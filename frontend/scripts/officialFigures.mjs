// Table de correspondance : chiffre affiché dans une carte de conseil
// ↔ paramètre officiel OpenFisca France.
//
// OpenFisca est le moteur de micro-simulation socio-fiscale maintenu par
// l'administration française (beta.gouv / Etalab). Chaque paramètre porte son
// historique daté, la date de parution au Journal officiel et le lien
// Légifrance du décret. C'est un `lastVerified` tenu à jour par un tiers
// officiel — bien plus fiable qu'un scraper.
//
// AGPL : on ne consomme QUE l'API HTTP publique depuis un script de build.
// Le moteur n'est jamais embarqué dans l'app (ce qui déclencherait la licence).
// Les valeurs elles-mêmes sont des faits juridiques, non protégeables.
//
// `kind` :
//   "eur"  → le paramètre est déjà un montant en euros
//   "bmaf" → le paramètre est un COEFFICIENT de la BMAF (base mensuelle des
//            allocations familiales) : montant réel = coefficient × BMAF

export const BMAF_PATH =
  "prestations_sociales.prestations_familiales.bmaf.bmaf";

export const TRACKED_FIGURES = [
  {
    cardId: "hand-aah",
    label: "AAH — montant mensuel maximal",
    path: "prestations_sociales.prestations_etat_de_sante.invalidite.aah.montant",
    kind: "eur",
    expected: 1041.59,
  },
  {
    cardId: "hand-mva",
    label: "Majoration pour la vie autonome",
    path: "prestations_sociales.prestations_etat_de_sante.invalidite.caah.majoration_vie_autonome",
    kind: "eur",
    expected: 104.77,
  },
  {
    cardId: "hand-aeeh",
    label: "AEEH — allocation de base",
    path: "prestations_sociales.prestations_familiales.education_presence_parentale.aeeh.base",
    kind: "bmaf",
    expected: 153.01,
  },
  {
    cardId: "hand-aeeh",
    label: "AEEH — complément catégorie 6",
    path: "prestations_sociales.prestations_familiales.education_presence_parentale.aeeh.complement_allocation.categorie_6",
    kind: "eur",
    expected: 1298.44,
  },
  {
    cardId: "hand-ajpp",
    label: "AJPP — allocation journalière (personne seule)",
    path: "prestations_sociales.prestations_familiales.education_presence_parentale.ajpp.montant.personne_seule",
    kind: "bmaf",
    expected: 66.64,
  },
];

// Tolérance : un écart de moins d'un centime vient d'un arrondi, pas d'une
// revalorisation.
export const TOLERANCE_EUR = 0.01;
