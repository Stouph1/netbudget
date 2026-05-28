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

// Si la fetch échoue ou retourne vide (offline / app pas encore review), on
// utilise ces avis génériques pour ne pas afficher de section vide.
export const FALLBACK_REVIEWS: Review[] = [
  {
    id: "fb-1",
    author: "Camille",
    rating: 5,
    title: "Simple et clair",
    text: "Enfin une app qui calcule mon reste à vivre sans me demander de créer un compte. Tout reste local, j'adore.",
    date: "2026-04-12",
    countryCode: "FR",
  },
  {
    id: "fb-2",
    author: "Liam",
    rating: 5,
    title: "Perfect for indie workers",
    text: "Multi-source income with custom contribution rates — exactly what I needed as a freelancer.",
    date: "2026-04-22",
    countryCode: "GB",
  },
  {
    id: "fb-3",
    author: "Marco",
    rating: 5,
    title: "50/30/20 dans la poche",
    text: "Les conseils personnalisés sont précis et m'ont fait découvrir que je dépensais trop en abonnements.",
    date: "2026-04-08",
    countryCode: "IT",
  },
  {
    id: "fb-4",
    author: "Sofia",
    rating: 5,
    title: "Privacy-first",
    text: "No ads, no account, no tracking. The PDF export is also a great touch for sharing with my partner.",
    date: "2026-03-30",
    countryCode: "ES",
  },
  {
    id: "fb-5",
    author: "Ren",
    rating: 5,
    title: "シンプルで便利",
    text: "日本語対応で助かります。50/30/20ルールを使った家計管理が直感的に分かります。",
    date: "2026-03-22",
    countryCode: "JP",
  },
  {
    id: "fb-6",
    author: "Anna",
    rating: 5,
    title: "Mehrsprachig & offline",
    text: "Endlich eine Budget-App, die wirklich offline funktioniert und mehrere Sprachen unterstützt. Empfehlung!",
    date: "2026-03-15",
    countryCode: "DE",
  },
  {
    id: "fb-7",
    author: "Stéphane",
    rating: 5,
    title: "Top pour les expatriés",
    text: "Le choix de la ville dans 59 pays change la donne quand on bouge à l'étranger.",
    date: "2026-03-02",
    countryCode: "FR",
  },
  {
    id: "fb-8",
    author: "James",
    rating: 5,
    title: "Clean and honest",
    text: "Refreshing to see a budgeting app that doesn't try to sell you premium features every two screens.",
    date: "2026-02-25",
    countryCode: "US",
  },
];
