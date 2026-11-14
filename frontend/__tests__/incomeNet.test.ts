import { monthlyNetForSource, type IncomeSource } from "../src/utils/income";

const base: IncomeSource = {
  id: "a",
  label: "Salaire",
  type: "salaire",
  amount: "2000",
  frequency: "monthly",
  chargesPercent: "22",
  withholdingPercent: "5",
};

describe("revenu saisi en net", () => {
  it("brut (par défaut, rétrocompatible) : charges et impôt déduits", () => {
    expect(monthlyNetForSource(base, 0)).toBeCloseTo(2000 * 0.78 * 0.95);
  });
  it("net : le montant saisi est ce qui arrive sur le compte", () => {
    expect(monthlyNetForSource({ ...base, amountKind: "net" }, 0)).toBe(2000);
  });
});
