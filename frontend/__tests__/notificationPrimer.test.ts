// Quand demander la permission de notifier — la décision pure.
// Les modules natifs sont remplacés : seule la décision est testée ici.
jest.mock("expo-notifications", () => ({ getPermissionsAsync: jest.fn() }));
jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() },
}));

import { ASK_FROM_OPEN, decidePrime } from "../src/utils/notificationPrimer";

const now = new Date("2026-09-28T10:00:00Z");
const base = { opens: ASK_FROM_OPEN, status: "undetermined" as const, canAskAgain: true, primedAt: null, now };

describe("decidePrime", () => {
  it("jamais à la première ouverture", () => {
    expect(decidePrime({ ...base, opens: 1 })).toBe(false);
  });
  it("à partir de la deuxième, si rien n'a encore été demandé", () => {
    expect(decidePrime(base)).toBe(true);
  });
  it("jamais si le système a déjà répondu, dans un sens ou l'autre", () => {
    expect(decidePrime({ ...base, status: "granted" })).toBe(false);
    expect(decidePrime({ ...base, status: "denied" })).toBe(false);
    expect(decidePrime({ ...base, canAskAgain: false })).toBe(false);
  });
  it("« plus tard » : on retente après deux semaines, pas avant", () => {
    const soon = new Date(now.getTime() - 5 * 86_400_000);
    const long = new Date(now.getTime() - 15 * 86_400_000);
    expect(decidePrime({ ...base, primedAt: soon })).toBe(false);
    expect(decidePrime({ ...base, primedAt: long })).toBe(true);
  });
});
