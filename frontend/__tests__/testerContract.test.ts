// Le contrat de test, tel qu'il est affiché.
//
// CE QUI EST VERROUILLÉ ICI : le texte affiché dans l'application et le texte
// du PDF viennent du MÊME fichier, et la version voyage avec l'approbation. Si
// l'un de ces deux liens casse, on se retrouve à prétendre que des gens ont
// approuvé un texte qu'ils n'ont jamais lu.

import contract from "../src/data/testerContract.json";
import {
  APPROVAL,
  CONTRACT_VERSION,
  contractSections,
} from "../src/lib/testerContract";

describe("version du contrat", () => {
  it("est celle du fichier source, sans transformation", () => {
    // Elle est enregistrée telle quelle côté serveur : la moindre dérive rend
    // les approbations passées inexploitables.
    expect(CONTRACT_VERSION).toBe(contract.version);
    expect(CONTRACT_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("sections", () => {
  it("reprend toutes celles du fichier, dans l'ordre", () => {
    const ids = contractSections("family").map((s) => s.id);
    expect(ids).toEqual(contract.sections.map((s) => s.id));
  });

  it("nomme la formule testée dans le texte", () => {
    const texte = contractSections("duo")
      .flatMap((s) => [...(s.body ?? []), ...(s.bullets ?? [])])
      .join(" ");
    expect(texte).toContain("Duo");
    // Un placeholder resté brut à l'écran ferait douter de tout le reste.
    expect(texte).not.toContain("{formule}");
  });

  it("nomme correctement chaque palier", () => {
    const nom = (tier: Parameters<typeof contractSections>[0]) =>
      contractSections(tier)
        .flatMap((s) => s.body ?? [])
        .join(" ");
    expect(nom("free")).toContain("Gratuit");
    expect(nom("solo")).toContain("Solo");
    expect(nom("family")).toContain("Famille");
  });

  it("annonce noir sur blanc que la formule sera retirée", () => {
    // C'est la phrase qui évite qu'un testeur se croie abonné à vie et le
    // prenne mal au lancement. Elle ne doit jamais disparaître d'une refonte.
    const texte = contractSections("family")
      .flatMap((s) => s.body ?? [])
      .join(" ");
    expect(texte).toMatch(/retirée à la fin/i);
  });
});

describe("bloc d'approbation", () => {
  it("demande un nom et au moins deux confirmations", () => {
    expect(APPROVAL.champNom.length).toBeGreaterThan(0);
    expect(APPROVAL.cases.length).toBeGreaterThanOrEqual(2);
  });

  it("propose une sortie explicite", () => {
    // Sans bouton de refus, le seul moyen de dire non serait de désinstaller.
    expect(APPROVAL.boutonRefuser.length).toBeGreaterThan(0);
  });

  it("dit ce qui est enregistré", () => {
    expect(APPROVAL.mentionTrace).toMatch(/nom/i);
    expect(APPROVAL.mentionTrace).toMatch(/date/i);
  });
});
