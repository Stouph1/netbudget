import {
  backfillItemLabels,
  convertOne,
  displayItemLabel,
  formatMonthInput,
  relativeAgoParts,
  isoToMonthInput,
  loanMonthlyPayment,
  monthInputToIso,
  sumAmounts,
} from "../../app/_budget/helpers";
import { DEFAULT_ITEMS } from "../../app/_budget/constants";
import type { ExpenseItem, Loan } from "../../app/_budget/types";
import type { RatesPayload } from "../../src/utils/exchangeRates";

// ---------------------------------------------------------------------------
// Saisie de la date de 1re échéance (MM/AAAA <-> ISO)
// ---------------------------------------------------------------------------
describe("formatMonthInput", () => {
  it("laisse passer 1 ou 2 chiffres sans slash", () => {
    expect(formatMonthInput("")).toBe("");
    expect(formatMonthInput("0")).toBe("0");
    expect(formatMonthInput("09")).toBe("09");
  });

  it("insère le slash dès le 3e chiffre", () => {
    expect(formatMonthInput("092")).toBe("09/2");
    expect(formatMonthInput("092023")).toBe("09/2023");
  });

  it("ignore les caractères non numériques et tronque à 6 chiffres", () => {
    expect(formatMonthInput("09/2023")).toBe("09/2023");
    expect(formatMonthInput("ab09xy2023zz")).toBe("09/2023");
    expect(formatMonthInput("0920231234")).toBe("09/2023");
  });
});

describe("monthInputToIso", () => {
  it("convertit une saisie complète en 1er du mois ISO", () => {
    expect(monthInputToIso("09/2023")).toBe("2023-09-01");
    expect(monthInputToIso("122030")).toBe("2030-12-01");
  });

  it("refuse une saisie incomplète", () => {
    expect(monthInputToIso("")).toBeUndefined();
    expect(monthInputToIso("09/202")).toBeUndefined();
  });

  it("refuse un mois hors bornes", () => {
    expect(monthInputToIso("00/2023")).toBeUndefined();
    expect(monthInputToIso("13/2023")).toBeUndefined();
  });

  it("refuse une année hors bornes", () => {
    expect(monthInputToIso("01/1949")).toBeUndefined();
    expect(monthInputToIso("01/2101")).toBeUndefined();
    expect(monthInputToIso("01/1950")).toBe("1950-01-01");
    expect(monthInputToIso("01/2100")).toBe("2100-01-01");
  });
});

describe("isoToMonthInput", () => {
  it("reformate une date ISO en MM/AAAA", () => {
    expect(isoToMonthInput("2023-09-01")).toBe("09/2023");
  });

  it("renvoie une chaîne vide quand il n'y a pas de date", () => {
    expect(isoToMonthInput(undefined)).toBe("");
    expect(isoToMonthInput("")).toBe("");
  });

  it("renvoie une chaîne vide sur un format inattendu", () => {
    expect(isoToMonthInput("09/2023")).toBe("");
  });
});

// Aller-retour : ce que l'utilisateur tape doit se relire à l'identique.
describe("monthInputToIso <-> isoToMonthInput", () => {
  it("fait un aller-retour stable", () => {
    const iso = monthInputToIso("07/1988");
    expect(iso).toBe("1988-07-01");
    expect(isoToMonthInput(iso)).toBe("07/1988");
  });
});

// ---------------------------------------------------------------------------
// Mensualité d'un prêt
// ---------------------------------------------------------------------------
describe("loanMonthlyPayment", () => {
  const base: Loan = {
    id: "l1",
    name: "Immo",
    principal: "100000",
    ratePercent: "0",
    years: "10",
  };

  it("mode direct : prend la mensualité saisie telle quelle", () => {
    expect(loanMonthlyPayment({ ...base, mode: "direct", directMonthly: "742,50" }))
      .toBeCloseTo(742.5, 2);
  });

  it("mode direct sans montant : 0", () => {
    expect(loanMonthlyPayment({ ...base, mode: "direct" })).toBe(0);
  });

  it("mode calculé : taux 0 => capital / nombre de mois", () => {
    expect(loanMonthlyPayment(base)).toBeCloseTo(100000 / 120, 6);
  });

  it("mode indéfini = calculé (rétrocompat v1.2.x)", () => {
    const withRate: Loan = { ...base, ratePercent: "3" };
    expect(loanMonthlyPayment(withRate)).toBeCloseTo(965.6, 1);
  });

  it("données incomplètes : 0 plutôt que NaN", () => {
    expect(loanMonthlyPayment({ ...base, principal: "0" })).toBe(0);
    expect(loanMonthlyPayment({ ...base, years: "0" })).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Libellés des catégories de dépense
// ---------------------------------------------------------------------------
describe("displayItemLabel", () => {
  const tt = (k: string) => `T:${k}`;

  it("préfère la traduction quand labelKey existe", () => {
    const item = DEFAULT_ITEMS[0];
    expect(displayItemLabel(item, tt)).toBe(`T:${item.labelKey}`);
  });

  it("garde le label brut pour une catégorie renommée / custom", () => {
    const item: ExpenseItem = {
      id: "custom-1",
      family: "loisirs",
      label: "Padel",
      icon: "tag",
      color: "#fff",
      amount: "40",
    };
    expect(displayItemLabel(item, tt)).toBe("Padel");
  });
});

describe("backfillItemLabels", () => {
  it("recolle labelKey sur un item par défaut sauvegardé avant l'i18n", () => {
    const stored: ExpenseItem[] = [
      { id: "transport", family: "besoins", label: "Transport", icon: "navigation", color: "#F59E0B", amount: "120" },
    ];
    expect(backfillItemLabels(stored)[0].labelKey).toBe("expense.transport");
  });

  it("ne touche pas un item par défaut RENOMMÉ par l'utilisateur", () => {
    const stored: ExpenseItem[] = [
      { id: "transport", family: "besoins", label: "Essence", icon: "navigation", color: "#F59E0B", amount: "120" },
    ];
    expect(backfillItemLabels(stored)[0].labelKey).toBeUndefined();
  });

  it("ne touche pas une catégorie custom", () => {
    const stored: ExpenseItem[] = [
      { id: "custom-42", family: "loisirs", label: "Padel", icon: "tag", color: "#fff", amount: "40" },
    ];
    expect(backfillItemLabels(stored)[0]).toEqual(stored[0]);
  });

  it("laisse intact un item qui a déjà son labelKey", () => {
    const stored: ExpenseItem[] = [
      { id: "eau", family: "besoins", label: "Eau", labelKey: "expense.eau", icon: "droplet", color: "#38BDF8", amount: "20" },
    ];
    expect(backfillItemLabels(stored)[0]).toEqual(stored[0]);
  });
});

// ---------------------------------------------------------------------------
// Total d'une famille de dépenses
// ---------------------------------------------------------------------------
describe("sumAmounts", () => {
  const item = (amount: string): ExpenseItem => ({
    id: `i-${amount}`,
    family: "besoins",
    label: amount,
    icon: "tag",
    color: "#fff",
    amount,
  });

  it("liste vide => 0", () => {
    expect(sumAmounts([])).toBe(0);
  });

  it("additionne, y compris les montants saisis à la française", () => {
    expect(sumAmounts([item("100"), item("50,5")])).toBeCloseTo(150.5, 2);
  });

  it("traite les champs vides comme 0", () => {
    expect(sumAmounts([item("100"), item("")])).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// Conversion d'un champ texte de montant
// ---------------------------------------------------------------------------
describe("convertOne", () => {
  // 1 USD = 0,90 EUR = 150 JPY
  const rates: RatesPayload = {
    base: "USD",
    rates: { EUR: 0.9, JPY: 150 },
    fetchedAt: 0,
  };

  it("arrondit à l'entier quand la devise cible n'a pas de décimales", () => {
    // 90 EUR -> 100 USD -> 15 000 JPY
    expect(convertOne("90", "EUR", "JPY", rates, 0)).toBe("15000");
  });

  it("garde 2 décimales sinon", () => {
    expect(convertOne("150", "JPY", "EUR", rates, 2)).toBe("0.90");
  });

  it("laisse le texte intact quand il ne vaut rien (0 ou vide)", () => {
    expect(convertOne("0", "EUR", "JPY", rates, 0)).toBe("0");
    expect(convertOne("", "EUR", "JPY", rates, 0)).toBe("");
  });

  it("laisse le texte intact hors ligne (pas de taux)", () => {
    expect(convertOne("90", "EUR", "JPY", null, 0)).toBe("90");
  });

  it("laisse le texte intact si la devise est absente des taux", () => {
    expect(convertOne("90", "EUR", "AUD", rates, 2)).toBe("90");
  });
});

// ---------------------------------------------------------------------------
// Horodatage relatif de l'historique du convertisseur
// ---------------------------------------------------------------------------
describe("relativeAgoParts", () => {
  const NOW = new Date("2026-08-14T12:00:00Z").getTime();

  it("renvoie l'unité et la valeur, sans texte", () => {
    // Délocalisé : la phrase est composée par l'appelant, dans sa langue.
    expect(relativeAgoParts(NOW - 5_000, NOW)).toEqual({ unit: "now", value: 0 });
    expect(relativeAgoParts(NOW - 5 * 60_000, NOW)).toEqual({ unit: "min", value: 5 });
    expect(relativeAgoParts(NOW - 3 * 3_600_000, NOW)).toEqual({ unit: "hour", value: 3 });
    expect(relativeAgoParts(NOW - 2 * 86_400_000, NOW)).toEqual({ unit: "day", value: 2 });
  });

  it("bascule d'unité aux bornes", () => {
    expect(relativeAgoParts(NOW - 59 * 60_000, NOW).unit).toBe("min");
    expect(relativeAgoParts(NOW - 90 * 60_000, NOW).unit).toBe("hour");
    expect(relativeAgoParts(NOW - 23 * 3_600_000, NOW).unit).toBe("hour");
    expect(relativeAgoParts(NOW - 25 * 3_600_000, NOW).unit).toBe("day");
  });
});
