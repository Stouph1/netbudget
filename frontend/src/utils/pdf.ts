// Génère du HTML stylisé prêt à être imprimé en PDF par expo-print.
// Format : rapport complet (A4-like) avec totaux + table + conseils.

import type { AdviceItem } from "./advice";
import { interpolate } from "./advice";
import { CurrencyCode, formatCurrency } from "./currency";

export type PdfData = {
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
  // Texte sur fond clair → couleurs foncées contrastées
  const restColor = d.remaining >= 0 ? TONE_COLORS.good : TONE_COLORS.danger;
  const restBg = d.remaining >= 0 ? "#ECFDF5" : "#FEF2F2";
  const adviceHtml = d.advice
    .map((a) => {
      const accent = TONE_COLORS[a.tone] ?? TONE_COLORS.info;
      const title = t(a.titleKey);
      const message = interpolate(t(a.messageKey), a.params);
      return `
        <div class="advice" style="border-left:4px solid ${accent};background:${tintForTone(a.tone)}">
          <div class="advice-title" style="color:${accent}">${escapeHtml(title)}</div>
          <div class="advice-msg">${escapeHtml(message)}</div>
        </div>
      `;
    })
    .join("");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>NETbudget — ${escapeHtml(d.cityName)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif; margin: 0; padding: 32px; background: #FFFFFF; color: #111827; }
  h1 { font-size: 28px; margin: 0 0 4px; color: #0F172A; letter-spacing: -0.5px; }
  .eyebrow { color: #6B7280; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 24px; }
  .hero { background: ${restBg}; border: 1px solid ${restColor}33; border-radius: 16px; padding: 28px; margin-bottom: 24px; }
  .hero .label { font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #6B7280; }
  .hero .value { font-size: 42px; font-weight: 800; margin-top: 6px; color: ${restColor}; }
  .hero .meta { color: #4B5563; font-size: 13px; margin-top: 4px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
  .card { background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; padding: 16px; }
  .card .label { font-size: 11px; color: #6B7280; text-transform: uppercase; letter-spacing: 1.2px; }
  .card .value { font-size: 18px; font-weight: 700; color: #111827; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  th { text-align: left; padding: 8px 0; border-bottom: 1px solid #E5E7EB; font-size: 11px; color: #6B7280; text-transform: uppercase; letter-spacing: 1.2px; }
  td { padding: 10px 0; border-bottom: 1px solid #F3F4F6; font-size: 14px; color: #111827; }
  td.amount { text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; }
  .section-title { font-size: 16px; font-weight: 700; color: #0F172A; margin: 24px 0 12px; }
  .advice { padding: 12px 16px; border-radius: 8px; margin-bottom: 8px; }
  .advice-title { font-size: 13px; font-weight: 700; margin-bottom: 4px; }
  .advice-msg { font-size: 12px; color: #1F2937; line-height: 1.55; }
  footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #E5E7EB; color: #9CA3AF; font-size: 11px; text-align: center; }
</style>
</head>
<body>
  <div class="eyebrow">NETbudget</div>
  <h1>${escapeHtml(d.cityName)} — ${escapeHtml(d.cityRegion)}</h1>

  <div class="hero">
    <div class="label">${escapeHtml(t("pdf.heroLabel"))}</div>
    <div class="value">${escapeHtml(fmt(d.remaining))}</div>
    <div class="meta">${escapeHtml(t("info.indexTitle"))} ×${d.cityIndex.toFixed(2)}</div>
  </div>

  <div class="grid">
    <div class="card">
      <div class="label">${escapeHtml(t("summary.netMonthlyEst"))}</div>
      <div class="value">${escapeHtml(fmt(d.netMensuel))}</div>
    </div>
    <div class="card">
      <div class="label">${escapeHtml(t("pdf.brutAnnual"))}</div>
      <div class="value">${escapeHtml(fmt(d.brutAnnuel))}</div>
    </div>
    <div class="card">
      <div class="label">${escapeHtml(t("donut.rent"))}</div>
      <div class="value">${escapeHtml(fmt(d.rent))}</div>
    </div>
    <div class="card">
      <div class="label">${escapeHtml(t("pdf.loansMonthly"))}</div>
      <div class="value">${escapeHtml(fmt(d.loansMonthly))}</div>
    </div>
  </div>

  <div class="section-title">${escapeHtml(t("pdf.breakdownTitle"))}</div>
  <table>
    <thead>
      <tr><th>${escapeHtml(t("pdf.category"))}</th><th class="amount">${escapeHtml(t("pdf.amount"))}</th></tr>
    </thead>
    <tbody>
      <tr><td>${escapeHtml(t("pdf.needsLine"))}</td><td class="amount">${escapeHtml(fmt(d.rent + d.loansMonthly + d.besoins))}</td></tr>
      <tr><td>${escapeHtml(t("family.loisirs.label"))}</td><td class="amount">${escapeHtml(fmt(d.loisirs))}</td></tr>
      <tr><td>${escapeHtml(t("family.epargne.label"))}</td><td class="amount">${escapeHtml(fmt(d.epargne))}</td></tr>
      <tr><td><strong>${escapeHtml(t("pdf.totalExpenses"))}</strong></td><td class="amount"><strong>${escapeHtml(fmt(d.rent + d.loansMonthly + d.totalExpenses))}</strong></td></tr>
    </tbody>
  </table>

  <div class="section-title">${escapeHtml(t("section.advice.title"))}</div>
  ${adviceHtml || `<p style="color:#6B7280;font-size:12px;">${escapeHtml(t("pdf.noAdvice"))}</p>`}

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
