
describe("validUntil", () => {
  it("retire une carte après sa date de validité", () => {
    const { ADVICE_CATALOG_FR } = require("../src/lib/adviceEngine");
    const dated = ADVICE_CATALOG_FR.filter((c: { validUntil?: string }) => c.validUntil);
    expect(dated.length).toBeGreaterThan(0);
    for (const c of dated) expect(c.validUntil).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
