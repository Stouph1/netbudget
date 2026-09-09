import {
  computeStreak,
  markCheckIn,
  milestoneReached,
  monthKey,
  previousMonth,
} from "./streak";

const at = (y: number, m: number) => new Date(y, m - 1, 15);

describe("monthKey / previousMonth", () => {
  it("formate et recule d'un mois", () => {
    expect(monthKey(at(2026, 9))).toBe("2026-09");
    expect(previousMonth("2026-09")).toBe("2026-08");
  });

  it("passe l'année à l'envers", () => {
    expect(previousMonth("2026-01")).toBe("2025-12");
  });
});

describe("markCheckIn", () => {
  it("ajoute le mois en cours", () => {
    expect(markCheckIn([], at(2026, 9))).toEqual(["2026-09"]);
  });

  // Sans ça, ouvrir l'app dix fois en janvier vaudrait dix mois de série.
  it("ne compte qu'une fois par mois", () => {
    const once = markCheckIn([], at(2026, 9));
    expect(markCheckIn(once, at(2026, 9))).toEqual(["2026-09"]);
  });

  it("garde l'historique trié", () => {
    expect(markCheckIn(["2026-09", "2026-07"], at(2026, 8))).toEqual([
      "2026-07",
      "2026-08",
      "2026-09",
    ]);
  });
});

describe("computeStreak", () => {
  it("compte les mois consécutifs", () => {
    const s = computeStreak(["2026-07", "2026-08", "2026-09"], at(2026, 9));
    expect(s.current).toBe(3);
    expect(s.doneThisMonth).toBe(true);
    expect(s.total).toBe(3);
  });

  // LA RÈGLE QUI COMPTE. Le 1er septembre au matin, une série d'août doit
  // tenir : on n'a pas encore eu l'occasion de faire le point du mois.
  it("tient tant que le mois précédent est fait", () => {
    const s = computeStreak(["2026-07", "2026-08"], at(2026, 9));
    expect(s.current).toBe(2);
    expect(s.doneThisMonth).toBe(false);
  });

  it("retombe après un mois entier sauté", () => {
    expect(computeStreak(["2026-06", "2026-07"], at(2026, 9)).current).toBe(0);
  });

  it("ignore les trous plus anciens", () => {
    const s = computeStreak(["2025-01", "2026-08", "2026-09"], at(2026, 9));
    expect(s.current).toBe(2);
    expect(s.total).toBe(3);
  });

  // Le meilleur score est un acquis : le perdre punirait une interruption.
  it("garde le meilleur score après une rupture", () => {
    const history = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-09"];
    const s = computeStreak(history, at(2026, 9));
    expect(s.current).toBe(1);
    expect(s.best).toBe(4);
  });

  it("part de zéro sans historique", () => {
    expect(computeStreak([], at(2026, 9))).toEqual({
      current: 0,
      best: 0,
      doneThisMonth: false,
      total: 0,
    });
  });
});

describe("milestoneReached", () => {
  const run = (n: number, end: Date) => {
    const months: string[] = [];
    let m = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}`;
    for (let i = 0; i < n; i++) {
      months.unshift(m);
      m = previousMonth(m);
    }
    return months;
  };

  it("se déclenche pile au palier", () => {
    expect(milestoneReached(computeStreak(run(3, at(2026, 9)), at(2026, 9)))).toBe(3);
    expect(milestoneReached(computeStreak(run(12, at(2026, 9)), at(2026, 9)))).toBe(12);
  });

  it("ne se déclenche pas entre deux paliers", () => {
    expect(milestoneReached(computeStreak(run(4, at(2026, 9)), at(2026, 9)))).toBeNull();
  });

  // Sinon le palier se rejouerait chaque mois suivant, sur la seule foi d'une
  // série encore en cours.
  it("ne se rejoue pas tant que le point du mois n'est pas fait", () => {
    const months = run(3, at(2026, 8));
    expect(milestoneReached(computeStreak(months, at(2026, 9)))).toBeNull();
  });
});
