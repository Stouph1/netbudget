// Pays où l'impôt sur le revenu est retenu sur le salaire par l'employeur.
//
// Jusqu'ici l'app ne connaissait que les charges sociales : le « net » affiché
// était le net AVANT impôt, et le reste à vivre comptait de l'argent qui
// n'arrive jamais sur le compte. Dans ces pays, le formulaire de salaire
// propose un champ « impôt prélevé à la source » avec, en regard, le nom du
// dispositif et l'administration qui le gère.
//
// Chaque ligne a été vérifiée sur une page officielle (champ `url`). Un pays
// absent n'est pas un pays sans retenue : c'est un pays non vérifié, et on
// préfère ne rien afficher plutôt qu'inventer. Sans impôt sur le revenu des
// salaires (vérifié) : AE, SA. Sans retenue mensuelle (vérifié) : SG, HK.

export type Withholding = {
  /** Nom du dispositif dans sa langue, tel qu'il figure sur la fiche de paie. */
  name: string;
  /** Administration qui le gère. */
  authority: string;
  /** Page officielle consultée. */
  url: string;
  /**
   * Ne concerne qu'une partie des salariés (Suisse : permis B et L,
   * frontaliers). Le bouton d'information le précise.
   */
  partial?: boolean;
};

export const WITHHOLDING: Record<string, Withholding> = {
  FR: {
    name: "prélèvement à la source",
    authority: "impots.gouv.fr",
    url: "https://www.impots.gouv.fr/particulier/je-consulte-le-taux-transmis-mes-collecteurs",
  },
  BE: {
    name: "précompte professionnel",
    authority: "SPF Finances",
    url: "https://finances.belgium.be",
  },
  DE: {
    name: "Lohnsteuer",
    authority: "Bundesfinanzministerium",
    url: "https://www.bundesfinanzministerium.de/Content/DE/Glossareintraege/L/lohnsteuer.html",
  },
  ES: {
    name: "retención del IRPF",
    authority: "Agencia Tributaria",
    url: "https://sede.agenciatributaria.gob.es",
  },
  IT: {
    name: "ritenuta IRPEF",
    authority: "Agenzia delle Entrate",
    url: "https://www.agenziaentrate.gov.it",
  },
  PT: {
    name: "retenção na fonte de IRS",
    authority: "Autoridade Tributária e Aduaneira",
    url: "https://www.portaldasfinancas.gov.pt",
  },
  LU: {
    name: "retenue d'impôt sur les salaires",
    authority: "Administration des contributions directes",
    url: "https://impotsdirects.public.lu/fr/salpens.html",
  },
  CH: {
    name: "impôt à la source",
    authority: "ch.ch",
    url: "https://www.ch.ch/fr/etrangers-en-suisse/vivre-en-suisse/imposition-a-la-source/",
    partial: true,
  },
  GB: {
    name: "PAYE",
    authority: "HM Revenue & Customs",
    url: "https://www.gov.uk/tax-codes",
  },
  IE: {
    name: "PAYE",
    authority: "Revenue",
    url: "https://www.revenue.ie/en/jobs-and-pensions/what-is-paye/index.aspx",
  },
  NL: {
    name: "loonheffing",
    authority: "Belastingdienst",
    url: "https://www.belastingdienst.nl",
  },
  AT: {
    name: "Lohnsteuer",
    authority: "Bundesministerium für Finanzen",
    url: "https://www.bmf.gv.at/services/glossar/l/lohnsteuer.html",
  },
  SE: {
    name: "preliminär skatt",
    authority: "Skatteverket",
    url: "https://www.skatteverket.se/privat/skatter/arbeteochinkomst/preliminarskatt.4.71004e4c133e23bf6db8000110220.html",
  },
  DK: {
    name: "A-skat",
    authority: "Skattestyrelsen",
    url: "https://skat.dk",
  },
  NO: {
    name: "forskuddstrekk (skattekort)",
    authority: "Skatteetaten",
    url: "https://www.skatteetaten.no",
  },
  FI: {
    name: "ennakonpidätys (verokortti)",
    authority: "Verohallinto",
    url: "https://www.vero.fi",
  },
  PL: {
    name: "zaliczka na PIT",
    authority: "Krajowa Administracja Skarbowa",
    url: "https://www.podatki.gov.pl",
  },
  US: {
    name: "federal income tax withholding (Form W-4)",
    authority: "IRS",
    url: "https://www.irs.gov/individuals/employees/tax-withholding",
  },
  CA: {
    name: "retenues à la source / source deductions",
    authority: "Agence du revenu du Canada",
    url: "https://www.canada.ca/en/revenue-agency.html",
  },
  MX: {
    name: "retención de ISR",
    authority: "SAT",
    url: "https://www.sat.gob.mx",
  },
  BR: {
    name: "IRRF (imposto de renda retido na fonte)",
    authority: "Receita Federal",
    url: "https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/tributos/IRRF",
  },
  AU: {
    name: "PAYG withholding",
    authority: "Australian Taxation Office",
    url: "https://www.ato.gov.au/businesses-and-organisations/preparing-lodging-and-paying/business-activity-statements-bas/pay-as-you-go-payg-withholding",
  },
  NZ: {
    name: "PAYE",
    authority: "Inland Revenue",
    url: "https://www.ird.govt.nz/employing-staff/deductions-from-income/deductions-from-salary-and-wages",
  },
  ZA: {
    name: "PAYE",
    authority: "SARS",
    url: "https://www.sars.gov.za",
  },
  IN: {
    name: "TDS on salary (section 192)",
    authority: "Income Tax Department",
    url: "https://www.incometaxindia.gov.in/w/section-192-64",
  },
  JP: {
    name: "源泉徴収",
    authority: "国税庁",
    url: "https://www.nta.go.jp",
  },
  KR: {
    name: "원천징수",
    authority: "국세청",
    url: "https://www.nts.go.kr",
  },
  CN: {
    name: "个人所得税预扣预缴",
    authority: "国家税务总局",
    url: "https://www.chinatax.gov.cn",
  },
  MA: {
    name: "retenue à la source de l'IR",
    authority: "Direction Générale des Impôts",
    url: "https://www.tax.gov.ma",
  },
  SN: {
    name: "retenue à la source sur salaires",
    authority: "DGID",
    url: "https://impotsetdomaines.sec.gouv.sn/fr/retenues-la-source-sur-salaires-trimf-ir-et-cfce-1",
  },
  TN: {
    name: "retenue à la source",
    authority: "Ministère des Finances",
    url: "https://www.finances.gov.tn/fr/apercu-general-sur-la-fiscalite",
  },
  DZ: {
    name: "IRG retenu à la source",
    authority: "Direction Générale des Impôts",
    url: "https://www.mfdgi.gov.dz",
  },
};

/** Le dispositif du pays, ou rien quand il n'y en a pas (ou pas vérifié). */
export function withholdingFor(countryCode: string | undefined): Withholding | null {
  if (!countryCode) return null;
  return WITHHOLDING[countryCode.toUpperCase()] ?? null;
}
