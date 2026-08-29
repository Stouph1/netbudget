// Quand annoncer les nouveautés, et lesquelles. Module PUR.
//
// AUX VERSIONS MAJEURES SEULEMENT. Un écran de nouveautés à chaque correctif
// devient un péage : on le ferme sans lire, et le jour où il y a vraiment
// quelque chose à dire, le geste de fermeture est déjà automatique. En le
// réservant aux 2.0, 3.0, on garde son pouvoir d'interruption pour les rares
// moments qui le méritent.
//
// JAMAIS À LA PREMIÈRE INSTALLATION. Quelqu'un qui découvre l'app n'a rien à
// rattraper : lui annoncer « ce qui a changé » n'a aucun sens, et ça occupe la
// place de la visite guidée, qui elle est utile.

/** Numéro majeur d'une version « x.y.z ». null si illisible. */
export function majorOf(version: string | null | undefined): number | null {
  if (typeof version !== "string") return null;
  const first = version.trim().split(".")[0];
  if (!/^\d+$/.test(first)) return null;
  return Number(first);
}

/**
 * Faut-il ouvrir l'écran des nouveautés ?
 *
 * `seen` est la version affichée la dernière fois, ou null si l'app n'a jamais
 * rien montré — ce qui inclut une première installation.
 */
export function shouldShowWhatsNew(
  seen: string | null,
  current: string,
  { firstInstall }: { firstInstall: boolean },
): boolean {
  // Rien à rattraper sur une installation neuve.
  if (firstInstall) return false;

  const now = majorOf(current);
  if (now === null) return false;

  // Version inconnue sur une app déjà installée : c'est une mise à jour venue
  // d'une version antérieure au suivi. On annonce.
  const before = majorOf(seen);
  if (before === null) return true;

  return now > before;
}
