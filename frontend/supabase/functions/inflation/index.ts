// Taux d'inflation officiels, servis à l'application.
//
// POURQUOI PASSER PAR NOUS PLUTÔT QUE D'APPELER EUROSTAT DEPUIS LE TÉLÉPHONE.
// Une requête « donne-moi l'inflation de la France » dit à l'institut, à
// chaque ouverture, dans quel pays vit la personne — avec son adresse IP en
// prime. Ici, la fonction renvoie TOUS les pays à TOUT LE MONDE, toujours la
// même réponse : elle ne reçoit aucun paramètre, et n'a donc rien à apprendre.
// L'app trie chez elle.
//
// DEUX PROPRIÉTÉS QUI JUSTIFIENT LA FORME DU CODE :
//
// 1. ELLE NE TOMBE JAMAIS SANS RÉPONDRE. Trois institutions publiques sont
//    interrogées ; l'une d'elles est en panne régulièrement. Une source muette
//    ne fait pas échouer la requête, elle réduit la liste — et l'app garde sa
//    table embarquée pour les pays manquants. Un chiffre daté vaut mieux que
//    pas d'écran.
//
// 2. ELLE EST MISE EN CACHE AGRESSIVEMENT. Ces chiffres changent une fois par
//    mois. Interroger Eurostat à chaque lancement d'app serait absurde, lent,
//    et finirait par nous faire bloquer. Le cache mémoire tient le temps de vie
//    de l'instance, et l'en-tête Cache-Control fait le reste côté CDN.
//
// Déploiement :
//   supabase functions deploy inflation --no-verify-jwt
//
// `--no-verify-jwt` est délibéré : l'app fonctionne SANS COMPTE, et les
// conseils budgétaires en font partie. Exiger une session priverait de
// l'indicateur exactement les utilisateurs qui n'ont rien à nous donner. La
// réponse est publique et identique pour tous — il n'y a rien à protéger.

const EUROSTAT = ["FR", "BE", "DE", "ES", "IT", "PT", "LU"];
const OECD: Record<string, string> = { CH: "CHE", GB: "GBR", US: "USA", CA: "CAN" };
const WORLDBANK = ["MA", "DZ", "TN", "SN", "CI", "CM"];

/** Douze heures. Les instituts publient au mois ; inutile d'y retourner plus. */
const TTL_MS = 12 * 60 * 60 * 1000;

type Row = { rate: number; period: string; source: string };
type Table = Record<string, Row>;

let cache: { at: number; table: Table } | null = null;

async function getJson(url: string, accept = "application/json"): Promise<unknown> {
  const res = await fetch(url, {
    headers: { Accept: accept },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const round = (n: number) => Math.round(n * 100) / 100;

async function fromEurostat(): Promise<Table> {
  const geo = EUROSTAT.map((c) => `geo=${c}`).join("&");
  const d = (await getJson(
    "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/ei_cphi_m" +
      `?format=JSON&unit=RT12&indic=TOTAL&${geo}&lastTimePeriod=1`,
  )) as {
    dimension: { geo: { category: { index: Record<string, number> } }; time: { category: { index: Record<string, number> } } };
    value: Record<string, number>;
  };

  const byPos: Record<number, string> = {};
  for (const [code, pos] of Object.entries(d.dimension.geo.category.index)) byPos[pos] = code;
  const period = Object.keys(d.dimension.time.category.index)[0];

  const out: Table = {};
  for (const [pos, value] of Object.entries(d.value)) {
    const country = byPos[Number(pos)];
    if (country && Number.isFinite(value)) {
      out[country] = { rate: round(value), period, source: "eurostat" };
    }
  }
  return out;
}

async function fromOecd(): Promise<Table> {
  const SDMX = "application/vnd.sdmx.data+json;version=1.0";
  const BASE = "https://sdmx.oecd.org/public/rest/data/OECD.SDD.TPS,DSD_PRICES@DF_PRICES_ALL,1.0/";
  const TAIL = "?lastNObservations=1&dimensionAtObservation=AllDimensions";
  const toCountry: Record<string, string> = {};
  for (const [c, ref] of Object.entries(OECD)) toCountry[ref] = c;

  // Le serveur SDMX rend des 500 selon la FORME de la clé et pas seulement son
  // contenu. On essaie la requête groupée, puis pays par pays.
  const attempts = [
    `${Object.values(OECD).join("+")}.M.N.CPI.PA._T.N.GY`,
    ...Object.values(OECD).map((ref) => `${ref}.M..CPI.PA._T.N.GY`),
  ];

  const out: Table = {};
  for (const key of attempts) {
    if (key.split(".")[0].split("+").every((r) => out[toCountry[r]])) continue;
    let d: {
      data: {
        structure: { dimensions: { observation: { id: string; values: { id: string }[] }[] } };
        dataSets: { observations: Record<string, (number | null)[]> }[];
      };
    };
    try {
      d = (await getJson(BASE + key + TAIL, SDMX)) as typeof d;
    } catch {
      continue;
    }

    const dims = d.data.structure.dimensions.observation;
    const names = dims.map((x) => x.id);
    const codes = dims.map((x) => x.values.map((v) => v.id));

    for (const [obsKey, obs] of Object.entries(d.data.dataSets[0].observations)) {
      const idx = obsKey.split(":").map(Number);
      const label: Record<string, string> = {};
      names.forEach((n, i) => (label[n] = codes[i][idx[i]]));
      const country = toCountry[label.REF_AREA];
      const value = obs[0];
      if (!country || value == null) continue;
      if (out[country] && label.METHODOLOGY !== "N") continue;
      out[country] = { rate: round(value), period: label.TIME_PERIOD, source: "oecd" };
    }
  }
  return out;
}

async function fromWorldBank(): Promise<Table> {
  const d = (await getJson(
    `https://api.worldbank.org/v2/country/${WORLDBANK.join(";")}/indicator/FP.CPI.TOTL.ZG` +
      "?format=json&mrv=1&per_page=100",
  )) as [unknown, { country: { id: string }; date: string; value: number | null }[]];

  const out: Table = {};
  for (const r of Array.isArray(d?.[1]) ? d[1] : []) {
    if (r.value == null || !WORLDBANK.includes(r.country.id)) continue;
    out[r.country.id] = { rate: round(r.value), period: r.date, source: "worldbank" };
  }
  return out;
}

async function build(): Promise<Table> {
  // `allSettled` et non `all` : une institution en panne ne doit pas priver
  // l'app des deux autres.
  const results = await Promise.allSettled([fromEurostat(), fromOecd(), fromWorldBank()]);
  const table: Table = {};
  for (const r of results) if (r.status === "fulfilled") Object.assign(table, r.value);
  return table;
}

Deno.serve(async (req: Request) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const now = Date.now();
  if (!cache || now - cache.at > TTL_MS) {
    const table = await build();
    // Une reconstruction vide ne remplace pas un cache valide : mieux vaut
    // servir des chiffres d'hier que rien du tout.
    if (Object.keys(table).length) cache = { at: now, table };
    else if (!cache) cache = { at: now, table: {} };
  }

  return new Response(
    JSON.stringify({ fetchedAt: new Date(cache.at).toISOString(), table: cache.table }),
    {
      headers: {
        ...cors,
        "Content-Type": "application/json",
        // Six heures de CDN : l'immense majorité des appels ne touchera jamais
        // ni cette fonction ni les instituts.
        "Cache-Control": "public, max-age=21600",
      },
    },
  );
});
