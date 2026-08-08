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
//   "eur"       → le paramètre est déjà un montant en euros
//   "bmaf"      → le paramètre OpenFisca est un COEFFICIENT de la BMAF :
//                 montant réel = coefficient × BMAF
//   "bmafRatio" → on ne fait PAS confiance au paramètre OpenFisca (obsolète) :
//                 on applique notre propre ratio légal à la BMAF courante.
//                 Le montant se revalorise alors tout seul chaque avril.
//
// `openfiscaStale` : documente les paramètres où OpenFisca traîne. Le
// vérificateur les classe à part au lieu de signaler un faux écart chaque
// semaine — sinon l'alerte devient du bruit et on finit par l'ignorer.

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
    // Tranché le 2026-08-09 : le complément est un % FIXE de la BMAF. Le ratio
    // d'OpenFisca (avril 2025) et le nôtre (avril 2026) sont identiques à
    // 0,00004 près → notre valeur est la bonne, OpenFisca n'a pas passé la
    // revalorisation d'avril 2026 sur ce paramètre précis.
    kind: "bmafRatio",
    ratio: 2.715493,
    expected: 1298.44,
    openfiscaStale:
      "OpenFisca reste à la valeur d'avril 2025 (1 288,13 €). Notre montant vient de monparcourshandicap.gouv.fr et suit le ratio BMAF.",
  },
  {
    cardId: "hand-ajpp",
    label: "AJPP — allocation journalière (personne seule)",
    path: "prestations_sociales.prestations_familiales.education_presence_parentale.ajpp.montant.personne_seule",
    // Tranché le 2026-08-09 : le coefficient d'OpenFisca (0,1263) date de
    // JUIN 2006 et donnerait 60,39 € — l'AJPP a été réformée depuis. Notre
    // valeur vient de service-public.gouv.fr (fiche F15132).
    kind: "eur",
    expected: 66.64,
    openfiscaStale:
      "Coefficient OpenFisca figé depuis 2006 (donnerait 60,39 €). Source retenue : service-public F15132. À revérifier chaque avril.",
  },

  // ==========================================================================
  // Prestations familiales et minima sociaux — extension du suivi.
  // ==========================================================================
  {
    cardId: "fr-prime-naissance",
    label: "Prime à la naissance (PAJE)",
    path: "prestations_sociales.prestations_familiales.petite_enfance.paje.paje_cm2.montant.prime_naissance",
    kind: "bmaf",
    expected: 1093.11,
    openfiscaStale:
      "Le paramètre est un coefficient de BMAF (2,2975) qui donne 1 098,58 € ; service-public annonce 1 093,11 €. Écart de 5,47 € à trancher — probable décalage de date de référence.",
  },
  {
    cardId: "fr-paje-base",
    label: "PAJE — allocation de base, taux plein (enfants nés après 2018)",
    path: "prestations_sociales.prestations_familiales.petite_enfance.paje.paje_cm.montant.allocation_base_taux_plein.apres_2018.taux",
    kind: "bmaf",
    expected: 198.17,
  },
  {
    cardId: "fr-ars-primaire",
    label: "Allocation de rentrée scolaire — primaire",
    path: "prestations_sociales.prestations_familiales.education_presence_parentale.ars.ars_m.taux_primaire",
    kind: "bmaf",
    expected: 0, // renseigné au premier passage du vérificateur
  },
  {
    cardId: "reference",
    label: "BMAF — base des prestations familiales",
    path: "prestations_sociales.prestations_familiales.bmaf.bmaf",
    kind: "eur",
    expected: 478.16,
  },
];

// Tolérance : un écart de moins d'un centime vient d'un arrondi, pas d'une
// revalorisation.
export const TOLERANCE_EUR = 0.01;
