// Conseils personnalisés basés sur la règle du 50/30/20 (Elizabeth Warren).
// Besoins ≤ 50 %, Loisirs ≤ 30 %, Épargne ≥ 20 % du revenu net.

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
        "Renseigne ton salaire pour obtenir des conseils personnalisés basés sur la règle 50/30/20.",
    });
    return out;
  }

  const besoinsTotal = rent + loansMonthly + besoinsExtra;
  const besoinsPct = (besoinsTotal / netMensuel) * 100;
  const loisirsPct = (loisirs / netMensuel) * 100;
  const epargnePct = (epargne / netMensuel) * 100;

  if (remaining < 0) {
    out.push({
      tone: "danger",
      icon: "alert-triangle",
      title: "Tu es en dépassement",
      message: `Tes dépenses dépassent ton net mensuel. Réduis une catégorie ou augmente tes revenus avant que la dette s'installe.`,
    });
  }

  if (rent > 0 && rent / netMensuel > 0.33) {
    out.push({
      tone: "warn",
      icon: "home",
      title: "Loyer élevé",
      message: `Ton loyer pèse ${Math.round(
        (rent / netMensuel) * 100
      )} % de ton net. Idéalement on reste sous 33 % — pense à renégocier ou changer de logement.`,
    });
  }

  if (loansMonthly > 0 && loansMonthly / netMensuel > 0.33) {
    out.push({
      tone: "danger",
      icon: "credit-card",
      title: "Endettement à surveiller",
      message: `Tes mensualités de prêt sont à ${Math.round(
        (loansMonthly / netMensuel) * 100
      )} %. Le seuil de surendettement HCSF est fixé à 35 % — au-delà, prudence.`,
    });
  }

  if (besoinsPct > 55) {
    out.push({
      tone: "warn",
      icon: "shield",
      title: "Besoins au-dessus de 50 %",
      message: `Tes besoins (loyer + prêts + dépenses fixes) représentent ${Math.round(
        besoinsPct
      )} % de ton net. La règle 50/30/20 vise 50 %. Renégocier mutuelle, énergie ou abonnements peut libérer ${formatPct(
        besoinsPct - 50
      )} de marge.`,
    });
  } else if (besoinsPct > 0 && besoinsPct <= 50) {
    out.push({
      tone: "good",
      icon: "check-circle",
      title: "Besoins maîtrisés",
      message: `Tes besoins sont à ${Math.round(
        besoinsPct
      )} % — sous le seuil 50 %. Bonne base pour épargner.`,
    });
  }

  if (loisirsPct > 35) {
    out.push({
      tone: "warn",
      icon: "music",
      title: "Loisirs au-dessus de 30 %",
      message: `Tu mets ${Math.round(
        loisirsPct
      )} % en loisirs. La règle vise 30 % — un peu de marge à récupérer pour booster l'épargne.`,
    });
  }

  if (epargnePct < 10 && netMensuel > 0) {
    out.push({
      tone: "danger",
      icon: "trending-up",
      title: "Épargne insuffisante",
      message: `Tu n'épargnes que ${Math.round(
        epargnePct
      )} % de ton net. Vise au moins 20 % pour bâtir un matelas (3 à 6 mois de dépenses) avant d'investir.`,
    });
  } else if (epargnePct < 20 && epargnePct >= 10) {
    out.push({
      tone: "warn",
      icon: "trending-up",
      title: "Épargne en construction",
      message: `Tu épargnes ${Math.round(
        epargnePct
      )} %. Pour atteindre la cible 20 %, mets en place un virement automatique en début de mois.`,
    });
  } else if (epargnePct >= 20) {
    out.push({
      tone: "good",
      icon: "award",
      title: "Excellente épargne",
      message: `Tu épargnes ${Math.round(
        epargnePct
      )} % — au-dessus du seuil 20 % de la règle 50/30/20. Pense à diversifier (Livret A, PEA, AV) si ce n'est pas déjà fait.`,
    });
  }

  if (remaining >= 0 && epargne === 0 && netMensuel > 0) {
    out.push({
      tone: "info",
      icon: "info",
      title: "Pense à ouvrir une épargne",
      message:
        "Tu as un reste à vivre positif mais aucune épargne déclarée. Un virement automatique de 50 à 100 € par mois suffit pour démarrer.",
    });
  }

  return out;
}

function formatPct(value: number): string {
  return `${Math.round(value)} pts`;
}
