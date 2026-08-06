// Cartes d'anniversaire : « voici ce qui change pour toi à X ans ».
// Faits VÉRIFIÉS (recherches 2026-08, sources officielles par pays — voir
// corpus docs/). Règles d'âge stables ; montants volatils formulés prudemment.
// Couverture : France (détaillée), Belgique, Suisse, Canada/Québec, Maroc,
// Sénégal, Cameroun. Autres pays : cartes génériques.
//
// tone : le signe de la carte — "good" (bonne nouvelle, vert),
// "gold" (information décisive, doré brillant), "bad" (mauvaise nouvelle à
// anticiper, rouge), "neutral".

import type { UserProfile } from "../types/advice";

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
const REGION_HIGHLIGHTS: Record<string, { title: string; body: string; sources: string[] }> = {
  "Île-de-France": {
    title: "Île-de-France : le transport, ton gisement d'économies",
    body: "Imagine R pour les scolaires/étudiants (remboursé à 100 % par la Ville pour les jeunes Parisiens !), tarification Solidarité Transport (50 à 100 % de réduction selon statut RSA/CSS/ASS), aide au permis de 1 000 € via l'appli LABAZ pour les 18-25 en insertion, et cantine des lycées au quotient familial dès 0,50 €.",
    sources: ["https://www.iledefrance-mobilites.fr/aide-et-contacts/reductions-et-gratuite/quest-ce-que-la-tarification-solidarite-transport", "https://www.iledefrance.fr/tous-les-services/labaz-lappli-pour-les-15-25-ans"],
  },
  "Occitanie": { title: "Occitanie : la Carte Jeune Région t'attend", body: "Gratuite, elle finance manuels, ordinateur prêté, aides lecture/sport/mobilité pour lycéens et jeunes. Chaque aide non activée est perdue.", sources: ["https://www.laregion.fr/-cartejeune-"] },
  "Auvergne-Rhône-Alpes": { title: "AURA : active ton PASS'Région jeunes", body: "Manuels gratuits, avantages sport, culture, ciné et santé pour lycéens et 16-25 ans selon statut. Gratuit — autant tout activer.", sources: ["https://www.auvergnerhonealpes.fr/passregionjeunes"] },
  "Hauts-de-France": { title: "Hauts-de-France : l'aide transport méconnue", body: "20 €/mois pour les salariés à plus de 20 km du travail (15 € apprentis), sous plafonds. Un dossier en ligne, plus de 200 €/an.", sources: ["https://guide-aides.hautsdefrance.fr/dispositif458"] },
  "Grand Est": { title: "Grand Est : Jeun'Est pour tous les 15-29 ans", body: "Réductions ciné, livres, spectacles, sport et aide premiers secours — ouvert à tous les 15-29 ans. Inscription gratuite.", sources: ["https://www.jeunest.fr/"] },
  "Pays de la Loire": { title: "Pays de la Loire : 8 € → plus de 130 € d'avantages", body: "L'e.pass culture sport (15-19 ans) coûte 8 €/an et débloque coupons sport, événements, patrimoine, BAFA.", sources: ["https://www.epassjeunes-paysdelaloire.fr/"] },
  "Provence-Alpes-Côte d'Azur": { title: "Région Sud : ZOU! Études et Pass Santé", body: "Transports régionaux illimités pour scolaires/étudiants et prestations santé gratuites. L'ancien e-PASS Jeunes n'existe plus.", sources: ["https://www.maregionsud.fr/ma-region/cest-quoi-la-region/education-orientation-et-apprentissage/toutes-vos-aides-en-1-clic"] },
  "Guadeloupe": { title: "Guadeloupe : LADOM et abattement d'impôt", body: "Billets vers l'Hexagone aidés (LADOM), réduction automatique d'impôt de 30 % (plafonnée), panier Bouclier Qualité Prix en magasin.", sources: ["https://ladom.fr"] },
  "Martinique": { title: "Martinique : LADOM et abattement d'impôt", body: "Billets vers l'Hexagone aidés (LADOM), réduction automatique d'impôt de 30 % (plafonnée), panier Bouclier Qualité Prix en magasin.", sources: ["https://ladom.fr"] },
  "Guyane": { title: "Guyane : 40 % d'abattement d'impôt", body: "Réduction automatique d'impôt de 40 % (plafonnée) — le plus fort taux des DROM avec Mayotte — plus LADOM et le Bouclier Qualité Prix.", sources: ["https://ladom.fr"] },
  "La Réunion": { title: "La Réunion : LADOM et abattement d'impôt", body: "Billets vers l'Hexagone aidés (LADOM), réduction automatique d'impôt de 30 % (plafonnée), Bouclier Qualité Prix renégocié chaque année.", sources: ["https://www.reunion.gouv.fr/Actions-de-l-Etat/Economie-commerce-exterieur-et-fiscalite-locale/Bouclier-qualite-prix-BQP"] },
  "Mayotte": { title: "Mayotte : 40 % d'abattement d'impôt", body: "Réduction automatique d'impôt de 40 % (plafonnée) — le plus fort taux des DROM avec la Guyane — plus LADOM pour la mobilité études.", sources: ["https://ladom.fr"] },
};

function frFacts(age: number): C[] {
  const out: C[] = [];
  if (age === 12) out.push(card("good", "🏦", "Le Livret Jeune s'ouvre à toi", "Dès 12 ans, tu peux avoir un Livret Jeune : plafond 1 600 €, intérêts exonérés d'impôt et taux au moins égal au Livret A. Le premier réflexe épargne.", ["https://www.economie.gouv.fr/particuliers/gerer-mon-argent"]));
  if (age === 16) out.push(card("good", "💳", "Ton argent, tes retraits", "À 16 ans, tu peux retirer seul sur ton Livret Jeune (sauf opposition des parents) et avoir un vrai compte avec carte. L'apprentissage s'ouvre aussi — avec un salaire.", ["https://code.travail.gouv.fr/fiche-service-public/contrat-dapprentissage"]));
  if (age === 17) out.push(card("good", "🎭", "50 € de pass Culture", "À 17 ans, le pass Culture crédite 50 € pour livres, ciné, concerts, jeux. Ils se cumulent avec le crédit des 18 ans et restent utilisables jusqu'à la veille de tes 21 ans.", ["https://pass.culture.fr/reforme-du-pass-culture"]));
  if (age === 18) {
    out.push(card("gold", "🔓", "Majorité financière", "Crédit, découvert, tous moyens de paiement : tout devient possible — et engageant. Le pass Culture ajoute 150 €, et tu peux demander les APL à ton nom (attention : ça recalcule les aides de tes parents).", ["https://pass.culture.fr/reforme-du-pass-culture", "https://www.caf.fr"]));
    out.push(card("good", "🚆", "Voyages malins", "La carte Avantage Jeune SNCF (12-27 ans) réduit de 30 % les TGV et Intercités. Si tu travailles, la prime d'activité peut compléter tes revenus dès 18 ans.", ["https://www.sncf-connect.com/catalogue/description/carte-avantage-jeune"]));
  }
  if (age === 20) out.push(card("bad", "👨‍👩‍👧", "Le cap des 20 ans côté CAF", "À 20 ans, tu ne comptes généralement plus comme enfant à charge pour les prestations familiales de tes parents. Si tu vis encore chez eux, c'est le bon moment pour parler budget familial.", ["https://www.caf.fr/allocataires/aides-et-demarches/ma-situation/vie-personnelle/l-aine-de-mes-enfants-20-ans"]));
  if (age === 21) out.push(card("bad", "⏳", "Dernière ligne droite pass Culture", "Tes crédits pass Culture expirent à la veille de tes 21 ans — dépense-les ! Et si tu n'es pas étudiant, le rattachement fiscal au foyer de tes parents s'arrête.", ["https://www.service-public.gouv.fr/particuliers/vosdroits/F3085"]));
  if (age === 25) out.push(card("good", "🛡️", "Le RSA devient accessible", "À 25 ans, le RSA s'ouvre sans les conditions restrictives des moins de 25 ans — un filet de sécurité à connaître. C'est aussi la dernière année du Livret Jeune et du rattachement fiscal étudiant.", ["https://www.service-public.gouv.fr/particuliers/vosdroits/F286"]));
  if (age === 26 || age === 27) out.push(card("good", "🚄", "Profite encore des tarifs jeunes", "La carte Avantage Jeune SNCF marche jusqu'à la veille de tes 28 ans — plus longtemps que la plupart des tarifs jeunes. Vérifie aussi les bornes d'âge de tes transports régionaux.", ["https://www.sncf-connect.com/catalogue/description/carte-avantage-jeune"]));
  if (age === 28) out.push(card("bad", "🎫", "Fin des tarifs jeunes SNCF", "La carte Avantage Jeune s'arrête à 28 ans. Compense en anticipant tes billets et en comparant les cartes Avantage adulte selon ta fréquence de voyage.", ["https://www.sncf-connect.com/catalogue/description/carte-avantage-jeune"]));
  if (age === 30) out.push(card("bad", "🏠", "Visale change de règles", "La garantie locative gratuite Visale n'est plus automatique après 30 ans (conditions : CDD, mutation, période d'essai…). Si un déménagement se profile, c'est un paramètre à anticiper.", ["https://www.visale.fr/vos-questions/faq-locataires/locataire-de-plus-de-30-ans-suis-je-eligible/"]));
  if (age >= 33 && age <= 36) out.push(card("gold", "🏡", "Emprunter sans questionnaire médical", "Loi Lemoine : pas de questionnaire de santé si la part assurée est ≤ 200 000 € ET que le prêt se termine avant tes 60 ans. Un prêt de 25 ans souscrit après 35 ans franchit cette limite — le calendrier compte.", ["https://www.service-public.gouv.fr/particuliers/vosdroits/F36526"]));
  if (age >= 50 && age <= 61) out.push(card("gold", "🧭", "La retraite se prépare maintenant", "Vérifie ton relevé de carrière sur info-retraite.fr (les erreurs sont fréquentes et corrigibles). L'âge légal dépend de ton année de naissance — la réforme est suspendue jusqu'en 2028, entre 62 ans 9 mois et 64 ans.", ["https://www.service-public.gouv.fr/particuliers/actualites/A18825"]));
  if (age >= 62 && age <= 66) out.push(card("gold", "🌅", "L'heure des choix", "Selon ton année de naissance, ton âge légal se situe entre 62 ans 9 mois et 64 ans (réforme suspendue). À 65 ans, l'ASPA garantit un minimum de ressources sous conditions. Fais tes simulations sur info-retraite.fr.", ["https://www.service-public.gouv.fr/particuliers/actualites/A18825"]));
  return out;
}

function beFacts(age: number): C[] {
  const out: C[] = [];
  if (age === 18) out.push(card("gold", "🔓", "Majorité : ton argent, tes contrats", "À 18 ans, tu peux ouvrir seul tout compte et souscrire un crédit. Côté allocations familiales : elles continuent sous conditions (études) — tes parents doivent vérifier les règles de leur région."));
  if (age >= 18 && age <= 24) out.push(card("good", "🎓", "Job étudiant : le quota d'heures avantageux", "Le quota d'heures de job étudiant à cotisations réduites (2,71 % au lieu de 13,07 %) est de 650 h/an depuis 2025. Bien utilisé, c'est un vrai levier de budget — surveille ton compteur sur Student@Work."));
  if (age === 25) out.push(card("bad", "👨‍👩‍👧", "Fin des allocations familiales", "À 25 ans, les allocations familiales s'arrêtent définitivement, même si tu étudies encore — dans les trois régimes régionaux. Un poste de revenu familial à remplacer dans le budget."));
  if (age >= 55 && age <= 59) out.push(card("gold", "⏳", "Épargne-pension : le timing de la taxe", "Souscrire une épargne-pension APRÈS 55 ans change la taxation (taxe prélevée 10 ans après la souscription au lieu de tes 60 ans). Le timing d'ouverture est décisif — renseigne-toi avant de signer."));
  if (age === 60) out.push(card("good", "💶", "La taxe anticipative est derrière toi", "À 60 ans, la taxe de 8 % sur ton épargne-pension est prélevée — et ensuite ? Épargner entre 60 et 64 ans donne encore la réduction d'impôt SANS nouvelle taxe finale. Des années fiscalement en or."));
  if (age >= 64 && age <= 67) out.push(card("gold", "🌅", "Pension : 66 ans aujourd'hui, 67 dès 2030", "L'âge légal est 66 ans (nés 1960-1963) et passera à 67 ans pour les nés à partir de 1964. Pension anticipée possible dès 60-63 ans selon ta carrière (42-44 ans). Vérifie sur mypension.be."));
  return out;
}

function chFacts(age: number): C[] {
  const out: C[] = [];
  if (age === 17) out.push(card("gold", "🏦", "L'AVS commence si tu travailles", "Dès le 1er janvier après tes 17 ans, tu cotises à l'AVS si tu as une activité rémunérée — et tu peux ouvrir un pilier 3a dès que tu as un revenu AVS. Commencer tôt, c'est des décennies d'intérêts composés."));
  if (age === 20) out.push(card("bad", "📋", "Cotisations AVS même sans emploi", "Dès le 1er janvier après tes 20 ans, les cotisations AVS sont dues MÊME sans activité (étudiants inclus). Une année non payée = une lacune qui réduira ta rente à vie. Vérifie ta situation auprès de ta caisse cantonale."));
  if (age >= 58 && age <= 59) out.push(card("gold", "🧭", "Retraite anticipée : le 2e pilier s'ouvre", "Dès 58 ans, certains règlements de caisse de pension permettent une retraite anticipée (rente réduite). C'est le moment de lire ton certificat de prévoyance et de faire tes simulations."));
  if (age === 60) out.push(card("good", "💰", "Ton pilier 3a devient disponible", "À 60 ans (5 ans avant l'âge de référence), tu peux retirer ton pilier 3a. Astuce fiscale : les retraits échelonnés de plusieurs comptes 3a sur des années différentes cassent la progression de l'impôt."));
  if (age >= 63 && age <= 66) out.push(card("gold", "🌅", "AVS : 65 ans, avec de la flexibilité", "L'âge de référence est 65 ans (hommes et femmes, réforme AVS 21 — transition pour les femmes nées 1961-1969). Anticipation possible dès 63 ans (rente réduite), report jusqu'à 70 ans (rente bonifiée)."));
  return out;
}

function caFacts(age: number): C[] {
  const out: C[] = [];
  if (age === 18) out.push(card("gold", "🔓", "Majorité (Québec) et premiers droits CELI", "Au Québec, 18 ans = majorité : comptes, crédit, contrats. Et tes droits de cotisation CELI commencent à s'accumuler dès cette année — même si tu n'ouvres le compte que plus tard, ils t'attendent."));
  if (age >= 59 && age <= 61) out.push(card("gold", "🧭", "RRQ dès 60 ans — mais à prix réduit", "Tu peux demander ta rente RRQ dès 60 ans, réduite d'environ 0,5-0,6 % par mois d'anticipation. Chaque année d'attente compte : fais la simulation avant de décider."));
  if (age >= 64 && age <= 66) out.push(card("gold", "🌅", "65 ans : RRQ pleine et Sécurité de la vieillesse", "À 65 ans, la RRQ se verse sans réduction et la pension fédérale de la Sécurité de la vieillesse s'ouvre (10 ans de résidence minimum). Reporter la SV la bonifie de 0,6 %/mois jusqu'à 70 ans."));
  if (age === 71) out.push(card("bad", "📋", "REER : l'année de la conversion obligatoire", "Au plus tard le 31 décembre de tes 71 ans, ton REER doit être converti en FERR (ou en rente). Les retraits minimums commencent l'année suivante — planifie la fiscalité dès maintenant."));
  if (age === 75) out.push(card("good", "💰", "Bonification automatique de la SV", "À 75 ans, ta pension de la Sécurité de la vieillesse augmente automatiquement de 10 %. Rien à faire — mais mets ton budget à jour."));
  return out;
}

function africaFacts(age: number, country: string): C[] {
  const out: C[] = [];
  if (country === "CM" && age === 21) out.push(card("gold", "🔓", "Majorité civile au Cameroun", "Au Cameroun, la majorité civile est à 21 ans (Code civil) : contrats et crédits en autonomie complète. C'est aussi l'âge où les allocations familiales CNPS s'arrêtent pour les étudiants."));
  if ((country === "SN" || country === "MA") && age === 18) out.push(card("gold", "🔓", "Majorité civile", "À 18 ans, tu peux contracter et gérer tes comptes en autonomie. Le bon réflexe dès maintenant : un compte épargne séparé et un premier objectif dans NetBudget."));
  if (country === "MA" && age >= 58 && age <= 61) out.push(card("gold", "🌅", "Retraite CNSS à 60 ans", "Au Maroc, la retraite CNSS du privé se prend à 60 ans (avec 3 240 jours de cotisation). Vérifie ton relevé de jours déclarés — les régularisations se font AVANT l'échéance, pas après."));
  if (country === "SN" && age >= 58 && age <= 61) out.push(card("gold", "🌅", "Retraite IPRES à 60 ans", "Au Sénégal, la retraite IPRES du privé se prend à 60 ans. Vérifie que ton employeur a bien déclaré toutes tes périodes — chaque trimestre manquant réduit la pension."));
  if (country === "CM" && age >= 58 && age <= 61) out.push(card("gold", "🌅", "Retraite CNPS à 60 ans", "Au Cameroun, la pension vieillesse CNPS se prend à 60 ans (20 ans d'immatriculation, 180 mois d'assurance). Anticipée possible dès 50 ans. Vérifie tes périodes déclarées dès maintenant."));
  return out;
}

export function buildBirthdayCards(
  age: number,
  firstName: string | null,
  profile: UserProfile,
): BirthdayCard[] {
  const name = firstName?.trim() || "toi";
  const country = profile.country ?? "FR";
  const cards: BirthdayCard[] = [];

  // 1. Ouverture
  cards.push(card("gold", "🎂", `Joyeux anniversaire ${name} !`,
    `${age} ans aujourd'hui — toute l'équipe NetBudget te souhaite une superbe année. Swipe à droite pour garder un conseil, à gauche pour le passer.`));

  // 2-6. Faits par âge selon le pays
  const byCountry: Record<string, C[]> = {
    FR: frFacts(age), BE: beFacts(age), CH: chFacts(age), CA: caFacts(age),
    MA: africaFacts(age, "MA"), SN: africaFacts(age, "SN"), CM: africaFacts(age, "CM"),
  };
  cards.push(...(byCountry[country] ?? []));

  // 7. Carte contextuelle (situation / lieu)
  if (profile.occupation === "self_employed") {
    cards.push(card("good", "💼", "Ton année d'indépendant", "Nouvelle année, mêmes réflexes : provisionne tes cotisations à chaque encaissement et surveille tes seuils dans l'app. Ton toi de décembre te remerciera."));
  } else if (profile.occupation === "student") {
    cards.push(card("good", "🎓", "Étudiant·e et malin·e", "Bourses, aides locales, tarifs jeunes, logement : à ton âge, des centaines d'euros d'aides existent. Le Coach NetBudget les connaît — vérifie que ton profil est à jour."));
  } else if (country === "FR" && profile.region) {
    const r = REGION_HIGHLIGHTS[profile.region];
    if (r) {
      cards.push(card("good", "📍", r.title, r.body, r.sources));
    } else {
      cards.push(card("good", "📍", "Ta région a des choses pour toi", `${profile.region} finance des aides que peu de gens réclament (transport, culture, formation). Le simulateur national les recense en 5 minutes.`, ["https://www.1jeune1solution.gouv.fr/mes-aides"]));
    }
  }

  // 8. Clôture
  cards.push(card("neutral", "🚀", "Ton année budget commence",
    "Un an de plus, de nouveaux objectifs : mets à jour ton profil Coach, fixe un objectif d'épargne pour l'année, et laisse NetBudget s'occuper du reste. Bonne année à toi !"));

  return cards.slice(0, 8);
}

// ============================================================================
// Anniversaire d'un ENFANT — vu du parent (France pour l'instant).
// ============================================================================
export function buildChildBirthdayCards(
  age: number,
  childName: string,
  profile: UserProfile,
): BirthdayCard[] {
  const cards: BirthdayCard[] = [];
  cards.push(card("gold", "🎂", `${childName} a ${age} ans !`,
    `Joyeux anniversaire à ${childName} de la part de NetBudget ! Swipe pour voir ce qui change côté budget et droits.`));

  const isFR = (profile.country ?? "FR") === "FR";
  if (isFR) {
    if (age === 3) cards.push(card("bad", "🍼", "Fin de la PAJE de base", "L'allocation de base de la PAJE s'arrête aux 3 ans de l'enfant, et le CMG (garde) change de règles à 3 ans aussi. Anticipe la bascule dans le budget garde/école.", ["https://www.caf.fr"]));
    if (age === 6) cards.push(card("good", "🎒", "L'ARS commence", "Dès 6 ans, l'allocation de rentrée scolaire est versée sous conditions de ressources, chaque fin août. Vérifie ton éligibilité sur caf.fr — c'est automatique si tu es allocataire.", ["https://www.service-public.gouv.fr/particuliers/vosdroits/F1878"]));
    if (age === 12) cards.push(card("good", "🏦", "Le Livret Jeune s'ouvre", `${childName} peut avoir un Livret Jeune : plafond 1 600 €, exonéré d'impôt. Une belle façon d'apprendre l'épargne — et d'y verser les étrennes.`, ["https://www.economie.gouv.fr"]));
    if (age === 16) cards.push(card("gold", "📋", "ARS : il faut maintenant la déclarer", "À partir de 16 ans, l'ARS n'est plus automatique : tu dois confirmer chaque rentrée que l'enfant est scolarisé ou apprenti sur caf.fr. Et l'apprentissage rémunéré devient possible.", ["https://www.caf.fr"]));
    if (age === 17) cards.push(card("good", "🎭", "50 € de pass Culture pour lui/elle", `${childName} peut activer son pass Culture : 50 € à 17 ans, cumulables avec les 150 € des 18 ans, valables jusqu'à la veille des 21 ans.`, ["https://pass.culture.fr/reforme-du-pass-culture"]));
    if (age === 18) cards.push(card("gold", "⚖️", "Rattachement ou indépendance fiscale ?", `${childName} est majeur : rattaché à ton foyer fiscal (quotient familial) ou détaché (pension alimentaire déductible, APL en son nom) ? Le bon choix dépend de vos revenus — fais les deux simulations.`, ["https://www.service-public.gouv.fr/particuliers/vosdroits/F3085"]));
    if (age === 20) cards.push(card("bad", "📉", "Fin des prestations familiales", `À 20 ans, ${childName} ne compte généralement plus pour tes prestations CAF. Recalcule le budget familial — et regarde le complément familial et les aides logement qui vont, eux, jusqu'à 21 ans.`, ["https://www.caf.fr/allocataires/aides-et-demarches/ma-situation/vie-personnelle/l-aine-de-mes-enfants-20-ans"]));
    if (age === 25) cards.push(card("bad", "🎓", "Fin du rattachement fiscal étudiant", `Dernière année possible de rattachement fiscal pour ${childName} (moins de 25 ans au 1er janvier, étudiant). Ensuite : déclaration séparée, et pension alimentaire déductible si tu l'aides.`, ["https://www.service-public.gouv.fr/particuliers/vosdroits/F3085"]));
  }
  if (cards.length === 1) {
    cards.push(card("good", "💝", "Une année de plus, un budget qui évolue", `Chaque âge de ${childName} change le budget familial : activités, école, équipement. Mets à jour la tranche d'âge dans ton profil Coach pour des conseils ajustés.`));
  }
  cards.push(card("neutral", "🎁", "Et si on épargnait pour plus tard ?", `Un objectif d'épargne au nom de ${childName} (études, permis, premier logement) transforme les anniversaires en capital. Crée-le dans Objectifs — même 20 €/mois font des milliers d'euros à 18 ans.`));
  return cards.slice(0, 8);
}

// ============================================================================
// Anniversaire d'un ANIMAL — budget vétérinaire, assurance, prévention.
// Chiffres assurance/budget : vérifiés 2026-07 (corpus animaux).
// ============================================================================
export function buildPetBirthdayCards(
  petName: string,
  species: "dog" | "cat" | "other",
): BirthdayCard[] {
  const cards: BirthdayCard[] = [];
  cards.push(card("gold", species === "dog" ? "🐶" : species === "cat" ? "🐱" : "🐾",
    `Joyeux anniversaire ${petName} !`,
    `Un an de plus pour ${petName} — l'occasion parfaite de faire le point sur son budget santé et bien-être.`));
  cards.push(card("good", "🩺", "Le bilan vétérinaire annuel", `L'anniversaire est un excellent rappel : vaccins, vermifuge, bilan de santé. Un contrôle annuel coûte bien moins cher qu'une pathologie découverte tard — et c'est le moment de vérifier que la puce d'identification est à jour.`));
  if (species === "dog") {
    cards.push(card("gold", "🛡️", "Assurance chien : le bon moment pour comparer", "En 2026, une assurance chien coûte en moyenne de 12 € (formule de base) à 44 € (premium) par mois. Plus l'animal vieillit, plus les primes montent et les exclusions s'accumulent — comparer maintenant peut figer de meilleures conditions.", ["https://www.moneyvox.fr/assurance/actualites/107615/combien-ca-coute-assurer-votre-chien-ou-votre-chat-en-2026"]));
  } else if (species === "cat") {
    cards.push(card("gold", "🛡️", "Assurance chat : de 9 à 35 €/mois", "Une assurance chat coûte en moyenne de 9 à 35 €/mois selon la couverture (budget annuel d'un chat : souvent 600 à 1 000 €). L'anniversaire est le bon rappel pour comparer — les primes grimpent avec l'âge.", ["https://www.moneyvox.fr/assurance/actualites/107615/combien-ca-coute-assurer-votre-chien-ou-votre-chat-en-2026"]));
  } else {
    cards.push(card("good", "🛡️", "Prévoir plutôt que subir", `Même pour ${petName}, une provision mensuelle dédiée (vétérinaire, alimentation, équipement) évite que les imprévus santé ne percutent le budget du foyer.`));
  }
  cards.push(card("neutral", "📊", "Une ligne budget à son nom", `Crée une ligne « ${petName} » dans tes dépenses : alimentation, vétérinaire, accessoires. Ce qu'on mesure, on le maîtrise — et les imprévus deviennent des provisions.`));
  return cards;
}
