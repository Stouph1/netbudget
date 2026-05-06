// Génère un HTML stylisé prêt à être imprimé en PDF par expo-print.

import type { AdviceItem } from "./advice";
import { formatEuro } from "./finance";

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
};

export function generatePdfHtml(d: PdfData): string {
  const restColor = d.remaining >= 0 ? "#10B981" : "#EF4444";
  const adviceHtml = d.advice
    .map((a) => {
      const accent =
        a.tone === "good"
          ? "#10B981"
          : a.tone === "warn"
            ? "#F59E0B"
            : a.tone === "danger"
              ? "#EF4444"
              : "#3B82F6";
      return `
        <div class="advice" style="border-left:4px solid ${accent}">
          <div class="advice-title" style="color:${accent}">${escapeHtml(a.title)}</div>
          <div class="advice-msg">${escapeHtml(a.message)}</div>
        </div>
      `;
    })
    .join("");

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>NETbudget — ${escapeHtml(d.cityName)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif; margin: 0; padding: 32px; background: #FFFFFF; color: #1F2937; }
  h1 { font-size: 28px; margin: 0 0 4px; color: #0F172A; letter-spacing: -0.5px; }
  .eyebrow { color: #6B7280; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 24px; }
  .hero { background: linear-gradient(135deg, #0F172A, #1E293B); color: #FFFFFF; border-radius: 16px; padding: 28px; margin-bottom: 24px; }
  .hero .label { font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #9CA3AF; }
  .hero .value { font-size: 42px; font-weight: 800; margin-top: 6px; color: ${restColor}; }
  .hero .meta { color: #D1D5DB; font-size: 13px; margin-top: 4px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
  .card { background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; padding: 16px; }
  .card .label { font-size: 11px; color: #6B7280; text-transform: uppercase; letter-spacing: 1.2px; }
  .card .value { font-size: 18px; font-weight: 700; color: #111827; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  th { text-align: left; padding: 8px 0; border-bottom: 1px solid #E5E7EB; font-size: 11px; color: #6B7280; text-transform: uppercase; letter-spacing: 1.2px; }
  td { padding: 10px 0; border-bottom: 1px solid #F3F4F6; font-size: 14px; }
  td.amount { text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; }
  .section-title { font-size: 16px; font-weight: 700; color: #0F172A; margin: 24px 0 12px; }
  .advice { background: #F9FAFB; padding: 12px 16px; border-radius: 8px; margin-bottom: 8px; }
  .advice-title { font-size: 13px; font-weight: 700; margin-bottom: 4px; }
  .advice-msg { font-size: 12px; color: #374151; line-height: 1.5; }
  footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #E5E7EB; color: #9CA3AF; font-size: 11px; text-align: center; }
</style>
</head>
<body>
  <div class="eyebrow">NETbudget · Budget France</div>
  <h1>${escapeHtml(d.cityName)} — ${escapeHtml(d.cityRegion)}</h1>

  <div class="hero">
    <div class="label">Reste à vivre mensuel</div>
    <div class="value">${escapeHtml(formatEuro(d.remaining))}</div>
    <div class="meta">Indice coût de la vie ×${d.cityIndex.toFixed(2)}</div>
  </div>

  <div class="grid">
    <div class="card">
      <div class="label">Net mensuel estimé</div>
      <div class="value">${escapeHtml(formatEuro(d.netMensuel))}</div>
    </div>
    <div class="card">
      <div class="label">Brut annuel</div>
      <div class="value">${escapeHtml(formatEuro(d.brutAnnuel))}</div>
    </div>
    <div class="card">
      <div class="label">Loyer</div>
      <div class="value">${escapeHtml(formatEuro(d.rent))}</div>
    </div>
    <div class="card">
      <div class="label">Mensualités prêts</div>
      <div class="value">${escapeHtml(formatEuro(d.loansMonthly))}</div>
    </div>
  </div>

  <div class="section-title">Répartition des dépenses</div>
  <table>
    <thead>
      <tr><th>Catégorie</th><th class="amount">Montant</th></tr>
    </thead>
    <tbody>
      <tr><td>Besoins (loyer + prêts + fixes)</td><td class="amount">${escapeHtml(formatEuro(d.rent + d.loansMonthly + d.besoins))}</td></tr>
      <tr><td>Loisirs</td><td class="amount">${escapeHtml(formatEuro(d.loisirs))}</td></tr>
      <tr><td>Épargne / Investissement</td><td class="amount">${escapeHtml(formatEuro(d.epargne))}</td></tr>
      <tr><td><strong>Total dépenses</strong></td><td class="amount"><strong>${escapeHtml(formatEuro(d.rent + d.loansMonthly + d.totalExpenses))}</strong></td></tr>
    </tbody>
  </table>

  <div class="section-title">Conseils d'optimisation</div>
  ${adviceHtml || `<p style="color:#6B7280;font-size:12px;">Aucun conseil pour le moment.</p>`}

  <footer>Généré par NETbudget · règle 50/30/20</footer>
</body>
</html>`;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
