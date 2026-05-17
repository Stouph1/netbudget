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
  corse: { from: "#1E40AF", to: "#0A0A0C", accent: "#A5B4FC", label: "Corse" },
};

export const CITIES: City[] = [
  // Île-de-France
  { id: "paris", name: "Paris", region: "Île-de-France", index: 1.28, theme: THEMES.idf },
  { id: "neuilly", name: "Neuilly-sur-Seine", region: "Île-de-France", index: 1.30, theme: THEMES.idf },
  { id: "levallois", name: "Levallois-Perret", region: "Île-de-France", index: 1.25, theme: THEMES.idf },
  { id: "boulogne", name: "Boulogne-Billancourt", region: "Île-de-France", index: 1.22, theme: THEMES.idf },
  { id: "issy", name: "Issy-les-Moulineaux", region: "Île-de-France", index: 1.22, theme: THEMES.idf },
  { id: "courbevoie", name: "Courbevoie", region: "Île-de-France", index: 1.20, theme: THEMES.idf },
  { id: "vincennes", name: "Vincennes", region: "Île-de-France", index: 1.20, theme: THEMES.idf },
  { id: "rueil", name: "Rueil-Malmaison", region: "Île-de-France", index: 1.18, theme: THEMES.idf },
  { id: "sceaux", name: "Sceaux", region: "Île-de-France", index: 1.18, theme: THEMES.idf },
  { id: "saintgermain", name: "Saint-Germain-en-Laye", region: "Île-de-France", index: 1.18, theme: THEMES.idf },
  { id: "versailles", name: "Versailles", region: "Île-de-France", index: 1.18, theme: THEMES.idf },
  { id: "asnieres", name: "Asnières-sur-Seine", region: "Île-de-France", index: 1.16, theme: THEMES.idf },
  { id: "nanterre", name: "Nanterre", region: "Île-de-France", index: 1.12, theme: THEMES.idf },
  { id: "colombes", name: "Colombes", region: "Île-de-France", index: 1.10, theme: THEMES.idf },
  { id: "montreuil", name: "Montreuil", region: "Île-de-France", index: 1.10, theme: THEMES.idf },
  { id: "antony", name: "Antony", region: "Île-de-France", index: 1.10, theme: THEMES.idf },
  { id: "pantin", name: "Pantin", region: "Île-de-France", index: 1.08, theme: THEMES.idf },
  { id: "massy", name: "Massy", region: "Île-de-France", index: 1.08, theme: THEMES.idf },
  { id: "creteil", name: "Créteil", region: "Île-de-France", index: 1.06, theme: THEMES.idf },
  { id: "saintdenis", name: "Saint-Denis", region: "Île-de-France", index: 1.05, theme: THEMES.idf },
  { id: "champigny", name: "Champigny-sur-Marne", region: "Île-de-France", index: 1.04, theme: THEMES.idf },
  { id: "fontainebleau", name: "Fontainebleau", region: "Île-de-France", index: 1.02, theme: THEMES.idf },
  { id: "argenteuil", name: "Argenteuil", region: "Île-de-France", index: 1.02, theme: THEMES.idf },
  { id: "vitry", name: "Vitry-sur-Seine", region: "Île-de-France", index: 1.00, theme: THEMES.idf },
  { id: "aubervilliers", name: "Aubervilliers", region: "Île-de-France", index: 1.00, theme: THEMES.idf },
  { id: "cergy", name: "Cergy", region: "Île-de-France", index: 1.00, theme: THEMES.idf },
  { id: "evry", name: "Évry-Courcouronnes", region: "Île-de-France", index: 0.99, theme: THEMES.idf },
  { id: "aulnay", name: "Aulnay-sous-Bois", region: "Île-de-France", index: 0.98, theme: THEMES.idf },
  { id: "melun", name: "Melun", region: "Île-de-France", index: 0.95, theme: THEMES.idf },
  { id: "meaux", name: "Meaux", region: "Île-de-France", index: 0.94, theme: THEMES.idf },
  { id: "mantes", name: "Mantes-la-Jolie", region: "Île-de-France", index: 0.92, theme: THEMES.idf },

  // Auvergne-Rhône-Alpes
  { id: "lyon", name: "Lyon", region: "Auvergne-Rhône-Alpes", index: 1.12, theme: THEMES.alpes },
  { id: "villeurbanne", name: "Villeurbanne", region: "Auvergne-Rhône-Alpes", index: 1.08, theme: THEMES.alpes },
  { id: "annecy", name: "Annecy", region: "Auvergne-Rhône-Alpes", index: 1.14, theme: THEMES.alpes },
  { id: "grenoble", name: "Grenoble", region: "Auvergne-Rhône-Alpes", index: 1.03, theme: THEMES.alpes },
  { id: "aixlesbains", name: "Aix-les-Bains", region: "Auvergne-Rhône-Alpes", index: 1.02, theme: THEMES.alpes },
  { id: "chambery", name: "Chambéry", region: "Auvergne-Rhône-Alpes", index: 1.00, theme: THEMES.alpes },
  { id: "vienne", name: "Vienne", region: "Auvergne-Rhône-Alpes", index: 0.96, theme: THEMES.alpes },
  { id: "valence", name: "Valence", region: "Auvergne-Rhône-Alpes", index: 0.94, theme: THEMES.alpes },
  { id: "bourg", name: "Bourg-en-Bresse", region: "Auvergne-Rhône-Alpes", index: 0.88, theme: THEMES.alpes },
  { id: "clermont", name: "Clermont-Ferrand", region: "Auvergne-Rhône-Alpes", index: 0.92, theme: THEMES.alpes },
  { id: "saintetienne", name: "Saint-Étienne", region: "Auvergne-Rhône-Alpes", index: 0.88, theme: THEMES.alpes },
  { id: "roanne", name: "Roanne", region: "Auvergne-Rhône-Alpes", index: 0.86, theme: THEMES.alpes },

  // PACA
  { id: "marseille", name: "Marseille", region: "PACA", index: 1.02, theme: THEMES.paca },
  { id: "nice", name: "Nice", region: "PACA", index: 1.15, theme: THEMES.paca },
  { id: "cannes", name: "Cannes", region: "PACA", index: 1.20, theme: THEMES.paca },
  { id: "antibes", name: "Antibes", region: "PACA", index: 1.12, theme: THEMES.paca },
  { id: "aix", name: "Aix-en-Provence", region: "PACA", index: 1.10, theme: THEMES.paca },
  { id: "sttropez", name: "Saint-Tropez", region: "PACA", index: 1.40, theme: THEMES.paca },
  { id: "frejus", name: "Fréjus", region: "PACA", index: 1.05, theme: THEMES.paca },
  { id: "laciotat", name: "La Ciotat", region: "PACA", index: 1.06, theme: THEMES.paca },
  { id: "hyeres", name: "Hyères", region: "PACA", index: 1.04, theme: THEMES.paca },
  { id: "toulon", name: "Toulon", region: "PACA", index: 0.98, theme: THEMES.paca },
  { id: "avignon", name: "Avignon", region: "PACA", index: 0.96, theme: THEMES.paca },
  { id: "monaco", name: "Monaco (frontalier)", region: "PACA", index: 1.45, theme: THEMES.paca },

  // Corse
  { id: "portovecchio", name: "Porto-Vecchio", region: "Corse", index: 1.20, theme: THEMES.corse },
  { id: "ajaccio", name: "Ajaccio", region: "Corse", index: 1.10, theme: THEMES.corse },
  { id: "bastia", name: "Bastia", region: "Corse", index: 1.05, theme: THEMES.corse },
  { id: "calvi", name: "Calvi", region: "Corse", index: 1.15, theme: THEMES.corse },

  // Occitanie
  { id: "toulouse", name: "Toulouse", region: "Occitanie", index: 1.00, theme: THEMES.occitanie },
  { id: "montpellier", name: "Montpellier", region: "Occitanie", index: 1.03, theme: THEMES.occitanie },
  { id: "nimes", name: "Nîmes", region: "Occitanie", index: 0.92, theme: THEMES.occitanie },
  { id: "sete", name: "Sète", region: "Occitanie", index: 0.92, theme: THEMES.occitanie },
  { id: "perpignan", name: "Perpignan", region: "Occitanie", index: 0.90, theme: THEMES.occitanie },
  { id: "carcassonne", name: "Carcassonne", region: "Occitanie", index: 0.88, theme: THEMES.occitanie },
  { id: "narbonne", name: "Narbonne", region: "Occitanie", index: 0.88, theme: THEMES.occitanie },
  { id: "albi", name: "Albi", region: "Occitanie", index: 0.88, theme: THEMES.occitanie },
  { id: "beziers", name: "Béziers", region: "Occitanie", index: 0.86, theme: THEMES.occitanie },
  { id: "tarbes", name: "Tarbes", region: "Occitanie", index: 0.84, theme: THEMES.occitanie },
  { id: "cahors", name: "Cahors", region: "Occitanie", index: 0.82, theme: THEMES.occitanie },

  // Nouvelle-Aquitaine
  { id: "bordeaux", name: "Bordeaux", region: "Nouvelle-Aquitaine", index: 1.08, theme: THEMES.sudouest },
  { id: "arcachon", name: "Arcachon", region: "Nouvelle-Aquitaine", index: 1.18, theme: THEMES.atlantique },
  { id: "biarritz", name: "Biarritz", region: "Nouvelle-Aquitaine", index: 1.13, theme: THEMES.atlantique },
  { id: "bayonne", name: "Bayonne", region: "Nouvelle-Aquitaine", index: 1.04, theme: THEMES.atlantique },
  { id: "larochelle", name: "La Rochelle", region: "Nouvelle-Aquitaine", index: 1.02, theme: THEMES.atlantique },
  { id: "pau", name: "Pau", region: "Nouvelle-Aquitaine", index: 0.92, theme: THEMES.sudouest },
  { id: "poitiers", name: "Poitiers", region: "Nouvelle-Aquitaine", index: 0.90, theme: THEMES.sudouest },
  { id: "limoges", name: "Limoges", region: "Nouvelle-Aquitaine", index: 0.88, theme: THEMES.sudouest },
  { id: "angouleme", name: "Angoulême", region: "Nouvelle-Aquitaine", index: 0.86, theme: THEMES.sudouest },
  { id: "niort", name: "Niort", region: "Nouvelle-Aquitaine", index: 0.86, theme: THEMES.sudouest },
  { id: "perigueux", name: "Périgueux", region: "Nouvelle-Aquitaine", index: 0.84, theme: THEMES.sudouest },

  // Pays de la Loire
  { id: "nantes", name: "Nantes", region: "Pays de la Loire", index: 1.02, theme: THEMES.atlantique },
  { id: "saintnazaire", name: "Saint-Nazaire", region: "Pays de la Loire", index: 0.92, theme: THEMES.atlantique },
  { id: "angers", name: "Angers", region: "Pays de la Loire", index: 0.96, theme: THEMES.atlantique },
  { id: "rochesuryon", name: "La Roche-sur-Yon", region: "Pays de la Loire", index: 0.90, theme: THEMES.atlantique },
  { id: "lemans", name: "Le Mans", region: "Pays de la Loire", index: 0.90, theme: THEMES.atlantique },
  { id: "cholet", name: "Cholet", region: "Pays de la Loire", index: 0.86, theme: THEMES.atlantique },
  { id: "laval", name: "Laval", region: "Pays de la Loire", index: 0.86, theme: THEMES.atlantique },

  // Bretagne
  { id: "rennes", name: "Rennes", region: "Bretagne", index: 1.00, theme: THEMES.atlantique },
  { id: "brest", name: "Brest", region: "Bretagne", index: 0.94, theme: THEMES.atlantique },
  { id: "quimper", name: "Quimper", region: "Bretagne", index: 0.90, theme: THEMES.atlantique },
  { id: "lorient", name: "Lorient", region: "Bretagne", index: 0.92, theme: THEMES.atlantique },
  { id: "vannes", name: "Vannes", region: "Bretagne", index: 0.96, theme: THEMES.atlantique },
  { id: "saintmalo", name: "Saint-Malo", region: "Bretagne", index: 1.00, theme: THEMES.atlantique },
  { id: "concarneau", name: "Concarneau", region: "Bretagne", index: 0.92, theme: THEMES.atlantique },
  { id: "lannion", name: "Lannion", region: "Bretagne", index: 0.86, theme: THEMES.atlantique },

  // Grand Est
  { id: "strasbourg", name: "Strasbourg", region: "Grand Est", index: 0.99, theme: THEMES.est },
  { id: "metz", name: "Metz", region: "Grand Est", index: 0.92, theme: THEMES.est },
  { id: "nancy", name: "Nancy", region: "Grand Est", index: 0.93, theme: THEMES.est },
  { id: "reims", name: "Reims", region: "Grand Est", index: 0.95, theme: THEMES.est },
  { id: "mulhouse", name: "Mulhouse", region: "Grand Est", index: 0.88, theme: THEMES.est },
  { id: "colmar", name: "Colmar", region: "Grand Est", index: 0.92, theme: THEMES.est },
  { id: "troyes", name: "Troyes", region: "Grand Est", index: 0.86, theme: THEMES.est },
  { id: "chalons", name: "Châlons-en-Champagne", region: "Grand Est", index: 0.86, theme: THEMES.est },
  { id: "epinal", name: "Épinal", region: "Grand Est", index: 0.84, theme: THEMES.est },

  // Hauts-de-France
  { id: "lille", name: "Lille", region: "Hauts-de-France", index: 0.98, theme: THEMES.nord },
  { id: "amiens", name: "Amiens", region: "Hauts-de-France", index: 0.90, theme: THEMES.nord },
  { id: "arras", name: "Arras", region: "Hauts-de-France", index: 0.90, theme: THEMES.nord },
  { id: "dunkerque", name: "Dunkerque", region: "Hauts-de-France", index: 0.88, theme: THEMES.nord },
  { id: "valenciennes", name: "Valenciennes", region: "Hauts-de-France", index: 0.86, theme: THEMES.nord },
  { id: "tourcoing", name: "Tourcoing", region: "Hauts-de-France", index: 0.86, theme: THEMES.nord },
  { id: "calais", name: "Calais", region: "Hauts-de-France", index: 0.86, theme: THEMES.nord },
  { id: "boulognesurmer", name: "Boulogne-sur-Mer", region: "Hauts-de-France", index: 0.84, theme: THEMES.nord },
  { id: "roubaix", name: "Roubaix", region: "Hauts-de-France", index: 0.84, theme: THEMES.nord },
  { id: "lens", name: "Lens", region: "Hauts-de-France", index: 0.82, theme: THEMES.nord },
  { id: "bethune", name: "Béthune", region: "Hauts-de-France", index: 0.82, theme: THEMES.nord },

  // Normandie
  { id: "rouen", name: "Rouen", region: "Normandie", index: 0.93, theme: THEMES.nord },
  { id: "caen", name: "Caen", region: "Normandie", index: 0.92, theme: THEMES.nord },
  { id: "lehavre", name: "Le Havre", region: "Normandie", index: 0.90, theme: THEMES.nord },
  { id: "evreux", name: "Évreux", region: "Normandie", index: 0.88, theme: THEMES.nord },
  { id: "dieppe", name: "Dieppe", region: "Normandie", index: 0.86, theme: THEMES.nord },
  { id: "cherbourg", name: "Cherbourg-en-Cotentin", region: "Normandie", index: 0.86, theme: THEMES.nord },

  // Bourgogne-Franche-Comté
  { id: "dijon", name: "Dijon", region: "Bourgogne-Franche-Comté", index: 0.93, theme: THEMES.est },
  { id: "besancon", name: "Besançon", region: "Bourgogne-Franche-Comté", index: 0.90, theme: THEMES.est },
  { id: "macon", name: "Mâcon", region: "Bourgogne-Franche-Comté", index: 0.88, theme: THEMES.est },
  { id: "chalon", name: "Chalon-sur-Saône", region: "Bourgogne-Franche-Comté", index: 0.86, theme: THEMES.est },
  { id: "belfort", name: "Belfort", region: "Bourgogne-Franche-Comté", index: 0.86, theme: THEMES.est },
  { id: "auxerre", name: "Auxerre", region: "Bourgogne-Franche-Comté", index: 0.84, theme: THEMES.est },

  // Centre-Val de Loire
  { id: "tours", name: "Tours", region: "Centre-Val de Loire", index: 0.94, theme: THEMES.centre },
  { id: "orleans", name: "Orléans", region: "Centre-Val de Loire", index: 0.93, theme: THEMES.centre },
  { id: "chartres", name: "Chartres", region: "Centre-Val de Loire", index: 0.94, theme: THEMES.centre },
  { id: "blois", name: "Blois", region: "Centre-Val de Loire", index: 0.88, theme: THEMES.centre },
  { id: "bourges", name: "Bourges", region: "Centre-Val de Loire", index: 0.86, theme: THEMES.centre },
  { id: "chateauroux", name: "Châteauroux", region: "Centre-Val de Loire", index: 0.84, theme: THEMES.centre },

  // Outre-mer
  { id: "fortdefrance", name: "Fort-de-France", region: "Martinique", index: 1.10, theme: THEMES.atlantique },
  { id: "pointeapitre", name: "Pointe-à-Pitre", region: "Guadeloupe", index: 1.08, theme: THEMES.atlantique },
  { id: "saintdenisre", name: "Saint-Denis (La Réunion)", region: "La Réunion", index: 1.06, theme: THEMES.atlantique },
  { id: "saintpierrere", name: "Saint-Pierre (La Réunion)", region: "La Réunion", index: 1.00, theme: THEMES.atlantique },
  { id: "cayenne", name: "Cayenne", region: "Guyane", index: 1.05, theme: THEMES.atlantique },
  { id: "mamoudzou", name: "Mamoudzou", region: "Mayotte", index: 1.15, theme: THEMES.atlantique },
];

// Texte d'explication de l'indice (affiché dans la section Localisation)
export const INDEX_EXPLANATION =
  "L'indice compare le coût global de la vie dans la ville à la moyenne nationale (1.00). Il est estimé à partir des loyers, des prix de l'alimentation, des transports et des services. Source : synthèse INSEE / comparateurs publics.";
