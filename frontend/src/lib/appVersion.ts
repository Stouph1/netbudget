// La ligne de version affichée au bas des Réglages.
//
// Convention des apps grand public (Discord, X…) : « 2.0.0 (19) » puis, plus
// petit, la plateforme, le canal et l'origine du JavaScript. Ça sert à une
// chose : quand quelqu'un signale un bug, savoir s'il a la dernière version.
// Avec EAS Update, deux téléphones au même build (19) peuvent exécuter deux
// JavaScript différents : l'identifiant de mise à jour tranche.

export type VersionInfo = {
  /** Version marketing, « 2.0.0 ». */
  version: string;
  /** Numéro de build natif (versionCode Android, buildNumber iOS). */
  build: string | null;
  /** « android », « ios », « web ». */
  platform: string;
  /** Canal EAS (« production », « sandbox »…), null hors build EAS. */
  channel: string | null;
  /** Identifiant de la mise à jour EAS en cours, null si aucune. */
  updateId: string | null;
  /** Vrai quand le JavaScript est celui embarqué dans le build. */
  embedded: boolean;
};

/** « 2.0.0 (19) », ou « 2.0.0 » quand le build est inconnu. */
export function versionLabel(v: VersionInfo): string {
  return v.build ? `${v.version} (${v.build})` : v.version;
}

/** Les 8 premiers caractères de l'identifiant, comme un hash git court. */
export function shortId(id: string | null): string | null {
  const s = (id ?? "").trim();
  return s ? s.replace(/-/g, "").slice(0, 8) : null;
}

export type VersionWords = {
  /** Libellé quand on tourne hors build EAS (client de dev, Expo Go). */
  dev: string;
  /** Libellé quand le JavaScript est celui d'origine du build. */
  embedded: string;
  /** Gabarit « mise à jour {id} ». */
  update: string;
};

/** « android · production · d'origine », ou « android · développement ». */
export function versionMeta(v: VersionInfo, words: VersionWords): string {
  const parts: string[] = [v.platform];
  if (!v.channel) {
    parts.push(words.dev);
  } else {
    parts.push(v.channel);
    const id = shortId(v.updateId);
    parts.push(v.embedded || !id ? words.embedded : words.update.replace("{id}", id));
  }
  return parts.join(" · ");
}

/** Tout sur une ligne, pour coller dans un mail de bug. */
export function versionClipboard(v: VersionInfo, words: VersionWords): string {
  return `NETbudget ${versionLabel(v)} · ${versionMeta(v, words)}`;
}
