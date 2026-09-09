import { addSnapshot, buildRecap, NOISE_FLOOR, previousSnapshot, type Snapshot } from "./recap";

const snap = (month: string, net: number, expenses: number, remaining: number): Snapshot => ({
  month,
  net,
  expenses,
  remaining,
});

describe("buildRecap", () => {
  it("rend null au premier point : il n'y a rien à comparer", () => {
    expect(buildRecap(null, snap("2026-09", 2000, 1500, 500))).toBeNull();
  });

  it("rend null si le point précédent est du même mois", () => {
    expect(
      buildRecap(snap("2026-09", 2000, 1500, 500), snap("2026-09", 2100, 1500, 600)),
    ).toBeNull();
  });

  // Un écart de trois euros vient d'un arrondi, pas d'un changement de vie.
  it("ignore ce qui est sous le seuil de bruit", () => {
    expect(
      buildRecap(snap("2026-08", 2000, 1500, 500), snap("2026-09", 2003, 1502, 501)),
    ).toBeNull();
    expect(NOISE_FLOOR).toBe(5);
  });

  it("donne l'écart signé et la lecture de chaque champ", () => {
    const r = buildRecap(snap("2026-08", 2000, 1500, 500), snap("2026-09", 2000, 1400, 600));
    expect(r).not.toBeNull();
    expect(r!.since).toBe("2026-08");

    const expenses = r!.lines.find((l) => l.key === "expenses")!;
    expect(expenses.delta).toBe(-100);
    // Des dépenses qui baissent : une baisse est une bonne nouvelle ici.
    expect(expenses.upIsGood).toBe(false);

    const remaining = r!.lines.find((l) => l.key === "remaining")!;
    expect(remaining.delta).toBe(100);
    expect(remaining.upIsGood).toBe(true);
  });

  it("met le plus gros écart en tête", () => {
    // net −300, dépenses −400, reste +100 : les dépenses dominent.
    const r = buildRecap(snap("2026-08", 2000, 1500, 500), snap("2026-09", 1700, 1100, 600));
    expect(r!.lines.map((l) => l.key)).toEqual(["expenses", "net", "remaining"]);
  });
});

describe("previousSnapshot", () => {
  const history = [snap("2026-06", 1, 1, 1), snap("2026-08", 2, 2, 2), snap("2026-09", 3, 3, 3)];

  it("prend le plus récent des mois antérieurs", () => {
    expect(previousSnapshot(history, "2026-09")!.month).toBe("2026-08");
  });

  it("ignore le mois en cours", () => {
    expect(previousSnapshot([snap("2026-09", 1, 1, 1)], "2026-09")).toBeNull();
  });

  it("rend null sur un historique vide", () => {
    expect(previousSnapshot([], "2026-09")).toBeNull();
  });
});

describe("addSnapshot", () => {
  // Corriger son loyer une heure après son point doit se voir le mois suivant.
  it("remplace l'instantané du même mois", () => {
    const out = addSnapshot([snap("2026-09", 1, 1, 1)], snap("2026-09", 9, 9, 9));
    expect(out).toHaveLength(1);
    expect(out[0].net).toBe(9);
  });

  it("garde l'historique trié et borné", () => {
    let h: Snapshot[] = [];
    for (let i = 1; i <= 30; i++) {
      h = addSnapshot(h, snap(`2026-${String((i % 12) + 1).padStart(2, "0")}`, i, i, i), 24);
    }
    expect(h.length).toBeLessThanOrEqual(24);
    expect([...h].sort((a, b) => a.month.localeCompare(b.month))).toEqual(h);
  });
});
