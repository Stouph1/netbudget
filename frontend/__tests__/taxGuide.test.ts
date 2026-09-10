import { audiencesOf, F1989, F23267, F358, F426, F8, stepsFor, TAX_STEPS } from "../src/lib/taxGuide";

describe("guide de la déclaration", () => {
  // La règle du projet : aucune étape sans fiche officielle ni date.
  it("source et date chaque étape", () => {
    for (const st of TAX_STEPS) {
      expect(st.sourceUrl).toMatch(/^https:\/\/(www\.|entreprendre\.)service-public\.gouv\.fr\//);
      expect(st.verified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    expect([F358, F1989, F23267, F426, F8].every((u) => TAX_STEPS.some((s) => s.sourceUrl === u))).toBe(true);
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

  // Le guide suit le profil : la ligne des dons n'apparaît qu'à qui donne,
  // celle des frais de garde qu'à qui a un enfant de moins de 6 ans.
  it("adapte les étapes au donateur et au parent d'un petit", () => {
    const ids = (p: Parameters<typeof stepsFor>[0]) => stepsFor(p).map((s) => s.id);
    expect(ids({ occupation: "employee" })).not.toContain("donations");
    expect(ids({ occupation: "employee", gives: true })).toContain("donations");
    expect(ids({ occupation: "self_employed", youngKids: true })).toEqual(
      expect.arrayContaining(["micro", "childcare"]),
    );
    expect(ids({ youngKids: false })).not.toContain("childcare");
  });

  it("nomme les publics retenus, dans l'ordre des étapes", () => {
    expect(audiencesOf({ occupation: "self_employed", gives: true, youngKids: true })).toEqual([
      "self_employed", "giver", "young_kids",
    ]);
    expect(audiencesOf({})).toEqual(["employee"]);
  });

  // « Corriger après envoi » reste la dernière étape, quoi qu'on ajoute avant.
  it("finit toujours par la correction", () => {
    for (const p of [{}, { gives: true, youngKids: true, occupation: "self_employed" }]) {
      const ids = stepsFor(p).map((s) => s.id);
      expect(ids[ids.length - 1]).toBe("fix");
    }
  });
});
