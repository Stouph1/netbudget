// Génère du HTML stylisé prêt à être imprimé en PDF par expo-print.
// Format : rapport complet (A4-like) avec totaux + table + conseils.

import type { AdviceItem } from "./advice";
import { interpolate } from "./advice";
import { CurrencyCode, formatCurrency } from "./currency";

export type PdfIncome = { label: string; net: number };
export type PdfItem = { label: string; amount: number; period?: string };
export type PdfFamily = { key: string; label: string; total: number; items: PdfItem[] };
export type PdfMonth = { name: string; income: number; expenses: number; remaining: number; current: boolean };

export type PdfData = {
  /** Date d'édition, déjà formatée dans la langue de l'app. */
  date?: string;
  /** Périmètre : « Perso » ou le nom de l'espace partagé. */
  scopeLabel?: string;
  incomes?: PdfIncome[];
  families?: PdfFamily[];
  months?: PdfMonth[];
  cityName: string;
  cityRegion: string;
  cityIndex: number;
  netMensuel: number;
  brutAnnuel: number;
  rent: number;
  loansMonthly: number;
  besoins: number;
  loisirs: number;
  epargne: number;
  totalExpenses: number;
  remaining: number;
  advice: AdviceItem[];
  currency: CurrencyCode;
  t: (key: string) => string; // fonction de traduction injectee depuis l'app
};

// Couleurs lisibles sur fond clair
const TONE_COLORS = {
  good: "#047857",   // vert foncé
  warn: "#B45309",   // orange foncé
  danger: "#B91C1C", // rouge foncé
  info: "#1E40AF",   // bleu foncé
};

// ============================================================
// Rapport complet
// ============================================================

export function generatePdfHtml(d: PdfData): string {
  const fmt = (v: number) => formatCurrency(v, d.currency);
  const t = d.t;
  const restColor = d.remaining >= 0 ? TONE_COLORS.good : TONE_COLORS.danger;
  const restBg = d.remaining >= 0 ? "#ECFDF5" : "#FEF2F2";
  const monthlyExpenses = d.rent + d.loansMonthly + d.totalExpenses;

  const adviceHtml = d.advice
    .map((a) => {
      const accent = TONE_COLORS[a.tone] ?? TONE_COLORS.info;
      return `
        <div class="advice" style="border-left:3px solid ${accent};background:${tintForTone(a.tone)}">
          <div class="advice-title" style="color:${accent}">${escapeHtml(t(a.titleKey))}</div>
          <div class="advice-msg">${escapeHtml(interpolate(t(a.messageKey), a.params))}</div>
        </div>`;
    })
    .join("");

  const incomes = (d.incomes ?? []).filter((i) => i.net > 0);
  const incomesHtml = incomes.length
    ? `<table>
        <thead><tr><th>${escapeHtml(t("pdf.incomes"))}</th><th class="amount">${escapeHtml(t("summary.netMonthlyEst"))}</th></tr></thead>
        <tbody>
          ${incomes.map((i) => `<tr><td>${escapeHtml(i.label)}</td><td class="amount">${escapeHtml(fmt(i.net))}</td></tr>`).join("")}
          <tr class="total"><td>${escapeHtml(t("summary.netMonthlyEst"))}</td><td class="amount">${escapeHtml(fmt(d.netMensuel))}</td></tr>
        </tbody>
      </table>`
    : "";

  // Le détail : loyer et prêts d'abord, puis chaque famille avec ses postes
  // renseignés. Un poste à zéro n'a rien à dire sur un rapport.
  const fixedRows = [
    d.rent > 0 ? `<tr><td>${escapeHtml(t("donut.rent"))}</td><td class="amount">${escapeHtml(fmt(d.rent))}</td></tr>` : "",
    d.loansMonthly > 0 ? `<tr><td>${escapeHtml(t("pdf.loansMonthly"))}</td><td class="amount">${escapeHtml(fmt(d.loansMonthly))}</td></tr>` : "",
  ].join("");
  const familiesHtml = (d.families ?? [])
    .map((f) => {
      const items = f.items.filter((it) => it.amount > 0);
      if (items.length === 0 && f.total <= 0) return "";
      return `
        <tr class="family"><td>${escapeHtml(f.label)}</td><td class="amount">${escapeHtml(fmt(f.total))}</td></tr>
        ${items
          .map(
            (it) =>
              `<tr class="item"><td>${escapeHtml(it.label)}${it.period ? `<span class="period">${escapeHtml(it.period)}</span>` : ""}</td><td class="amount">${escapeHtml(fmt(it.amount))}</td></tr>`,
          )
          .join("")}`;
    })
    .join("");
  const detailHtml = `<table>
      <thead><tr><th>${escapeHtml(t("pdf.detail"))}</th><th class="amount">${escapeHtml(t("pdf.amount"))}</th></tr></thead>
      <tbody>
        ${fixedRows}
        ${familiesHtml}
        <tr class="total"><td>${escapeHtml(t("pdf.totalExpenses"))}</td><td class="amount">${escapeHtml(fmt(monthlyExpenses))}</td></tr>
      </tbody>
    </table>`;

  const months = d.months ?? [];
  const monthsHtml = months.length
    ? `<div class="section-title">${escapeHtml(t("section.monthly.title"))}</div>
      <table class="months">
        <thead><tr>
          <th>${escapeHtml(t("monthly.col.month"))}</th>
          <th class="amount">${escapeHtml(t("monthly.col.income"))}</th>
          <th class="amount">${escapeHtml(t("monthly.col.expenses"))}</th>
          <th class="amount">${escapeHtml(t("monthly.col.remaining"))}</th>
        </tr></thead>
        <tbody>
          ${months
            .map(
              (m) => `<tr class="${m.current ? "current" : ""}">
                <td>${escapeHtml(m.name)}</td>
                <td class="amount">${escapeHtml(fmt(m.income))}</td>
                <td class="amount muted">${escapeHtml(fmt(m.expenses))}</td>
                <td class="amount" style="color:${m.remaining >= 0 ? TONE_COLORS.good : TONE_COLORS.danger}">${escapeHtml(fmt(m.remaining))}</td>
              </tr>`,
            )
            .join("")}
          <tr class="total">
            <td>${escapeHtml(t("monthly.total.annual"))}</td>
            <td class="amount">${escapeHtml(fmt(months.reduce((s, m) => s + m.income, 0)))}</td>
            <td class="amount">${escapeHtml(fmt(months.reduce((s, m) => s + m.expenses, 0)))}</td>
            <td class="amount">${escapeHtml(fmt(months.reduce((s, m) => s + m.remaining, 0)))}</td>
          </tr>
        </tbody>
      </table>`
    : "";

  const meta = [d.scopeLabel, d.date ? interpolate(t("pdf.generatedOn"), { date: d.date }) : ""]
    .filter(Boolean)
    .map((x) => escapeHtml(String(x)))
    .join(" · ");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>NETbudget — ${escapeHtml(d.cityName)}</title>
<style>
  * { box-sizing: border-box; }
  @page { margin: 18mm 16mm; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif; margin: 0; padding: 0; background: #FFFFFF; color: #111827; font-size: 12px; }
  .top { display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 12px; border-bottom: 2px solid #0F172A; margin-bottom: 20px; }
  .brand { font-size: 20px; font-weight: 800; letter-spacing: -0.5px; color: #0F172A; }
  .brand span { color: #059669; }
  .meta { color: #6B7280; font-size: 11px; text-align: right; line-height: 1.5; }
  h1 { font-size: 15px; margin: 0; color: #374151; font-weight: 600; }
  .hero { display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: 10px; margin-bottom: 22px; }
  .hero .main { background: ${restBg}; border: 1px solid ${restColor}33; border-radius: 12px; padding: 16px 18px; }
  .hero .card { background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; padding: 16px 18px; }
  .hero .label { font-size: 10px; letter-spacing: 1.2px; text-transform: uppercase; color: #6B7280; }
  .hero .main .value { font-size: 30px; font-weight: 800; margin-top: 6px; color: ${restColor}; letter-spacing: -0.5px; }
  .hero .card .value { font-size: 18px; font-weight: 700; margin-top: 6px; color: #111827; }
  .hero .sub { color: #6B7280; font-size: 11px; margin-top: 4px; }
  .section-title { font-size: 13px; font-weight: 700; color: #0F172A; margin: 18px 0 8px; text-transform: uppercase; letter-spacing: 1px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 14px; page-break-inside: auto; }
  tr { page-break-inside: avoid; }
  th { text-align: left; padding: 6px 0; border-bottom: 1px solid #E5E7EB; font-size: 10px; color: #6B7280; text-transform: uppercase; letter-spacing: 1px; }
  td { padding: 7px 0; border-bottom: 1px solid #F3F4F6; font-size: 12px; color: #111827; }
  td.amount, th.amount { text-align: right; font-variant-numeric: tabular-nums; }
  td.amount { font-weight: 600; }
  td.muted { color: #6B7280; font-weight: 500; }
  tr.family td { font-weight: 700; background: #F9FAFB; }
  tr.item td:first-child { padding-left: 14px; color: #374151; }
  tr.total td { font-weight: 800; border-top: 1px solid #D1D5DB; border-bottom: none; }
  tr.current td { background: #ECFDF5; }
  .period { display: inline-block; margin-left: 8px; font-size: 10px; color: #6B7280; border: 1px solid #E5E7EB; border-radius: 999px; padding: 1px 7px; }
  .advice { padding: 9px 12px; border-radius: 8px; margin-bottom: 6px; page-break-inside: avoid; }
  .advice-title { font-size: 12px; font-weight: 700; margin-bottom: 2px; }
  .advice-msg { font-size: 11px; color: #1F2937; line-height: 1.5; }
  footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #E5E7EB; color: #9CA3AF; font-size: 10px; text-align: center; }
</style>
</head>
<body>
  <div class="top">
    <div>
      <div class="brand">NET<span>budget</span></div>
      <h1>${escapeHtml(d.cityName)} — ${escapeHtml(d.cityRegion)} · ${escapeHtml(t("info.indexTitle"))} ×${d.cityIndex.toFixed(2)}</h1>
    </div>
    <div class="meta">${meta}</div>
  </div>

  <div class="hero">
    <div class="main">
      <div class="label">${escapeHtml(t("pdf.heroLabel"))}</div>
      <div class="value">${escapeHtml(fmt(d.remaining))}</div>
      <div class="sub">${escapeHtml(t("summary.netMonthlyEst"))} ${escapeHtml(fmt(d.netMensuel))} − ${escapeHtml(fmt(monthlyExpenses))}</div>
    </div>
    <div class="card">
      <div class="label">${escapeHtml(t("summary.netMonthlyEst"))}</div>
      <div class="value">${escapeHtml(fmt(d.netMensuel))}</div>
      <div class="sub">${escapeHtml(t("pdf.brutAnnual"))} ${escapeHtml(fmt(d.brutAnnuel))}</div>
    </div>
    <div class="card">
      <div class="label">${escapeHtml(t("pdf.totalExpenses"))}</div>
      <div class="value">${escapeHtml(fmt(monthlyExpenses))}</div>
      <div class="sub">${escapeHtml(t("family.epargne.label"))} ${escapeHtml(fmt(d.epargne))}</div>
    </div>
  </div>

  ${incomesHtml ? `<div class="section-title">${escapeHtml(t("pdf.incomes"))}</div>${incomesHtml}` : ""}

  <div class="section-title">${escapeHtml(t("pdf.breakdownTitle"))}</div>
  ${detailHtml}

  ${monthsHtml}

  <div class="section-title">${escapeHtml(t("section.advice.title"))}</div>
  ${adviceHtml || `<p style="color:#6B7280;font-size:11px;">${escapeHtml(t("pdf.noAdvice"))}</p>`}

  <footer>${escapeHtml(t("pdf.footer"))}</footer>
</body>
</html>`;
}

// ============================================================
// helpers
// ============================================================

function escapeHtml(input: string): string {
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function tintForTone(tone: AdviceItem["tone"]): string {
  switch (tone) {
    case "good":
      return "#ECFDF5";
    case "warn":
      return "#FFFBEB";
    case "danger":
      return "#FEF2F2";
    default:
      return "#EFF6FF";
  }
}
