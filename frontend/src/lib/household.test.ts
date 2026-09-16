import { childBracket, childrenOf, derivedChildBrackets, mergeChildBrackets, petsOf, sameBrackets } from "./household";

const NOW = new Date("2026-09-16T12:00:00");
const persons = [
  { id: "c1", kind: "child" as const, name: "Viviane", birthdate: "2018-12-04" },
  { id: "c2", kind: "child" as const, name: "Natan", birthdate: "2023-02-04" },
  { id: "p1", kind: "pet" as const, name: "Lio", birthdate: "2025-01-01", species: "dog" as const },
];

describe("le foyer d'après les Anniversaires", () => {
  it("calcule l'âge du jour et la tranche du Coach", () => {
    expect(childrenOf(persons, NOW)).toEqual([
      { id: "c1", name: "Viviane", age: 7, bracket: "7-11" },
      { id: "c2", name: "Natan", age: 3, bracket: "0-6" },
    ]);
  });

  // C'est le bug vu en test : Natan, 3 ans, enregistré dans Anniversaires,
  // et le Coach qui ne cochait que 7-11.
  it("impose les tranches des enfants enregistrés", () => {
    expect(derivedChildBrackets(persons, NOW)).toEqual(["0-6", "7-11"]);
    expect(mergeChildBrackets(["7-11"], ["0-6", "7-11"])).toEqual(["0-6", "7-11"]);
    expect(mergeChildBrackets(["19+"], ["0-6"])).toEqual(["0-6", "19+"]);
    expect(mergeChildBrackets(undefined, [])).toEqual([]);
  });

  it("borne les tranches comme les options", () => {
    expect([0, 6, 7, 11, 12, 15, 16, 18, 19, 30].map(childBracket)).toEqual([
      "0-6", "0-6", "7-11", "7-11", "12-15", "12-15", "16-18", "16-18", "19+", "19+",
    ]);
  });

  it("compare deux jeux de tranches sans se soucier de l'ordre", () => {
    expect(sameBrackets(["7-11", "0-6"], ["0-6", "7-11"])).toBe(true);
    expect(sameBrackets(["7-11"], ["0-6", "7-11"])).toBe(false);
    expect(sameBrackets(undefined, [])).toBe(true);
  });

  it("liste les animaux avec leur âge", () => {
    expect(petsOf(persons, NOW)).toEqual([{ id: "p1", name: "Lio", species: "dog", age: 1 }]);
  });
});
