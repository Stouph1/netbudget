import { passExpiry } from "./rewardPass";

describe("laissez-passer de 24 h", () => {
  const now = 1_000_000;
  it("court tant que l'échéance est devant", () => {
    expect(passExpiry(String(now + 1), now)).toBe(now + 1);
  });
  it("est éteint une fois l'échéance passée", () => {
    expect(passExpiry(String(now), now)).toBe(0);
    expect(passExpiry(String(now - 5), now)).toBe(0);
  });
  it("ignore une valeur absente ou abîmée", () => {
    expect(passExpiry(null, now)).toBe(0);
    expect(passExpiry("abc", now)).toBe(0);
  });
});
