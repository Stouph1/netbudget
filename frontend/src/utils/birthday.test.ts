// Dates de naissance et anniversaires.
//
// Deux bugs réels sont couverts ici : un garde-fou d'âge minimum qui rejetait
// la date de naissance d'un bébé ou d'un chaton, et le 29 février — qui n'a
// pas d'anniversaire 3 années sur 4.

import {
  ageToBracket,
  computeAge,
  dateToIso,
  isBirthdayToday,
  isoToInput,
  nextBirthdayAt,
  parseBirthdate,
} from "./birthday";

describe("parseBirthdate", () => {
  it("accepte les séparateurs usuels", () => {
    for (const v of ["23/04/1999", "23.04.1999", "23-04-1999"]) {
      expect(parseBirthdate(v)).toBeInstanceOf(Date);
    }
  });

  it("refuse une date qui n'existe pas", () => {
    expect(parseBirthdate("31/02/1999")).toBeNull();
    expect(parseBirthdate("32/01/1999")).toBeNull();
    expect(parseBirthdate("15/13/1999")).toBeNull();
  });

  it("refuse une date dans le futur", () => {
    const next = new Date();
    next.setFullYear(next.getFullYear() + 1);
    expect(parseBirthdate(`01/01/${next.getFullYear()}`)).toBeNull();
  });

  it("refuse un format libre", () => {
    expect(parseBirthdate("hier")).toBeNull();
    expect(parseBirthdate("")).toBeNull();
    expect(parseBirthdate("1999")).toBeNull();
  });

  it("applique un âge minimum de 10 ans par défaut (inscription)", () => {
    const thisYear = new Date().getFullYear();
    expect(parseBirthdate(`01/01/${thisYear - 5}`)).toBeNull();
  });

  it("accepte un bébé ou un chaton avec minAge: 0", () => {
    // Régression : le garde-fou par défaut rejetait les enfants et animaux,
    // et l'app disait « date invalide » sans expliquer pourquoi.
    const thisYear = new Date().getFullYear();
    expect(parseBirthdate(`01/01/${thisYear - 1}`, { minAge: 0 })).toBeInstanceOf(Date);
  });

  it("respecte un âge maximum (40 ans pour un animal)", () => {
    const thisYear = new Date().getFullYear();
    expect(
      parseBirthdate(`01/01/${thisYear - 50}`, { minAge: 0, maxAge: 40 }),
    ).toBeNull();
  });
});

describe("computeAge", () => {
  it("compte l'âge atteint, pas l'année de différence", () => {
    // Anniversaire pas encore passé cette année.
    expect(computeAge(new Date(2000, 11, 25), new Date(2026, 5, 1))).toBe(25);
    // Anniversaire passé.
    expect(computeAge(new Date(2000, 0, 25), new Date(2026, 5, 1))).toBe(26);
  });

  it("compte le jour même de l'anniversaire", () => {
    expect(computeAge(new Date(2000, 5, 1), new Date(2026, 5, 1))).toBe(26);
  });
});

describe("ageToBracket", () => {
  it("place chaque âge dans la bonne tranche", () => {
    expect(ageToBracket(15)).toBe("under_18");
    expect(ageToBracket(18)).toBe("18-25");
    expect(ageToBracket(25)).toBe("18-25");
    expect(ageToBracket(26)).toBe("26-35");
    expect(ageToBracket(50)).toBe("36-50");
    expect(ageToBracket(51)).toBe("51-65");
    expect(ageToBracket(66)).toBe("66+");
    expect(ageToBracket(99)).toBe("66+");
  });
});

describe("conversions de format", () => {
  it("passe de l'ISO au champ de saisie et inversement", () => {
    expect(isoToInput("1999-04-23")).toBe("23/04/1999");
    expect(dateToIso(new Date(1999, 3, 23))).toBe("1999-04-23");
  });

  it("tolère une date absente", () => {
    expect(isoToInput(null)).toBe("");
    expect(isoToInput("n'importe quoi")).toBe("");
  });
});

describe("isBirthdayToday", () => {
  it("reconnaît le jour J", () => {
    expect(isBirthdayToday("1999-04-23", new Date(2026, 3, 23))).toBe(true);
  });

  it("dit non la veille et le lendemain", () => {
    expect(isBirthdayToday("1999-04-23", new Date(2026, 3, 22))).toBe(false);
    expect(isBirthdayToday("1999-04-23", new Date(2026, 3, 24))).toBe(false);
  });

  it("fête un 29 février le 28 les années non bissextiles", () => {
    // 2027 n'est pas bissextile : sans ce repli, la personne n'aurait jamais
    // d'anniversaire 3 années sur 4.
    expect(isBirthdayToday("2000-02-29", new Date(2027, 1, 28))).toBe(true);
    expect(isBirthdayToday("2000-02-29", new Date(2028, 1, 29))).toBe(true);
    expect(isBirthdayToday("2000-02-29", new Date(2028, 1, 28))).toBe(false);
  });
});

describe("nextBirthdayAt", () => {
  it("vise cette année si l'anniversaire est à venir", () => {
    const next = nextBirthdayAt("1999-12-25", new Date(2026, 5, 1))!;
    expect(next.getFullYear()).toBe(2026);
    expect(next.getMonth()).toBe(11);
  });

  it("passe à l'année suivante si la date est dépassée", () => {
    const next = nextBirthdayAt("1999-01-25", new Date(2026, 5, 1))!;
    expect(next.getFullYear()).toBe(2027);
  });

  it("programme à 9 h", () => {
    expect(nextBirthdayAt("1999-12-25", new Date(2026, 5, 1))!.getHours()).toBe(9);
  });

  it("renvoie null sur une date invalide", () => {
    expect(nextBirthdayAt("pas-une-date")).toBeNull();
  });
});
