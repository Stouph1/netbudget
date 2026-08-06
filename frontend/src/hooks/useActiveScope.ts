// Re-export : le scope actif vit maintenant dans un Context global
// (src/contexts/ScopeContext.tsx) pour que le changement de scope se propage
// instantanément à TOUS les écrans (S1, Conseils, Budget, Profil).
// Ce fichier est conservé pour ne pas casser les imports existants.

export { useActiveScope, ScopeProvider } from "../contexts/ScopeContext";
export type { ScopeKind } from "../contexts/ScopeContext";
