// Récupère les avis publics de NETbudget au BUILD, depuis les deux stores :
//  - App Store : flux RSS public Apple (une requête par pays × tri, sans clé)
//  - Google Play : google-play-scraper (scraping du store public, sans clé)
// Aucun fake : uniquement de vrais avis publiés. Un snapshot committé sert de
// filet de sécurité — si les deux sources échouent au build, la section
// affiche au minimum les avis du snapshot (plus jamais de section vide).
//
// Doc RSS Apple : https://itunes.apple.com/<cc>/rss/customerreviews/id=<appId>/sortBy=<sort>/page=1/json
// ATTENTION format : le flux peut inclure OU NON la fiche app en premier
// élément, et renvoie un OBJET (pas un tableau) quand il n'y a qu'une entrée.
// On filtre donc par présence de `im:rating` au lieu d'un slice(1) aveugle.

import snapshot from "../data/reviews-snapshot.json";

export interface Review {
  id: string;
  author: string;
  rating: number; // 1-5
  title: string;
  text: string;
  date: string; // ISO
  countryCode: string;
  store: "appstore" | "playstore";
}

const APPLE_APP_ID = "6763551701";
const PLAY_APP_ID = "com.stouph.netbudget";

// Apple plafonne chaque tri à peu d'avis pour les fiches peu commentées :
// on interroge deux tris par store puis on déduplique.
const APPLE_SORTS = ["mostRecent", "mostHelpful"] as const;
const APPLE_COUNTRIES = [
  "fr", "be", "ch", "ca", "mc", "lu",
  "us", "gb", "au", "nz", "ie",
  "de", "at",
  "es", "mx", "ar", "co", "cl", "pe",
  "it",
  "pt", "br",
  "jp", "kr", "hk", "tw", "sg", "my", "th", "id", "ph", "vn", "in",
  "ae", "sa", "il", "tr", "eg", "ma",
  "nl", "se", "no", "dk", "fi", "pl", "cz", "ro", "hu", "gr",
];

// Google Play : les avis sont par langue (pas par pays) — on couvre les
// langues de l'app. Le paramètre country influe peu mais reste requis.
const PLAY_LOCALES: { lang: string; country: string }[] = [
  { lang: "fr", country: "fr" },
  { lang: "en", country: "us" },
  { lang: "de", country: "de" },
  { lang: "es", country: "es" },
  { lang: "it", country: "it" },
  { lang: "pt", country: "pt" },
];

interface RssEntry {
  id?: { label?: string };
  author?: { name?: { label?: string } };
  "im:rating"?: { label?: string };
  title?: { label?: string };
  content?: { label?: string };
  updated?: { label?: string };
}

async function fetchAppleOne(country: string, sort: string): Promise<Review[]> {
  const url = `https://itunes.apple.com/${country}/rss/customerreviews/id=${APPLE_APP_ID}/sortBy=${sort}/page=1/json`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "NETbudget-Website/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { feed?: { entry?: RssEntry | RssEntry[] } };
    const raw = data?.feed?.entry;
    if (!raw) return [];
    // Objet unique → tableau ; puis on ne garde que les entrées qui SONT des
    // avis (elles portent im:rating — la fiche app, quand présente, n'en a pas).
    const entries = (Array.isArray(raw) ? raw : [raw]).filter(
      (e) => e["im:rating"]?.label,
    );
    return entries
      .map((e): Review => ({
        id: e.id?.label ?? `${country}-${Math.random()}`,
        author: e.author?.name?.label ?? "—",
        rating: parseInt(e["im:rating"]?.label ?? "5", 10) || 5,
        title: e.title?.label ?? "",
        text: e.content?.label ?? "",
        date: e.updated?.label ?? "",
        countryCode: country.toUpperCase(),
        store: "appstore",
      }))
      .filter((r) => r.text.length > 0);
  } catch {
    return [];
  }
}

async function fetchPlay(): Promise<Review[]> {
  try {
    // Import dynamique : si le scraper casse (changement du store, CI sans
    // réseau), le build continue avec App Store + snapshot.
    const gplayModule = await import("google-play-scraper");
    const gplay = (gplayModule as { default?: unknown }).default ?? gplayModule;
    const { reviews: fetchReviews, sort: sortEnum } = gplay as {
      reviews: (opts: Record<string, unknown>) => Promise<{ data: PlayReview[] }>;
      sort: { NEWEST: unknown };
    };
    const tasks = PLAY_LOCALES.map(({ lang, country }) =>
      fetchReviews({
        appId: PLAY_APP_ID,
        lang,
        country,
        sort: sortEnum.NEWEST,
        num: 50,
      })
        .then((r) =>
          (r?.data ?? []).map((p): Review => ({
            id: `play-${p.id}`,
            author: p.userName ?? "—",
            rating: p.score ?? 5,
            title: p.title ?? "",
            text: p.text ?? "",
            date: p.date ?? "",
            countryCode: country.toUpperCase(),
            store: "playstore",
          })),
        )
        .catch(() => [] as Review[]),
    );
    const all = (await Promise.all(tasks)).flat();
    return all.filter((r) => r.text.length > 0);
  } catch {
    return [];
  }
}

interface PlayReview {
  id: string;
  userName?: string;
  score?: number;
  title?: string | null;
  text?: string | null;
  date?: string;
}

let cache: Review[] | null = null;

export async function getReviews(): Promise<Review[]> {
  if (cache) return cache;

  const appleTasks: Promise<Review[]>[] = [];
  for (const c of APPLE_COUNTRIES) {
    for (const s of APPLE_SORTS) appleTasks.push(fetchAppleOne(c, s));
  }
  const [appleAll, playAll] = await Promise.all([
    Promise.all(appleTasks).then((r) => r.flat()),
    fetchPlay(),
  ]);

  // Filet de sécurité : le snapshot committé garantit que la section ne peut
  // plus jamais être vide, même si les deux sources échouent au build.
  const all = [...appleAll, ...playAll, ...(snapshot as Review[])];

  // Déduplication par ID (avis vu via plusieurs tris / déjà dans le snapshot).
  const seen = new Set<string>();
  const unique: Review[] = [];
  for (const r of all) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    unique.push(r);
  }
  // Vitrine : on met en avant les avis 4-5 étoiles (tous restent visibles sur
  // les stores). Si ça vidait tout, on retombe sur l'intégralité.
  const positive = unique.filter((r) => r.rating >= 4);
  const displayed = positive.length >= 1 ? positive : unique;

  // Tri : note décroissante, puis date la plus récente.
  displayed.sort((a, b) => {
    if (b.rating !== a.rating) return b.rating - a.rating;
    return (b.date ?? "").localeCompare(a.date ?? "");
  });
  cache = displayed;
  return displayed;
}
