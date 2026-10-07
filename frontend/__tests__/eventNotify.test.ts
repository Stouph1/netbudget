// Deux jalons tombant le même jour donnaient deux notifications identiques
// à la même minute (« Fête patrick » × 2, le 6 octobre 2026 à 9 h).
import { groupMilestonesByDay, milestoneDate } from "../src/utils/eventNotify";

const ev = {
  dateIso: "2027-01-06",
  milestones: [
    { id: "a", label: "Fixer la date", monthsBefore: 3, done: false },
    { id: "b", label: "Réserver la salle", monthsBefore: 3, done: false },
    { id: "c", label: "Envoyer les invitations", monthsBefore: 1, done: false },
    { id: "d", label: "Acheter le gâteau", monthsBefore: 1, done: true },
    { id: "e", label: "Jour J", monthsBefore: 0, done: false },
  ],
} as unknown as Parameters<typeof groupMilestonesByDay>[0];

describe("jalons d'événement regroupés par jour", () => {
  const groups = groupMilestonesByDay(ev);

  it("fait un seul rappel pour les jalons du même jour", () => {
    expect(groups).toHaveLength(2);
    expect(groups[0].ids).toEqual(["a", "b"]);
    expect(groups[0].labels).toEqual(["Fixer la date", "Réserver la salle"]);
    expect(groups[0].at.getTime()).toBe(milestoneDate("2027-01-06", 3).getTime());
  });

  it("ignore les jalons faits et le jour J", () => {
    expect(groups[1].ids).toEqual(["c"]);
  });

  it("classe les rappels du plus proche au plus lointain", () => {
    expect(groups[0].at.getTime()).toBeLessThan(groups[1].at.getTime());
  });
});
