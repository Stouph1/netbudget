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
// On fetch plusieurs stores pour montrer la couverture mondiale et avoir plus de matière.
const COUNTRIES = ["fr", "us", "gb", "de", "es", "it", "jp", "br"];

interface RssEntry {
  id?: { label?: string };
  author?: { name?: { label?: string } };
  "im:rating"?: { label?: string };
  title?: { label?: string };
  content?: { label?: string };
  updated?: { label?: string };
}

async function fetchOne(country: string): Promise<Review[]> {
  const url = `https://itunes.apple.com/${country}/rss/customerreviews/id=${APP_ID}/sortBy=mostRecent/page=1/json`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "NETbudget-Website/1.0" },
      signal: AbortSignal.timeout(5000),
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
  const all = (await Promise.all(COUNTRIES.map(fetchOne))).flat();
  // Tri : note décroissante, puis date la plus récente.
  all.sort((a, b) => {
    if (b.rating !== a.rating) return b.rating - a.rating;
    return (b.date ?? "").localeCompare(a.date ?? "");
  });
  cache = all;
  return all;
}

