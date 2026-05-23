// Conseils personnalisés basés sur la regle du 50/30/20 (Elizabeth Warren)
// + regles classiques de gestion budgetaire France (HCSF, fond d'urgence, etc.).
//
// Les chaines passent par le t() (i18n) — chaque carte de conseil porte une cle
// de traduction (titleKey / messageKey) + des parametres optionnels.

export type AdviceTone = "good" | "warn" | "danger" | "info";

export type AdviceItem = {
  tone: AdviceTone;
  icon: string; // nom Feather
  titleKey: string;
  messageKey: string;
  params?: Record<string, string | number>;
};

export type AdviceInput = {
  netMensuel: number;
  rent: number;
  loansMonthly: number;
  besoinsExtra: number; // depenses besoins hors loyer/prets
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
      titleKey: "advice.noIncome.title",
      messageKey: "advice.noIncome.msg",
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
      titleKey: "advice.overspend.title",
      messageKey: "advice.overspend.msg",
    });
  }

  if (loansMonthly > 0 && loansPct > 35) {
    out.push({
      tone: "danger",
      icon: "credit-card",
      titleKey: "advice.debt35.title",
      messageKey: "advice.debt35.msg",
      params: { pct: Math.round(loansPct) },
    });
  } else if (loansMonthly > 0 && loansPct > 25) {
    out.push({
      tone: "warn",
      icon: "credit-card",
      titleKey: "advice.debt25.title",
      messageKey: "advice.debt25.msg",
      params: { pct: Math.round(loansPct) },
    });
  }

  // ----- Loyer -----
  if (rent > 0 && rentPct > 33) {
    out.push({
      tone: "warn",
      icon: "home",
      titleKey: "advice.rentHigh.title",
      messageKey: "advice.rentHigh.msg",
      params: { pct: Math.round(rentPct) },
    });
  } else if (rent > 0 && rentPct < 20) {
    out.push({
      tone: "good",
      icon: "home",
      titleKey: "advice.rentOk.title",
      messageKey: "advice.rentOk.msg",
      params: { pct: Math.round(rentPct) },
    });
  }

  // ----- Regle 50/30/20 : Besoins -----
  if (besoinsPct > 60) {
    out.push({
      tone: "danger",
      icon: "shield",
      titleKey: "advice.needsCrit.title",
      messageKey: "advice.needsCrit.msg",
      params: { pct: Math.round(besoinsPct) },
    });
  } else if (besoinsPct > 55) {
    out.push({
      tone: "warn",
      icon: "shield",
      titleKey: "advice.needsHigh.title",
      messageKey: "advice.needsHigh.msg",
      params: { pct: Math.round(besoinsPct), gap: Math.round(besoinsPct - 50) },
    });
  } else if (besoinsPct > 0 && besoinsPct <= 50) {
    out.push({
      tone: "good",
      icon: "check-circle",
      titleKey: "advice.needsOk.title",
      messageKey: "advice.needsOk.msg",
      params: { pct: Math.round(besoinsPct) },
    });
  }

  // ----- Regle 50/30/20 : Loisirs -----
  if (loisirsPct > 40) {
    out.push({
      tone: "warn",
      icon: "music",
      titleKey: "advice.wantsHigh.title",
      messageKey: "advice.wantsHigh.msg",
      params: { pct: Math.round(loisirsPct) },
    });
  } else if (loisirsPct > 35) {
    out.push({
      tone: "info",
      icon: "music",
      titleKey: "advice.wantsBitHigh.title",
      messageKey: "advice.wantsBitHigh.msg",
      params: { pct: Math.round(loisirsPct) },
    });
  } else if (loisirs === 0 && netMensuel > 0) {
    out.push({
      tone: "info",
      icon: "smile",
      titleKey: "advice.noWants.title",
      messageKey: "advice.noWants.msg",
    });
  }

  // ----- Regle 50/30/20 : Epargne -----
  if (epargnePct < 5 && netMensuel > 0 && remaining >= 0) {
    out.push({
      tone: "danger",
      icon: "trending-up",
      titleKey: "advice.noSavings.title",
      messageKey: "advice.noSavings.msg",
    });
  } else if (epargnePct < 10) {
    out.push({
      tone: "warn",
      icon: "trending-up",
      titleKey: "advice.lowSavings.title",
      messageKey: "advice.lowSavings.msg",
      params: { pct: Math.round(epargnePct) },
    });
  } else if (epargnePct < 20) {
    out.push({
      tone: "warn",
      icon: "trending-up",
      titleKey: "advice.savingsBuilding.title",
      messageKey: "advice.savingsBuilding.msg",
      params: { pct: Math.round(epargnePct) },
    });
  } else if (epargnePct >= 20 && epargnePct < 30) {
    out.push({
      tone: "good",
      icon: "award",
      titleKey: "advice.goodSavings.title",
      messageKey: "advice.goodSavings.msg",
      params: { pct: Math.round(epargnePct) },
    });
  } else if (epargnePct >= 30) {
    out.push({
      tone: "good",
      icon: "award",
      titleKey: "advice.maxSavings.title",
      messageKey: "advice.maxSavings.msg",
      params: { pct: Math.round(epargnePct) },
    });
  }

  // ----- Conseils cibles -----
  if (remaining > 0 && epargne === 0 && netMensuel > 0) {
    out.push({
      tone: "info",
      icon: "info",
      titleKey: "advice.captureMargin.title",
      messageKey: "advice.captureMargin.msg",
      params: { pct: Math.round(restePct) },
    });
  }

  if (besoinsExtra > 0 && besoinsExtra / netMensuel > 0.25) {
    out.push({
      tone: "warn",
      icon: "tool",
      titleKey: "advice.fixedExpenses.title",
      messageKey: "advice.fixedExpenses.msg",
      params: { pct: Math.round((besoinsExtra / netMensuel) * 100) },
    });
  }

  if (loansMonthly > 0 && rent > 0) {
    out.push({
      tone: "info",
      icon: "info",
      titleKey: "advice.rentLoan.title",
      messageKey: "advice.rentLoan.msg",
    });
  }

  if (totalSpent > 0 && totalSpent < netMensuel * 0.5) {
    out.push({
      tone: "info",
      icon: "info",
      titleKey: "advice.lowExpenses.title",
      messageKey: "advice.lowExpenses.msg",
    });
  }

  if (epargnePct >= 20 && (rent === 0 || rentPct < 25) && remaining > 0) {
    out.push({
      tone: "info",
      icon: "trending-up",
      titleKey: "advice.investProfile.title",
      messageKey: "advice.investProfile.msg",
    });
  }

  // Fond d'urgence
  if (epargne > 0 && netMensuel > 0) {
    const monthsCovered = epargne === 0 ? 0 : Math.round((epargne * 12) / Math.max(besoinsTotal, 1));
    if (monthsCovered < 3 && besoinsTotal > 0) {
      out.push({
        tone: "info",
        icon: "umbrella",
        titleKey: "advice.emergency.title",
        messageKey: "advice.emergency.msg",
      });
    }
  }

  // Tip general si tout va bien
  if (besoinsPct <= 50 && loisirsPct <= 30 && epargnePct >= 20 && remaining >= 0) {
    out.push({
      tone: "good",
      icon: "star",
      titleKey: "advice.perfect.title",
      messageKey: "advice.perfect.msg",
    });
  }

  if (out.length === 0) {
    out.push({
      tone: "info",
      icon: "info",
      titleKey: "advice.notEnoughData.title",
      messageKey: "advice.notEnoughData.msg",
    });
  }

  return out;
}

// ----- helpers -----

function pct(value: number, ref: number): number {
  if (!ref || ref <= 0) return 0;
  return (value / ref) * 100;
}

// Remplace {key} dans le template par params[key].
export function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_match, key) => {
    const v = params[key];
    return v === undefined || v === null ? `{${key}}` : String(v);
  });
}
