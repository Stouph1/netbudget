import { GOAL_MILESTONES, goalPct, highestMilestone, newMilestones } from "./goalMilestones";

describe("goalPct", () => {
  it("calcule et borne à 100", () => {
    expect(goalPct(50, 200)).toBe(25);
    expect(goalPct(300, 200)).toBe(100);
  });

  // Une cible à zéro donnerait l'infini, et 100 % sur un objectif vide.
  it("rend 0 sur des valeurs impossibles", () => {
    expect(goalPct(100, 0)).toBe(0);
    expect(goalPct(100, -5)).toBe(0);
    expect(goalPct(Number.NaN, 200)).toBe(0);
  });

  it("ne descend pas sous zéro", () => {
    expect(goalPct(-50, 200)).toBe(0);
  });
});

describe("newMilestones", () => {
  it("rend le cap tout juste franchi", () => {
    expect(newMilestones(52, 25)).toEqual([50]);
  });

  it("rend tous les caps d'un gros versement", () => {
    expect(newMilestones(80, 0)).toEqual([25, 50, 75]);
  });

  // Sans ça, la félicitation reviendrait à chaque ouverture de l'écran.
  it("ne rejoue pas un cap déjà fêté", () => {
    expect(newMilestones(52, 50)).toEqual([]);
    expect(newMilestones(100, 100)).toEqual([]);
  });

  // Retirer de l'argent arrive pour de bonnes raisons. On ne reprend rien, et
  // repasser le cap plus tard ne redéclenche pas la fête.
  it("ne redéclenche rien après un retrait puis un retour", () => {
    expect(newMilestones(40, 50)).toEqual([]);
    expect(newMilestones(60, 50)).toEqual([]);
  });

  it("marque l'objectif atteint", () => {
    expect(newMilestones(100, 75)).toEqual([100]);
  });

  it("ne franchit rien juste en dessous du cap", () => {
    expect(newMilestones(24.9, 0)).toEqual([]);
  });
});

describe("highestMilestone", () => {
  it("rend le cap le plus haut atteint", () => {
    expect(highestMilestone(0)).toBe(0);
    expect(highestMilestone(24)).toBe(0);
    expect(highestMilestone(25)).toBe(25);
    expect(highestMilestone(99)).toBe(75);
    expect(highestMilestone(100)).toBe(100);
  });

  it("reste cohérent avec la liste des caps", () => {
    for (const m of GOAL_MILESTONES) expect(highestMilestone(m)).toBe(m);
  });
});
