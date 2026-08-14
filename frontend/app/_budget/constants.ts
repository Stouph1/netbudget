// Constantes de l'écran Budget (ex-app/index.tsx) : palette, familles de
// dépenses, catégories par défaut, clés i18n des mois.
//
// Ce module reste volontairement SANS dépendance à react-native : il est
// importé par les helpers purs, eux-mêmes testés hors bundler Metro.
import type { ExpenseFamily, ExpenseItem, FamilyMeta, Tab } from "./types";

export const MONTH_KEYS_LONG = [
  "month.long.0", "month.long.1", "month.long.2", "month.long.3",
  "month.long.4", "month.long.5", "month.long.6", "month.long.7",
  "month.long.8", "month.long.9", "month.long.10", "month.long.11",
];
export const MONTH_KEYS_SHORT = [
  "month.short.0", "month.short.1", "month.short.2", "month.short.3",
  "month.short.4", "month.short.5", "month.short.6", "month.short.7",
  "month.short.8", "month.short.9", "month.short.10", "month.short.11",
];

export const FAMILY_META: Record<ExpenseFamily, FamilyMeta> = {
  besoins: { label: "Besoins", sub: "indispensable au quotidien", color: "#3B82F6", icon: "shield" },
  loisirs: { label: "Loisirs", sub: "plaisirs, sorties, vacances", color: "#A855F7", icon: "music" },
  epargne: { label: "Épargne / Investissement", sub: "ce que tu mets de côté", color: "#F59E0B", icon: "trending-up" },
};

export const FAMILY_ORDER: ExpenseFamily[] = ["besoins", "loisirs", "epargne"];

export const DEFAULT_ITEMS: ExpenseItem[] = [
  { id: "alimentation", family: "besoins", label: "Alimentation", labelKey: "expense.alimentation", icon: "shopping-cart", color: "#10B981", amount: "0" },
  { id: "transport", family: "besoins", label: "Transport", labelKey: "expense.transport", icon: "navigation", color: "#F59E0B", amount: "0" },
  { id: "sante", family: "besoins", label: "Santé / Mutuelle", labelKey: "expense.sante", icon: "heart", color: "#06B6D4", amount: "0" },
  { id: "energie", family: "besoins", label: "Énergie", labelKey: "expense.energie", icon: "zap", color: "#F97316", amount: "0" },
  { id: "eau", family: "besoins", label: "Eau", labelKey: "expense.eau", icon: "droplet", color: "#38BDF8", amount: "0" },
  { id: "abonnements", family: "besoins", label: "Abonnements (essentiels)", labelKey: "expense.abonnements", icon: "wifi", color: "#EC4899", amount: "0" },
  { id: "sorties", family: "loisirs", label: "Sorties / Restos", labelKey: "expense.sorties", icon: "coffee", color: "#A855F7", amount: "0" },
  { id: "vacances", family: "loisirs", label: "Vacances", labelKey: "expense.vacances", icon: "sun", color: "#C084FC", amount: "0" },
  { id: "streaming", family: "loisirs", label: "Streaming / Hobbies", labelKey: "expense.streaming", icon: "play", color: "#D946EF", amount: "0" },
  { id: "livret", family: "epargne", label: "Livret A / LDDS", labelKey: "expense.livret", icon: "save", color: "#F59E0B", amount: "0" },
  { id: "pea", family: "epargne", label: "PEA", labelKey: "expense.pea", icon: "bar-chart-2", color: "#FBBF24", amount: "0" },
  { id: "cto", family: "epargne", label: "CTO", labelKey: "expense.cto", icon: "trending-up", color: "#FDE047", amount: "0" },
  { id: "av", family: "epargne", label: "Assurance vie", labelKey: "expense.av", icon: "file-text", color: "#FCD34D", amount: "0" },
];

export const FAMILY_PALETTE: Record<ExpenseFamily, string[]> = {
  besoins: ["#10B981", "#06B6D4", "#3B82F6", "#F97316", "#EC4899"],
  loisirs: ["#A855F7", "#C084FC", "#D946EF", "#8B5CF6", "#E879F9"],
  epargne: ["#F59E0B", "#FBBF24", "#FCD34D", "#FDE047", "#EAB308"],
};

// Navigation par onglet (bottom tabs).
// Les 5 onglets sont rendus en rangée horizontale ; on translate le container
// pour suivre le doigt en temps réel (style Instagram/Twitter), puis on snap
// au plus proche au relâchement.
export const TAB_ORDER: Tab[] = ["settings", "events", "budget", "converter", "premium"];

export const GOLD = "#4ADE80";
export const BG = "#0A0F1A";
export const SURFACE = "#141826";
export const SURFACE_2 = "#1C2130";
export const BORDER = "#2A3142";
export const TEXT = "#FFFFFF";
export const TEXT_2 = "#A1A1AA";
export const TEXT_3 = "#71717A";
export const DANGER = "#EF4444";
export const SUCCESS = "#10B981";
export const COLOR_LOYER = "#3B82F6";
export const COLOR_PRETS = "#EF4444";
