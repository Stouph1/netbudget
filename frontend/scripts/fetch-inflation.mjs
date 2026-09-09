#!/usr/bin/env node
// Récupère le taux d'inflation officiel de chaque pays couvert par l'app et
// régénère `src/lib/inflationData.ts`.
//
//   npm run fetch:inflation
//
// POURQUOI EMBARQUER LES CHIFFRES PLUTÔT QUE LES APPELER DEPUIS L'APP. Un
// appel réseau au lancement dirait à Eurostat, à l'OCDE et à la Banque
// mondiale dans quel pays vit l'utilisateur, à chaque ouverture. L'app est
// vendue sur le fait qu'elle n'envoie rien : on ne va pas troquer ça contre un
// chiffre qui bouge une fois par mois. Il est donc figé à la compilation, et
// AFFICHÉ AVEC SA DATE — un chiffre daté est honnête, un chiffre sans date ne
// l'est pas.
//
// AUCUN CHIFFRE ÉCRIT À LA MAIN. Tout vient d'une de ces trois institutions,
// et un pays qu'aucune ne couvre reste absent de la table : l'app n'affichera
// alors pas d'indicateur, ce qui vaut mieux qu'une estimation inventée.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "lib", "inflationData.ts");
const TIMEOUT = 45000;

// ---------------------------------------------------------------------------
// Répartition des pays par source
// ---------------------------------------------------------------------------
//
// L'ordre suit la fraîcheur : Eurostat et l'OCDE publient au mois, la Banque
// mondiale à l'année. On ne prend la Banque mondiale que là où les deux autres
// ne vont pas.

// Eurostat — indice des prix à la consommation harmonisé, variation sur 12
// mois. `ei_cphi_m` est le jeu à jour ; `prc_hicp_manr` s'est arrêté au
// rebasage 2025=100 de février 2026 et ne doit plus être utilisé.
const EUROSTAT = ["FR", "BE", "DE", "ES", "IT", "PT", "LU"];

// OCDE — prix à la consommation, glissement annuel (`GY`).
const OECD = { CH: "CHE", GB: "GBR", US: "USA", CA: "CAN" };

// Banque mondiale — inflation annuelle des prix à la consommation.
const WORLDBANK = { MA: "MA", DZ: "DZ", TN: "TN", SN: "SN", CI: "CI", CM: "CM" };

// Trois tentatives. Ces API publiques rendent des 500 et des délais dépassés
// sans raison durable ; abandonner à la première ferait échouer toute la
// génération pour un incident de quelques secondes.
async function getJson(url, accept = "application/json") {
  let last;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { Accept: accept },
        signal: AbortSignal.timeout(TIMEOUT),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      last = e;
      if (attempt < 3) await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
  throw new Error(`${last.message} — ${url}`);
}

// ---------------------------------------------------------------------------
// Eurostat
// ---------------------------------------------------------------------------

async function fromEurostat() {
  const geo = EUROSTAT.map((c) => `geo=${c}`).join("&");
  const url =
    "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/ei_cphi_m" +
    `?format=JSON&unit=RT12&indic=TOTAL&${geo}&lastTimePeriod=1`;
  const d = await getJson(url);

  const geoIndex = d.dimension.geo.category.index;
  const byPosition = Object.fromEntries(Object.entries(geoIndex).map(([k, v]) => [v, k]));
  const period = Object.keys(d.dimension.time.category.index)[0];

  const out = {};
  for (const [pos, value] of Object.entries(d.value)) {
    const country = byPosition[Number(pos)];
    if (!country) continue;
    out[country] = { rate: value, period, source: "eurostat" };
  }
  return out;
}

// ---------------------------------------------------------------------------
// OCDE
// ---------------------------------------------------------------------------
//
// La clé SDMX laisse la méthodologie libre (`CPI..GY`) : la Suisse n'expose
// pas la même que les autres, et la figer ferait disparaître un pays entier.
// Quand plusieurs méthodologies répondent, on garde l'indice NATIONAL (`N`),
// celui que la presse et les banques du pays citent.

async function fromOecd() {
  const SDMX = "application/vnd.sdmx.data+json;version=1.0";
  const BASE =
    "https://sdmx.oecd.org/public/rest/data/OECD.SDD.TPS,DSD_PRICES@DF_PRICES_ALL,1.0/";
  const TAIL = "?lastNObservations=1&dimensionAtObservation=AllDimensions";
  const toCountry = Object.fromEntries(Object.entries(OECD).map(([k, v]) => [v, k]));

  // Le serveur SDMX de l'OCDE rend des 500 selon la FORME de la clé, et pas
  // seulement selon son contenu : la requête groupée avec méthodologie passe
  // là où la même requête pays par pays échoue, et inversement selon le pays.
  // On essaie donc plusieurs formes plutôt que d'en déclarer une bonne.
  const attempts = [
    // Méthodologie `N` — l'indice NATIONAL, celui que la presse et les banques
    // de chaque pays citent. Forme groupée : une seule requête quand ça passe.
    `${Object.values(OECD).join("+")}.M.N.CPI.PA._T.N.GY`,
    // Repli, pays par pays, méthodologie laissée libre.
    ...Object.values(OECD).map((ref) => `${ref}.M..CPI.PA._T.N.GY`),
  ];

  const out = {};
  const errors = [];
  for (const key of attempts) {
    // Inutile d'insister pour un pays déjà servi par la requête groupée.
    const refs = key.split(".")[0].split("+");
    if (refs.every((r) => out[toCountry[r]])) continue;

    let d;
    try {
      d = await getJson(BASE + key + TAIL, SDMX);
    } catch (e) {
      errors.push(e.message);
      continue;
    }

    const dims = d.data.structure.dimensions.observation;
    const names = dims.map((x) => x.id);
    const codes = dims.map((x) => x.values.map((v) => v.id));

    for (const [obsKey, obs] of Object.entries(d.data.dataSets[0].observations)) {
      const idx = obsKey.split(":").map(Number);
      const label = Object.fromEntries(names.map((n, i) => [n, codes[i][idx[i]]]));
      const country = toCountry[label.REF_AREA];
      if (!country || obs[0] == null) continue;
      // Si plusieurs méthodologies répondent, l'indice national l'emporte.
      if (out[country] && label.METHODOLOGY !== "N") continue;
      out[country] = { rate: obs[0], period: label.TIME_PERIOD, source: "oecd" };
    }
  }

  const missing = Object.keys(OECD).filter((c) => !out[c]);
  if (missing.length) {
    throw new Error(`aucune donnée pour ${missing.join(", ")} — ${errors.join(" | ")}`);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Banque mondiale
// ---------------------------------------------------------------------------

async function fromWorldBank() {
  const codes = Object.values(WORLDBANK).join(";");
  const url =
    `https://api.worldbank.org/v2/country/${codes}/indicator/FP.CPI.TOTL.ZG` +
    "?format=json&mrv=1&per_page=100";
  const d = await getJson(url);
  const rows = Array.isArray(d) && Array.isArray(d[1]) ? d[1] : [];

  const out = {};
  for (const r of rows) {
    const country = Object.keys(WORLDBANK).find((k) => WORLDBANK[k] === r.country.id);
    if (!country || r.value == null) continue;
    out[country] = { rate: r.value, period: r.date, source: "worldbank" };
  }
  return out;
}

// ---------------------------------------------------------------------------

// Deux décimales : au-delà on afficherait une précision que les instituts
// eux-mêmes ne revendiquent pas.
const round = (n) => Math.round(n * 100) / 100;

function render(rows, today) {
  const entries = Object.keys(rows)
    .sort()
    .map((c) => {
      const r = rows[c];
      return (
        `  ${c}: { rate: ${round(r.rate)}, period: ${JSON.stringify(r.period)}, ` +
        `source: ${JSON.stringify(r.source)} },`
      );
    })
    .join("\n");

  return `// FICHIER GÉNÉRÉ — ne pas modifier à la main.
// Régénérer avec : npm run fetch:inflation
//
// Taux d'inflation annuel officiel, par pays. Chaque ligne porte la période
// exacte à laquelle elle se rapporte, parce que l'app l'affiche : un taux sans
// date laisserait croire qu'il est d'aujourd'hui.
//
// Généré le ${today}.

import type { Country } from "../types/advice";

/** Institution d'où sort le chiffre. Aucune autre source n'est acceptée. */
export type InflationSource = "eurostat" | "oecd" | "worldbank";

export type InflationRow = {
  /** Variation annuelle des prix à la consommation, en pourcentage. */
  rate: number;
  /** "AAAA-MM" pour une publication mensuelle, "AAAA" pour une annuelle. */
  period: string;
  source: InflationSource;
};

export const INFLATION_GENERATED_AT = ${JSON.stringify(today)};

export const SOURCE_URLS: Record<InflationSource, string> = {
  eurostat:
    "https://ec.europa.eu/eurostat/databrowser/view/ei_cphi_m/default/table",
  oecd: "https://data-explorer.oecd.org/vis?df[ds]=dsDisseminateFinalDMZ&df[id]=DSD_PRICES%40DF_PRICES_ALL",
  worldbank: "https://data.worldbank.org/indicator/FP.CPI.TOTL.ZG",
};

/**
 * Un pays absent de cette table n'a pas de chiffre officiel récupérable — l'app
 * n'affiche alors aucun indicateur plutôt qu'une approximation.
 */
export const INFLATION: Partial<Record<Country, InflationRow>> = {
${entries}
};
`;
}

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const sources = [
    ["Eurostat", fromEurostat],
    ["OCDE", fromOecd],
    ["Banque mondiale", fromWorldBank],
  ];

  const rows = {};
  let failed = 0;
  for (const [name, fn] of sources) {
    try {
      const got = await fn();
      Object.assign(rows, got);
      console.log(`${name} : ${Object.keys(got).length} pays`);
    } catch (e) {
      failed++;
      console.error(`${name} : ÉCHEC — ${e.message}`);
    }
  }

  // Une source muette ferait disparaître ses pays de la table sans bruit, et
  // l'indicateur avec eux. On préfère ne rien réécrire et le dire.
  if (failed) {
    console.error(`\n${failed} source(s) en échec — fichier NON régénéré.`);
    process.exit(1);
  }

  writeFileSync(OUT, render(rows, today), "utf8");
  console.log(`\n${Object.keys(rows).length} pays écrits dans ${OUT}`);
  for (const c of Object.keys(rows).sort()) {
    console.log(`  ${c}  ${round(rows[c].rate).toString().padStart(6)} %   ${rows[c].period}  (${rows[c].source})`);
  }
}

main();
