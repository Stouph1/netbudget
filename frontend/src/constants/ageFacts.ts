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
};

type C = BirthdayCard;
const card = (tone: BirthdayTone, emoji: string, title: string, body: string): C =>
  ({ tone, emoji, title, body });

function frFacts(age: number): C[] {
  const out: C[] = [];
  if (age === 12) out.push(card("good", "🏦", "Le Livret Jeune s'ouvre à toi", "Dès 12 ans, tu peux avoir un Livret Jeune : plafond 1 600 €, intérêts exonérés d'impôt et taux au moins égal au Livret A. Le premier réflexe épargne."));
  if (age === 16) out.push(card("good", "💳", "Ton argent, tes retraits", "À 16 ans, tu peux retirer seul sur ton Livret Jeune (sauf opposition des parents) et avoir un vrai compte avec carte. L'apprentissage s'ouvre aussi — avec un salaire."));
  if (age === 17) out.push(card("good", "🎭", "50 € de pass Culture", "À 17 ans, le pass Culture crédite 50 € pour livres, ciné, concerts, jeux. Ils se cumulent avec le crédit des 18 ans et restent utilisables jusqu'à la veille de tes 21 ans."));
  if (age === 18) {
    out.push(card("gold", "🔓", "Majorité financière", "Crédit, découvert, tous moyens de paiement : tout devient possible — et engageant. Le pass Culture ajoute 150 €, et tu peux demander les APL à ton nom (attention : ça recalcule les aides de tes parents)."));
    out.push(card("good", "🚆", "Voyages malins", "La carte Avantage Jeune SNCF (12-27 ans) réduit de 30 % les TGV et Intercités. Si tu travailles, la prime d'activité peut compléter tes revenus dès 18 ans."));
  }
  if (age === 20) out.push(card("bad", "👨‍👩‍👧", "Le cap des 20 ans côté CAF", "À 20 ans, tu ne comptes généralement plus comme enfant à charge pour les prestations familiales de tes parents. Si tu vis encore chez eux, c'est le bon moment pour parler budget familial."));
  if (age === 21) out.push(card("bad", "⏳", "Dernière ligne droite pass Culture", "Tes crédits pass Culture expirent à la veille de tes 21 ans — dépense-les ! Et si tu n'es pas étudiant, le rattachement fiscal au foyer de tes parents s'arrête."));
  if (age === 25) out.push(card("good", "🛡️", "Le RSA devient accessible", "À 25 ans, le RSA s'ouvre sans les conditions restrictives des moins de 25 ans — un filet de sécurité à connaître. C'est aussi la dernière année du Livret Jeune et du rattachement fiscal étudiant."));
  if (age === 26 || age === 27) out.push(card("good", "🚄", "Profite encore des tarifs jeunes", "La carte Avantage Jeune SNCF marche jusqu'à la veille de tes 28 ans — plus longtemps que la plupart des tarifs jeunes. Vérifie aussi les bornes d'âge de tes transports régionaux."));
  if (age === 28) out.push(card("bad", "🎫", "Fin des tarifs jeunes SNCF", "La carte Avantage Jeune s'arrête à 28 ans. Compense en anticipant tes billets et en comparant les cartes Avantage adulte selon ta fréquence de voyage."));
  if (age === 30) out.push(card("bad", "🏠", "Visale change de règles", "La garantie locative gratuite Visale n'est plus automatique après 30 ans (conditions : CDD, mutation, période d'essai…). Si un déménagement se profile, c'est un paramètre à anticiper."));
  if (age >= 33 && age <= 36) out.push(card("gold", "🏡", "Emprunter sans questionnaire médical", "Loi Lemoine : pas de questionnaire de santé si la part assurée est ≤ 200 000 € ET que le prêt se termine avant tes 60 ans. Un prêt de 25 ans souscrit après 35 ans franchit cette limite — le calendrier compte."));
  if (age >= 50 && age <= 61) out.push(card("gold", "🧭", "La retraite se prépare maintenant", "Vérifie ton relevé de carrière sur info-retraite.fr (les erreurs sont fréquentes et corrigibles). L'âge légal dépend de ton année de naissance — la réforme est suspendue jusqu'en 2028, entre 62 ans 9 mois et 64 ans."));
  if (age >= 62 && age <= 66) out.push(card("gold", "🌅", "L'heure des choix", "Selon ton année de naissance, ton âge légal se situe entre 62 ans 9 mois et 64 ans (réforme suspendue). À 65 ans, l'ASPA garantit un minimum de ressources sous conditions. Fais tes simulations sur info-retraite.fr."));
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
    cards.push(card("good", "📍", "Ta région a des choses pour toi", `${profile.region} finance des aides que peu de gens réclament (transport, culture, formation). Jette un œil aux conseils régionaux du Coach.`));
  }

  // 8. Clôture
  cards.push(card("neutral", "🚀", "Ton année budget commence",
    "Un an de plus, de nouveaux objectifs : mets à jour ton profil Coach, fixe un objectif d'épargne pour l'année, et laisse NetBudget s'occuper du reste. Bonne année à toi !"));

  return cards.slice(0, 8);
}
