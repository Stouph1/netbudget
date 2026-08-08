#!/usr/bin/env node
// Vérifie que les montants officiels cités dans les cartes de conseils
// correspondent toujours aux paramètres publiés par OpenFisca France.
//
//   node scripts/check-figures.mjs
//
// Sortie : un rapport lisible + un code de sortie non nul si un écart est
// détecté (utilisable tel quel dans une tâche planifiée / CI).
//
// IMPORTANT — aucune mise à jour automatique. Le script SIGNALE, un humain
// décide. Un montant faux dans une app de budget est plus grave qu'un montant
// légèrement daté : quelqu'un peut prendre une décision financière dessus.

import { BMAF_PATH, TRACKED_FIGURES, TOLERANCE_EUR } from "./officialFigures.mjs";

const API = "https://api.fr.openfisca.org/latest/parameter/";

async function fetchParam(dottedPath) {
  const url = API + dottedPath.replaceAll(".", "/");
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} sur ${dottedPath}`);
  return res.json();
}

// Dernière valeur en vigueur à la date du jour (les valeurs futures déjà
// publiées — une revalorisation votée — ne doivent pas être appliquées avant
// leur date d'effet).
function valueInForce(values, today = new Date().toISOString().slice(0, 10)) {
  const applicable = Object.entries(values)
    .filter(([date]) => date <= today)
    .sort(([a], [b]) => a.localeCompare(b));
  if (!applicable.length) return null;
  const [date, value] = applicable[applicable.length - 1];
  return { date, value };
}

function upcoming(values, today = new Date().toISOString().slice(0, 10)) {
  return Object.entries(values)
    .filter(([date]) => date > today)
    .sort(([a], [b]) => a.localeCompare(b))[0];
}

const fmt = (n) => `${n.toFixed(2).replace(".", ",")} €`;

async function main() {
  console.log("Vérification des montants officiels — source : OpenFisca France");
  console.log("https://api.fr.openfisca.org\n");

  const bmafParam = await fetchParam(BMAF_PATH);
  const bmaf = valueInForce(bmafParam.values);
  console.log(`BMAF en vigueur : ${fmt(bmaf.value)} (depuis le ${bmaf.date})\n`);

  const drift = [];
  const ok = [];
  const failed = [];

  for (const fig of TRACKED_FIGURES) {
    try {
      const param = await fetchParam(fig.path);
      const inForce = valueInForce(param.values);
      if (!inForce) {
        failed.push({ fig, reason: "aucune valeur en vigueur" });
        continue;
      }
      const official =
        fig.kind === "bmaf"
          ? Math.round(inForce.value * bmaf.value * 100) / 100
          : inForce.value;
      const delta = Math.abs(official - fig.expected);
      const next = upcoming(param.values);
      const entry = {
        fig,
        official,
        since: inForce.date,
        validUntil: param.metadata?.last_value_still_valid_on,
        jo: param.metadata?.official_journal_date?.[inForce.date],
        next,
      };
      if (delta <= TOLERANCE_EUR) ok.push(entry);
      else drift.push({ ...entry, delta });
    } catch (e) {
      failed.push({ fig, reason: e.message });
    }
  }

  if (ok.length) {
    console.log(`À jour (${ok.length})`);
    for (const e of ok) {
      const jo = e.jo ? `, JO du ${e.jo}` : "";
      console.log(`  ✓ ${e.fig.label} : ${fmt(e.official)} (depuis le ${e.since}${jo})`);
      if (e.next) {
        console.log(`      ⏭  revalorisation déjà publiée : ${fmt(
          e.fig.kind === "bmaf" ? e.next[1] * bmaf.value : e.next[1],
        )} au ${e.next[0]}`);
      }
    }
    console.log("");
  }

  if (drift.length) {
    console.log(`ÉCART DÉTECTÉ (${drift.length}) — à vérifier à la main\n`);
    for (const e of drift) {
      // Distinction capitale pour la personne qui relit : si la valeur
      // OpenFisca date de plus de 18 mois, c'est probablement OpenFisca qui
      // n'a pas suivi la dernière revalorisation, pas notre carte qui est
      // fausse. Le verdict ne se lit pas dans l'écart, mais dans les DATES.
      const ageMonths =
        (Date.now() - new Date(e.since).getTime()) / (1000 * 3600 * 24 * 30.44);
      const verdict =
        ageMonths > 18
          ? "OpenFisca n'a pas suivi (sa valeur date de plus de 18 mois) — notre carte est probablement la bonne, mais reconfirme sur service-public"
          : "OpenFisca est à jour — NOTRE CARTE est probablement périmée, corrige-la";
      console.log(`  ✗ ${e.fig.label}`);
      console.log(`      carte « ${e.fig.cardId} » affiche : ${fmt(e.fig.expected)}`);
      console.log(`      OpenFisca en vigueur           : ${fmt(e.official)} (depuis le ${e.since})`);
      console.log(`      écart : ${fmt(e.delta)}`);
      console.log(`      → ${verdict}`);
      console.log(`      → ${API}${e.fig.path.replaceAll(".", "/")}\n`);
    }
  }

  if (failed.length) {
    console.log(`Non vérifiables (${failed.length})`);
    for (const f of failed) console.log(`  ? ${f.fig.label} — ${f.reason}`);
    console.log("");
  }

  console.log(
    `Bilan : ${ok.length} à jour · ${drift.length} en écart · ${failed.length} non vérifiés`,
  );
  process.exit(drift.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Échec de la vérification :", e.message);
  process.exit(2);
});
