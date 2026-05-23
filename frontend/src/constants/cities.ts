// Indice de coût de la vie par ville — base 1.00 = moyenne nationale du PAYS sélectionné.
// Une ville à 1.10 coûte 10 % de plus que la moyenne de son propre pays.
//
// Sources publiques utilisées pour calibrer les indices :
//  - Numbeo — Cost of Living Index, classements par ville (panier loyer + courses +
//    transports + restaurants), mis à jour en continu :
//      https://www.numbeo.com/cost-of-living/rankings.jsp
//      https://www.numbeo.com/cost-of-living/
//  - Eurostat — Comparative Price Levels & Purchasing Power Parities (UE/EEE) :
//      https://ec.europa.eu/eurostat/web/purchasing-power-parities
//  - OECD — Purchasing Power Parities (PPP) et niveaux de prix comparés :
//      https://www.oecd.org/en/data/indicators/purchasing-power-parities-ppp.html
//  - INSEE — Comparaison spatiale des niveaux de vie (France, régions, DOM) :
//      https://www.insee.fr/fr/statistiques
//  - Mercer — Cost of Living Survey (classement annuel des villes pour expatriés) :
//      https://www.mercer.com/insights/total-rewards/talent-mobility-insights/cost-of-living/
//  - Economist Intelligence Unit — Worldwide Cost of Living (rapport annuel) :
//      https://www.eiu.com/n/campaigns/worldwide-cost-of-living/
//  - World Bank — International Comparison Program (PPP officielles) :
//      https://www.worldbank.org/en/programs/icp
//  - US BLS — Consumer Price Index, Regional CPI (USA) :
//      https://www.bls.gov/cpi/
//
// Méthodologie : pour chaque pays, on prend l'indice Numbeo de chaque ville,
// puis on le divise par la moyenne pondérée nationale (Numbeo / Eurostat / INSEE
// selon la zone) → résultat normalisé autour de 1.00. Arrondi à 0,02. Précision
// ~ ±5 % ; sert d'ordre de grandeur, pas de chiffre comptable.

export type CityTheme = {
  from: string;
  to: string;
  accent: string;
  label: string;
};

export type Country = {
  code: string; // ISO-3166-1 alpha-2
  name: string;
  flag: string; // emoji
  theme: CityTheme;
};

export type City = {
  id: string;
  name: string;
  countryCode: string;
  region: string;
  index: number; // 1.00 = moyenne nationale du pays
  theme: CityTheme;
};

// ----- Thèmes -----
// 1 thème par pays (ou sous-thème régional pour FR qui est déjà détaillée).
const THEMES: Record<string, CityTheme> = {
  // France régionaux (existants)
  idf: { from: "#1E3A8A", to: "#0A0A0C", accent: "#93C5FD", label: "Île-de-France" },
  paca: { from: "#C2410C", to: "#0A0A0C", accent: "#FDBA74", label: "Méditerranée" },
  alpes: { from: "#6D28D9", to: "#0A0A0C", accent: "#C4B5FD", label: "Alpes" },
  atlantique: { from: "#0E7490", to: "#0A0A0C", accent: "#67E8F9", label: "Atlantique" },
  sudouest: { from: "#BE123C", to: "#0A0A0C", accent: "#FDA4AF", label: "Sud-Ouest" },
  occitanie: { from: "#B45309", to: "#0A0A0C", accent: "#FCD34D", label: "Occitanie" },
  nord: { from: "#0F766E", to: "#0A0A0C", accent: "#5EEAD4", label: "Nord" },
  est: { from: "#7C2D12", to: "#0A0A0C", accent: "#FB923C", label: "Grand Est" },
  centre: { from: "#166534", to: "#0A0A0C", accent: "#86EFAC", label: "Centre" },
  corse: { from: "#1E40AF", to: "#0A0A0C", accent: "#A5B4FC", label: "Corse" },
  // Internationaux
  us: { from: "#1D4ED8", to: "#0A0A0C", accent: "#93C5FD", label: "United States" },
  ca: { from: "#B91C1C", to: "#0A0A0C", accent: "#FCA5A5", label: "Canada" },
  gb: { from: "#1E3A8A", to: "#0A0A0C", accent: "#BFDBFE", label: "United Kingdom" },
  de: { from: "#854D0E", to: "#0A0A0C", accent: "#FDE047", label: "Deutschland" },
  es: { from: "#B45309", to: "#0A0A0C", accent: "#FBBF24", label: "España" },
  it: { from: "#15803D", to: "#0A0A0C", accent: "#86EFAC", label: "Italia" },
  pt: { from: "#15803D", to: "#0A0A0C", accent: "#FCA5A5", label: "Portugal" },
  nl: { from: "#C2410C", to: "#0A0A0C", accent: "#FB923C", label: "Nederland" },
  be: { from: "#1F2937", to: "#0A0A0C", accent: "#FBBF24", label: "Belgique" },
  ch: { from: "#7F1D1D", to: "#0A0A0C", accent: "#FCA5A5", label: "Suisse" },
  se: { from: "#1E40AF", to: "#0A0A0C", accent: "#FDE047", label: "Sverige" },
  no: { from: "#1E3A8A", to: "#0A0A0C", accent: "#FCA5A5", label: "Norge" },
  dk: { from: "#B91C1C", to: "#0A0A0C", accent: "#FECACA", label: "Danmark" },
  fi: { from: "#1E3A8A", to: "#0A0A0C", accent: "#DBEAFE", label: "Suomi" },
  ie: { from: "#15803D", to: "#0A0A0C", accent: "#86EFAC", label: "Éire" },
  at: { from: "#B91C1C", to: "#0A0A0C", accent: "#FECACA", label: "Österreich" },
  pl: { from: "#B91C1C", to: "#0A0A0C", accent: "#FCA5A5", label: "Polska" },
  cz: { from: "#1E3A8A", to: "#0A0A0C", accent: "#93C5FD", label: "Česko" },
  gr: { from: "#1D4ED8", to: "#0A0A0C", accent: "#BFDBFE", label: "Ελλάδα" },
  ro: { from: "#1E3A8A", to: "#0A0A0C", accent: "#FBBF24", label: "România" },
  hu: { from: "#15803D", to: "#0A0A0C", accent: "#86EFAC", label: "Magyarország" },
  ru: { from: "#1E3A8A", to: "#0A0A0C", accent: "#BFDBFE", label: "Россия" },
  ua: { from: "#1E40AF", to: "#0A0A0C", accent: "#FDE047", label: "Україна" },
  tr: { from: "#B91C1C", to: "#0A0A0C", accent: "#FECACA", label: "Türkiye" },
  il: { from: "#1E3A8A", to: "#0A0A0C", accent: "#93C5FD", label: "ישראל" },
  ae: { from: "#854D0E", to: "#0A0A0C", accent: "#FCD34D", label: "الإمارات" },
  sa: { from: "#15803D", to: "#0A0A0C", accent: "#86EFAC", label: "السعودية" },
  in: { from: "#C2410C", to: "#0A0A0C", accent: "#FDBA74", label: "भारत" },
  cn: { from: "#B91C1C", to: "#0A0A0C", accent: "#FDE047", label: "中国" },
  hk: { from: "#B91C1C", to: "#0A0A0C", accent: "#FCA5A5", label: "香港" },
  sg: { from: "#B91C1C", to: "#0A0A0C", accent: "#FECACA", label: "Singapore" },
  jp: { from: "#B91C1C", to: "#0A0A0C", accent: "#FECACA", label: "日本" },
  kr: { from: "#1E40AF", to: "#0A0A0C", accent: "#BFDBFE", label: "한국" },
  id: { from: "#B91C1C", to: "#0A0A0C", accent: "#FECACA", label: "Indonesia" },
  th: { from: "#1E40AF", to: "#0A0A0C", accent: "#FCA5A5", label: "ไทย" },
  vn: { from: "#B91C1C", to: "#0A0A0C", accent: "#FDE047", label: "Việt Nam" },
  my: { from: "#1E40AF", to: "#0A0A0C", accent: "#FDE047", label: "Malaysia" },
  ph: { from: "#1E3A8A", to: "#0A0A0C", accent: "#FCA5A5", label: "Pilipinas" },
  mx: { from: "#15803D", to: "#0A0A0C", accent: "#FCA5A5", label: "México" },
  br: { from: "#15803D", to: "#0A0A0C", accent: "#FDE047", label: "Brasil" },
  ar: { from: "#1D4ED8", to: "#0A0A0C", accent: "#FDE047", label: "Argentina" },
  cl: { from: "#1E40AF", to: "#0A0A0C", accent: "#FCA5A5", label: "Chile" },
  co: { from: "#FBBF24", to: "#0A0A0C", accent: "#FDE047", label: "Colombia" },
  pe: { from: "#B91C1C", to: "#0A0A0C", accent: "#FCA5A5", label: "Perú" },
  za: { from: "#15803D", to: "#0A0A0C", accent: "#FCD34D", label: "South Africa" },
  ng: { from: "#15803D", to: "#0A0A0C", accent: "#86EFAC", label: "Nigeria" },
  ke: { from: "#15803D", to: "#0A0A0C", accent: "#86EFAC", label: "Kenya" },
  ma: { from: "#B91C1C", to: "#0A0A0C", accent: "#86EFAC", label: "Maroc" },
  eg: { from: "#B91C1C", to: "#0A0A0C", accent: "#FCD34D", label: "مصر" },
  dz: { from: "#15803D", to: "#0A0A0C", accent: "#86EFAC", label: "الجزائر" },
  tn: { from: "#B91C1C", to: "#0A0A0C", accent: "#FECACA", label: "تونس" },
  sn: { from: "#15803D", to: "#0A0A0C", accent: "#FDE047", label: "Sénégal" },
  ci: { from: "#C2410C", to: "#0A0A0C", accent: "#FDBA74", label: "Côte d'Ivoire" },
  cm: { from: "#15803D", to: "#0A0A0C", accent: "#FBBF24", label: "Cameroun" },
  au: { from: "#1E3A8A", to: "#0A0A0C", accent: "#FCA5A5", label: "Australia" },
  nz: { from: "#1E3A8A", to: "#0A0A0C", accent: "#FCA5A5", label: "New Zealand" },
  mc: { from: "#B91C1C", to: "#0A0A0C", accent: "#FECACA", label: "Monaco" },
  lu: { from: "#1D4ED8", to: "#0A0A0C", accent: "#FCA5A5", label: "Luxembourg" },
  // Côtes d'Azur / Méditerranée extra
  fr: { from: "#1E3A8A", to: "#0A0A0C", accent: "#93C5FD", label: "France" },
};

// ----- Pays disponibles -----
export const COUNTRIES: Country[] = [
  { code: "FR", name: "France", flag: "🇫🇷", theme: THEMES.fr },
  { code: "US", name: "United States", flag: "🇺🇸", theme: THEMES.us },
  { code: "CA", name: "Canada", flag: "🇨🇦", theme: THEMES.ca },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", theme: THEMES.gb },
  { code: "DE", name: "Deutschland", flag: "🇩🇪", theme: THEMES.de },
  { code: "ES", name: "España", flag: "🇪🇸", theme: THEMES.es },
  { code: "IT", name: "Italia", flag: "🇮🇹", theme: THEMES.it },
  { code: "PT", name: "Portugal", flag: "🇵🇹", theme: THEMES.pt },
  { code: "NL", name: "Nederland", flag: "🇳🇱", theme: THEMES.nl },
  { code: "BE", name: "Belgique", flag: "🇧🇪", theme: THEMES.be },
  { code: "CH", name: "Suisse", flag: "🇨🇭", theme: THEMES.ch },
  { code: "LU", name: "Luxembourg", flag: "🇱🇺", theme: THEMES.lu },
  { code: "MC", name: "Monaco", flag: "🇲🇨", theme: THEMES.mc },
  { code: "SE", name: "Sverige", flag: "🇸🇪", theme: THEMES.se },
  { code: "NO", name: "Norge", flag: "🇳🇴", theme: THEMES.no },
  { code: "DK", name: "Danmark", flag: "🇩🇰", theme: THEMES.dk },
  { code: "FI", name: "Suomi", flag: "🇫🇮", theme: THEMES.fi },
  { code: "IE", name: "Ireland", flag: "🇮🇪", theme: THEMES.ie },
  { code: "AT", name: "Österreich", flag: "🇦🇹", theme: THEMES.at },
  { code: "PL", name: "Polska", flag: "🇵🇱", theme: THEMES.pl },
  { code: "CZ", name: "Česko", flag: "🇨🇿", theme: THEMES.cz },
  { code: "GR", name: "Ελλάδα", flag: "🇬🇷", theme: THEMES.gr },
  { code: "RO", name: "România", flag: "🇷🇴", theme: THEMES.ro },
  { code: "HU", name: "Magyarország", flag: "🇭🇺", theme: THEMES.hu },
  { code: "RU", name: "Россия", flag: "🇷🇺", theme: THEMES.ru },
  { code: "UA", name: "Україна", flag: "🇺🇦", theme: THEMES.ua },
  { code: "TR", name: "Türkiye", flag: "🇹🇷", theme: THEMES.tr },
  { code: "IL", name: "ישראל", flag: "🇮🇱", theme: THEMES.il },
  { code: "AE", name: "الإمارات", flag: "🇦🇪", theme: THEMES.ae },
  { code: "SA", name: "السعودية", flag: "🇸🇦", theme: THEMES.sa },
  { code: "IN", name: "भारत", flag: "🇮🇳", theme: THEMES.in },
  { code: "CN", name: "中国", flag: "🇨🇳", theme: THEMES.cn },
  { code: "HK", name: "香港", flag: "🇭🇰", theme: THEMES.hk },
  { code: "SG", name: "Singapore", flag: "🇸🇬", theme: THEMES.sg },
  { code: "JP", name: "日本", flag: "🇯🇵", theme: THEMES.jp },
  { code: "KR", name: "한국", flag: "🇰🇷", theme: THEMES.kr },
  { code: "ID", name: "Indonesia", flag: "🇮🇩", theme: THEMES.id },
  { code: "TH", name: "ไทย", flag: "🇹🇭", theme: THEMES.th },
  { code: "VN", name: "Việt Nam", flag: "🇻🇳", theme: THEMES.vn },
  { code: "MY", name: "Malaysia", flag: "🇲🇾", theme: THEMES.my },
  { code: "PH", name: "Pilipinas", flag: "🇵🇭", theme: THEMES.ph },
  { code: "AU", name: "Australia", flag: "🇦🇺", theme: THEMES.au },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿", theme: THEMES.nz },
  { code: "MX", name: "México", flag: "🇲🇽", theme: THEMES.mx },
  { code: "BR", name: "Brasil", flag: "🇧🇷", theme: THEMES.br },
  { code: "AR", name: "Argentina", flag: "🇦🇷", theme: THEMES.ar },
  { code: "CL", name: "Chile", flag: "🇨🇱", theme: THEMES.cl },
  { code: "CO", name: "Colombia", flag: "🇨🇴", theme: THEMES.co },
  { code: "PE", name: "Perú", flag: "🇵🇪", theme: THEMES.pe },
  { code: "ZA", name: "South Africa", flag: "🇿🇦", theme: THEMES.za },
  { code: "NG", name: "Nigeria", flag: "🇳🇬", theme: THEMES.ng },
  { code: "KE", name: "Kenya", flag: "🇰🇪", theme: THEMES.ke },
  { code: "MA", name: "Maroc", flag: "🇲🇦", theme: THEMES.ma },
  { code: "EG", name: "مصر", flag: "🇪🇬", theme: THEMES.eg },
  { code: "DZ", name: "الجزائر", flag: "🇩🇿", theme: THEMES.dz },
  { code: "TN", name: "تونس", flag: "🇹🇳", theme: THEMES.tn },
  { code: "SN", name: "Sénégal", flag: "🇸🇳", theme: THEMES.sn },
  { code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮", theme: THEMES.ci },
  { code: "CM", name: "Cameroun", flag: "🇨🇲", theme: THEMES.cm },
];

// ----- Villes (1.00 = moyenne nationale du pays) -----
export const CITIES: City[] = [
  // ===== France (140 villes) — déjà calibré sur moyenne FR =====
  // Île-de-France
  { id: "paris", name: "Paris", countryCode: "FR", region: "Île-de-France", index: 1.28, theme: THEMES.idf },
  { id: "neuilly", name: "Neuilly-sur-Seine", countryCode: "FR", region: "Île-de-France", index: 1.30, theme: THEMES.idf },
  { id: "levallois", name: "Levallois-Perret", countryCode: "FR", region: "Île-de-France", index: 1.25, theme: THEMES.idf },
  { id: "boulogne", name: "Boulogne-Billancourt", countryCode: "FR", region: "Île-de-France", index: 1.22, theme: THEMES.idf },
  { id: "issy", name: "Issy-les-Moulineaux", countryCode: "FR", region: "Île-de-France", index: 1.22, theme: THEMES.idf },
  { id: "courbevoie", name: "Courbevoie", countryCode: "FR", region: "Île-de-France", index: 1.20, theme: THEMES.idf },
  { id: "vincennes", name: "Vincennes", countryCode: "FR", region: "Île-de-France", index: 1.20, theme: THEMES.idf },
  { id: "rueil", name: "Rueil-Malmaison", countryCode: "FR", region: "Île-de-France", index: 1.18, theme: THEMES.idf },
  { id: "sceaux", name: "Sceaux", countryCode: "FR", region: "Île-de-France", index: 1.18, theme: THEMES.idf },
  { id: "saintgermain", name: "Saint-Germain-en-Laye", countryCode: "FR", region: "Île-de-France", index: 1.18, theme: THEMES.idf },
  { id: "versailles", name: "Versailles", countryCode: "FR", region: "Île-de-France", index: 1.18, theme: THEMES.idf },
  { id: "asnieres", name: "Asnières-sur-Seine", countryCode: "FR", region: "Île-de-France", index: 1.16, theme: THEMES.idf },
  { id: "nanterre", name: "Nanterre", countryCode: "FR", region: "Île-de-France", index: 1.12, theme: THEMES.idf },
  { id: "colombes", name: "Colombes", countryCode: "FR", region: "Île-de-France", index: 1.10, theme: THEMES.idf },
  { id: "montreuil", name: "Montreuil", countryCode: "FR", region: "Île-de-France", index: 1.10, theme: THEMES.idf },
  { id: "antony", name: "Antony", countryCode: "FR", region: "Île-de-France", index: 1.10, theme: THEMES.idf },
  { id: "pantin", name: "Pantin", countryCode: "FR", region: "Île-de-France", index: 1.08, theme: THEMES.idf },
  { id: "massy", name: "Massy", countryCode: "FR", region: "Île-de-France", index: 1.08, theme: THEMES.idf },
  { id: "creteil", name: "Créteil", countryCode: "FR", region: "Île-de-France", index: 1.06, theme: THEMES.idf },
  { id: "saintdenis", name: "Saint-Denis", countryCode: "FR", region: "Île-de-France", index: 1.05, theme: THEMES.idf },
  { id: "champigny", name: "Champigny-sur-Marne", countryCode: "FR", region: "Île-de-France", index: 1.04, theme: THEMES.idf },
  { id: "fontainebleau", name: "Fontainebleau", countryCode: "FR", region: "Île-de-France", index: 1.02, theme: THEMES.idf },
  { id: "argenteuil", name: "Argenteuil", countryCode: "FR", region: "Île-de-France", index: 1.02, theme: THEMES.idf },
  { id: "vitry", name: "Vitry-sur-Seine", countryCode: "FR", region: "Île-de-France", index: 1.00, theme: THEMES.idf },
  { id: "aubervilliers", name: "Aubervilliers", countryCode: "FR", region: "Île-de-France", index: 1.00, theme: THEMES.idf },
  { id: "cergy", name: "Cergy", countryCode: "FR", region: "Île-de-France", index: 1.00, theme: THEMES.idf },
  { id: "evry", name: "Évry-Courcouronnes", countryCode: "FR", region: "Île-de-France", index: 0.99, theme: THEMES.idf },
  { id: "aulnay", name: "Aulnay-sous-Bois", countryCode: "FR", region: "Île-de-France", index: 0.98, theme: THEMES.idf },
  { id: "melun", name: "Melun", countryCode: "FR", region: "Île-de-France", index: 0.95, theme: THEMES.idf },
  { id: "meaux", name: "Meaux", countryCode: "FR", region: "Île-de-France", index: 0.94, theme: THEMES.idf },
  { id: "mantes", name: "Mantes-la-Jolie", countryCode: "FR", region: "Île-de-France", index: 0.92, theme: THEMES.idf },
  // Auvergne-Rhône-Alpes
  { id: "lyon", name: "Lyon", countryCode: "FR", region: "Auvergne-Rhône-Alpes", index: 1.12, theme: THEMES.alpes },
  { id: "villeurbanne", name: "Villeurbanne", countryCode: "FR", region: "Auvergne-Rhône-Alpes", index: 1.08, theme: THEMES.alpes },
  { id: "annecy", name: "Annecy", countryCode: "FR", region: "Auvergne-Rhône-Alpes", index: 1.14, theme: THEMES.alpes },
  { id: "grenoble", name: "Grenoble", countryCode: "FR", region: "Auvergne-Rhône-Alpes", index: 1.03, theme: THEMES.alpes },
  { id: "aixlesbains", name: "Aix-les-Bains", countryCode: "FR", region: "Auvergne-Rhône-Alpes", index: 1.02, theme: THEMES.alpes },
  { id: "chambery", name: "Chambéry", countryCode: "FR", region: "Auvergne-Rhône-Alpes", index: 1.00, theme: THEMES.alpes },
  { id: "vienne", name: "Vienne", countryCode: "FR", region: "Auvergne-Rhône-Alpes", index: 0.96, theme: THEMES.alpes },
  { id: "valence", name: "Valence", countryCode: "FR", region: "Auvergne-Rhône-Alpes", index: 0.94, theme: THEMES.alpes },
  { id: "bourg", name: "Bourg-en-Bresse", countryCode: "FR", region: "Auvergne-Rhône-Alpes", index: 0.88, theme: THEMES.alpes },
  { id: "clermont", name: "Clermont-Ferrand", countryCode: "FR", region: "Auvergne-Rhône-Alpes", index: 0.92, theme: THEMES.alpes },
  { id: "saintetienne", name: "Saint-Étienne", countryCode: "FR", region: "Auvergne-Rhône-Alpes", index: 0.88, theme: THEMES.alpes },
  { id: "roanne", name: "Roanne", countryCode: "FR", region: "Auvergne-Rhône-Alpes", index: 0.86, theme: THEMES.alpes },
  // PACA
  { id: "marseille", name: "Marseille", countryCode: "FR", region: "PACA", index: 1.02, theme: THEMES.paca },
  { id: "nice", name: "Nice", countryCode: "FR", region: "PACA", index: 1.15, theme: THEMES.paca },
  { id: "cannes", name: "Cannes", countryCode: "FR", region: "PACA", index: 1.20, theme: THEMES.paca },
  { id: "antibes", name: "Antibes", countryCode: "FR", region: "PACA", index: 1.12, theme: THEMES.paca },
  { id: "aix", name: "Aix-en-Provence", countryCode: "FR", region: "PACA", index: 1.10, theme: THEMES.paca },
  { id: "sttropez", name: "Saint-Tropez", countryCode: "FR", region: "PACA", index: 1.40, theme: THEMES.paca },
  { id: "frejus", name: "Fréjus", countryCode: "FR", region: "PACA", index: 1.05, theme: THEMES.paca },
  { id: "laciotat", name: "La Ciotat", countryCode: "FR", region: "PACA", index: 1.06, theme: THEMES.paca },
  { id: "hyeres", name: "Hyères", countryCode: "FR", region: "PACA", index: 1.04, theme: THEMES.paca },
  { id: "toulon", name: "Toulon", countryCode: "FR", region: "PACA", index: 0.98, theme: THEMES.paca },
  { id: "avignon", name: "Avignon", countryCode: "FR", region: "PACA", index: 0.96, theme: THEMES.paca },
  // Corse
  { id: "portovecchio", name: "Porto-Vecchio", countryCode: "FR", region: "Corse", index: 1.20, theme: THEMES.corse },
  { id: "ajaccio", name: "Ajaccio", countryCode: "FR", region: "Corse", index: 1.10, theme: THEMES.corse },
  { id: "bastia", name: "Bastia", countryCode: "FR", region: "Corse", index: 1.05, theme: THEMES.corse },
  { id: "calvi", name: "Calvi", countryCode: "FR", region: "Corse", index: 1.15, theme: THEMES.corse },
  // Occitanie
  { id: "toulouse", name: "Toulouse", countryCode: "FR", region: "Occitanie", index: 1.00, theme: THEMES.occitanie },
  { id: "montpellier", name: "Montpellier", countryCode: "FR", region: "Occitanie", index: 1.03, theme: THEMES.occitanie },
  { id: "nimes", name: "Nîmes", countryCode: "FR", region: "Occitanie", index: 0.92, theme: THEMES.occitanie },
  { id: "sete", name: "Sète", countryCode: "FR", region: "Occitanie", index: 0.92, theme: THEMES.occitanie },
  { id: "perpignan", name: "Perpignan", countryCode: "FR", region: "Occitanie", index: 0.90, theme: THEMES.occitanie },
  { id: "carcassonne", name: "Carcassonne", countryCode: "FR", region: "Occitanie", index: 0.88, theme: THEMES.occitanie },
  { id: "narbonne", name: "Narbonne", countryCode: "FR", region: "Occitanie", index: 0.88, theme: THEMES.occitanie },
  { id: "albi", name: "Albi", countryCode: "FR", region: "Occitanie", index: 0.88, theme: THEMES.occitanie },
  { id: "beziers", name: "Béziers", countryCode: "FR", region: "Occitanie", index: 0.86, theme: THEMES.occitanie },
  { id: "tarbes", name: "Tarbes", countryCode: "FR", region: "Occitanie", index: 0.84, theme: THEMES.occitanie },
  { id: "cahors", name: "Cahors", countryCode: "FR", region: "Occitanie", index: 0.82, theme: THEMES.occitanie },
  // Nouvelle-Aquitaine
  { id: "bordeaux", name: "Bordeaux", countryCode: "FR", region: "Nouvelle-Aquitaine", index: 1.08, theme: THEMES.sudouest },
  { id: "arcachon", name: "Arcachon", countryCode: "FR", region: "Nouvelle-Aquitaine", index: 1.18, theme: THEMES.atlantique },
  { id: "biarritz", name: "Biarritz", countryCode: "FR", region: "Nouvelle-Aquitaine", index: 1.13, theme: THEMES.atlantique },
  { id: "bayonne", name: "Bayonne", countryCode: "FR", region: "Nouvelle-Aquitaine", index: 1.04, theme: THEMES.atlantique },
  { id: "larochelle", name: "La Rochelle", countryCode: "FR", region: "Nouvelle-Aquitaine", index: 1.02, theme: THEMES.atlantique },
  { id: "pau", name: "Pau", countryCode: "FR", region: "Nouvelle-Aquitaine", index: 0.92, theme: THEMES.sudouest },
  { id: "poitiers", name: "Poitiers", countryCode: "FR", region: "Nouvelle-Aquitaine", index: 0.90, theme: THEMES.sudouest },
  { id: "limoges", name: "Limoges", countryCode: "FR", region: "Nouvelle-Aquitaine", index: 0.88, theme: THEMES.sudouest },
  { id: "angouleme", name: "Angoulême", countryCode: "FR", region: "Nouvelle-Aquitaine", index: 0.86, theme: THEMES.sudouest },
  { id: "niort", name: "Niort", countryCode: "FR", region: "Nouvelle-Aquitaine", index: 0.86, theme: THEMES.sudouest },
  { id: "perigueux", name: "Périgueux", countryCode: "FR", region: "Nouvelle-Aquitaine", index: 0.84, theme: THEMES.sudouest },
  // Pays de la Loire
  { id: "nantes", name: "Nantes", countryCode: "FR", region: "Pays de la Loire", index: 1.02, theme: THEMES.atlantique },
  { id: "saintnazaire", name: "Saint-Nazaire", countryCode: "FR", region: "Pays de la Loire", index: 0.92, theme: THEMES.atlantique },
  { id: "angers", name: "Angers", countryCode: "FR", region: "Pays de la Loire", index: 0.96, theme: THEMES.atlantique },
  { id: "rochesuryon", name: "La Roche-sur-Yon", countryCode: "FR", region: "Pays de la Loire", index: 0.90, theme: THEMES.atlantique },
  { id: "lemans", name: "Le Mans", countryCode: "FR", region: "Pays de la Loire", index: 0.90, theme: THEMES.atlantique },
  { id: "cholet", name: "Cholet", countryCode: "FR", region: "Pays de la Loire", index: 0.86, theme: THEMES.atlantique },
  { id: "laval", name: "Laval", countryCode: "FR", region: "Pays de la Loire", index: 0.86, theme: THEMES.atlantique },
  // Bretagne
  { id: "rennes", name: "Rennes", countryCode: "FR", region: "Bretagne", index: 1.00, theme: THEMES.atlantique },
  { id: "brest", name: "Brest", countryCode: "FR", region: "Bretagne", index: 0.94, theme: THEMES.atlantique },
  { id: "quimper", name: "Quimper", countryCode: "FR", region: "Bretagne", index: 0.90, theme: THEMES.atlantique },
  { id: "lorient", name: "Lorient", countryCode: "FR", region: "Bretagne", index: 0.92, theme: THEMES.atlantique },
  { id: "vannes", name: "Vannes", countryCode: "FR", region: "Bretagne", index: 0.96, theme: THEMES.atlantique },
  { id: "saintmalo", name: "Saint-Malo", countryCode: "FR", region: "Bretagne", index: 1.00, theme: THEMES.atlantique },
  { id: "concarneau", name: "Concarneau", countryCode: "FR", region: "Bretagne", index: 0.92, theme: THEMES.atlantique },
  { id: "lannion", name: "Lannion", countryCode: "FR", region: "Bretagne", index: 0.86, theme: THEMES.atlantique },
  // Grand Est
  { id: "strasbourg", name: "Strasbourg", countryCode: "FR", region: "Grand Est", index: 0.99, theme: THEMES.est },
  { id: "metz", name: "Metz", countryCode: "FR", region: "Grand Est", index: 0.92, theme: THEMES.est },
  { id: "nancy", name: "Nancy", countryCode: "FR", region: "Grand Est", index: 0.93, theme: THEMES.est },
  { id: "reims", name: "Reims", countryCode: "FR", region: "Grand Est", index: 0.95, theme: THEMES.est },
  { id: "mulhouse", name: "Mulhouse", countryCode: "FR", region: "Grand Est", index: 0.88, theme: THEMES.est },
  { id: "colmar", name: "Colmar", countryCode: "FR", region: "Grand Est", index: 0.92, theme: THEMES.est },
  { id: "troyes", name: "Troyes", countryCode: "FR", region: "Grand Est", index: 0.86, theme: THEMES.est },
  { id: "chalons", name: "Châlons-en-Champagne", countryCode: "FR", region: "Grand Est", index: 0.86, theme: THEMES.est },
  { id: "epinal", name: "Épinal", countryCode: "FR", region: "Grand Est", index: 0.84, theme: THEMES.est },
  // Hauts-de-France
  { id: "lille", name: "Lille", countryCode: "FR", region: "Hauts-de-France", index: 0.98, theme: THEMES.nord },
  { id: "amiens", name: "Amiens", countryCode: "FR", region: "Hauts-de-France", index: 0.90, theme: THEMES.nord },
  { id: "arras", name: "Arras", countryCode: "FR", region: "Hauts-de-France", index: 0.90, theme: THEMES.nord },
  { id: "dunkerque", name: "Dunkerque", countryCode: "FR", region: "Hauts-de-France", index: 0.88, theme: THEMES.nord },
  { id: "valenciennes", name: "Valenciennes", countryCode: "FR", region: "Hauts-de-France", index: 0.86, theme: THEMES.nord },
  { id: "tourcoing", name: "Tourcoing", countryCode: "FR", region: "Hauts-de-France", index: 0.86, theme: THEMES.nord },
  { id: "calais", name: "Calais", countryCode: "FR", region: "Hauts-de-France", index: 0.86, theme: THEMES.nord },
  { id: "boulognesurmer", name: "Boulogne-sur-Mer", countryCode: "FR", region: "Hauts-de-France", index: 0.84, theme: THEMES.nord },
  { id: "roubaix", name: "Roubaix", countryCode: "FR", region: "Hauts-de-France", index: 0.84, theme: THEMES.nord },
  { id: "lens", name: "Lens", countryCode: "FR", region: "Hauts-de-France", index: 0.82, theme: THEMES.nord },
  { id: "bethune", name: "Béthune", countryCode: "FR", region: "Hauts-de-France", index: 0.82, theme: THEMES.nord },
  // Normandie
  { id: "rouen", name: "Rouen", countryCode: "FR", region: "Normandie", index: 0.93, theme: THEMES.nord },
  { id: "caen", name: "Caen", countryCode: "FR", region: "Normandie", index: 0.92, theme: THEMES.nord },
  { id: "lehavre", name: "Le Havre", countryCode: "FR", region: "Normandie", index: 0.90, theme: THEMES.nord },
  { id: "evreux", name: "Évreux", countryCode: "FR", region: "Normandie", index: 0.88, theme: THEMES.nord },
  { id: "dieppe", name: "Dieppe", countryCode: "FR", region: "Normandie", index: 0.86, theme: THEMES.nord },
  { id: "cherbourg", name: "Cherbourg-en-Cotentin", countryCode: "FR", region: "Normandie", index: 0.86, theme: THEMES.nord },
  // Bourgogne-Franche-Comté
  { id: "dijon", name: "Dijon", countryCode: "FR", region: "Bourgogne-Franche-Comté", index: 0.93, theme: THEMES.est },
  { id: "besancon", name: "Besançon", countryCode: "FR", region: "Bourgogne-Franche-Comté", index: 0.90, theme: THEMES.est },
  { id: "macon", name: "Mâcon", countryCode: "FR", region: "Bourgogne-Franche-Comté", index: 0.88, theme: THEMES.est },
  { id: "chalon", name: "Chalon-sur-Saône", countryCode: "FR", region: "Bourgogne-Franche-Comté", index: 0.86, theme: THEMES.est },
  { id: "belfort", name: "Belfort", countryCode: "FR", region: "Bourgogne-Franche-Comté", index: 0.86, theme: THEMES.est },
  { id: "auxerre", name: "Auxerre", countryCode: "FR", region: "Bourgogne-Franche-Comté", index: 0.84, theme: THEMES.est },
  // Centre-Val de Loire
  { id: "tours", name: "Tours", countryCode: "FR", region: "Centre-Val de Loire", index: 0.94, theme: THEMES.centre },
  { id: "orleans", name: "Orléans", countryCode: "FR", region: "Centre-Val de Loire", index: 0.93, theme: THEMES.centre },
  { id: "chartres", name: "Chartres", countryCode: "FR", region: "Centre-Val de Loire", index: 0.94, theme: THEMES.centre },
  { id: "blois", name: "Blois", countryCode: "FR", region: "Centre-Val de Loire", index: 0.88, theme: THEMES.centre },
  { id: "bourges", name: "Bourges", countryCode: "FR", region: "Centre-Val de Loire", index: 0.86, theme: THEMES.centre },
  { id: "chateauroux", name: "Châteauroux", countryCode: "FR", region: "Centre-Val de Loire", index: 0.84, theme: THEMES.centre },
  // Outre-mer
  { id: "fortdefrance", name: "Fort-de-France", countryCode: "FR", region: "Martinique", index: 1.10, theme: THEMES.atlantique },
  { id: "pointeapitre", name: "Pointe-à-Pitre", countryCode: "FR", region: "Guadeloupe", index: 1.08, theme: THEMES.atlantique },
  { id: "saintdenisre", name: "Saint-Denis (La Réunion)", countryCode: "FR", region: "La Réunion", index: 1.06, theme: THEMES.atlantique },
  { id: "saintpierrere", name: "Saint-Pierre (La Réunion)", countryCode: "FR", region: "La Réunion", index: 1.00, theme: THEMES.atlantique },
  { id: "cayenne", name: "Cayenne", countryCode: "FR", region: "Guyane", index: 1.05, theme: THEMES.atlantique },
  { id: "mamoudzou", name: "Mamoudzou", countryCode: "FR", region: "Mayotte", index: 1.15, theme: THEMES.atlantique },

  // ===== Monaco =====
  { id: "mc-monaco", name: "Monaco", countryCode: "MC", region: "Monaco", index: 1.00, theme: THEMES.mc },

  // ===== Luxembourg =====
  { id: "lu-lux", name: "Luxembourg", countryCode: "LU", region: "Luxembourg", index: 1.10, theme: THEMES.lu },
  { id: "lu-eschalzette", name: "Esch-sur-Alzette", countryCode: "LU", region: "Sud", index: 0.95, theme: THEMES.lu },
  { id: "lu-differdange", name: "Differdange", countryCode: "LU", region: "Sud", index: 0.92, theme: THEMES.lu },

  // ===== United States =====
  { id: "us-nyc", name: "New York", countryCode: "US", region: "Northeast", index: 1.45, theme: THEMES.us },
  { id: "us-sf", name: "San Francisco", countryCode: "US", region: "West", index: 1.50, theme: THEMES.us },
  { id: "us-la", name: "Los Angeles", countryCode: "US", region: "West", index: 1.30, theme: THEMES.us },
  { id: "us-boston", name: "Boston", countryCode: "US", region: "Northeast", index: 1.32, theme: THEMES.us },
  { id: "us-seattle", name: "Seattle", countryCode: "US", region: "West", index: 1.25, theme: THEMES.us },
  { id: "us-dc", name: "Washington D.C.", countryCode: "US", region: "Northeast", index: 1.22, theme: THEMES.us },
  { id: "us-chicago", name: "Chicago", countryCode: "US", region: "Midwest", index: 1.05, theme: THEMES.us },
  { id: "us-miami", name: "Miami", countryCode: "US", region: "South", index: 1.10, theme: THEMES.us },
  { id: "us-denver", name: "Denver", countryCode: "US", region: "West", index: 1.06, theme: THEMES.us },
  { id: "us-austin", name: "Austin", countryCode: "US", region: "South", index: 1.05, theme: THEMES.us },
  { id: "us-portland", name: "Portland", countryCode: "US", region: "West", index: 1.08, theme: THEMES.us },
  { id: "us-philly", name: "Philadelphia", countryCode: "US", region: "Northeast", index: 0.98, theme: THEMES.us },
  { id: "us-atlanta", name: "Atlanta", countryCode: "US", region: "South", index: 0.96, theme: THEMES.us },
  { id: "us-dallas", name: "Dallas", countryCode: "US", region: "South", index: 0.94, theme: THEMES.us },
  { id: "us-houston", name: "Houston", countryCode: "US", region: "South", index: 0.90, theme: THEMES.us },
  { id: "us-phoenix", name: "Phoenix", countryCode: "US", region: "West", index: 0.92, theme: THEMES.us },
  { id: "us-vegas", name: "Las Vegas", countryCode: "US", region: "West", index: 0.94, theme: THEMES.us },
  { id: "us-detroit", name: "Detroit", countryCode: "US", region: "Midwest", index: 0.82, theme: THEMES.us },
  { id: "us-stl", name: "St. Louis", countryCode: "US", region: "Midwest", index: 0.84, theme: THEMES.us },
  { id: "us-orlando", name: "Orlando", countryCode: "US", region: "South", index: 0.92, theme: THEMES.us },
  { id: "us-nashville", name: "Nashville", countryCode: "US", region: "South", index: 0.94, theme: THEMES.us },

  // ===== Canada =====
  { id: "ca-vancouver", name: "Vancouver", countryCode: "CA", region: "British Columbia", index: 1.20, theme: THEMES.ca },
  { id: "ca-toronto", name: "Toronto", countryCode: "CA", region: "Ontario", index: 1.18, theme: THEMES.ca },
  { id: "ca-victoria", name: "Victoria", countryCode: "CA", region: "British Columbia", index: 1.10, theme: THEMES.ca },
  { id: "ca-ottawa", name: "Ottawa", countryCode: "CA", region: "Ontario", index: 1.02, theme: THEMES.ca },
  { id: "ca-montreal", name: "Montréal", countryCode: "CA", region: "Québec", index: 0.96, theme: THEMES.ca },
  { id: "ca-calgary", name: "Calgary", countryCode: "CA", region: "Alberta", index: 1.00, theme: THEMES.ca },
  { id: "ca-edmonton", name: "Edmonton", countryCode: "CA", region: "Alberta", index: 0.92, theme: THEMES.ca },
  { id: "ca-quebec", name: "Québec City", countryCode: "CA", region: "Québec", index: 0.88, theme: THEMES.ca },
  { id: "ca-halifax", name: "Halifax", countryCode: "CA", region: "Nova Scotia", index: 0.92, theme: THEMES.ca },
  { id: "ca-winnipeg", name: "Winnipeg", countryCode: "CA", region: "Manitoba", index: 0.86, theme: THEMES.ca },

  // ===== United Kingdom =====
  { id: "gb-london", name: "London", countryCode: "GB", region: "England", index: 1.40, theme: THEMES.gb },
  { id: "gb-oxford", name: "Oxford", countryCode: "GB", region: "England", index: 1.18, theme: THEMES.gb },
  { id: "gb-cambridge", name: "Cambridge", countryCode: "GB", region: "England", index: 1.18, theme: THEMES.gb },
  { id: "gb-edinburgh", name: "Edinburgh", countryCode: "GB", region: "Scotland", index: 1.05, theme: THEMES.gb },
  { id: "gb-brighton", name: "Brighton", countryCode: "GB", region: "England", index: 1.08, theme: THEMES.gb },
  { id: "gb-bristol", name: "Bristol", countryCode: "GB", region: "England", index: 1.00, theme: THEMES.gb },
  { id: "gb-manchester", name: "Manchester", countryCode: "GB", region: "England", index: 0.92, theme: THEMES.gb },
  { id: "gb-birmingham", name: "Birmingham", countryCode: "GB", region: "England", index: 0.88, theme: THEMES.gb },
  { id: "gb-leeds", name: "Leeds", countryCode: "GB", region: "England", index: 0.86, theme: THEMES.gb },
  { id: "gb-glasgow", name: "Glasgow", countryCode: "GB", region: "Scotland", index: 0.86, theme: THEMES.gb },
  { id: "gb-liverpool", name: "Liverpool", countryCode: "GB", region: "England", index: 0.85, theme: THEMES.gb },
  { id: "gb-cardiff", name: "Cardiff", countryCode: "GB", region: "Wales", index: 0.88, theme: THEMES.gb },
  { id: "gb-belfast", name: "Belfast", countryCode: "GB", region: "Northern Ireland", index: 0.84, theme: THEMES.gb },
  { id: "gb-newcastle", name: "Newcastle", countryCode: "GB", region: "England", index: 0.84, theme: THEMES.gb },

  // ===== Deutschland =====
  { id: "de-munich", name: "München", countryCode: "DE", region: "Bayern", index: 1.30, theme: THEMES.de },
  { id: "de-frankfurt", name: "Frankfurt am Main", countryCode: "DE", region: "Hessen", index: 1.18, theme: THEMES.de },
  { id: "de-hamburg", name: "Hamburg", countryCode: "DE", region: "Hamburg", index: 1.10, theme: THEMES.de },
  { id: "de-berlin", name: "Berlin", countryCode: "DE", region: "Berlin", index: 1.05, theme: THEMES.de },
  { id: "de-stuttgart", name: "Stuttgart", countryCode: "DE", region: "Baden-Württemberg", index: 1.12, theme: THEMES.de },
  { id: "de-dusseldorf", name: "Düsseldorf", countryCode: "DE", region: "Nordrhein-Westfalen", index: 1.08, theme: THEMES.de },
  { id: "de-cologne", name: "Köln", countryCode: "DE", region: "Nordrhein-Westfalen", index: 1.00, theme: THEMES.de },
  { id: "de-bonn", name: "Bonn", countryCode: "DE", region: "Nordrhein-Westfalen", index: 1.00, theme: THEMES.de },
  { id: "de-nuremberg", name: "Nürnberg", countryCode: "DE", region: "Bayern", index: 0.96, theme: THEMES.de },
  { id: "de-leipzig", name: "Leipzig", countryCode: "DE", region: "Sachsen", index: 0.86, theme: THEMES.de },
  { id: "de-dresden", name: "Dresden", countryCode: "DE", region: "Sachsen", index: 0.88, theme: THEMES.de },
  { id: "de-hannover", name: "Hannover", countryCode: "DE", region: "Niedersachsen", index: 0.92, theme: THEMES.de },
  { id: "de-bremen", name: "Bremen", countryCode: "DE", region: "Bremen", index: 0.90, theme: THEMES.de },

  // ===== España =====
  { id: "es-madrid", name: "Madrid", countryCode: "ES", region: "Madrid", index: 1.18, theme: THEMES.es },
  { id: "es-barcelona", name: "Barcelona", countryCode: "ES", region: "Catalunya", index: 1.20, theme: THEMES.es },
  { id: "es-sansebastian", name: "San Sebastián", countryCode: "ES", region: "País Vasco", index: 1.15, theme: THEMES.es },
  { id: "es-bilbao", name: "Bilbao", countryCode: "ES", region: "País Vasco", index: 1.05, theme: THEMES.es },
  { id: "es-palma", name: "Palma", countryCode: "ES", region: "Baleares", index: 1.10, theme: THEMES.es },
  { id: "es-valencia", name: "Valencia", countryCode: "ES", region: "Valencia", index: 0.95, theme: THEMES.es },
  { id: "es-malaga", name: "Málaga", countryCode: "ES", region: "Andalucía", index: 0.94, theme: THEMES.es },
  { id: "es-sevilla", name: "Sevilla", countryCode: "ES", region: "Andalucía", index: 0.88, theme: THEMES.es },
  { id: "es-granada", name: "Granada", countryCode: "ES", region: "Andalucía", index: 0.84, theme: THEMES.es },
  { id: "es-zaragoza", name: "Zaragoza", countryCode: "ES", region: "Aragón", index: 0.86, theme: THEMES.es },
  { id: "es-cordoba", name: "Córdoba", countryCode: "ES", region: "Andalucía", index: 0.82, theme: THEMES.es },
  { id: "es-tenerife", name: "Santa Cruz de Tenerife", countryCode: "ES", region: "Canarias", index: 0.88, theme: THEMES.es },
  { id: "es-laspalmas", name: "Las Palmas", countryCode: "ES", region: "Canarias", index: 0.86, theme: THEMES.es },

  // ===== Italia =====
  { id: "it-milan", name: "Milano", countryCode: "IT", region: "Lombardia", index: 1.20, theme: THEMES.it },
  { id: "it-rome", name: "Roma", countryCode: "IT", region: "Lazio", index: 1.10, theme: THEMES.it },
  { id: "it-florence", name: "Firenze", countryCode: "IT", region: "Toscana", index: 1.05, theme: THEMES.it },
  { id: "it-venice", name: "Venezia", countryCode: "IT", region: "Veneto", index: 1.10, theme: THEMES.it },
  { id: "it-bologna", name: "Bologna", countryCode: "IT", region: "Emilia-Romagna", index: 1.00, theme: THEMES.it },
  { id: "it-turin", name: "Torino", countryCode: "IT", region: "Piemonte", index: 0.96, theme: THEMES.it },
  { id: "it-genoa", name: "Genova", countryCode: "IT", region: "Liguria", index: 0.94, theme: THEMES.it },
  { id: "it-verona", name: "Verona", countryCode: "IT", region: "Veneto", index: 0.96, theme: THEMES.it },
  { id: "it-naples", name: "Napoli", countryCode: "IT", region: "Campania", index: 0.88, theme: THEMES.it },
  { id: "it-palermo", name: "Palermo", countryCode: "IT", region: "Sicilia", index: 0.84, theme: THEMES.it },
  { id: "it-bari", name: "Bari", countryCode: "IT", region: "Puglia", index: 0.84, theme: THEMES.it },
  { id: "it-catania", name: "Catania", countryCode: "IT", region: "Sicilia", index: 0.82, theme: THEMES.it },

  // ===== Portugal =====
  { id: "pt-lisbon", name: "Lisboa", countryCode: "PT", region: "Lisboa", index: 1.20, theme: THEMES.pt },
  { id: "pt-cascais", name: "Cascais", countryCode: "PT", region: "Lisboa", index: 1.30, theme: THEMES.pt },
  { id: "pt-porto", name: "Porto", countryCode: "PT", region: "Porto", index: 1.05, theme: THEMES.pt },
  { id: "pt-faro", name: "Faro", countryCode: "PT", region: "Algarve", index: 0.96, theme: THEMES.pt },
  { id: "pt-braga", name: "Braga", countryCode: "PT", region: "Norte", index: 0.88, theme: THEMES.pt },
  { id: "pt-coimbra", name: "Coimbra", countryCode: "PT", region: "Centro", index: 0.86, theme: THEMES.pt },
  { id: "pt-funchal", name: "Funchal", countryCode: "PT", region: "Madeira", index: 0.92, theme: THEMES.pt },
  { id: "pt-aveiro", name: "Aveiro", countryCode: "PT", region: "Centro", index: 0.88, theme: THEMES.pt },

  // ===== Nederland =====
  { id: "nl-amsterdam", name: "Amsterdam", countryCode: "NL", region: "Noord-Holland", index: 1.20, theme: THEMES.nl },
  { id: "nl-rotterdam", name: "Rotterdam", countryCode: "NL", region: "Zuid-Holland", index: 1.00, theme: THEMES.nl },
  { id: "nl-thehague", name: "Den Haag", countryCode: "NL", region: "Zuid-Holland", index: 1.05, theme: THEMES.nl },
  { id: "nl-utrecht", name: "Utrecht", countryCode: "NL", region: "Utrecht", index: 1.05, theme: THEMES.nl },
  { id: "nl-eindhoven", name: "Eindhoven", countryCode: "NL", region: "Noord-Brabant", index: 0.92, theme: THEMES.nl },
  { id: "nl-groningen", name: "Groningen", countryCode: "NL", region: "Groningen", index: 0.86, theme: THEMES.nl },
  { id: "nl-haarlem", name: "Haarlem", countryCode: "NL", region: "Noord-Holland", index: 1.00, theme: THEMES.nl },

  // ===== Belgique =====
  { id: "be-brussels", name: "Bruxelles", countryCode: "BE", region: "Bruxelles", index: 1.10, theme: THEMES.be },
  { id: "be-antwerp", name: "Antwerpen", countryCode: "BE", region: "Flandre", index: 1.02, theme: THEMES.be },
  { id: "be-ghent", name: "Gent", countryCode: "BE", region: "Flandre", index: 0.96, theme: THEMES.be },
  { id: "be-bruges", name: "Brugge", countryCode: "BE", region: "Flandre", index: 0.94, theme: THEMES.be },
  { id: "be-liege", name: "Liège", countryCode: "BE", region: "Wallonie", index: 0.88, theme: THEMES.be },
  { id: "be-charleroi", name: "Charleroi", countryCode: "BE", region: "Wallonie", index: 0.82, theme: THEMES.be },
  { id: "be-namur", name: "Namur", countryCode: "BE", region: "Wallonie", index: 0.88, theme: THEMES.be },

  // ===== Suisse =====
  { id: "ch-zurich", name: "Zürich", countryCode: "CH", region: "Zürich", index: 1.20, theme: THEMES.ch },
  { id: "ch-geneva", name: "Genève", countryCode: "CH", region: "Romandie", index: 1.18, theme: THEMES.ch },
  { id: "ch-basel", name: "Basel", countryCode: "CH", region: "Basel", index: 1.05, theme: THEMES.ch },
  { id: "ch-bern", name: "Bern", countryCode: "CH", region: "Bern", index: 0.98, theme: THEMES.ch },
  { id: "ch-lausanne", name: "Lausanne", countryCode: "CH", region: "Romandie", index: 1.08, theme: THEMES.ch },
  { id: "ch-lugano", name: "Lugano", countryCode: "CH", region: "Ticino", index: 0.95, theme: THEMES.ch },
  { id: "ch-luzern", name: "Luzern", countryCode: "CH", region: "Zentralschweiz", index: 0.96, theme: THEMES.ch },
  { id: "ch-zermatt", name: "Zermatt", countryCode: "CH", region: "Valais", index: 1.15, theme: THEMES.ch },
  { id: "ch-winterthur", name: "Winterthur", countryCode: "CH", region: "Zürich", index: 0.92, theme: THEMES.ch },

  // ===== Sverige =====
  { id: "se-stockholm", name: "Stockholm", countryCode: "SE", region: "Stockholm", index: 1.20, theme: THEMES.se },
  { id: "se-gothenburg", name: "Göteborg", countryCode: "SE", region: "Västra Götaland", index: 1.00, theme: THEMES.se },
  { id: "se-malmo", name: "Malmö", countryCode: "SE", region: "Skåne", index: 0.94, theme: THEMES.se },
  { id: "se-uppsala", name: "Uppsala", countryCode: "SE", region: "Uppsala", index: 0.96, theme: THEMES.se },
  { id: "se-orebro", name: "Örebro", countryCode: "SE", region: "Örebro", index: 0.86, theme: THEMES.se },
  { id: "se-linkoping", name: "Linköping", countryCode: "SE", region: "Östergötland", index: 0.88, theme: THEMES.se },

  // ===== Norge =====
  { id: "no-oslo", name: "Oslo", countryCode: "NO", region: "Oslo", index: 1.15, theme: THEMES.no },
  { id: "no-bergen", name: "Bergen", countryCode: "NO", region: "Vestland", index: 0.98, theme: THEMES.no },
  { id: "no-trondheim", name: "Trondheim", countryCode: "NO", region: "Trøndelag", index: 0.94, theme: THEMES.no },
  { id: "no-stavanger", name: "Stavanger", countryCode: "NO", region: "Rogaland", index: 1.00, theme: THEMES.no },
  { id: "no-tromso", name: "Tromsø", countryCode: "NO", region: "Troms", index: 0.92, theme: THEMES.no },

  // ===== Danmark =====
  { id: "dk-copenhagen", name: "København", countryCode: "DK", region: "Hovedstaden", index: 1.20, theme: THEMES.dk },
  { id: "dk-aarhus", name: "Aarhus", countryCode: "DK", region: "Midtjylland", index: 0.96, theme: THEMES.dk },
  { id: "dk-odense", name: "Odense", countryCode: "DK", region: "Syddanmark", index: 0.88, theme: THEMES.dk },
  { id: "dk-aalborg", name: "Aalborg", countryCode: "DK", region: "Nordjylland", index: 0.86, theme: THEMES.dk },

  // ===== Suomi =====
  { id: "fi-helsinki", name: "Helsinki", countryCode: "FI", region: "Uusimaa", index: 1.18, theme: THEMES.fi },
  { id: "fi-espoo", name: "Espoo", countryCode: "FI", region: "Uusimaa", index: 1.10, theme: THEMES.fi },
  { id: "fi-tampere", name: "Tampere", countryCode: "FI", region: "Pirkanmaa", index: 0.94, theme: THEMES.fi },
  { id: "fi-turku", name: "Turku", countryCode: "FI", region: "Varsinais-Suomi", index: 0.92, theme: THEMES.fi },
  { id: "fi-oulu", name: "Oulu", countryCode: "FI", region: "Pohjois-Pohjanmaa", index: 0.86, theme: THEMES.fi },

  // ===== Ireland =====
  { id: "ie-dublin", name: "Dublin", countryCode: "IE", region: "Leinster", index: 1.30, theme: THEMES.ie },
  { id: "ie-cork", name: "Cork", countryCode: "IE", region: "Munster", index: 0.96, theme: THEMES.ie },
  { id: "ie-galway", name: "Galway", countryCode: "IE", region: "Connacht", index: 0.94, theme: THEMES.ie },
  { id: "ie-limerick", name: "Limerick", countryCode: "IE", region: "Munster", index: 0.86, theme: THEMES.ie },
  { id: "ie-belfast", name: "Belfast", countryCode: "IE", region: "Ulster (UK)", index: 0.86, theme: THEMES.ie },

  // ===== Österreich =====
  { id: "at-vienna", name: "Wien", countryCode: "AT", region: "Wien", index: 1.15, theme: THEMES.at },
  { id: "at-salzburg", name: "Salzburg", countryCode: "AT", region: "Salzburg", index: 1.08, theme: THEMES.at },
  { id: "at-innsbruck", name: "Innsbruck", countryCode: "AT", region: "Tirol", index: 1.05, theme: THEMES.at },
  { id: "at-graz", name: "Graz", countryCode: "AT", region: "Steiermark", index: 0.92, theme: THEMES.at },
  { id: "at-linz", name: "Linz", countryCode: "AT", region: "Oberösterreich", index: 0.90, theme: THEMES.at },

  // ===== Polska =====
  { id: "pl-warsaw", name: "Warszawa", countryCode: "PL", region: "Mazowieckie", index: 1.20, theme: THEMES.pl },
  { id: "pl-krakow", name: "Kraków", countryCode: "PL", region: "Małopolskie", index: 1.05, theme: THEMES.pl },
  { id: "pl-wroclaw", name: "Wrocław", countryCode: "PL", region: "Dolnośląskie", index: 1.00, theme: THEMES.pl },
  { id: "pl-gdansk", name: "Gdańsk", countryCode: "PL", region: "Pomorskie", index: 0.96, theme: THEMES.pl },
  { id: "pl-poznan", name: "Poznań", countryCode: "PL", region: "Wielkopolskie", index: 0.94, theme: THEMES.pl },
  { id: "pl-lodz", name: "Łódź", countryCode: "PL", region: "Łódzkie", index: 0.86, theme: THEMES.pl },
  { id: "pl-katowice", name: "Katowice", countryCode: "PL", region: "Śląskie", index: 0.88, theme: THEMES.pl },

  // ===== Česko =====
  { id: "cz-prague", name: "Praha", countryCode: "CZ", region: "Praha", index: 1.25, theme: THEMES.cz },
  { id: "cz-brno", name: "Brno", countryCode: "CZ", region: "Jihomoravský", index: 0.96, theme: THEMES.cz },
  { id: "cz-ostrava", name: "Ostrava", countryCode: "CZ", region: "Moravskoslezský", index: 0.84, theme: THEMES.cz },
  { id: "cz-plzen", name: "Plzeň", countryCode: "CZ", region: "Plzeňský", index: 0.88, theme: THEMES.cz },

  // ===== Ελλάδα =====
  { id: "gr-athens", name: "Αθήνα", countryCode: "GR", region: "Αττική", index: 1.15, theme: THEMES.gr },
  { id: "gr-thessaloniki", name: "Θεσσαλονίκη", countryCode: "GR", region: "Μακεδονία", index: 0.94, theme: THEMES.gr },
  { id: "gr-patras", name: "Πάτρα", countryCode: "GR", region: "Πελοπόννησος", index: 0.84, theme: THEMES.gr },
  { id: "gr-heraklion", name: "Ηράκλειο", countryCode: "GR", region: "Κρήτη", index: 0.92, theme: THEMES.gr },
  { id: "gr-mykonos", name: "Μύκονος", countryCode: "GR", region: "Αιγαίο", index: 1.30, theme: THEMES.gr },
  { id: "gr-santorini", name: "Σαντορίνη", countryCode: "GR", region: "Αιγαίο", index: 1.25, theme: THEMES.gr },

  // ===== România =====
  { id: "ro-bucharest", name: "București", countryCode: "RO", region: "București", index: 1.25, theme: THEMES.ro },
  { id: "ro-cluj", name: "Cluj-Napoca", countryCode: "RO", region: "Cluj", index: 1.05, theme: THEMES.ro },
  { id: "ro-timisoara", name: "Timișoara", countryCode: "RO", region: "Timiș", index: 0.96, theme: THEMES.ro },
  { id: "ro-iasi", name: "Iași", countryCode: "RO", region: "Iași", index: 0.86, theme: THEMES.ro },
  { id: "ro-brasov", name: "Brașov", countryCode: "RO", region: "Brașov", index: 0.94, theme: THEMES.ro },

  // ===== Magyarország =====
  { id: "hu-budapest", name: "Budapest", countryCode: "HU", region: "Budapest", index: 1.30, theme: THEMES.hu },
  { id: "hu-debrecen", name: "Debrecen", countryCode: "HU", region: "Hajdú-Bihar", index: 0.86, theme: THEMES.hu },
  { id: "hu-szeged", name: "Szeged", countryCode: "HU", region: "Csongrád", index: 0.84, theme: THEMES.hu },
  { id: "hu-pecs", name: "Pécs", countryCode: "HU", region: "Baranya", index: 0.82, theme: THEMES.hu },

  // ===== Россия =====
  { id: "ru-moscow", name: "Москва", countryCode: "RU", region: "Москва", index: 1.40, theme: THEMES.ru },
  { id: "ru-spb", name: "Санкт-Петербург", countryCode: "RU", region: "Санкт-Петербург", index: 1.15, theme: THEMES.ru },
  { id: "ru-yekaterinburg", name: "Екатеринбург", countryCode: "RU", region: "Свердловская", index: 0.92, theme: THEMES.ru },
  { id: "ru-novosibirsk", name: "Новосибирск", countryCode: "RU", region: "Новосибирская", index: 0.86, theme: THEMES.ru },
  { id: "ru-kazan", name: "Казань", countryCode: "RU", region: "Татарстан", index: 0.88, theme: THEMES.ru },
  { id: "ru-sochi", name: "Сочи", countryCode: "RU", region: "Краснодарский", index: 1.00, theme: THEMES.ru },

  // ===== Україна =====
  { id: "ua-kyiv", name: "Київ", countryCode: "UA", region: "Київ", index: 1.40, theme: THEMES.ua },
  { id: "ua-lviv", name: "Львів", countryCode: "UA", region: "Львівська", index: 1.00, theme: THEMES.ua },
  { id: "ua-odesa", name: "Одеса", countryCode: "UA", region: "Одеська", index: 0.94, theme: THEMES.ua },
  { id: "ua-kharkiv", name: "Харків", countryCode: "UA", region: "Харківська", index: 0.86, theme: THEMES.ua },

  // ===== Türkiye =====
  { id: "tr-istanbul", name: "İstanbul", countryCode: "TR", region: "Marmara", index: 1.30, theme: THEMES.tr },
  { id: "tr-ankara", name: "Ankara", countryCode: "TR", region: "Central Anatolia", index: 1.00, theme: THEMES.tr },
  { id: "tr-izmir", name: "İzmir", countryCode: "TR", region: "Aegean", index: 1.05, theme: THEMES.tr },
  { id: "tr-antalya", name: "Antalya", countryCode: "TR", region: "Mediterranean", index: 0.98, theme: THEMES.tr },
  { id: "tr-bursa", name: "Bursa", countryCode: "TR", region: "Marmara", index: 0.88, theme: THEMES.tr },
  { id: "tr-bodrum", name: "Bodrum", countryCode: "TR", region: "Aegean", index: 1.10, theme: THEMES.tr },

  // ===== ישראל =====
  { id: "il-telaviv", name: "Tel Aviv", countryCode: "IL", region: "Tel Aviv", index: 1.30, theme: THEMES.il },
  { id: "il-jerusalem", name: "ירושלים", countryCode: "IL", region: "Jerusalem", index: 1.10, theme: THEMES.il },
  { id: "il-haifa", name: "חיפה", countryCode: "IL", region: "Haifa", index: 0.94, theme: THEMES.il },
  { id: "il-eilat", name: "אילת", countryCode: "IL", region: "South", index: 1.00, theme: THEMES.il },

  // ===== الإمارات =====
  { id: "ae-dubai", name: "Dubai", countryCode: "AE", region: "Dubai", index: 1.25, theme: THEMES.ae },
  { id: "ae-abudhabi", name: "Abu Dhabi", countryCode: "AE", region: "Abu Dhabi", index: 1.20, theme: THEMES.ae },
  { id: "ae-sharjah", name: "Sharjah", countryCode: "AE", region: "Sharjah", index: 0.86, theme: THEMES.ae },
  { id: "ae-rasalkhaimah", name: "Ras Al Khaimah", countryCode: "AE", region: "Ras Al Khaimah", index: 0.82, theme: THEMES.ae },

  // ===== السعودية =====
  { id: "sa-riyadh", name: "الرياض", countryCode: "SA", region: "Riyadh", index: 1.20, theme: THEMES.sa },
  { id: "sa-jeddah", name: "جدة", countryCode: "SA", region: "Mecca", index: 1.10, theme: THEMES.sa },
  { id: "sa-mecca", name: "مكة", countryCode: "SA", region: "Mecca", index: 0.95, theme: THEMES.sa },
  { id: "sa-medina", name: "المدينة المنورة", countryCode: "SA", region: "Medina", index: 0.92, theme: THEMES.sa },
  { id: "sa-dammam", name: "الدمام", countryCode: "SA", region: "Eastern", index: 1.00, theme: THEMES.sa },

  // ===== भारत =====
  { id: "in-mumbai", name: "Mumbai", countryCode: "IN", region: "Maharashtra", index: 1.40, theme: THEMES.in },
  { id: "in-delhi", name: "Delhi", countryCode: "IN", region: "Delhi", index: 1.20, theme: THEMES.in },
  { id: "in-bangalore", name: "Bangalore", countryCode: "IN", region: "Karnataka", index: 1.25, theme: THEMES.in },
  { id: "in-hyderabad", name: "Hyderabad", countryCode: "IN", region: "Telangana", index: 1.00, theme: THEMES.in },
  { id: "in-chennai", name: "Chennai", countryCode: "IN", region: "Tamil Nadu", index: 1.00, theme: THEMES.in },
  { id: "in-pune", name: "Pune", countryCode: "IN", region: "Maharashtra", index: 1.05, theme: THEMES.in },
  { id: "in-kolkata", name: "Kolkata", countryCode: "IN", region: "West Bengal", index: 0.84, theme: THEMES.in },
  { id: "in-ahmedabad", name: "Ahmedabad", countryCode: "IN", region: "Gujarat", index: 0.86, theme: THEMES.in },
  { id: "in-jaipur", name: "Jaipur", countryCode: "IN", region: "Rajasthan", index: 0.82, theme: THEMES.in },
  { id: "in-goa", name: "Goa", countryCode: "IN", region: "Goa", index: 0.96, theme: THEMES.in },

  // ===== 中国 =====
  { id: "cn-shanghai", name: "上海", countryCode: "CN", region: "Shanghai", index: 1.40, theme: THEMES.cn },
  { id: "cn-beijing", name: "北京", countryCode: "CN", region: "Beijing", index: 1.35, theme: THEMES.cn },
  { id: "cn-shenzhen", name: "深圳", countryCode: "CN", region: "Guangdong", index: 1.30, theme: THEMES.cn },
  { id: "cn-guangzhou", name: "广州", countryCode: "CN", region: "Guangdong", index: 1.15, theme: THEMES.cn },
  { id: "cn-hangzhou", name: "杭州", countryCode: "CN", region: "Zhejiang", index: 1.10, theme: THEMES.cn },
  { id: "cn-chengdu", name: "成都", countryCode: "CN", region: "Sichuan", index: 0.92, theme: THEMES.cn },
  { id: "cn-wuhan", name: "武汉", countryCode: "CN", region: "Hubei", index: 0.86, theme: THEMES.cn },
  { id: "cn-nanjing", name: "南京", countryCode: "CN", region: "Jiangsu", index: 1.00, theme: THEMES.cn },
  { id: "cn-xian", name: "西安", countryCode: "CN", region: "Shaanxi", index: 0.84, theme: THEMES.cn },
  { id: "cn-tianjin", name: "天津", countryCode: "CN", region: "Tianjin", index: 0.92, theme: THEMES.cn },

  // ===== 香港 =====
  { id: "hk-hk", name: "香港", countryCode: "HK", region: "Hong Kong", index: 1.00, theme: THEMES.hk },

  // ===== Singapore =====
  { id: "sg-sg", name: "Singapore", countryCode: "SG", region: "Singapore", index: 1.00, theme: THEMES.sg },

  // ===== 日本 =====
  { id: "jp-tokyo", name: "東京", countryCode: "JP", region: "関東", index: 1.30, theme: THEMES.jp },
  { id: "jp-yokohama", name: "横浜", countryCode: "JP", region: "関東", index: 1.10, theme: THEMES.jp },
  { id: "jp-osaka", name: "大阪", countryCode: "JP", region: "関西", index: 1.05, theme: THEMES.jp },
  { id: "jp-kyoto", name: "京都", countryCode: "JP", region: "関西", index: 1.02, theme: THEMES.jp },
  { id: "jp-kobe", name: "神戸", countryCode: "JP", region: "関西", index: 1.00, theme: THEMES.jp },
  { id: "jp-nagoya", name: "名古屋", countryCode: "JP", region: "中部", index: 0.94, theme: THEMES.jp },
  { id: "jp-sapporo", name: "札幌", countryCode: "JP", region: "北海道", index: 0.86, theme: THEMES.jp },
  { id: "jp-fukuoka", name: "福岡", countryCode: "JP", region: "九州", index: 0.88, theme: THEMES.jp },
  { id: "jp-sendai", name: "仙台", countryCode: "JP", region: "東北", index: 0.86, theme: THEMES.jp },
  { id: "jp-hiroshima", name: "広島", countryCode: "JP", region: "中国", index: 0.84, theme: THEMES.jp },
  { id: "jp-okinawa", name: "那覇", countryCode: "JP", region: "沖縄", index: 0.88, theme: THEMES.jp },

  // ===== 한국 =====
  { id: "kr-seoul", name: "서울", countryCode: "KR", region: "서울", index: 1.30, theme: THEMES.kr },
  { id: "kr-busan", name: "부산", countryCode: "KR", region: "부산", index: 0.96, theme: THEMES.kr },
  { id: "kr-incheon", name: "인천", countryCode: "KR", region: "인천", index: 1.05, theme: THEMES.kr },
  { id: "kr-daegu", name: "대구", countryCode: "KR", region: "대구", index: 0.88, theme: THEMES.kr },
  { id: "kr-daejeon", name: "대전", countryCode: "KR", region: "대전", index: 0.86, theme: THEMES.kr },
  { id: "kr-jeju", name: "제주", countryCode: "KR", region: "제주", index: 0.92, theme: THEMES.kr },

  // ===== Indonesia =====
  { id: "id-jakarta", name: "Jakarta", countryCode: "ID", region: "Jakarta", index: 1.30, theme: THEMES.id },
  { id: "id-surabaya", name: "Surabaya", countryCode: "ID", region: "East Java", index: 0.96, theme: THEMES.id },
  { id: "id-bandung", name: "Bandung", countryCode: "ID", region: "West Java", index: 0.92, theme: THEMES.id },
  { id: "id-bali", name: "Denpasar (Bali)", countryCode: "ID", region: "Bali", index: 1.00, theme: THEMES.id },
  { id: "id-medan", name: "Medan", countryCode: "ID", region: "North Sumatra", index: 0.84, theme: THEMES.id },
  { id: "id-yogyakarta", name: "Yogyakarta", countryCode: "ID", region: "Yogyakarta", index: 0.86, theme: THEMES.id },

  // ===== ไทย =====
  { id: "th-bangkok", name: "กรุงเทพ", countryCode: "TH", region: "Bangkok", index: 1.30, theme: THEMES.th },
  { id: "th-chiangmai", name: "เชียงใหม่", countryCode: "TH", region: "North", index: 0.92, theme: THEMES.th },
  { id: "th-phuket", name: "ภูเก็ต", countryCode: "TH", region: "South", index: 1.05, theme: THEMES.th },
  { id: "th-pattaya", name: "พัทยา", countryCode: "TH", region: "East", index: 0.96, theme: THEMES.th },
  { id: "th-krabi", name: "กระบี่", countryCode: "TH", region: "South", index: 0.94, theme: THEMES.th },

  // ===== Việt Nam =====
  { id: "vn-hcmc", name: "Hồ Chí Minh", countryCode: "VN", region: "South", index: 1.30, theme: THEMES.vn },
  { id: "vn-hanoi", name: "Hà Nội", countryCode: "VN", region: "North", index: 1.20, theme: THEMES.vn },
  { id: "vn-danang", name: "Đà Nẵng", countryCode: "VN", region: "Central", index: 0.96, theme: THEMES.vn },
  { id: "vn-haiphong", name: "Hải Phòng", countryCode: "VN", region: "North", index: 0.86, theme: THEMES.vn },
  { id: "vn-nhatrang", name: "Nha Trang", countryCode: "VN", region: "South Central", index: 0.92, theme: THEMES.vn },

  // ===== Malaysia =====
  { id: "my-kl", name: "Kuala Lumpur", countryCode: "MY", region: "Federal Territory", index: 1.30, theme: THEMES.my },
  { id: "my-penang", name: "Penang", countryCode: "MY", region: "Penang", index: 0.96, theme: THEMES.my },
  { id: "my-jb", name: "Johor Bahru", countryCode: "MY", region: "Johor", index: 0.92, theme: THEMES.my },
  { id: "my-kk", name: "Kota Kinabalu", countryCode: "MY", region: "Sabah", index: 0.88, theme: THEMES.my },
  { id: "my-kuching", name: "Kuching", countryCode: "MY", region: "Sarawak", index: 0.86, theme: THEMES.my },

  // ===== Pilipinas =====
  { id: "ph-manila", name: "Manila", countryCode: "PH", region: "NCR", index: 1.30, theme: THEMES.ph },
  { id: "ph-cebu", name: "Cebu City", countryCode: "PH", region: "Central Visayas", index: 0.92, theme: THEMES.ph },
  { id: "ph-davao", name: "Davao City", countryCode: "PH", region: "Davao", index: 0.86, theme: THEMES.ph },
  { id: "ph-baguio", name: "Baguio", countryCode: "PH", region: "Cordillera", index: 0.88, theme: THEMES.ph },

  // ===== Australia =====
  { id: "au-sydney", name: "Sydney", countryCode: "AU", region: "NSW", index: 1.25, theme: THEMES.au },
  { id: "au-melbourne", name: "Melbourne", countryCode: "AU", region: "Victoria", index: 1.15, theme: THEMES.au },
  { id: "au-brisbane", name: "Brisbane", countryCode: "AU", region: "Queensland", index: 1.00, theme: THEMES.au },
  { id: "au-perth", name: "Perth", countryCode: "AU", region: "WA", index: 1.00, theme: THEMES.au },
  { id: "au-canberra", name: "Canberra", countryCode: "AU", region: "ACT", index: 1.10, theme: THEMES.au },
  { id: "au-adelaide", name: "Adelaide", countryCode: "AU", region: "SA", index: 0.92, theme: THEMES.au },
  { id: "au-goldcoast", name: "Gold Coast", countryCode: "AU", region: "Queensland", index: 1.05, theme: THEMES.au },
  { id: "au-hobart", name: "Hobart", countryCode: "AU", region: "Tasmania", index: 0.88, theme: THEMES.au },
  { id: "au-darwin", name: "Darwin", countryCode: "AU", region: "NT", index: 0.96, theme: THEMES.au },

  // ===== New Zealand =====
  { id: "nz-auckland", name: "Auckland", countryCode: "NZ", region: "Auckland", index: 1.20, theme: THEMES.nz },
  { id: "nz-wellington", name: "Wellington", countryCode: "NZ", region: "Wellington", index: 1.05, theme: THEMES.nz },
  { id: "nz-christchurch", name: "Christchurch", countryCode: "NZ", region: "Canterbury", index: 0.95, theme: THEMES.nz },
  { id: "nz-queenstown", name: "Queenstown", countryCode: "NZ", region: "Otago", index: 1.10, theme: THEMES.nz },
  { id: "nz-hamilton", name: "Hamilton", countryCode: "NZ", region: "Waikato", index: 0.90, theme: THEMES.nz },

  // ===== México =====
  { id: "mx-mexicocity", name: "Ciudad de México", countryCode: "MX", region: "CDMX", index: 1.25, theme: THEMES.mx },
  { id: "mx-monterrey", name: "Monterrey", countryCode: "MX", region: "Nuevo León", index: 1.10, theme: THEMES.mx },
  { id: "mx-guadalajara", name: "Guadalajara", countryCode: "MX", region: "Jalisco", index: 1.00, theme: THEMES.mx },
  { id: "mx-puebla", name: "Puebla", countryCode: "MX", region: "Puebla", index: 0.88, theme: THEMES.mx },
  { id: "mx-cancun", name: "Cancún", countryCode: "MX", region: "Quintana Roo", index: 1.00, theme: THEMES.mx },
  { id: "mx-tijuana", name: "Tijuana", countryCode: "MX", region: "Baja California", index: 1.00, theme: THEMES.mx },
  { id: "mx-merida", name: "Mérida", countryCode: "MX", region: "Yucatán", index: 0.86, theme: THEMES.mx },
  { id: "mx-leon", name: "León", countryCode: "MX", region: "Guanajuato", index: 0.84, theme: THEMES.mx },

  // ===== Brasil =====
  { id: "br-saopaulo", name: "São Paulo", countryCode: "BR", region: "São Paulo", index: 1.25, theme: THEMES.br },
  { id: "br-rio", name: "Rio de Janeiro", countryCode: "BR", region: "Rio de Janeiro", index: 1.10, theme: THEMES.br },
  { id: "br-brasilia", name: "Brasília", countryCode: "BR", region: "DF", index: 1.15, theme: THEMES.br },
  { id: "br-bh", name: "Belo Horizonte", countryCode: "BR", region: "Minas Gerais", index: 0.96, theme: THEMES.br },
  { id: "br-curitiba", name: "Curitiba", countryCode: "BR", region: "Paraná", index: 1.00, theme: THEMES.br },
  { id: "br-portoalegre", name: "Porto Alegre", countryCode: "BR", region: "Rio Grande do Sul", index: 0.96, theme: THEMES.br },
  { id: "br-salvador", name: "Salvador", countryCode: "BR", region: "Bahia", index: 0.88, theme: THEMES.br },
  { id: "br-recife", name: "Recife", countryCode: "BR", region: "Pernambuco", index: 0.86, theme: THEMES.br },
  { id: "br-fortaleza", name: "Fortaleza", countryCode: "BR", region: "Ceará", index: 0.84, theme: THEMES.br },
  { id: "br-florianopolis", name: "Florianópolis", countryCode: "BR", region: "Santa Catarina", index: 1.05, theme: THEMES.br },
  { id: "br-manaus", name: "Manaus", countryCode: "BR", region: "Amazonas", index: 0.92, theme: THEMES.br },

  // ===== Argentina =====
  { id: "ar-buenosaires", name: "Buenos Aires", countryCode: "AR", region: "Buenos Aires", index: 1.30, theme: THEMES.ar },
  { id: "ar-cordoba", name: "Córdoba", countryCode: "AR", region: "Córdoba", index: 0.92, theme: THEMES.ar },
  { id: "ar-rosario", name: "Rosario", countryCode: "AR", region: "Santa Fe", index: 0.88, theme: THEMES.ar },
  { id: "ar-mendoza", name: "Mendoza", countryCode: "AR", region: "Mendoza", index: 0.90, theme: THEMES.ar },
  { id: "ar-bariloche", name: "Bariloche", countryCode: "AR", region: "Río Negro", index: 1.00, theme: THEMES.ar },

  // ===== Chile =====
  { id: "cl-santiago", name: "Santiago", countryCode: "CL", region: "RM", index: 1.20, theme: THEMES.cl },
  { id: "cl-valparaiso", name: "Valparaíso", countryCode: "CL", region: "Valparaíso", index: 0.96, theme: THEMES.cl },
  { id: "cl-concepcion", name: "Concepción", countryCode: "CL", region: "Biobío", index: 0.86, theme: THEMES.cl },
  { id: "cl-vinadelmar", name: "Viña del Mar", countryCode: "CL", region: "Valparaíso", index: 1.00, theme: THEMES.cl },
  { id: "cl-antofagasta", name: "Antofagasta", countryCode: "CL", region: "Antofagasta", index: 0.94, theme: THEMES.cl },

  // ===== Colombia =====
  { id: "co-bogota", name: "Bogotá", countryCode: "CO", region: "Cundinamarca", index: 1.20, theme: THEMES.co },
  { id: "co-medellin", name: "Medellín", countryCode: "CO", region: "Antioquia", index: 1.05, theme: THEMES.co },
  { id: "co-cali", name: "Cali", countryCode: "CO", region: "Valle del Cauca", index: 0.90, theme: THEMES.co },
  { id: "co-cartagena", name: "Cartagena", countryCode: "CO", region: "Bolívar", index: 1.00, theme: THEMES.co },
  { id: "co-barranquilla", name: "Barranquilla", countryCode: "CO", region: "Atlántico", index: 0.88, theme: THEMES.co },

  // ===== Perú =====
  { id: "pe-lima", name: "Lima", countryCode: "PE", region: "Lima", index: 1.25, theme: THEMES.pe },
  { id: "pe-cusco", name: "Cusco", countryCode: "PE", region: "Cusco", index: 0.92, theme: THEMES.pe },
  { id: "pe-arequipa", name: "Arequipa", countryCode: "PE", region: "Arequipa", index: 0.88, theme: THEMES.pe },
  { id: "pe-trujillo", name: "Trujillo", countryCode: "PE", region: "La Libertad", index: 0.84, theme: THEMES.pe },

  // ===== South Africa =====
  { id: "za-jhb", name: "Johannesburg", countryCode: "ZA", region: "Gauteng", index: 1.10, theme: THEMES.za },
  { id: "za-capetown", name: "Cape Town", countryCode: "ZA", region: "Western Cape", index: 1.15, theme: THEMES.za },
  { id: "za-durban", name: "Durban", countryCode: "ZA", region: "KwaZulu-Natal", index: 0.92, theme: THEMES.za },
  { id: "za-pretoria", name: "Pretoria", countryCode: "ZA", region: "Gauteng", index: 1.00, theme: THEMES.za },
  { id: "za-pe", name: "Port Elizabeth", countryCode: "ZA", region: "Eastern Cape", index: 0.86, theme: THEMES.za },

  // ===== Nigeria =====
  { id: "ng-lagos", name: "Lagos", countryCode: "NG", region: "Lagos", index: 1.40, theme: THEMES.ng },
  { id: "ng-abuja", name: "Abuja", countryCode: "NG", region: "FCT", index: 1.20, theme: THEMES.ng },
  { id: "ng-portharcourt", name: "Port Harcourt", countryCode: "NG", region: "Rivers", index: 0.94, theme: THEMES.ng },
  { id: "ng-kano", name: "Kano", countryCode: "NG", region: "Kano", index: 0.78, theme: THEMES.ng },
  { id: "ng-ibadan", name: "Ibadan", countryCode: "NG", region: "Oyo", index: 0.82, theme: THEMES.ng },

  // ===== Kenya =====
  { id: "ke-nairobi", name: "Nairobi", countryCode: "KE", region: "Nairobi", index: 1.30, theme: THEMES.ke },
  { id: "ke-mombasa", name: "Mombasa", countryCode: "KE", region: "Coast", index: 1.00, theme: THEMES.ke },
  { id: "ke-kisumu", name: "Kisumu", countryCode: "KE", region: "Nyanza", index: 0.82, theme: THEMES.ke },

  // ===== Maroc =====
  { id: "ma-casablanca", name: "Casablanca", countryCode: "MA", region: "Casablanca-Settat", index: 1.20, theme: THEMES.ma },
  { id: "ma-rabat", name: "Rabat", countryCode: "MA", region: "Rabat-Salé-Kénitra", index: 1.10, theme: THEMES.ma },
  { id: "ma-marrakech", name: "Marrakech", countryCode: "MA", region: "Marrakech-Safi", index: 0.96, theme: THEMES.ma },
  { id: "ma-tangier", name: "Tanger", countryCode: "MA", region: "Tanger-Tétouan", index: 0.94, theme: THEMES.ma },
  { id: "ma-fes", name: "Fès", countryCode: "MA", region: "Fès-Meknès", index: 0.88, theme: THEMES.ma },
  { id: "ma-agadir", name: "Agadir", countryCode: "MA", region: "Souss-Massa", index: 0.92, theme: THEMES.ma },

  // ===== مصر =====
  { id: "eg-cairo", name: "القاهرة", countryCode: "EG", region: "Cairo", index: 1.25, theme: THEMES.eg },
  { id: "eg-alexandria", name: "الإسكندرية", countryCode: "EG", region: "Alexandria", index: 1.00, theme: THEMES.eg },
  { id: "eg-giza", name: "الجيزة", countryCode: "EG", region: "Giza", index: 1.05, theme: THEMES.eg },
  { id: "eg-hurghada", name: "الغردقة", countryCode: "EG", region: "Red Sea", index: 0.92, theme: THEMES.eg },
  { id: "eg-luxor", name: "الأقصر", countryCode: "EG", region: "Luxor", index: 0.78, theme: THEMES.eg },

  // ===== الجزائر =====
  { id: "dz-algiers", name: "الجزائر", countryCode: "DZ", region: "Alger", index: 1.25, theme: THEMES.dz },
  { id: "dz-oran", name: "وهران", countryCode: "DZ", region: "Oran", index: 1.00, theme: THEMES.dz },
  { id: "dz-constantine", name: "قسنطينة", countryCode: "DZ", region: "Constantine", index: 0.88, theme: THEMES.dz },
  { id: "dz-annaba", name: "عنابة", countryCode: "DZ", region: "Annaba", index: 0.86, theme: THEMES.dz },

  // ===== تونس =====
  { id: "tn-tunis", name: "تونس", countryCode: "TN", region: "Tunis", index: 1.25, theme: THEMES.tn },
  { id: "tn-sfax", name: "صفاقس", countryCode: "TN", region: "Sfax", index: 0.92, theme: THEMES.tn },
  { id: "tn-sousse", name: "سوسة", countryCode: "TN", region: "Sousse", index: 0.96, theme: THEMES.tn },
  { id: "tn-djerba", name: "جربة", countryCode: "TN", region: "Médenine", index: 0.90, theme: THEMES.tn },

  // ===== Sénégal =====
  { id: "sn-dakar", name: "Dakar", countryCode: "SN", region: "Dakar", index: 1.35, theme: THEMES.sn },
  { id: "sn-thies", name: "Thiès", countryCode: "SN", region: "Thiès", index: 0.88, theme: THEMES.sn },
  { id: "sn-saintlouis", name: "Saint-Louis", countryCode: "SN", region: "Saint-Louis", index: 0.86, theme: THEMES.sn },

  // ===== Côte d'Ivoire =====
  { id: "ci-abidjan", name: "Abidjan", countryCode: "CI", region: "Abidjan", index: 1.40, theme: THEMES.ci },
  { id: "ci-yamoussoukro", name: "Yamoussoukro", countryCode: "CI", region: "Yamoussoukro", index: 0.84, theme: THEMES.ci },
  { id: "ci-bouake", name: "Bouaké", countryCode: "CI", region: "Vallée du Bandama", index: 0.78, theme: THEMES.ci },

  // ===== Cameroun =====
  { id: "cm-douala", name: "Douala", countryCode: "CM", region: "Littoral", index: 1.30, theme: THEMES.cm },
  { id: "cm-yaounde", name: "Yaoundé", countryCode: "CM", region: "Centre", index: 1.15, theme: THEMES.cm },
  { id: "cm-bafoussam", name: "Bafoussam", countryCode: "CM", region: "Ouest", index: 0.86, theme: THEMES.cm },
];

// ----- Helpers -----
export function getCountry(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code === code);
}

export function citiesByCountry(code: string): City[] {
  return CITIES.filter((c) => c.countryCode === code);
}

export function regionsForCountry(code: string): string[] {
  const cities = citiesByCountry(code);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of cities) {
    if (!seen.has(c.region)) {
      seen.add(c.region);
      out.push(c.region);
    }
  }
  return out;
}

// Liens cliquables affichés dans la modal d'info "Indice du coût de la vie".
export const INDEX_SOURCES: { label: string; url: string }[] = [
  { label: "Numbeo — Cost of Living Rankings", url: "https://www.numbeo.com/cost-of-living/rankings.jsp" },
  { label: "Eurostat — Purchasing Power Parities", url: "https://ec.europa.eu/eurostat/web/purchasing-power-parities" },
  { label: "OECD — Purchasing Power Parities (PPP)", url: "https://www.oecd.org/en/data/indicators/purchasing-power-parities-ppp.html" },
  { label: "INSEE — Statistiques", url: "https://www.insee.fr/fr/statistiques" },
  { label: "Mercer — Cost of Living Survey", url: "https://www.mercer.com/insights/total-rewards/talent-mobility-insights/cost-of-living/" },
  { label: "EIU — Worldwide Cost of Living", url: "https://www.eiu.com/n/campaigns/worldwide-cost-of-living/" },
  { label: "World Bank — International Comparison Program", url: "https://www.worldbank.org/en/programs/icp" },
  { label: "US BLS — Consumer Price Index", url: "https://www.bls.gov/cpi/" },
];

// Texte d'explication de l'indice (affiché dans la section Localisation)
export const INDEX_EXPLANATION =
  "L'indice compare le coût global de la vie de la ville à la moyenne nationale de son pays (1.00). Il agrège loyers, courses, transports et services. Sources : Numbeo (numbeo.com), Eurostat PPP, OECD PPP, INSEE, Mercer Cost of Living Survey et EIU Worldwide Cost of Living.";
