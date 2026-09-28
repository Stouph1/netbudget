// Le conseil de la semaine : même semaine, même conseil ; semaine suivante, un autre.

import { pickWeekly, weekKey } from "../src/lib/weeklyAdvice";
import type { AdviceCard } from "../src/types/advice";

const cards = ["a", "b", "c", "d", "e"].map(
  (id, i) => ({ id, priority: 10 * i } as unknown as AdviceCard),
);

describe("weekKey", () => {
  it("suit la semaine ISO, lundi compris", () => {
    expect(weekKey(new Date("2026-09-28T10:00:00Z"))).toBe("2026-W40"); // lundi
    expect(weekKey(new Date("2026-10-04T10:00:00Z"))).toBe("2026-W40"); // dimanche, même semaine
    expect(weekKey(new Date("2026-10-05T10:00:00Z"))).toBe("2026-W41");
  });
});

describe("pickWeekly", () => {
  it("est stable dans la semaine et change d'une semaine à l'autre", () => {
    const a = pickWeekly(cards, "2026-W40");
    expect(pickWeekly(cards, "2026-W40")).toBe(a);
    const seen = new Set(["2026-W40", "2026-W41", "2026-W42", "2026-W43"].map((k) => pickWeekly(cards, k)!.id));
    expect(seen.size).toBeGreaterThan(1);
  });
  it("rien sans conseil applicable", () => {
    expect(pickWeekly([], "2026-W40")).toBeNull();
  });
});
