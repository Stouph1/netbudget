/**
 * Commande tes finances — suivi de la session (EJP Social)
 * Script du classeur « SUIVI commande tes finances ».
 *
 * Deux fonctions publiques :
 *   setup()  — à lancer UNE fois : crée les onglets, les en-têtes, les listes
 *              déroulantes et l'onglet Config avec un TOKEN aléatoire.
 *   doGet()  — l'application web : renvoie les statistiques AGRÉGÉES en JSON
 *              à la page netbudget.app/rapports/formation-2026-…
 *
 * Règle : aucune donnée individuelle ne sort. Le JSON ne contient que des
 * totaux, des moyennes et des pourcentages.
 */

// ---------- Onglets et en-têtes ----------
const TABS = {
  Config: ["Clé", "Valeur"],
  Inscriptions: ["Horodateur", "Prénom", "Nom", "Profil", "Groupe", "Email", "Téléphone"],
  Presences: ["Séance", "Date", "Groupe", "Participant", "Présent", "Défi réalisé"],
  Feedback: ["Horodateur", "Participant", "Note globale", "Recommanderait", "Atelier préféré", "Commentaire"],
  Bilan3mois: ["Horodateur", "Participant", "Budget tenu", "Virement automatique actif", "Dette attaquée", "PEA ouvert", "Utilise NetBudget"],
  Formateurs: ["Horodateur", "Formateur", "Semaine", "Groupe", "Note séance", "Besoin d'aide", "Résolu", "Commentaire"],
};

const SEANCES = [
  { code: "SG", label: "Session générale" },
  { code: "A1", label: "Atelier 1" },
  { code: "A2", label: "Atelier 2" },
  { code: "A3", label: "Atelier 3" },
  { code: "A4", label: "Atelier 4" },
];
const PROFILS = ["Étudiant", "Jeune travailleur", "Collégien/Lycéen", "Parent", "Autre"];
const ATELIERS = ["Budget", "Épargne", "Dettes & crédit", "Investissement"];

// ---------- setup ----------
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(TABS).forEach((name) => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    const headers = TABS[name];
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold");
    sh.setFrozenRows(1);
  });

  // Config : le token n'est écrit que s'il n'existe pas déjà.
  const cfg = ss.getSheetByName("Config");
  const existing = readConfig_(cfg);
  const rows = [
    ["TOKEN", existing.TOKEN || randomToken_()],
    ["SESSION", existing.SESSION || "Session pilote — automne 2026"],
    ["OBJECTIF", existing.OBJECTIF || 30],
    ["SEUIL_ASSIDU", existing.SEUIL_ASSIDU || 4],
  ];
  cfg.getRange(2, 1, rows.length, 2).setValues(rows);
  cfg.autoResizeColumns(1, 2);

  // Listes déroulantes : moins de fautes de frappe, des agrégats fiables.
  const yesNo = ["Oui", "Non"];
  const yesNoNa = ["Oui", "Non", "Non concerné"];
  validate_(ss.getSheetByName("Inscriptions"), 4, PROFILS);
  validate_(ss.getSheetByName("Presences"), 1, SEANCES.map((s) => s.code));
  validate_(ss.getSheetByName("Presences"), 5, yesNo);
  validate_(ss.getSheetByName("Presences"), 6, ["Oui", "Non", "—"]);
  validate_(ss.getSheetByName("Feedback"), 3, ["1", "2", "3", "4", "5"]);
  validate_(ss.getSheetByName("Feedback"), 4, yesNo);
  validate_(ss.getSheetByName("Feedback"), 5, ATELIERS);
  [3, 4, 7].forEach((c) => validate_(ss.getSheetByName("Bilan3mois"), c, yesNo));
  [5, 6].forEach((c) => validate_(ss.getSheetByName("Bilan3mois"), c, yesNoNa));
  validate_(ss.getSheetByName("Formateurs"), 5, ["1", "2", "3", "4", "5"]);
  [6, 7].forEach((c) => validate_(ss.getSheetByName("Formateurs"), c, yesNo));

  // La feuille vide de départ ne sert plus.
  const blank = ss.getSheetByName("Feuille 1") || ss.getSheetByName("Sheet1");
  if (blank && ss.getSheets().length > 1 && blank.getLastRow() === 0) ss.deleteSheet(blank);

  SpreadsheetApp.getUi().alert("Classeur prêt. TOKEN : " + rows[0][1] + "\n(onglet Config, ligne 2)");
}

function validate_(sh, col, values) {
  const rule = SpreadsheetApp.newDataValidation().requireValueInList(values, true).setAllowInvalid(false).build();
  sh.getRange(2, col, 1000, 1).setDataValidation(rule);
}

function randomToken_() {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < 24; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

// ---------- lecture ----------
function readConfig_(sh) {
  const out = {};
  if (!sh) return out;
  const vals = sh.getDataRange().getValues();
  for (let i = 1; i < vals.length; i++) if (vals[i][0]) out[String(vals[i][0]).trim()] = vals[i][1];
  return out;
}

/** Lignes d'un onglet sous forme d'objets { EnTête: valeur }, lignes vides exclues. */
function rows_(ss, name) {
  const sh = ss.getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return [];
  const vals = sh.getDataRange().getValues();
  const headers = vals[0].map((h) => String(h).trim());
  return vals.slice(1)
    .filter((r) => r.some((c) => c !== "" && c !== null))
    .map((r) => { const o = {}; headers.forEach((h, i) => (o[h] = r[i])); return o; });
}

const yes_ = (v) => String(v).trim().toLowerCase() === "oui";
const na_ = (v) => /non concern/i.test(String(v));
const num_ = (v) => { const n = parseFloat(String(v).replace(",", ".")); return isFinite(n) ? n : null; };
const count_ = (arr, key) => arr.reduce((m, r) => { const k = String(r[key] || "").trim(); if (k) m[k] = (m[k] || 0) + 1; return m; }, {});
const pctOf_ = (yes, total) => (total ? Math.round((100 * yes) / total) : null);
const avg_ = (nums) => { const v = nums.filter((n) => n !== null); return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null; };
const dateKey_ = (v) => { const d = v instanceof Date ? v : new Date(v); return isNaN(d) ? null : Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd"); };

// ---------- agrégats ----------
function stats_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const cfg = readConfig_(ss.getSheetByName("Config"));
  const seuil = Number(cfg.SEUIL_ASSIDU) || 4;

  // Inscriptions
  const ins = rows_(ss, "Inscriptions");
  const byDay = {};
  ins.forEach((r) => { const k = dateKey_(r["Horodateur"]); if (k) byDay[k] = (byDay[k] || 0) + 1; });
  let run = 0;
  const cumul = Object.keys(byDay).sort().map((d) => ({ date: d, total: (run += byDay[d]) }));

  // Présences
  const pres = rows_(ss, "Presences");
  const seances = SEANCES.map((s) => {
    const rowsS = pres.filter((r) => String(r["Séance"]).trim().toUpperCase() === s.code);
    const presents = new Set(rowsS.filter((r) => yes_(r["Présent"])).map((r) => String(r["Participant"]).trim().toLowerCase()));
    return { code: s.code, label: s.label, presents: presents.size, renseigne: rowsS.length > 0 };
  });
  const perPerson = {};
  pres.forEach((r) => {
    if (!yes_(r["Présent"])) return;
    const p = String(r["Participant"]).trim().toLowerCase();
    if (!p) return;
    (perPerson[p] = perPerson[p] || new Set()).add(String(r["Séance"]).trim().toUpperCase());
  });
  const people = Object.values(perPerson);
  const assidus = people.filter((s) => s.size >= seuil).length;
  const complets = people.filter((s) => s.size >= SEANCES.length).length;
  const base = ins.length || people.length;

  // Défis (ateliers 1 à 3 : le défi se fait entre deux séances)
  const defis = {};
  ["A1", "A2", "A3"].forEach((code, i) => {
    const rowsS = pres.filter((r) => String(r["Séance"]).trim().toUpperCase() === code && /^(oui|non)$/i.test(String(r["Défi réalisé"]).trim()));
    if (rowsS.length) defis["Atelier " + (i + 1)] = { faits: rowsS.filter((r) => yes_(r["Défi réalisé"])).length, total: rowsS.length };
  });

  // Feedback de fin
  const fb = rows_(ss, "Feedback");
  const feedback = {
    reponses: fb.length,
    noteMoyenne: avg_(fb.map((r) => num_(r["Note globale"]))),
    recommande: pctOf_(fb.filter((r) => yes_(r["Recommanderait"])).length, fb.length),
    atelierPrefere: count_(fb, "Atelier préféré"),
  };

  // Bilan à 3 mois — les « non concernés » sortent du dénominateur
  const bl = rows_(ss, "Bilan3mois");
  const share = (key) => { const c = bl.filter((r) => !na_(r[key]) && String(r[key]).trim() !== ""); return pctOf_(c.filter((r) => yes_(r[key])).length, c.length); };
  const bilan3mois = {
    reponses: bl.length,
    budgetTenu: share("Budget tenu"),
    virementActif: share("Virement automatique actif"),
    detteAttaquee: share("Dette attaquée"),
    peaOuvert: share("PEA ouvert"),
    netbudget: share("Utilise NetBudget"),
  };

  // Formateurs
  const fm = rows_(ss, "Formateurs");
  const formateurs = {
    retours: fm.length,
    actifs: Object.keys(count_(fm, "Formateur")).length,
    noteMoyenne: avg_(fm.map((r) => num_(r["Note séance"]))),
    alertes: fm.filter((r) => yes_(r["Besoin d'aide"]) && !yes_(r["Résolu"])).length,
  };

  return {
    updated: new Date().toISOString(),
    session: String(cfg.SESSION || "Session en cours"),
    objectif: Number(cfg.OBJECTIF) || null,
    inscrits: { total: ins.length, parProfil: count_(ins, "Profil"), parGroupe: count_(ins, "Groupe"), cumul },
    seances,
    assiduite: { seuil, assidus, complets, taux: pctOf_(assidus, base) },
    defis,
    feedback,
    bilan3mois,
    formateurs,
  };
}

// ---------- application web ----------
function doGet(e) {
  const cfg = readConfig_(SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Config"));
  const given = (e && e.parameter && e.parameter.token) || "";
  let body;
  if (!cfg.TOKEN || String(given) !== String(cfg.TOKEN)) {
    body = { error: "unauthorized" };
  } else {
    try { body = stats_(); } catch (err) { body = { error: "Erreur du script : " + err.message }; }
  }
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}
