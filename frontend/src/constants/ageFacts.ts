// Cartes d'anniversaire : « voici ce qui change pour toi à X ans ».
// Faits VÉRIFIÉS (recherches 2026-08, sources officielles par pays — voir
// corpus docs/). Règles d'âge stables ; montants volatils formulés prudemment.
// Couverture : France (détaillée), Belgique, Suisse, Canada/Québec, Maroc,
// Sénégal, Cameroun. Autres pays : cartes génériques.
//
// tone : le signe de la carte — "good" (bonne nouvelle, vert),
// "gold" (information décisive, doré brillant), "bad" (mauvaise nouvelle à
// anticiper, rouge), "neutral".
//
// i18n : ce module est un module de DONNÉES (pas de contexte React). Aucun
// texte affichable n'y est écrit en dur — les fabriques reçoivent `i18n`
// ({ t, tp }) et composent depuis des clés `bdayCard.*`. Les jetons {name},
// {age} et {region} sont interpolés par `tp`.

import type { AdviceI18n, UserProfile } from "../types/advice";

export type BirthdayTone = "good" | "gold" | "bad" | "neutral";

export type BirthdayCard = {
  emoji: string;
  title: string;
  body: string;
  tone: BirthdayTone;
  sources?: string[]; // liens officiels — affichés dans le dépôt de conseils
};

type C = BirthdayCard;
const card = (tone: BirthdayTone, emoji: string, title: string, body: string, sources?: string[]): C =>
  ({ tone, emoji, title, body, sources });

// Point fort régional pour la carte anniversaire (dispositifs vérifiés 2026-08).
// `slug` sert de racine de clé i18n : `bdayCard.region.<slug>.title` / `.body`.
const REGION_HIGHLIGHTS: Record<string, { slug: string; sources: string[] }> = {
  "Île-de-France": {
    slug: "idf",
    sources: ["https://www.iledefrance-mobilites.fr/aide-et-contacts/reductions-et-gratuite/quest-ce-que-la-tarification-solidarite-transport", "https://www.iledefrance.fr/tous-les-services/labaz-lappli-pour-les-15-25-ans"],
  },
  "Occitanie": { slug: "occitanie", sources: ["https://www.laregion.fr/-cartejeune-"] },
  "Auvergne-Rhône-Alpes": { slug: "aura", sources: ["https://www.auvergnerhonealpes.fr/passregionjeunes"] },
  "Hauts-de-France": { slug: "hdf", sources: ["https://guide-aides.hautsdefrance.fr/dispositif458"] },
  "Grand Est": { slug: "grandest", sources: ["https://www.jeunest.fr/"] },
  "Pays de la Loire": { slug: "pdl", sources: ["https://www.epassjeunes-paysdelaloire.fr/"] },
  "Provence-Alpes-Côte d'Azur": { slug: "paca", sources: ["https://www.maregionsud.fr/ma-region/cest-quoi-la-region/education-orientation-et-apprentissage/toutes-vos-aides-en-1-clic"] },
  "Guadeloupe": { slug: "guadeloupe", sources: ["https://ladom.fr"] },
  "Martinique": { slug: "martinique", sources: ["https://ladom.fr"] },
  "Guyane": { slug: "guyane", sources: ["https://ladom.fr"] },
  "La Réunion": { slug: "reunion", sources: ["https://www.reunion.gouv.fr/Actions-de-l-Etat/Economie-commerce-exterieur-et-fiscalite-locale/Bouclier-qualite-prix-BQP"] },
  "Mayotte": { slug: "mayotte", sources: ["https://ladom.fr"] },
};

function frFacts(age: number, { t }: AdviceI18n): C[] {
  const out: C[] = [];
  const k = (s: string) => `bdayCard.fr.${s}`;
  const put = (tone: BirthdayTone, emoji: string, slug: string, sources?: string[]) =>
    out.push(card(tone, emoji, t(`${k(slug)}.title`), t(`${k(slug)}.body`), sources));
  if (age === 12) put("good", "🏦", "12", ["https://www.economie.gouv.fr/particuliers/gerer-mon-argent"]);
  if (age === 16) put("good", "💳", "16", ["https://code.travail.gouv.fr/fiche-service-public/contrat-dapprentissage"]);
  if (age === 17) put("good", "🎭", "17", ["https://pass.culture.fr/reforme-du-pass-culture"]);
  if (age === 18) {
    put("gold", "🔓", "18a", ["https://pass.culture.fr/reforme-du-pass-culture", "https://www.caf.fr"]);
    put("good", "🚆", "18b", ["https://www.sncf-connect.com/catalogue/description/carte-avantage-jeune"]);
  }
  if (age === 20) put("bad", "👨‍👩‍👧", "20", ["https://www.caf.fr/allocataires/aides-et-demarches/ma-situation/vie-personnelle/l-aine-de-mes-enfants-20-ans"]);
  if (age === 21) put("bad", "⏳", "21", ["https://www.service-public.gouv.fr/particuliers/vosdroits/F3085"]);
  if (age === 25) put("good", "🛡️", "25", ["https://www.service-public.gouv.fr/particuliers/vosdroits/F286"]);
  if (age === 26 || age === 27) put("good", "🚄", "26", ["https://www.sncf-connect.com/catalogue/description/carte-avantage-jeune"]);
  if (age === 28) put("bad", "🎫", "28", ["https://www.sncf-connect.com/catalogue/description/carte-avantage-jeune"]);
  if (age === 30) put("bad", "🏠", "30", ["https://www.visale.fr/vos-questions/faq-locataires/locataire-de-plus-de-30-ans-suis-je-eligible/"]);
  if (age >= 33 && age <= 36) put("gold", "🏡", "33", ["https://www.service-public.gouv.fr/particuliers/vosdroits/F36526"]);
  if (age >= 50 && age <= 61) put("gold", "🧭", "50", ["https://www.service-public.gouv.fr/particuliers/actualites/A18825"]);
  if (age >= 62 && age <= 66) put("gold", "🌅", "62", ["https://www.service-public.gouv.fr/particuliers/actualites/A18825"]);
  return out;
}

function beFacts(age: number, { t }: AdviceI18n): C[] {
  const out: C[] = [];
  const put = (tone: BirthdayTone, emoji: string, slug: string) =>
    out.push(card(tone, emoji, t(`bdayCard.be.${slug}.title`), t(`bdayCard.be.${slug}.body`)));
  if (age === 18) put("gold", "🔓", "18");
  if (age >= 18 && age <= 24) put("good", "🎓", "18-24");
  if (age === 25) put("bad", "👨‍👩‍👧", "25");
  if (age >= 55 && age <= 59) put("gold", "⏳", "55");
  if (age === 60) put("good", "💶", "60");
  if (age >= 64 && age <= 67) put("gold", "🌅", "64");
  return out;
}

function chFacts(age: number, { t }: AdviceI18n): C[] {
  const out: C[] = [];
  const put = (tone: BirthdayTone, emoji: string, slug: string) =>
    out.push(card(tone, emoji, t(`bdayCard.ch.${slug}.title`), t(`bdayCard.ch.${slug}.body`)));
  if (age === 17) put("gold", "🏦", "17");
  if (age === 20) put("bad", "📋", "20");
  if (age >= 58 && age <= 59) put("gold", "🧭", "58");
  if (age === 60) put("good", "💰", "60");
  if (age >= 63 && age <= 66) put("gold", "🌅", "63");
  return out;
}

function caFacts(age: number, { t }: AdviceI18n): C[] {
  const out: C[] = [];
  const put = (tone: BirthdayTone, emoji: string, slug: string) =>
    out.push(card(tone, emoji, t(`bdayCard.ca.${slug}.title`), t(`bdayCard.ca.${slug}.body`)));
  if (age === 18) put("gold", "🔓", "18");
  if (age >= 59 && age <= 61) put("gold", "🧭", "59");
  if (age >= 64 && age <= 66) put("gold", "🌅", "64");
  if (age === 71) put("bad", "📋", "71");
  if (age === 75) put("good", "💰", "75");
  return out;
}

function luFacts(age: number, { t }: AdviceI18n): C[] {
  const out: C[] = [];
  const put = (tone: BirthdayTone, emoji: string, slug: string, sources: string[]) =>
    out.push(card(tone, emoji, t(`bdayCard.lu.${slug}.title`), t(`bdayCard.lu.${slug}.body`), sources));
  if (age === 15) put("good", "💼", "15", ["https://guichet.public.lu/fr/entreprises/ressources-humaines/contrat-convention/jeunes-actifs/etudiant.html"]);
  if (age === 18) put("gold", "🔓", "18", ["https://cae.public.lu/fr/allocations/majorite-de-l-enfant.html", "https://guichet.public.lu/fr/citoyens/famille-education/etudes-superieures/aides-logement/aide-financiere.html"]);
  if (age >= 18 && age <= 20) put("good", "🏦", "18-20", ["https://guichet.public.lu/fr/citoyens/fiscalite/immobilier/depenses-deductibles/epargne-logement-resident.html"]);
  if (age === 25) put("gold", "🛡️", "25", ["https://guichet.public.lu/fr/citoyens/aides/famille-education/revenus-modestes/revenu-inclusion-sociale-revis.html"]);
  if (age === 41) put("bad", "🏠", "41", ["https://guichet.public.lu/fr/citoyens/fiscalite/immobilier/depenses-deductibles/epargne-logement-resident.html"]);
  if (age >= 55 && age <= 59) put("gold", "🧭", "55", ["https://guichet.public.lu/fr/citoyens/travail/pension/assurance-pension/retraite-pension-anticipee.html", "https://guichet.public.lu/fr/citoyens/travail/pension/assurance-pension/certificat-cnap-abattement-fiscal.html"]);
  if (age === 60) put("good", "💰", "60", ["https://guichet.public.lu/fr/citoyens/fiscalite/declaration-impot-decompte/depenses-deductibles/contrat-prevoyance-resident.html"]);
  if (age >= 64 && age <= 66) put("gold", "🌅", "64", ["https://guichet.public.lu/fr/citoyens/travail/pension/assurance-pension/retraite-pension-vieillesse.html", "https://impotsdirects.public.lu/fr/az/c/class_resid.html"]);
  return out;
}

function africaFacts(age: number, country: string, { t }: AdviceI18n): C[] {
  const out: C[] = [];
  const put = (tone: BirthdayTone, emoji: string, slug: string, sources?: string[]) =>
    out.push(card(tone, emoji, t(`bdayCard.${slug}.title`), t(`bdayCard.${slug}.body`), sources));
  if (country === "CM" && age === 21) put("gold", "🔓", "cm.21");
  if ((country === "SN" || country === "MA") && age === 18) put("gold", "🔓", "snma.18");
  if (country === "MA" && age >= 58 && age <= 61) put("gold", "🌅", "ma.58");
  if (country === "SN" && age >= 58 && age <= 61) put("gold", "🌅", "sn.58");
  if (country === "CM" && age >= 58 && age <= 61) put("gold", "🌅", "cm.58");
  if (country === "CI" && age === 18) put("gold", "🔓", "ci.18", ["https://agenceemploijeunes.ci/site/faq"]);
  if (country === "CI" && age >= 53 && age <= 56) put("gold", "🧭", "ci.53", ["https://www.cnps.ci/salarie/"]);
  if (country === "CI" && age >= 58 && age <= 61) put("gold", "🌅", "ci.58", ["https://www.cnps.ci/salarie/"]);
  if (country === "DZ" && age === 19) put("gold", "🔓", "dz.19", ["https://www.cleiss.fr/docs/regimes/regime_algerie_salaries.html"]);
  if (country === "DZ" && age >= 53 && age <= 61) put("gold", "🌅", "dz.53", ["https://www.cleiss.fr/docs/regimes/regime_algerie_salaries.html"]);
  if (country === "TN" && age === 18) put("gold", "🔓", "tn.18", ["https://legislation-securite.tn/latest-laws/loi-n-2010-39-du-26-juillet-2010-portant-unification-de-lage-de-la-majorite-civile/"]);
  if (country === "TN" && age >= 58 && age <= 61) put("gold", "🌅", "tn.58", ["https://www.cleiss.fr/docs/regimes/regime_tunisie_salaries.html"]);
  return out;
}

export function buildBirthdayCards(
  age: number,
  firstName: string | null,
  profile: UserProfile,
  i18n: AdviceI18n,
): BirthdayCard[] {
  const { t, tp } = i18n;
  const name = firstName?.trim() || t("bdayCard.open.you");
  const country = profile.country ?? "FR";
  const cards: BirthdayCard[] = [];

  // 1. Ouverture
  cards.push(card("gold", "🎂", tp("bdayCard.open.title", { name }),
    tp("bdayCard.open.body", { age })));

  // 2-6. Faits par âge selon le pays
  const byCountry: Record<string, C[]> = {
    FR: frFacts(age, i18n), BE: beFacts(age, i18n), CH: chFacts(age, i18n), CA: caFacts(age, i18n),
    LU: luFacts(age, i18n),
    MA: africaFacts(age, "MA", i18n), SN: africaFacts(age, "SN", i18n), CM: africaFacts(age, "CM", i18n),
    CI: africaFacts(age, "CI", i18n), DZ: africaFacts(age, "DZ", i18n), TN: africaFacts(age, "TN", i18n),
  };
  cards.push(...(byCountry[country] ?? []));

  // 7. Carte contextuelle (situation / lieu)
  if (profile.occupation === "self_employed") {
    cards.push(card("good", "💼", t("bdayCard.ctx.self_employed.title"), t("bdayCard.ctx.self_employed.body")));
  } else if (profile.occupation === "student") {
    cards.push(card("good", "🎓", t("bdayCard.ctx.student.title"), t("bdayCard.ctx.student.body")));
  } else if (country === "FR" && profile.region) {
    const r = REGION_HIGHLIGHTS[profile.region];
    if (r) {
      cards.push(card("good", "📍", t(`bdayCard.region.${r.slug}.title`), t(`bdayCard.region.${r.slug}.body`), r.sources));
    } else {
      cards.push(card("good", "📍", t("bdayCard.region.generic.title"),
        tp("bdayCard.region.generic.body", { region: profile.region }),
        ["https://www.1jeune1solution.gouv.fr/mes-aides"]));
    }
  }

  // 8. Clôture
  cards.push(card("neutral", "🚀", t("bdayCard.close.title"), t("bdayCard.close.body")));

  return cards.slice(0, 8);
}

// ============================================================================
// Anniversaire d'un ENFANT — vu du parent (France pour l'instant).
// ============================================================================
export function buildChildBirthdayCards(
  age: number,
  childName: string,
  profile: UserProfile,
  i18n: AdviceI18n,
): BirthdayCard[] {
  const { t, tp } = i18n;
  const cards: BirthdayCard[] = [];
  const name = childName;
  const put = (tone: BirthdayTone, emoji: string, slug: string, sources?: string[]) =>
    cards.push(card(tone, emoji, tp(`bdayCard.child.${slug}.title`, { name, age }),
      tp(`bdayCard.child.${slug}.body`, { name, age }), sources));

  cards.push(card("gold", "🎂", tp("bdayCard.child.open.title", { name, age }),
    tp("bdayCard.child.open.body", { name })));

  const country = profile.country ?? "FR";
  if (country === "BE") {
    if (age === 6 || age === 12) put("good", "📈", "be.6", ["https://www.irispedia.brussels/fr/prestations-familiales/montants/montants-actuels/", "https://www.famiwal.be/vos-allocations-familiales/votre-supplement-dage-annuel-prime-scolaire"]);
    if (age === 15 || age === 16) put("good", "💼", "be.15", ["https://www.studentatwork.be/fr/quota-heures-et-impact.html"]);
    if (age === 18) put("gold", "📋", "be.18", ["https://famiris.brussels/wp-content/uploads/2024/04/2024_Famiris_Etudiant.pdf", "https://www.famiwal.be/jeunes/les-principes-de-base"]);
    if (age === 25) put("bad", "📉", "be.25", ["https://www.famiwal.be/jeunes/les-principes-de-base"]);
  } else if (country === "CA") {
    if (age === 4) put("good", "🎒", "ca.4", ["https://www.retraitequebec.gouv.qc.ca/fr/faq/enfants/supplement-fournitures-scolaires/Pages/supplement-fournitures-scolaires.aspx"]);
    if (age === 6) put("bad", "📉", "ca.6", ["https://www.canada.ca/en/revenue-agency/services/child-family-benefits/canada-child-benefit/how-much.html"]);
    if (age === 14 || age === 15) put("gold", "🎓", "ca.14", ["https://reee-resp.service.canada.ca/fr/fondamentaux/SDE0093_Mai_2023.pdf"]);
    if (age === 17) put("neutral", "⏳", "ca.17", ["https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/registered-education-savings-plans-resps/canada-education-savings-programs-cesp/canada-education-savings-grant-cesg.html"]);
    if (age === 18) put("gold", "🔓", "ca.18", ["https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/tax-free-savings-account/contributing/before.html"]);
  } else if (country === "LU") {
    if (age === 1) put("good", "🍼", "lu.1", ["https://men.public.lu/fr/systeme-educatif/enfance/02-gratuite.html"]);
    if (age === 6 || age === 12) put("good", "📈", "lu.6", ["https://cae.public.lu/fr/allocations/allocation-pour-lavenir-des-enfants/montants.html"]);
    if (age === 17) put("gold", "📋", "lu.17", ["https://cae.public.lu/fr/allocations/majorite-de-l-enfant.html"]);
  } else if (country === "FR") {
    if (age === 3) put("bad", "🍼", "fr.3", ["https://www.caf.fr"]);
    if (age === 6) put("good", "🎒", "fr.6", ["https://www.service-public.gouv.fr/particuliers/vosdroits/F1878"]);
    if (age === 12) put("good", "🏦", "fr.12", ["https://www.economie.gouv.fr"]);
    if (age === 16) put("gold", "📋", "fr.16", ["https://www.caf.fr"]);
    if (age === 17) put("good", "🎭", "fr.17", ["https://pass.culture.fr/reforme-du-pass-culture"]);
    if (age === 18) put("gold", "⚖️", "fr.18", ["https://www.service-public.gouv.fr/particuliers/vosdroits/F3085"]);
    if (age === 20) put("bad", "📉", "fr.20", ["https://www.caf.fr/allocataires/aides-et-demarches/ma-situation/vie-personnelle/l-aine-de-mes-enfants-20-ans"]);
    if (age === 25) put("bad", "🎓", "fr.25", ["https://www.service-public.gouv.fr/particuliers/vosdroits/F3085"]);
  }
  if (cards.length === 1) {
    cards.push(card("good", "💝", t("bdayCard.child.generic.title"),
      tp("bdayCard.child.generic.body", { name })));
  }
  cards.push(card("neutral", "🎁", t("bdayCard.child.close.title"),
    tp("bdayCard.child.close.body", { name })));
  return cards.slice(0, 8);
}

// ============================================================================
// Anniversaire d'un ANIMAL — budget vétérinaire, assurance, prévention.
// Chiffres assurance/budget : vérifiés 2026-07 (corpus animaux).
// ============================================================================
export function buildPetBirthdayCards(
  petName: string,
  species: "dog" | "cat" | "other",
  i18n: AdviceI18n,
): BirthdayCard[] {
  const { t, tp } = i18n;
  const name = petName;
  const cards: BirthdayCard[] = [];
  cards.push(card("gold", species === "dog" ? "🐶" : species === "cat" ? "🐱" : "🐾",
    tp("bdayCard.pet.open.title", { name }),
    tp("bdayCard.pet.open.body", { name })));
  cards.push(card("good", "🩺", t("bdayCard.pet.vet.title"), t("bdayCard.pet.vet.body")));
  if (species === "dog") {
    cards.push(card("gold", "🛡️", t("bdayCard.pet.dog.title"), t("bdayCard.pet.dog.body"), ["https://www.moneyvox.fr/assurance/actualites/107615/combien-ca-coute-assurer-votre-chien-ou-votre-chat-en-2026"]));
  } else if (species === "cat") {
    cards.push(card("gold", "🛡️", t("bdayCard.pet.cat.title"), t("bdayCard.pet.cat.body"), ["https://www.moneyvox.fr/assurance/actualites/107615/combien-ca-coute-assurer-votre-chien-ou-votre-chat-en-2026"]));
  } else {
    cards.push(card("good", "🛡️", t("bdayCard.pet.other.title"), tp("bdayCard.pet.other.body", { name })));
  }
  cards.push(card("neutral", "📊", t("bdayCard.pet.budget.title"), tp("bdayCard.pet.budget.body", { name })));
  return cards;
}
