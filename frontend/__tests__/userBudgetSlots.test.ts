// Un budget local PAR COMPTE. Avant : on se déconnectait et le budget était
// encore là ; un second compte créé sur le téléphone héritait du premier.
const mem = new Map<string, string>();
jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k: string) => mem.get(k) ?? null),
    setItem: jest.fn(async (k: string, v: string) => { mem.set(k, v); }),
    removeItem: jest.fn(async (k: string) => { mem.delete(k); }),
  },
}));

import {
  decideUserBudgetSource,
  loadState,
  loadUserBudget,
  releaseUserBudgetToDevice,
  saveState,
  saveUserBudget,
} from "../src/utils/storage";

beforeEach(() => mem.clear());

describe("décision", () => {
  it("lit l'emplacement du compte quand il existe", () => {
    expect(decideUserBudgetSource({ hasSlot: true, firstOwner: "b", userId: "a" })).toBe("slot");
  });
  it("adopte le budget du téléphone pour le premier compte", () => {
    expect(decideUserBudgetSource({ hasSlot: false, firstOwner: null, userId: "a" })).toBe("adopt");
  });
  it("repart de zéro pour un second compte", () => {
    expect(decideUserBudgetSource({ hasSlot: false, firstOwner: "a", userId: "b" })).toBe("fresh");
  });
});

describe("stephane puis james sur le même téléphone", () => {
  const stephaneBudget = { incomes: [{ id: "s", amount: "3000" }], rent: "900", expenseItems: [], loans: [] };

  it("stephane adopte son budget d'avant inscription, james part vide, le téléphone est vide", async () => {
    await saveState({ ...stephaneBudget, currency: "EUR", lang: "fr", cityId: "paris" });

    const s = await loadUserBudget("stephane");
    expect(s?.rent).toBe("900");
    expect(s?.incomes).toHaveLength(1);

    // Le téléphone a rendu le budget mais gardé ses réglages.
    const device = await loadState();
    expect(device?.rent).toBeUndefined();
    expect(device?.incomes).toBeUndefined();
    expect(device?.currency).toBe("EUR");
    expect(device?.cityId).toBe("paris");

    // James, second compte : rien de stephane.
    expect(await loadUserBudget("james")).toBeNull();

    // Stephane revient : son budget est intact.
    expect((await loadUserBudget("stephane"))?.rent).toBe("900");
  });

  it("chaque compte écrit chez lui", async () => {
    await saveUserBudget("stephane", stephaneBudget);
    await saveUserBudget("james", { ...stephaneBudget, rent: "500" });
    expect((await loadUserBudget("stephane"))?.rent).toBe("900");
    expect((await loadUserBudget("james"))?.rent).toBe("500");
  });

  it("à la suppression du compte, le budget redevient celui du téléphone", async () => {
    await saveState({ currency: "EUR" });
    await saveUserBudget("stephane", stephaneBudget);
    await releaseUserBudgetToDevice("stephane");
    const device = await loadState();
    expect(device?.rent).toBe("900");
    expect(device?.currency).toBe("EUR");
    // L'emplacement du compte n'existe plus : un prochain « stephane » adopterait à nouveau.
    expect(mem.has("netbudget:budget:user:stephane")).toBe(false);
  });
});
