jest.mock("@react-native-async-storage/async-storage", () => ({}));
jest.mock("expo-store-review", () => ({}));

import { shouldAskForReview, withVisit, type ReviewState } from "../src/lib/reviewPrompt";

const NOW = new Date("2026-11-20T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

const used = (days: number[], asked: Date[] = []): ReviewState => {
  let s: ReviewState = { firstOpen: null, activeDays: [], asked: [] };
  for (const d of [...days].sort((a, b) => b - a)) s = withVisit(s, daysAgo(d));
  return { ...s, asked: asked.map((d) => d.toISOString()) };
};

describe("demande de note", () => {
  it("ne demande pas au premier jour", () => {
    expect(shouldAskForReview(used([0]), NOW)).toBe(false);
  });

  it("attend trois jours d'usage distincts", () => {
    expect(shouldAskForReview(used([5, 0]), NOW)).toBe(false);
    expect(shouldAskForReview(used([5, 2, 0]), NOW)).toBe(true);
  });

  it("espace les demandes de 90 jours", () => {
    expect(shouldAskForReview(used([5, 2, 0], [daysAgo(30)]), NOW)).toBe(false);
    expect(shouldAskForReview(used([5, 2, 0], [daysAgo(100)]), NOW)).toBe(true);
  });

  it("au plus trois par an", () => {
    const asked = [daysAgo(300), daysAgo(200), daysAgo(100)];
    expect(shouldAskForReview(used([5, 2, 0], asked), NOW)).toBe(false);
  });

  it("compte un jour une seule fois", () => {
    const s = withVisit(withVisit(used([]), NOW), NOW);
    expect(s.activeDays).toHaveLength(1);
  });
});
