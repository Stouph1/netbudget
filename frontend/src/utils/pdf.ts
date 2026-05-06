// Génère du HTML stylisé prêt à être imprimé en PDF par expo-print.
// Deux formats : rapport complet (A4-like) et carte verticale 9:16 pour partage story.

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
  // Texte sur fond clair → couleurs foncées contrastées
  const restColor = d.remaining >= 0 ? TONE_COLORS.good : TONE_COLORS.danger;
  const restBg = d.remaining >= 0 ? "#ECFDF5" : "#FEF2F2";
  const adviceHtml = d.advice
    .map((a) => {
      const accent = TONE_COLORS[a.tone] ?? TONE_COLORS.info;
      return `
        <div class="advice" style="border-left:4px solid ${accent};background:${tintForTone(a.tone)}">
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

  <div class="section-title">Répartition 50/30/20</div>
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

// ============================================================
// Carte de partage verticale (story 9:16)
// ============================================================

export function generateShareCardHtml(d: PdfData): string {
  const restColor = d.remaining >= 0 ? "#10B981" : "#EF4444";
  const total = d.rent + d.loansMonthly + d.totalExpenses;
  const safeNet = Math.max(d.netMensuel, 1);

  const besoinsTotal = d.rent + d.loansMonthly + d.besoins;
  const besoinsPct = Math.round((besoinsTotal / safeNet) * 100);
  const loisirsPct = Math.round((d.loisirs / safeNet) * 100);
  const epargnePct = Math.round((d.epargne / safeNet) * 100);
  const restePct = Math.round((d.remaining / safeNet) * 100);

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>NETbudget — Carte</title>
<style>
  @page { size: 1080px 1920px; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    width: 1080px; height: 1920px;
    font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
    background: linear-gradient(160deg, #0F172A 0%, #020617 100%);
    color: #FFFFFF;
    padding: 80px 70px;
  }
  .brand {
    color: #FACC15; font-size: 28px; letter-spacing: 6px;
    text-transform: uppercase; font-weight: 700; margin-bottom: 14px;
  }
  .city {
    font-size: 72px; font-weight: 800; line-height: 1.05;
    color: #FFFFFF; margin-bottom: 6px;
  }
  .region { color: #94A3B8; font-size: 28px; margin-bottom: 60px; }

  .reste-block { margin-bottom: 60px; }
  .reste-label {
    color: #94A3B8; font-size: 26px; letter-spacing: 4px; text-transform: uppercase;
    margin-bottom: 18px; font-weight: 600;
  }
  .reste-value { color: ${restColor}; font-size: 160px; font-weight: 900; line-height: 1; letter-spacing: -3px; }
  .reste-pct { color: ${restColor}; font-size: 36px; font-weight: 700; margin-top: 14px; }

  .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; margin-bottom: 60px; }
  .stat {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 24px; padding: 26px 30px;
  }
  .stat .label { color: #94A3B8; font-size: 22px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600; }
  .stat .value { color: #FFFFFF; font-size: 46px; font-weight: 800; margin-top: 8px; }
  .stat.green .value { color: #10B981; }
  .stat.purple .value { color: #C084FC; }
  .stat.gold .value { color: #FACC15; }

  .breakdown { margin-top: 8px; }
  .row {
    display: flex; justify-content: space-between; align-items: center;
    padding: 22px 0; border-bottom: 1px solid rgba(255,255,255,0.10);
  }
  .row:last-child { border-bottom: none; }
  .row .label { color: #CBD5E1; font-size: 30px; font-weight: 600; }
  .row .pct { color: #FFFFFF; font-size: 30px; font-weight: 800; }

  .footer {
    position: absolute; left: 70px; right: 70px; bottom: 80px;
    display: flex; justify-content: space-between; align-items: center;
    color: #64748B; font-size: 22px; letter-spacing: 2px;
  }
</style>
</head>
<body>
  <div class="brand">NETbudget</div>
  <div class="city">${escapeHtml(d.cityName)}</div>
  <div class="region">${escapeHtml(d.cityRegion)} · ×${d.cityIndex.toFixed(2)}</div>

  <div class="reste-block">
    <div class="reste-label">Reste à vivre / mois</div>
    <div class="reste-value">${escapeHtml(formatEuro(d.remaining))}</div>
    <div class="reste-pct">${restePct} % de mon net</div>
  </div>

  <div class="stats">
    <div class="stat"><div class="label">Net mensuel</div><div class="value">${escapeHtml(formatEuro(d.netMensuel))}</div></div>
    <div class="stat"><div class="label">Total dépenses</div><div class="value">${escapeHtml(formatEuro(total))}</div></div>
  </div>

  <div class="breakdown">
    <div class="row"><div class="label">🛡️ Besoins</div><div class="pct">${besoinsPct} %</div></div>
    <div class="row"><div class="label">🎵 Loisirs</div><div class="pct">${loisirsPct} %</div></div>
    <div class="row"><div class="label">📈 Épargne</div><div class="pct">${epargnePct} %</div></div>
  </div>

  <div class="footer">
    <span>Règle 50/30/20</span>
    <span>NETbudget · 🇫🇷</span>
  </div>
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
