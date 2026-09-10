// Couleurs d'accent de l'app — la teinte que la personne choisit, espace par
// espace.
//
// UNE SEULE COULEUR CHANGE. Fond, surfaces, textes, rouge d'alerte : rien de
// tout ça ne bouge. Ce qui bouge, c'est l'accent — boutons, onglet actif,
// puces sélectionnées, montants « dans le vert ». C'est ce qui rend un espace
// reconnaissable d'un coup d'œil : « le jaune, c'est mon budget perso ; le
// bleu, c'est la famille ».
//
// PAR ESPACE, PAS PAR COMPTE. Le réglage est local au téléphone et clé par
// espace (perso, ou l'identifiant d'un espace partagé). Il ne se synchronise
// pas : c'est une préférence d'affichage, pas une donnée — et rien ne sort de
// l'appareil pour ça.
//
// CHAQUE ACCENT EST LISIBLE. Le texte posé sur un bouton d'accent est noir ;
// les six teintes sont choisies claires pour que ce noir reste net (≥ 4,5:1),
// et pour rester visibles sur le fond sombre (≥ 3:1). Un test le vérifie.

export type AccentId = "mint" | "yellow" | "blue" | "violet" | "rose" | "orange";

export type Accent = {
  id: AccentId;
  /** La couleur d'accent elle-même : boutons, actifs, icônes. */
  main: string;
  /** Variante claire, pour un texte d'accent sur surface sombre. */
  soft: string;
  /** Variante profonde, pour un fond teinté discret. */
  deep: string;
};

/** L'accent historique de l'app : celui de tous les écrans avant ce réglage. */
export const DEFAULT_ACCENT_ID: AccentId = "mint";

export const ACCENTS: readonly Accent[] = [
  { id: "mint", main: "#4ADE80", soft: "#86EFAC", deep: "#15803D" },
  { id: "yellow", main: "#FACC15", soft: "#FDE68A", deep: "#A16207" },
  { id: "blue", main: "#60A5FA", soft: "#93C5FD", deep: "#1D4ED8" },
  { id: "violet", main: "#A78BFA", soft: "#C4B5FD", deep: "#6D28D9" },
  { id: "rose", main: "#FB7185", soft: "#FDA4AF", deep: "#BE123C" },
  { id: "orange", main: "#FB923C", soft: "#FDBA74", deep: "#C2410C" },
];

export function accentById(id: string | null | undefined): Accent {
  return ACCENTS.find((a) => a.id === id) ?? ACCENTS[0];
}

/** Clé d'espace : « perso » pour le budget personnel, sinon l'id de l'espace. */
export function scopeKey(workspaceId: string | null | undefined): string {
  return workspaceId ?? "perso";
}

/** Réglages enregistrés : clé d'espace → accent. */
export type AccentMap = Record<string, AccentId>;

export function resolveAccent(map: AccentMap, workspaceId: string | null | undefined): Accent {
  return accentById(map[scopeKey(workspaceId)]);
}

/** Lit une map depuis le stockage sans jamais faire confiance à son contenu. */
export function parseAccentMap(raw: string | null): AccentMap {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: AccentMap = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "string" && ACCENTS.some((a) => a.id === v)) out[k] = v as AccentId;
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * `rgba()` à partir d'un hex et d'une opacité.
 *
 * Les écrans posaient partout « rgba(74,222,128,0.12) », la menthe à la main ;
 * avec un accent variable, la transparence doit suivre la couleur.
 */
export function alpha(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full.slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/**
 * « r,g,b » d'un hex — pour composer un rgba() DANS un worklet Reanimated,
 * où l'on ne peut pas appeler alpha() : la chaîne se capture, la fonction non.
 */
export function rgbTriplet(hex: string): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full.slice(0, 6), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

/** Rapport de contraste WCAG entre deux couleurs hex. Sert aux tests. */
export function contrastRatio(hexA: string, hexB: string): number {
  const lum = (hex: string) => {
    const h = hex.replace("#", "");
    const ch = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
    const lin = ch.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  };
  const [la, lb] = [lum(hexA), lum(hexB)];
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}
