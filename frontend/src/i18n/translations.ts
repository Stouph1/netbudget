// Catalogues de traductions. Chaque clé est un point d'ancrage stable utilisé via `t(key, lang)`.
// Pour ajouter une langue : crée la même structure que `fr` et ajoute-la dans `LANGUAGES`.

export type Lang =
  | "fr"
  | "en"
  | "es"
  | "pt"
  | "de"
  | "it"
  | "ar";

type Catalog = Record<string, string>;

const fr: Catalog = {
  // Header
  "header.brand": "Budget",
  "header.eyebrow": "Budget",

  // Onboarding
  "onboarding.title": "Comment ça marche",
  "onboarding.step1": "Ajoute tes sources de revenu (salaire, freelance, locatif, dividendes…). Chaque source a son taux de charges.",
  "onboarding.step2": "Renseigne ton loyer, tes prêts et tes dépenses, classées en 3 familles : Besoins, Loisirs, Épargne (règle 50/30/20).",
  "onboarding.step3": "En bas de page : ton reste à vivre, tes conseils personnalisés et l'export PDF.",
  "onboarding.tip": "💡 Tes données restent sur ton téléphone — rien n'est envoyé sur internet.",

  // Top summary
  "top.netMonthly": "Net mensuel",
  "top.expenses": "Dépenses",
  "top.remaining": "Reste à vivre",

  // Sections
  "section.income.title": "Revenus",
  "section.income.subtitle": "Salaire, freelance, locatif, dividendes… chacun avec son propre taux de charges.",
  "section.location.title": "Localisation",
  "section.housing.title": "Logement",
  "section.loans.title": "Prêts",
  "section.needs.title": "Besoins",
  "section.wants.title": "Loisirs",
  "section.savings.title": "Épargne / Investissement",
  "section.converter.title": "Convertisseur de devise",
  "section.advice.title": "Conseils d'optimisation",
  "section.breakdown.title": "Répartition",
  "section.monthly.title": "Budget mois par mois",

  // Empty states
  "income.empty.title": "Aucun revenu",
  "income.empty.text": "Ajoute ton salaire ou une autre source pour démarrer.",
  "loans.empty.title": "Aucun prêt",
  "loans.empty.text": "Ajoute tes crédits (immobilier, auto, conso…) pour calculer la mensualité automatiquement.",
  "family.empty.title": "Aucune entrée",
  "family.empty.text": "Ajoute une catégorie avec le bouton « Ajouter ».",

  // Modal titles
  "modal.newIncome": "Nouvelle source",
  "modal.editIncome": "Modifier la source",
  "modal.newLoan": "Nouveau prêt",
  "modal.editLoan": "Modifier le prêt",
  "modal.chooseCity": "Choisir une ville",
  "modal.chooseCurrency": "Choisir la devise",
  "modal.chooseLanguage": "Choisir la langue",

  // Buttons / actions
  "btn.add": "Ajouter",
  "btn.save": "Enregistrer",
  "btn.cancel": "Annuler",
  "btn.delete": "Supprimer",
  "btn.confirm": "Confirmer",
  "btn.reset": "Réinitialiser",
  "btn.understood": "Compris",
  "btn.ok": "OK",
  "btn.exportPdf": "Exporter en PDF",
  "btn.refresh": "Rafraîchir",
  "btn.search": "Rechercher une ville…",

  // Income labels
  "income.name": "Nom",
  "income.amount": "Montant brut",
  "income.type": "Type de revenu",
  "income.frequency": "Fréquence",
  "income.status": "Statut professionnel",
  "income.timeMode": "Quotité de travail",
  "income.charges": "Taux de charges / prélèvements",

  // Converter
  "converter.from": "De",
  "converter.to": "Vers",
  "converter.amount": "Montant",
  "converter.result": "Résultat",
  "converter.loading": "Chargement des taux…",
  "converter.updated": "Taux mis à jour",
  "converter.cacheExpired": "cache expiré",

  // Tabs
  "tab.settings": "Réglages",
  "tab.budget": "Budget",
  "tab.converter": "Devises",

  // Settings tab
  "settings.title": "Réglages",
  "settings.intro": "Configure les préférences par défaut de l'application.",
  "settings.currency.title": "Devise affichée",
  "settings.currency.hint": "Tous les montants de l'app utilisent cette devise.",
  "settings.language.title": "Langue de l'app",
  "settings.language.hint": "Choisis la langue d'affichage de l'interface.",
  "settings.danger.title": "Zone de danger",
  "settings.reset.btn": "Réinitialiser toutes les données",

  // Common labels
  "label.rent": "Loyer mensuel (charges comprises)",
  "label.loanName": "Nom du prêt",
  "label.loanMode": "Mode de saisie",
  "label.loanComputed": "Calculer la mensualité",
  "label.loanComputedHint": "À partir du capital, taux et durée",
  "label.loanDirect": "Mensualité directe",
  "label.loanDirectHint": "Tu connais déjà le montant mensuel",
  "label.loanPrincipal": "Montant emprunté",
  "label.loanRate": "Taux d'intérêt annuel",
  "label.loanDuration": "Durée",
  "label.loanMonthly": "Mensualité",
  "label.loanMonthlyHint": "Saisis le montant exact que tu rembourses chaque mois.",
  "label.loanPreview": "Mensualité estimée",
  "label.years": "ans",
  "label.perMonth": "/ mois",

  // Frequencies
  "freq.monthly": "Mensuel",
  "freq.monthlyHint": "Chaque mois (ex: salaire net mensuel)",
  "freq.annual": "Annuel",
  "freq.annualHint": "Le total sur 1 an, réparti automatiquement",
  "freq.monthOnce": "Versé un mois précis",
  "freq.monthOnceHint": "Prime, 13e mois, dividende annuel…",

  // Time mode
  "time.full": "Temps plein",
  "time.part": "Temps partiel",

  // Reset confirm
  "reset.title": "Réinitialiser ?",
  "reset.message": "Toutes les données saisies seront effacées.",

  // Validation errors
  "error.amountRequired": "Montant requis",
  "error.amountRequiredHint": "Indique un montant supérieur à 0.",
  "error.nameRequired": "Nom requis",
  "error.nameRequiredHint": "Donne un nom à ta nouvelle catégorie.",
  "error.loanMonthlyRequired": "Mensualité requise",
  "error.loanMonthlyRequiredHint": "Indique le montant que tu rembourses chaque mois.",
  "error.loanIncomplete": "Informations incomplètes",
  "error.loanIncompleteHint": "Renseigne au minimum le montant emprunté et la durée en années.",

  // Misc
  "renameHint": "Renomme cette catégorie",
  "newCategoryName": "Nom de la catégorie",
  "loans.add": "Ajouter",
};

const en: Catalog = {
  "header.brand": "Budget",
  "header.eyebrow": "Budget",
  "onboarding.title": "How it works",
  "onboarding.step1": "Add your income sources (salary, freelance, rental, dividends…). Each source has its own contribution rate.",
  "onboarding.step2": "Fill in your rent, loans and expenses, sorted into 3 families: Needs, Wants, Savings (50/30/20 rule).",
  "onboarding.step3": "At the bottom: your disposable income, personalised tips and PDF export.",
  "onboarding.tip": "💡 Your data stays on your phone — nothing is sent to the internet.",
  "top.netMonthly": "Monthly net",
  "top.expenses": "Expenses",
  "top.remaining": "Disposable",
  "section.income.title": "Income",
  "section.income.subtitle": "Salary, freelance, rental, dividends… each with its own contribution rate.",
  "section.location.title": "Location",
  "section.housing.title": "Housing",
  "section.loans.title": "Loans",
  "section.needs.title": "Needs",
  "section.wants.title": "Wants",
  "section.savings.title": "Savings / Investment",
  "section.converter.title": "Currency converter",
  "section.advice.title": "Optimisation tips",
  "section.breakdown.title": "Breakdown",
  "section.monthly.title": "Monthly budget",
  "income.empty.title": "No income",
  "income.empty.text": "Add a salary or another source to get started.",
  "loans.empty.title": "No loans",
  "loans.empty.text": "Add your loans (real estate, car, consumer…) to compute the monthly payment automatically.",
  "family.empty.title": "No entries",
  "family.empty.text": "Add a category with the “Add” button.",
  "modal.newIncome": "New source",
  "modal.editIncome": "Edit source",
  "modal.newLoan": "New loan",
  "modal.editLoan": "Edit loan",
  "modal.chooseCity": "Choose a city",
  "modal.chooseCurrency": "Choose currency",
  "modal.chooseLanguage": "Choose language",
  "btn.add": "Add",
  "btn.save": "Save",
  "btn.cancel": "Cancel",
  "btn.delete": "Delete",
  "btn.confirm": "Confirm",
  "btn.reset": "Reset",
  "btn.understood": "Got it",
  "btn.ok": "OK",
  "btn.exportPdf": "Export PDF",
  "btn.refresh": "Refresh",
  "btn.search": "Search a city…",
  "income.name": "Name",
  "income.amount": "Gross amount",
  "income.type": "Income type",
  "income.frequency": "Frequency",
  "income.status": "Employment status",
  "income.timeMode": "Working time",
  "income.charges": "Contribution / withholding rate",
  "converter.from": "From",
  "converter.to": "To",
  "converter.amount": "Amount",
  "converter.result": "Result",
  "converter.loading": "Loading rates…",
  "converter.updated": "Rates updated",
  "converter.cacheExpired": "cache expired",
  "tab.settings": "Settings",
  "tab.budget": "Budget",
  "tab.converter": "FX",
  "settings.title": "Settings",
  "settings.intro": "Configure the app's default preferences.",
  "settings.currency.title": "Display currency",
  "settings.currency.hint": "All amounts in the app use this currency.",
  "settings.language.title": "App language",
  "settings.language.hint": "Choose the language of the interface.",
  "settings.danger.title": "Danger zone",
  "settings.reset.btn": "Reset all data",
  "label.rent": "Monthly rent (charges included)",
  "label.loanName": "Loan name",
  "label.loanMode": "Input mode",
  "label.loanComputed": "Compute payment",
  "label.loanComputedHint": "From principal, rate and duration",
  "label.loanDirect": "Direct monthly",
  "label.loanDirectHint": "You already know the monthly amount",
  "label.loanPrincipal": "Principal",
  "label.loanRate": "Annual interest rate",
  "label.loanDuration": "Duration",
  "label.loanMonthly": "Monthly payment",
  "label.loanMonthlyHint": "Enter the exact amount you repay each month.",
  "label.loanPreview": "Estimated monthly payment",
  "label.years": "years",
  "label.perMonth": "/ month",
  "freq.monthly": "Monthly",
  "freq.monthlyHint": "Every month (e.g. net monthly salary)",
  "freq.annual": "Annual",
  "freq.annualHint": "The total over 1 year, automatically split",
  "freq.monthOnce": "Paid a specific month",
  "freq.monthOnceHint": "Bonus, 13th month, annual dividend…",
  "time.full": "Full-time",
  "time.part": "Part-time",
  "reset.title": "Reset?",
  "reset.message": "All entered data will be erased.",
  "error.amountRequired": "Amount required",
  "error.amountRequiredHint": "Enter an amount greater than 0.",
  "error.nameRequired": "Name required",
  "error.nameRequiredHint": "Give a name to your new category.",
  "error.loanMonthlyRequired": "Monthly amount required",
  "error.loanMonthlyRequiredHint": "Enter the amount you repay each month.",
  "error.loanIncomplete": "Incomplete information",
  "error.loanIncompleteHint": "Provide at least the principal and the duration in years.",
  "renameHint": "Rename this category",
  "newCategoryName": "Category name",
  "loans.add": "Add",
};

// Pour ES/PT/DE/IT/AR : fallback automatique sur FR tant que les catalogues ne sont pas remplis.
// Tu peux les compléter au fur et à mesure et pousser via OTA.
const es: Catalog = { ...fr };
const pt: Catalog = { ...fr };
const de: Catalog = { ...fr };
const it: Catalog = { ...fr };
const ar: Catalog = { ...fr };

export const CATALOGS: Record<Lang, Catalog> = { fr, en, es, pt, de, it, ar };

export const LANGUAGES: { code: Lang; label: string; flag: string }[] = [
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "pt", label: "Português", flag: "🇵🇹" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
];

export const DEFAULT_LANG: Lang = "fr";

export function t(key: string, lang: Lang = DEFAULT_LANG): string {
  return CATALOGS[lang]?.[key] ?? CATALOGS[DEFAULT_LANG][key] ?? key;
}
