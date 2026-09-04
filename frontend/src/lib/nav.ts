// Retour arrière qui ne tombe jamais dans le vide.
//
// LE DÉFAUT QU'IL CORRIGE. L'inscription se termine par `router.replace` vers
// l'écran des conseils — volontairement : on ne veut pas qu'un retour ramène
// dans le formulaire déjà validé. Mais `replace` EFFACE l'historique, et
// `router.back()` n'a plus rien où revenir. La flèche du haut devenait morte,
// sans le moindre signe, et la seule issue était une icône maison en haut à
// droite que personne ne pense à chercher.
//
// Une flèche retour qui ne fait rien est pire qu'une flèche absente : on la
// tape deux fois, puis on se demande si l'app a gelé.

import { router } from "expo-router";

/**
 * Revient en arrière, ou rentre à l'accueil s'il n'y a pas d'arrière.
 *
 * `tab: premium` plutôt que la racine nue : c'est de l'onglet Profil que
 * partent tous les écrans qui appellent ceci, donc c'est là qu'on s'attend à
 * retomber.
 */
export function goBack(): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace({ pathname: "/", params: { tab: "premium" } } as never);
}
