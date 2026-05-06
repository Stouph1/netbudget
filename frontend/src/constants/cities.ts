// Indice de coût de la vie par ville (base 1.00 = moyenne nationale France)
// Source: estimations consolidées à partir de données publiques (INSEE, Numbeo,
// comparateurs du coût de la vie) sur le panier type français
// (alimentation, transport, loisirs, services, immobilier).

export type CityTheme = {
  from: string;
  to: string;
  accent: string;
  label: string;
};

export type City = {
  id: string;
  name: string;
  region: string;
  index: number; // 1.00 = moyenne
  theme: CityTheme;
};

// Thèmes par grande région → gradient de fond cohérent avec l'identité
const THEMES: Record<string, CityTheme> = {
  idf: { from: "#1E3A8A", to: "#0A0A0C", accent: "#93C5FD", label: "Île-de-France" },
  paca: { from: "#C2410C", to: "#0A0A0C", accent: "#FDBA74", label: "Méditerranée" },
  alpes: { from: "#6D28D9", to: "#0A0A0C", accent: "#C4B5FD", label: "Alpes" },
  atlantique: { from: "#0E7490", to: "#0A0A0C", accent: "#67E8F9", label: "Atlantique" },
  sudouest: { from: "#BE123C", to: "#0A0A0C", accent: "#FDA4AF", label: "Sud-Ouest" },
  occitanie: { from: "#B45309", to: "#0A0A0C", accent: "#FCD34D", label: "Occitanie" },
  nord: { from: "#0F766E", to: "#0A0A0C", accent: "#5EEAD4", label: "Nord" },
  est: { from: "#7C2D12", to: "#0A0A0C", accent: "#FB923C", label: "Grand Est" },
  centre: { from: "#166534", to: "#0A0A0C", accent: "#86EFAC", label: "Centre" },
  default: { from: "#3F3F46", to: "#0A0F1A", accent: "#4ADE80", label: "France" },
};

export const CITIES: City[] = [
  { id: "paris", name: "Paris", region: "Île-de-France", index: 1.28, theme: THEMES.idf },
  { id: "boulogne", name: "Boulogne-Billancourt", region: "Île-de-France", index: 1.22, theme: THEMES.idf },
  { id: "versailles", name: "Versailles", region: "Île-de-France", index: 1.18, theme: THEMES.idf },
  { id: "lyon", name: "Lyon", region: "Auvergne-Rhône-Alpes", index: 1.12, theme: THEMES.alpes },
  { id: "annecy", name: "Annecy", region: "Auvergne-Rhône-Alpes", index: 1.14, theme: THEMES.alpes },
  { id: "grenoble", name: "Grenoble", region: "Auvergne-Rhône-Alpes", index: 1.03, theme: THEMES.alpes },
  { id: "nice", name: "Nice", region: "PACA", index: 1.15, theme: THEMES.paca },
  { id: "cannes", name: "Cannes", region: "PACA", index: 1.2, theme: THEMES.paca },
  { id: "marseille", name: "Marseille", region: "PACA", index: 1.02, theme: THEMES.paca },
  { id: "aix", name: "Aix-en-Provence", region: "PACA", index: 1.1, theme: THEMES.paca },
  { id: "toulouse", name: "Toulouse", region: "Occitanie", index: 1.0, theme: THEMES.occitanie },
  { id: "montpellier", name: "Montpellier", region: "Occitanie", index: 1.03, theme: THEMES.occitanie },
  { id: "bordeaux", name: "Bordeaux", region: "Nouvelle-Aquitaine", index: 1.08, theme: THEMES.sudouest },
  { id: "biarritz", name: "Biarritz", region: "Nouvelle-Aquitaine", index: 1.13, theme: THEMES.atlantique },
  { id: "nantes", name: "Nantes", region: "Pays de la Loire", index: 1.02, theme: THEMES.atlantique },
  { id: "rennes", name: "Rennes", region: "Bretagne", index: 1.0, theme: THEMES.atlantique },
  { id: "brest", name: "Brest", region: "Bretagne", index: 0.94, theme: THEMES.atlantique },
  { id: "strasbourg", name: "Strasbourg", region: "Grand Est", index: 0.99, theme: THEMES.est },
  { id: "nancy", name: "Nancy", region: "Grand Est", index: 0.93, theme: THEMES.est },
  { id: "reims", name: "Reims", region: "Grand Est", index: 0.95, theme: THEMES.est },
  { id: "lille", name: "Lille", region: "Hauts-de-France", index: 0.98, theme: THEMES.nord },
  { id: "amiens", name: "Amiens", region: "Hauts-de-France", index: 0.9, theme: THEMES.nord },
  { id: "rouen", name: "Rouen", region: "Normandie", index: 0.93, theme: THEMES.nord },
  { id: "caen", name: "Caen", region: "Normandie", index: 0.92, theme: THEMES.nord },
  { id: "lehavre", name: "Le Havre", region: "Normandie", index: 0.9, theme: THEMES.nord },
  { id: "dijon", name: "Dijon", region: "Bourgogne-Franche-Comté", index: 0.93, theme: THEMES.est },
  { id: "clermont", name: "Clermont-Ferrand", region: "Auvergne-Rhône-Alpes", index: 0.92, theme: THEMES.alpes },
  { id: "tours", name: "Tours", region: "Centre-Val de Loire", index: 0.94, theme: THEMES.centre },
  { id: "orleans", name: "Orléans", region: "Centre-Val de Loire", index: 0.93, theme: THEMES.centre },
  { id: "limoges", name: "Limoges", region: "Nouvelle-Aquitaine", index: 0.88, theme: THEMES.sudouest },
  { id: "perpignan", name: "Perpignan", region: "Occitanie", index: 0.9, theme: THEMES.occitanie },
  { id: "saintetienne", name: "Saint-Étienne", region: "Auvergne-Rhône-Alpes", index: 0.88, theme: THEMES.alpes },
  { id: "metz", name: "Metz", region: "Grand Est", index: 0.92, theme: THEMES.est },
  { id: "angers", name: "Angers", region: "Pays de la Loire", index: 0.96, theme: THEMES.atlantique },
  { id: "lemans", name: "Le Mans", region: "Pays de la Loire", index: 0.9, theme: THEMES.atlantique },
  { id: "autre", name: "Autre / Moyenne nationale", region: "France", index: 1.0, theme: THEMES.default },
];

// Texte d'explication de l'indice (affiché dans la section Localisation)
export const INDEX_EXPLANATION =
  "L'indice compare le coût global de la vie dans la ville à la moyenne nationale (1.00). Il est estimé à partir des loyers, des prix de l'alimentation, des transports et des services. Source : synthèse INSEE / comparateurs publics.";
