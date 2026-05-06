// Conseils personnalisés basés sur la règle du 50/30/20 (Elizabeth Warren)
// + règles classiques de gestion budgétaire France (HCSF, fond d'urgence, etc.).

export type AdviceTone = "good" | "warn" | "danger" | "info";

export type AdviceItem = {
  tone: AdviceTone;
  icon: string; // nom Feather
  title: string;
  message: string;
};

export type AdviceInput = {
  netMensuel: number;
  rent: number;
  loansMonthly: number;
  besoinsExtra: number; // dépenses besoins hors loyer/prêts
  loisirs: number;
  epargne: number;
  remaining: number;
};

export function buildAdvice(input: AdviceInput): AdviceItem[] {
  const { netMensuel, rent, loansMonthly, besoinsExtra, loisirs, epargne, remaining } = input;
  const out: AdviceItem[] = [];

  if (netMensuel <= 0) {
    out.push({
      tone: "info",
      icon: "info",
      title: "Saisis tes revenus",
      message:
        "Renseigne ton salaire et tes dépenses pour obtenir des conseils personnalisés basés sur la règle 50/30/20.",
    });
    return out;
  }

  const besoinsTotal = rent + loansMonthly + besoinsExtra;
  const totalSpent = besoinsTotal + loisirs + epargne;
  const besoinsPct = pct(besoinsTotal, netMensuel);
  const loisirsPct = pct(loisirs, netMensuel);
  const epargnePct = pct(epargne, netMensuel);
  const restePct = pct(remaining, netMensuel);
  const rentPct = pct(rent, netMensuel);
  const loansPct = pct(loansMonthly, netMensuel);

  // ----- Alertes critiques -----
  if (remaining < 0) {
    out.push({
      tone: "danger",
      icon: "alert-triangle",
      title: "Tu dépenses plus que tu ne gagnes",
      message:
        "Tes dépenses dépassent ton net mensuel. Coupe d'abord les abonnements non essentiels, puis renégocie les charges (énergie, mutuelle, banque) avant que la dette s'installe.",
    });
  }

  if (loansMonthly > 0 && loansPct > 35) {
    out.push({
      tone: "danger",
      icon: "credit-card",
      title: "Endettement au-dessus de 35 %",
      message: `Tes mensualités de prêt représentent ${Math.round(
        loansPct
      )} % de ton net. Le HCSF (Banque de France) fixe le seuil de surendettement à 35 % — au-delà, prudence et anticipe un refinancement.`,
    });
  } else if (loansMonthly > 0 && loansPct > 25) {
    out.push({
      tone: "warn",
      icon: "credit-card",
      title: "Endettement à surveiller",
      message: `Tes mensualités sont à ${Math.round(
        loansPct
      )} %. Tu approches de la zone risquée (35 %). Évite tout nouveau crédit avant un solde positif robuste.`,
    });
  }

  // ----- Loyer -----
  if (rent > 0 && rentPct > 33) {
    out.push({
      tone: "warn",
      icon: "home",
      title: "Loyer élevé",
      message: `Ton loyer pèse ${Math.round(
        rentPct
      )} % de ton net. La règle classique du 1/3 conseille de rester sous 33 %. Pense colocation, déménagement ou négociation de l'augmentation annuelle.`,
    });
  } else if (rent > 0 && rentPct < 20) {
    out.push({
      tone: "good",
      icon: "home",
      title: "Loyer maîtrisé",
      message: `Ton loyer ne représente que ${Math.round(
        rentPct
      )} % de ton net — excellente marge pour épargner ou investir.`,
    });
  }

  // ----- Règle 50/30/20 : Besoins -----
  if (besoinsPct > 60) {
    out.push({
      tone: "danger",
      icon: "shield",
      title: "Besoins critiques",
      message: `Tes besoins fixes (loyer + prêts + dépenses contraintes) montent à ${Math.round(
        besoinsPct
      )} % de ton net. Au-dessus de 60 %, la marge de manœuvre disparaît. Renégocie d'abord les contrats récurrents (assurances, mutuelle, énergie, télécoms).`,
    });
  } else if (besoinsPct > 55) {
    out.push({
      tone: "warn",
      icon: "shield",
      title: "Besoins au-dessus de 50 %",
      message: `Tes besoins représentent ${Math.round(
        besoinsPct
      )} % de ton net. La règle 50/30/20 vise 50 %. Cibler ${formatPct(
        besoinsPct - 50
      )} de réduction libère directement de l'épargne.`,
    });
  } else if (besoinsPct > 0 && besoinsPct <= 50) {
    out.push({
      tone: "good",
      icon: "check-circle",
      title: "Besoins maîtrisés",
      message: `Tes besoins sont à ${Math.round(
        besoinsPct
      )} % — sous le seuil 50 % de la règle 50/30/20. Bonne base pour épargner.`,
    });
  }

  // ----- Règle 50/30/20 : Loisirs -----
  if (loisirsPct > 40) {
    out.push({
      tone: "warn",
      icon: "music",
      title: "Loisirs très élevés",
      message: `Tu mets ${Math.round(
        loisirsPct
      )} % en loisirs (vs 30 % recommandés). Quelques restos en moins peuvent libérer plusieurs centaines d'euros pour épargner ou investir.`,
    });
  } else if (loisirsPct > 35) {
    out.push({
      tone: "info",
      icon: "music",
      title: "Loisirs un peu hauts",
      message: `Tu es à ${Math.round(
        loisirsPct
      )} % de loisirs. Légèrement au-dessus du seuil 30 %, rien d'alarmant tant que l'épargne avance.`,
    });
  } else if (loisirs === 0 && netMensuel > 0) {
    out.push({
      tone: "info",
      icon: "smile",
      title: "Aucun loisir déclaré",
      message:
        "Aucun budget loisirs ? Pense à t'accorder une enveloppe « plaisir » : un budget équilibré tient sur la durée parce qu'il est vivable.",
    });
  }

  // ----- Règle 50/30/20 : Épargne -----
  if (epargnePct < 5 && netMensuel > 0 && remaining >= 0) {
    out.push({
      tone: "danger",
      icon: "trending-up",
      title: "Pas d'épargne",
      message:
        "Tu épargnes presque rien. Mets en place dès ce mois-ci un virement automatique vers un Livret A (taux 3 %, disponible) — même 50 € / mois, le but c'est l'habitude.",
    });
  } else if (epargnePct < 10) {
    out.push({
      tone: "warn",
      icon: "trending-up",
      title: "Épargne faible",
      message: `Tu épargnes ${Math.round(
        epargnePct
      )} % de ton net. L'objectif 50/30/20 vise 20 %. Étape 1 : constituer un fond d'urgence de 3 à 6 mois de dépenses sur livrets.`,
    });
  } else if (epargnePct < 20) {
    out.push({
      tone: "warn",
      icon: "trending-up",
      title: "Épargne en construction",
      message: `Tu épargnes ${Math.round(
        epargnePct
      )} %. Pour atteindre 20 %, automatise un virement en début de mois — ce que tu ne vois pas, tu ne le dépenses pas.`,
    });
  } else if (epargnePct >= 20 && epargnePct < 30) {
    out.push({
      tone: "good",
      icon: "award",
      title: "Excellente épargne",
      message: `Tu épargnes ${Math.round(
        epargnePct
      )} % — au-dessus du seuil 20 %. Diversifie : Livret A pour la sécurité, PEA / CTO pour la croissance long terme.`,
    });
  } else if (epargnePct >= 30) {
    out.push({
      tone: "good",
      icon: "award",
      title: "Épargne maximale",
      message: `Tu épargnes ${Math.round(
        epargnePct
      )} % de ton net — c'est rare. Pense long terme : PER (défiscalisation), assurance vie, immobilier locatif.`,
    });
  }

  // ----- Conseils ciblés -----
  if (remaining > 0 && epargne === 0 && netMensuel > 0) {
    out.push({
      tone: "info",
      icon: "info",
      title: "Tu as une marge — capture-la",
      message: `Il te reste ${Math.round(
        restePct
      )} % à la fin du mois mais aucune épargne déclarée. Sans automatisation, l'argent disparaît dans des dépenses non-essentielles. Programme un virement.`,
    });
  }

  if (besoinsExtra > 0 && besoinsExtra / netMensuel > 0.25) {
    out.push({
      tone: "warn",
      icon: "tool",
      title: "Dépenses fixes hors logement",
      message: `Tes dépenses « besoins » hors loyer/prêts représentent ${Math.round(
        (besoinsExtra / netMensuel) * 100
      )} % de ton net. Faire le tour des contrats (énergie, télécom, assurances) une fois par an récupère facilement 30 à 80 € / mois.`,
    });
  }

  if (loansMonthly > 0 && rent > 0) {
    out.push({
      tone: "info",
      icon: "info",
      title: "Tu cumules loyer et crédit",
      message:
        "Avoir loyer + crédit en parallèle est lourd. Si le crédit concerne un bien que tu n'occupes pas, vérifie que les loyers perçus couvrent au moins la mensualité.",
    });
  }

  if (totalSpent > 0 && totalSpent < netMensuel * 0.5) {
    out.push({
      tone: "info",
      icon: "info",
      title: "Pense aux dépenses oubliées",
      message:
        "Tes dépenses semblent très faibles par rapport à ton revenu. Vérifie que tu as bien renseigné les abonnements, les courses, l'énergie — un budget sous-estimé donne de faux conseils.",
    });
  }

  if (epargnePct >= 20 && (rent === 0 || rentPct < 25) && remaining > 0) {
    out.push({
      tone: "info",
      icon: "trending-up",
      title: "Profil propice à l'investissement",
      message:
        "Avec ton excédent et un coût de logement contenu, tu peux passer à l'étape suivante : DCA mensuel sur un ETF World via PEA, ou simulation d'investissement locatif.",
    });
  }

  // Fond d'urgence
  if (epargne > 0 && netMensuel > 0) {
    const monthsCovered = epargne === 0 ? 0 : Math.round((epargne * 12) / Math.max(besoinsTotal, 1));
    if (monthsCovered < 3 && besoinsTotal > 0) {
      out.push({
        tone: "info",
        icon: "umbrella",
        title: "Constitue un fond d'urgence",
        message:
          "Vise 3 à 6 mois de dépenses fixes sur livrets liquides (Livret A, LDDS) avant d'investir en bourse. C'est ton airbag financier.",
      });
    }
  }

  // Tip général si tout va bien
  if (besoinsPct <= 50 && loisirsPct <= 30 && epargnePct >= 20 && remaining >= 0) {
    out.push({
      tone: "good",
      icon: "star",
      title: "Budget exemplaire",
      message:
        "Tu coches les 3 cases du 50/30/20 (50/30/20) et tu n'es pas en dépassement. Continue ainsi et pense à faire travailler ton épargne (PEA, AV, immobilier).",
    });
  }

  if (out.length === 0) {
    out.push({
      tone: "info",
      icon: "info",
      title: "Pas encore assez de données",
      message:
        "Renseigne plus de catégories pour obtenir des conseils ciblés.",
    });
  }

  return out;
}

// ----- helpers -----

function pct(value: number, ref: number): number {
  if (!ref || ref <= 0) return 0;
  return (value / ref) * 100;
}

function formatPct(value: number): string {
  return `${Math.round(value)} pts`;
}
