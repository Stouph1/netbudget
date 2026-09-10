import { F1989, F23267, F358, stepsFor, TAX_STEPS } from "../src/lib/taxGuide";

describe("guide de la déclaration", () => {
  // La règle du projet : aucune étape sans fiche officielle ni date.
  it("source et date chaque étape", () => {
    for (const st of TAX_STEPS) {
      expect(st.sourceUrl).toMatch(/^https:\/\/(www\.|entreprendre\.)service-public\.gouv\.fr\//);
      expect(st.verified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    expect([F358, F1989, F23267].every((u) => TAX_STEPS.some((s) => s.sourceUrl === u))).toBe(true);
  });

  it("montre la ligne micro-entrepreneur aux seuls indépendants", () => {
    expect(stepsFor("self_employed").some((s) => s.id === "micro")).toBe(true);
    expect(stepsFor("employee").some((s) => s.id === "micro")).toBe(false);
    expect(stepsFor("self_employed").some((s) => s.id === "fees")).toBe(false);
  });

  it("garde les étapes communes pour tout le monde", () => {
    for (const occ of ["employee", "self_employed", undefined, "retired"]) {
      const ids = stepsFor(occ).map((s) => s.id);
      expect(ids).toEqual(expect.arrayContaining(["who", "when", "auto", "check", "fix"]));
    }
  });
});
