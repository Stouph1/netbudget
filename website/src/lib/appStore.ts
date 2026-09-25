// Fiche publique de l'app sur l'App Store, lue AU BUILD.
//
// Source : l'API de recherche iTunes, publique et sans clé, celle qui alimente
// la fiche visible par n'importe qui :
//   https://itunes.apple.com/lookup?id=6763551701&country=fr
// Elle renvoie la note moyenne, le nombre de notes, la version en ligne et la
// date de première publication. On ne recopie rien à la main : un chiffre
// écrit dans le code vieillit sans prévenir, celui-ci suit la boutique à
// chaque déploiement.
//
// Si l'appel échoue, on renvoie null et le balisage n'annonce rien : mieux
// vaut aucune note qu'une note inventée ou périmée.

const APPLE_APP_ID = "6763551701";
const LOOKUP = `https://itunes.apple.com/lookup?id=${APPLE_APP_ID}&country=fr`;

export type AppStoreFacts = {
  /** Note moyenne, arrondie au dixième, entre 1 et 5. */
  rating: number;
  /** Nombre de notes derrière cette moyenne. */
  ratingCount: number;
  /** Version publiée sur la boutique, ex. « 2.0.0 ». */
  version: string | null;
  /** Première mise en ligne, au format AAAA-MM-JJ. */
  datePublished: string | null;
  /** Quand la fiche a été lue, pour le dire dans le balisage. */
  fetchedAt: string;
};

let cached: Promise<AppStoreFacts | null> | null = null;

export function getAppStoreFacts(): Promise<AppStoreFacts | null> {
  // Une seule requête par build, quel que soit le nombre de pages.
  if (!cached) cached = fetchFacts();
  return cached;
}

async function fetchFacts(): Promise<AppStoreFacts | null> {
  try {
    const res = await fetch(LOOKUP, {
      headers: { "User-Agent": "NETbudget-Website/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      results?: {
        averageUserRating?: number;
        userRatingCount?: number;
        version?: string;
        releaseDate?: string;
      }[];
    };
    const r = data.results?.[0];
    if (!r || typeof r.averageUserRating !== "number" || !r.userRatingCount) return null;
    return {
      rating: Math.round(r.averageUserRating * 10) / 10,
      ratingCount: r.userRatingCount,
      version: r.version ?? null,
      datePublished: r.releaseDate ? r.releaseDate.slice(0, 10) : null,
      fetchedAt: new Date().toISOString().slice(0, 10),
    };
  } catch {
    return null;
  }
}
