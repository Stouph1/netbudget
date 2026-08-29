// Accès au SDK natif — version web : il n'y en a pas.
//
// Aucun achat n'est possible depuis un navigateur ici, et le SDK pèse environ
// 1 Mo. Ce fichier vide le remplace à la résolution : voir purchases.ts.

export type PurchasesModule = typeof import("react-native-purchases").default;

export function loadPurchases(): PurchasesModule | null {
  return null;
}
