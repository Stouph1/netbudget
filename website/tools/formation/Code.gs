/**
 * Commande tes finances — suivi de la session (EJP Social)
 * Script du classeur « SUIVI commande tes finances ».
 *
 * Quatre fonctions publiques (menu « Commande tes finances » du classeur) :
 *   setup()             — crée les onglets, les en-têtes, les listes déroulantes
 *                         et l'onglet Config avec un TOKEN aléatoire.
 *   creerFormulaires()  — crée les 5 formulaires Google, écrit leurs liens dans
 *                         Config et installe le déclencheur qui recopie chaque
 *                         réponse dans le bon onglet. Le classeur se remplit
 *                         alors tout seul.
 *   rafraichirListes()  — remet à jour la liste des participants dans les
 *                         formulaires (appelée automatiquement à chaque
 *                         inscription).
 *   doGet()             — l'application web : renvoie les statistiques AGRÉGÉES
 *                         en JSON à netbudget.app/rapports/formation-2026-…
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
  const token = prepare_();
  SpreadsheetApp.getUi().alert(
    "Classeur prêt. TOKEN : " + token + "\n(onglet Config, ligne 2)\n\n" +
    "Étape suivante : menu « Commande tes finances » → « Créer les formulaires »."
  );
}

/** Tout le travail de setup(), sans la fenêtre. Rejouable sans rien casser. */
function prepare_() {
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
    ["GROUPES", existing.GROUPES || "Groupe 1, Groupe 2, Groupe 3"],
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

  return rows[0][1];
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

// ---------- Formulaires ----------
/**
 * Les formulaires ne sont PAS « liés » au classeur : c'est le déclencheur
 * onSubmit_ qui recopie chaque réponse dans le bon onglet, à la bonne colonne.
 * On évite ainsi les onglets « Réponses au formulaire 1 » parasites, et les
 * agrégats lisent toujours la même structure.
 *
 * Types d'items : text, email, long, choix (opts), note (1 à 5),
 * groupe (liste tenue à jour depuis Config), participant (liste tenue à jour
 * depuis l'onglet Inscriptions).
 * Colonnes : "@date" = horodatage de la réponse, "@oui" = la valeur « Oui »,
 * "@seance" = le code de la séance (SG, A1…) déduit du choix.
 */
const FORMULAIRES = [
  {
    cle: "INSCRIPTION",
    titre: "Commande tes finances — inscription",
    description:
      "Réserve ta place pour la session. Tes coordonnées servent uniquement à t'envoyer les informations pratiques ; aucune donnée individuelle n'est publiée.",
    onglet: "Inscriptions",
    items: [
      { type: "text", titre: "Prénom", req: true },
      { type: "text", titre: "Nom", req: true },
      { type: "email", titre: "Email", req: true },
      { type: "text", titre: "Téléphone", aide: "Facultatif — pour les rappels de séance." },
      { type: "choix", titre: "Profil", req: true, opts: PROFILS },
      { type: "groupe", titre: "Groupe", req: true },
    ],
    cols: {
      "Horodateur": "@date", "Prénom": "Prénom", "Nom": "Nom", "Profil": "Profil",
      "Groupe": "Groupe", "Email": "Email", "Téléphone": "Téléphone",
    },
  },
  {
    cle: "PRESENCE",
    titre: "Commande tes finances — émargement",
    description: "À remplir au début de chaque séance. Une réponse par personne et par séance.",
    onglet: "Presences",
    items: [
      { type: "choix", titre: "Séance", req: true, opts: SEANCES.map((s) => s.code + " — " + s.label) },
      { type: "participant", titre: "Participant", req: true },
      { type: "groupe", titre: "Groupe" },
      { type: "choix", titre: "Défi réalisé", opts: ["Oui", "Non", "—"], aide: "Le défi donné à la séance précédente. « — » si tu n'en avais pas." },
    ],
    cols: {
      "Séance": "@seance", "Date": "@date", "Groupe": "Groupe",
      "Participant": "Participant", "Présent": "@oui", "Défi réalisé": "Défi réalisé",
    },
  },
  {
    cle: "FEEDBACK",
    titre: "Commande tes finances — ton avis",
    description: "À la fin du parcours. Deux minutes, et ça nous sert vraiment.",
    onglet: "Feedback",
    items: [
      { type: "participant", titre: "Participant", req: true },
      { type: "note", titre: "Note globale", req: true },
      { type: "choix", titre: "Recommanderait", req: true, opts: ["Oui", "Non"], aide: "Conseillerais-tu cette formation à un proche ?" },
      { type: "choix", titre: "Atelier préféré", opts: ATELIERS },
      { type: "long", titre: "Commentaire" },
    ],
    cols: {
      "Horodateur": "@date", "Participant": "Participant", "Note globale": "Note globale",
      "Recommanderait": "Recommanderait", "Atelier préféré": "Atelier préféré", "Commentaire": "Commentaire",
    },
  },
  {
    cle: "BILAN",
    titre: "Commande tes finances — trois mois après",
    description: "Où en es-tu trois mois plus tard ? Réponds « Non concerné » si la question ne s'applique pas à toi.",
    onglet: "Bilan3mois",
    items: [
      { type: "participant", titre: "Participant", req: true },
      { type: "choix", titre: "Budget tenu", opts: ["Oui", "Non"], aide: "As-tu suivi ton budget au moins un mois complet ?" },
      { type: "choix", titre: "Virement automatique actif", opts: ["Oui", "Non"], aide: "Un virement automatique vers ton épargne le jour de la paie." },
      { type: "choix", titre: "Dette attaquée", opts: ["Oui", "Non", "Non concerné"] },
      { type: "choix", titre: "PEA ouvert", opts: ["Oui", "Non", "Non concerné"] },
      { type: "choix", titre: "Utilise NetBudget", opts: ["Oui", "Non"] },
    ],
    cols: {
      "Horodateur": "@date", "Participant": "Participant", "Budget tenu": "Budget tenu",
      "Virement automatique actif": "Virement automatique actif", "Dette attaquée": "Dette attaquée",
      "PEA ouvert": "PEA ouvert", "Utilise NetBudget": "Utilise NetBudget",
    },
  },
  {
    cle: "FORMATEUR",
    titre: "Commande tes finances — retour formateur",
    description: "Après chaque séance animée. Signale ici ce qui bloque, on le voit tout de suite sur le tableau de bord.",
    onglet: "Formateurs",
    items: [
      { type: "text", titre: "Formateur", req: true },
      { type: "text", titre: "Semaine", aide: "Par exemple : semaine 3." },
      { type: "groupe", titre: "Groupe" },
      { type: "note", titre: "Note séance", req: true },
      { type: "choix", titre: "Besoin d'aide", opts: ["Oui", "Non"], req: true },
      { type: "choix", titre: "Résolu", opts: ["Oui", "Non"] },
      { type: "long", titre: "Commentaire" },
    ],
    cols: {
      "Horodateur": "@date", "Formateur": "Formateur", "Semaine": "Semaine", "Groupe": "Groupe",
      "Note séance": "Note séance", "Besoin d'aide": "Besoin d'aide", "Résolu": "Résolu",
      "Commentaire": "Commentaire",
    },
  },
];

/** Crée (ou retrouve) les cinq formulaires, écrit leurs liens, arme le déclencheur. */
function creerFormulaires() {
  prepare_();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const props = PropertiesService.getDocumentProperties();
  const liens = [];
  FORMULAIRES.forEach((def) => {
    let form = null;
    const id = props.getProperty("FORM_" + def.cle);
    if (id) { try { form = FormApp.openById(id); } catch (err) { form = null; } }
    const neuf = !form;
    if (neuf) {
      form = FormApp.create(def.titre);
      props.setProperty("FORM_" + def.cle, form.getId());
      def.items.forEach((it) => ajouterItem_(form, it));
    }
    // Un formulaire déjà diffusé garde ses questions : on ne touche qu'à l'habillage.
    form.setTitle(def.titre).setDescription(def.description).setConfirmationMessage("C'est enregistré. Merci !");
    liens.push(["LIEN_" + def.cle, form.getPublishedUrl()]);
  });
  ecrireConfig_(ss.getSheetByName("Config"), liens);
  installerDeclencheurs();
  rafraichirListes();
  SpreadsheetApp.getUi().alert(
    "Les " + FORMULAIRES.length + " formulaires sont prêts.\n\n" +
    "Leurs liens sont dans l'onglet Config (lignes LIEN_…).\n" +
    "Chaque réponse arrive désormais toute seule dans le bon onglet, et le tableau de bord se met à jour dans la minute."
  );
}

function ajouterItem_(form, it) {
  let item;
  if (it.type === "long") item = form.addParagraphTextItem();
  else if (it.type === "note") item = form.addScaleItem().setBounds(1, 5).setLabels("Pas du tout", "Beaucoup");
  else if (it.type === "choix") item = form.addMultipleChoiceItem().setChoiceValues(it.opts);
  else if (it.type === "groupe") item = form.addListItem().setChoiceValues(groupes_());
  else if (it.type === "participant") item = form.addListItem().setChoiceValues(participants_());
  else if (it.type === "email") item = form.addTextItem().setValidation(FormApp.createTextValidation().requireTextIsEmail().build());
  else item = form.addTextItem();
  item.setTitle(it.titre);
  if (it.aide) item.setHelpText(it.aide);
  if (it.req) item.setRequired(true);
  return item;
}

/** « Prénom Nom » de chaque inscrit, sans doublon. */
function participants_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const vus = {};
  const noms = [];
  rows_(ss, "Inscriptions").forEach((r) => {
    const n = (String(r["Prénom"] || "").trim() + " " + String(r["Nom"] || "").trim()).trim();
    const k = n.toLowerCase();
    if (n && !vus[k]) { vus[k] = true; noms.push(n); }
  });
  noms.sort();
  return noms.length ? noms : ["(aucun inscrit pour le moment)"];
}

function groupes_() {
  const cfg = readConfig_(SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Config"));
  const list = String(cfg.GROUPES || "Groupe 1, Groupe 2, Groupe 3")
    .split(",").map((g) => g.trim()).filter(Boolean);
  return list.concat(["Je ne sais pas encore"]);
}

/** Remet à jour les listes déroulantes des formulaires (participants, groupes). */
function rafraichirListes() {
  const props = PropertiesService.getDocumentProperties();
  const noms = participants_();
  const grp = groupes_();
  FORMULAIRES.forEach((def) => {
    const id = props.getProperty("FORM_" + def.cle);
    if (!id) return;
    let form;
    try { form = FormApp.openById(id); } catch (err) { return; }
    form.getItems(FormApp.ItemType.LIST).forEach((item) => {
      const t = item.getTitle().trim();
      if (t === "Participant") item.asListItem().setChoiceValues(noms);
      else if (t === "Groupe") item.asListItem().setChoiceValues(grp);
    });
  });
}

/** Un déclencheur « à l'envoi du formulaire » par formulaire, sans doublon. */
function installerDeclencheurs() {
  ScriptApp.getProjectTriggers().forEach((tr) => {
    if (tr.getHandlerFunction() === "onSubmit_") ScriptApp.deleteTrigger(tr);
  });
  const props = PropertiesService.getDocumentProperties();
  FORMULAIRES.forEach((def) => {
    const id = props.getProperty("FORM_" + def.cle);
    if (!id) return;
    ScriptApp.newTrigger("onSubmit_").forForm(FormApp.openById(id)).onFormSubmit().create();
  });
}

/** Appelé par Google à chaque réponse : recopie la ligne dans le bon onglet. */
function onSubmit_(e) {
  if (!e || !e.source || !e.response) return;
  const id = e.source.getId();
  const props = PropertiesService.getDocumentProperties();
  const def = FORMULAIRES.filter((f) => props.getProperty("FORM_" + f.cle) === id)[0];
  if (!def) return;

  const rep = {};
  e.response.getItemResponses().forEach((ir) => {
    const v = ir.getResponse();
    rep[ir.getItem().getTitle().trim()] = Array.isArray(v) ? v.join(", ") : v;
  });

  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(def.onglet);
  if (!sh) return;
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map((h) => String(h).trim());
  const ligne = headers.map((h) => {
    const src = def.cols[h];
    if (src === undefined) return "";
    if (src === "@date") return new Date();
    if (src === "@oui") return "Oui";
    if (src === "@seance") return codeSeance_(rep["Séance"]);
    return rep[src] === undefined ? "" : rep[src];
  });
  sh.appendRow(ligne);

  // Un inscrit de plus : il doit apparaître dans les listes d'émargement.
  if (def.cle === "INSCRIPTION") rafraichirListes();
}

/** « A1 — Atelier 1 » → « A1 ». */
function codeSeance_(v) {
  const s = String(v || "").trim();
  const code = s.split("—")[0].trim().toUpperCase();
  const connu = SEANCES.filter((x) => x.code === code)[0];
  if (connu) return connu.code;
  const parLabel = SEANCES.filter((x) => x.label.toLowerCase() === s.toLowerCase())[0];
  return parLabel ? parLabel.code : s;
}

/** Écrit (ou met à jour) des paires clé/valeur dans l'onglet Config. */
function ecrireConfig_(sh, pairs) {
  if (!sh) return;
  const vals = sh.getDataRange().getValues();
  pairs.forEach(([cle, valeur]) => {
    let ligne = -1;
    for (let i = 1; i < vals.length; i++) if (String(vals[i][0]).trim() === cle) { ligne = i + 1; break; }
    if (ligne === -1) { sh.appendRow([cle, valeur]); vals.push([cle, valeur]); }
    else sh.getRange(ligne, 2).setValue(valeur);
  });
  sh.autoResizeColumns(1, 2);
}

// ---------- menu du classeur ----------
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Commande tes finances")
    .addItem("1. Préparer le classeur", "setup")
    .addItem("2. Créer les formulaires", "creerFormulaires")
    .addSeparator()
    .addItem("Rafraîchir la liste des participants", "rafraichirListes")
    .addItem("Afficher le TOKEN et les liens", "afficherConfig")
    .addToUi();
}

function afficherConfig() {
  const cfg = readConfig_(SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Config"));
  const lignes = Object.keys(cfg).map((k) => k + " : " + cfg[k]);
  SpreadsheetApp.getUi().alert(lignes.join("\n") || "L'onglet Config est vide : lance « 1. Préparer le classeur ».");
}
