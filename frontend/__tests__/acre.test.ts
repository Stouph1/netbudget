import { ACRE_CONDITIONS, acreVerdict } from "../src/lib/acre";

describe("ACRE — verdict", () => {
  // La règle de la fiche F11677, sans appréciation ajoutée : au moins une
  // situation, et pas d'ACRE dans les trois dernières années.
  it("ouvre le droit dès une situation cochée", () => {
    expect(acreVerdict(["age"], false)).toBe("eligible");
    expect(acreVerdict(["are", "qpv"], false)).toBe("eligible");
  });

  it("ferme le droit après une ACRE récente, quoi qu'il en soit", () => {
    expect(acreVerdict(["age", "rsa"], true)).toBe("blocked");
    expect(acreVerdict([], true)).toBe("blocked");
  });

  it("ne conclut rien sans situation", () => {
    expect(acreVerdict([], false)).toBe("none");
  });

  // Dix situations, celles de la fiche. Une de plus ou de moins signalerait
  // une édition qui n'a pas relu la source.
  it("garde les dix situations de la fiche", () => {
    expect(ACRE_CONDITIONS).toHaveLength(10);
  });
});
