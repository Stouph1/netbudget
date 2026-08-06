// Cartes d'anniversaire : « voici ce qui change pour toi à X ans ».
// Faits VÉRIFIÉS (recherche 2026-08-06, sources service-public.gouv.fr,
// caf.fr, pass.culture.fr, sncf-connect, visale.fr — voir corpus docs/).
// Règles d'âge stables ; les montants volatils sont formulés prudemment.
// France uniquement pour l'instant (public cible francophone).

import type { UserProfile } from "../types/advice";

export type BirthdayCard = {
  emoji: string;
  title: string;
  body: string;
};

export function buildBirthdayCards(
  age: number,
  firstName: string | null,
  profile: UserProfile,
): BirthdayCard[] {
  const name = firstName?.trim() || "toi";
  const cards: BirthdayCard[] = [];

  // 1. La carte d'ouverture
  cards.push({
    emoji: "🎂",
    title: `Joyeux anniversaire ${name} !`,
    body: `${age} ans aujourd'hui — toute l'équipe NetBudget te souhaite une superbe année. Swipe pour découvrir ce qui change pour toi côté budget et droits.`,
  });

  // 2-6. Faits par âge (France)
  const isFR = (profile.country ?? "FR") === "FR";
  if (isFR) {
    if (age === 12) {
      cards.push({ emoji: "🏦", title: "Le Livret Jeune s'ouvre à toi", body: "Dès 12 ans, tu peux avoir un Livret Jeune : plafond 1 600 €, intérêts exonérés d'impôt et taux au moins égal au Livret A. Le premier réflexe épargne." });
    }
    if (age === 16) {
      cards.push({ emoji: "💳", title: "Ton argent, tes retraits", body: "À 16 ans, tu peux retirer seul sur ton Livret Jeune (sauf opposition des parents) et avoir un vrai compte avec carte. L'apprentissage s'ouvre aussi — avec un salaire." });
    }
    if (age === 17) {
      cards.push({ emoji: "🎭", title: "50 € de pass Culture", body: "À 17 ans, le pass Culture crédite 50 € pour livres, ciné, concerts, jeux. Ils se cumulent avec le crédit des 18 ans et restent utilisables jusqu'à la veille de tes 21 ans." });
    }
    if (age === 18) {
      cards.push({ emoji: "🔓", title: "Majorité financière", body: "Crédit, découvert, tous moyens de paiement : tout devient possible — et engageant. Le pass Culture ajoute 150 €, et tu peux demander les APL à ton nom (attention : ça recalcule les aides de tes parents)." });
      cards.push({ emoji: "🚆", title: "Voyages malins", body: "La carte Avantage Jeune SNCF (12-27 ans) réduit de 30 % les TGV et Intercités. Si tu travailles, la prime d'activité peut compléter tes revenus dès 18 ans." });
    }
    if (age === 20) {
      cards.push({ emoji: "👨‍👩‍👧", title: "Le cap des 20 ans côté CAF", body: "À 20 ans, tu ne comptes généralement plus comme enfant à charge pour les prestations familiales de tes parents. Si tu vis encore chez eux, c'est le bon moment pour parler budget familial." });
    }
    if (age === 21) {
      cards.push({ emoji: "⏳", title: "Dernière ligne droite pass Culture", body: "Tes crédits pass Culture expirent à la veille de tes 21 ans — dépense-les ! Et si tu n'es pas étudiant, le rattachement fiscal au foyer de tes parents s'arrête." });
    }
    if (age === 25) {
      cards.push({ emoji: "🛡️", title: "Le RSA devient accessible", body: "À 25 ans, le RSA s'ouvre sans les conditions restrictives des moins de 25 ans — un filet de sécurité à connaître. C'est aussi la dernière année du Livret Jeune et du rattachement fiscal étudiant." });
    }
    if (age === 26 || age === 27) {
      cards.push({ emoji: "🚄", title: "Profite encore des tarifs jeunes", body: "La carte Avantage Jeune SNCF marche jusqu'à la veille de tes 28 ans — plus longtemps que la plupart des tarifs jeunes. Vérifie aussi les bornes d'âge de tes transports régionaux." });
    }
    if (age === 28) {
      cards.push({ emoji: "🎫", title: "Fin des tarifs jeunes SNCF", body: "La carte Avantage Jeune s'arrête à 28 ans. Compense en anticipant tes billets et en comparant cartes Avantage adulte selon ta fréquence de voyage." });
    }
    if (age === 30) {
      cards.push({ emoji: "🏠", title: "Visale change de règles", body: "La garantie locative gratuite Visale n'est plus automatique après 30 ans (conditions : CDD, mutation, période d'essai…). Si un déménagement se profile, c'est un paramètre à anticiper." });
    }
    if (age >= 33 && age <= 36) {
      cards.push({ emoji: "🏡", title: "Emprunter sans questionnaire médical", body: "Loi Lemoine : pas de questionnaire de santé si la part assurée est ≤ 200 000 € ET que le prêt se termine avant tes 60 ans. Un prêt de 25 ans souscrit après 35 ans franchit cette limite — le calendrier compte." });
    }
    if (age >= 50 && age <= 61) {
      cards.push({ emoji: "🧭", title: "La retraite se prépare maintenant", body: "Vérifie ton relevé de carrière sur info-retraite.fr (les erreurs sont fréquentes et corrigibles). L'âge légal dépend de ton année de naissance — la réforme est suspendue jusqu'en 2028, entre 62 ans 9 mois et 64 ans." });
    }
    if (age >= 62 && age <= 66) {
      cards.push({ emoji: "🌅", title: "L'heure des choix", body: "Selon ton année de naissance, ton âge légal se situe entre 62 ans 9 mois et 64 ans (réforme suspendue). À 65 ans, l'ASPA garantit un minimum de ressources sous conditions. Fais tes simulations sur info-retraite.fr." });
    }
  }

  // 7. Carte contextuelle (lieu / situation)
  if (profile.occupation === "self_employed") {
    cards.push({ emoji: "💼", title: "Ton année d'indépendant", body: "Nouvelle année, mêmes réflexes : provisionne tes cotisations à chaque encaissement et surveille tes seuils de CA et de TVA dans l'app. Ton toi de décembre te remerciera." });
  } else if (profile.occupation === "student") {
    cards.push({ emoji: "🎓", title: "Étudiant·e et malin·e", body: "Bourses, aides régionales, tarifs jeunes, APL : à ton âge, des centaines d'euros d'aides existent. Le Coach NetBudget les connaît — vérifie que ton profil est à jour pour ne rien rater." });
  } else if ((profile.country ?? "FR") === "FR" && profile.region) {
    cards.push({ emoji: "📍", title: `Ta région a des choses pour toi`, body: `${profile.region} finance des aides que peu de gens réclament (transport, culture, formation). Jette un œil aux conseils régionaux du Coach — c'est souvent un dossier en ligne et c'est tout.` });
  }

  // 8. La carte de clôture
  cards.push({
    emoji: "🚀",
    title: "Ton année budget commence",
    body: "Un an de plus, de nouveaux objectifs : mets à jour ton profil Coach, fixe un objectif d'épargne pour l'année, et laisse NetBudget s'occuper du reste. Bonne année à toi !",
  });

  return cards.slice(0, 8);
}
