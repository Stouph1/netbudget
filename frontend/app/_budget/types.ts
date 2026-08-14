// Types locaux de l'écran Budget (ex-app/index.tsx).
//
// Le dossier `_budget` est préfixé par `_` : expo-router ignore les dossiers
// commençant par un underscore, ils ne deviennent donc pas des routes.
import { Feather } from "@expo/vector-icons";
import type { CurrencyCode } from "../../src/utils/currency";

/** Traducteur de l'app (clé i18n → texte dans la langue courante). */
export type Translate = (key: string) => string;

export type LoanMode = "computed" | "direct";

export type Loan = {
  id: string;
  name: string;
  mode?: LoanMode; // undefined = "computed" (rétrocompat v1.2.x)
  principal: string;
  ratePercent: string;
  years: string;
  directMonthly?: string;
  startDate?: string; // "AAAA-MM-JJ" — 1re échéance, pour le suivi dans le temps
};

export type ExpenseFamily = "besoins" | "loisirs" | "epargne";

export type ExpenseItem = {
  id: string;
  family: ExpenseFamily;
  label: string;
  labelKey?: string; // si present, sert de cle i18n pour traduire le label par defaut
  icon: keyof typeof Feather.glyphMap;
  color: string;
  amount: string;
};

export type FamilyMeta = {
  label: string;
  sub: string;
  color: string;
  icon: keyof typeof Feather.glyphMap;
};

export type ConfirmState = {
  open: boolean;
  title: string;
  message: string;
  danger?: boolean;
  confirmLabel?: string;
  onConfirm?: () => void;
  /** Libellé du bouton d'annulation (défaut : « Annuler »). */
  cancelLabel?: string;
  /** Action au refus — utile quand « Non » n'est pas un simple abandon. */
  onCancel?: () => void;
};

/** Onglets du pager (ordre = ordre visuel de gauche à droite). */
export type Tab = "settings" | "events" | "budget" | "converter" | "premium";

export type ConvHistoryItem = {
  id: string;
  from: CurrencyCode;
  to: CurrencyCode;
  amount: number;
  result: number;
  timestamp: number;
};

export type DropdownOption<T extends string> = { value: T; label: string; hint?: string };
