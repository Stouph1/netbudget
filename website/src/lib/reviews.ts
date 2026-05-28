// Récupère les avis App Store de NETbudget via le flux RSS public Apple, au build.
// Une seule requête HTTP par locale d'App Store, sans clé API.
// Doc : https://itunes.apple.com/<country>/rss/customerreviews/id=<appId>/sortBy=mostRecent/page=<n>/json

export interface Review {
  id: string;
  author: string;
  rating: number; // 1-5
  title: string;
  text: string;
  date: string; // ISO
  countryCode: string;
}

const APP_ID = "6763551701";
// Apple plafonne chaque tri à ~2 avis pour les fiches peu commentées. On
// interroge donc DEUX tris par store puis on déduplique → on récupère plus
// d'avis qu'avec un seul appel.
const SORTS = ["mostRecent", "mostHelpful"] as const;
// Liste large pour aller chercher des avis dans tous les marchés.
const COUNTRIES = [
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

interface RssEntry {
  id?: { label?: string };
  author?: { name?: { label?: string } };
  "im:rating"?: { label?: string };
  title?: { label?: string };
  content?: { label?: string };
  updated?: { label?: string };
}

async function fetchOne(country: string, sort: string): Promise<Review[]> {
  const url = `https://itunes.apple.com/${country}/rss/customerreviews/id=${APP_ID}/sortBy=${sort}/page=1/json`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "NETbudget-Website/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { feed?: { entry?: RssEntry | RssEntry[] } };
    const raw = data?.feed?.entry;
    if (!raw) return [];
    // Le 1er entry est la fiche app, pas un avis. Si un seul item, c'est sûrement l'app.
    const entries = Array.isArray(raw) ? raw.slice(1) : [];
    return entries
      .map((e): Review => ({
        id: e.id?.label ?? `${country}-${Math.random()}`,
        author: e.author?.name?.label ?? "—",
        rating: parseInt(e["im:rating"]?.label ?? "5", 10) || 5,
        title: e.title?.label ?? "",
        text: e.content?.label ?? "",
        date: e.updated?.label ?? "",
        countryCode: country.toUpperCase(),
      }))
      .filter((r) => r.text.length > 0);
  } catch {
    return [];
  }
}

let cache: Review[] | null = null;

export async function getReviews(): Promise<Review[]> {
  if (cache) return cache;
  // Cross-product : chaque pays × chaque tri.
  const tasks: Promise<Review[]>[] = [];
  for (const c of COUNTRIES) for (const s of SORTS) tasks.push(fetchOne(c, s));
  const all = (await Promise.all(tasks)).flat();
  // Déduplication par ID (un avis trouvé via plusieurs tris ne compte qu'une fois).
  const seen = new Set<string>();
  const unique: Review[] = [];
  for (const r of all) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    unique.push(r);
  }
  // Tri : note décroissante, puis date la plus récente.
  unique.sort((a, b) => {
    if (b.rating !== a.rating) return b.rating - a.rating;
    return (b.date ?? "").localeCompare(a.date ?? "");
  });
  cache = unique;
  return unique;
}

