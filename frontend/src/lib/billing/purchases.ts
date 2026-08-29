// Accès au SDK natif — version téléphone.
//
// POURQUOI UN FICHIER À PART. Metro embarque TOUT ce qu'il voit dans le code,
// y compris un `require` placé derrière un test qui ne sera jamais vrai sur la
// plateforme visée. Un chargement « paresseux » ne retire donc rien du bundle :
// mesuré, le SDK ajoutait 1 Mo au bundle web, où aucun achat n'est possible.
//
// La séparation par extension, elle, agit à la RÉSOLUTION : sur web, Metro
// prend `purchases.web.ts` et ce fichier-ci n'existe tout simplement pas.

export type PurchasesModule = typeof import("react-native-purchases").default;

export function loadPurchases(): PurchasesModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("react-native-purchases").default as PurchasesModule;
  } catch {
    // Module natif absent (Expo Go) : on ne vend pas, on ne casse pas.
    return null;
  }
}
