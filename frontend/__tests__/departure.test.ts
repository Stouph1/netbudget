// Retours de départ : le motif part au mieux, jamais au prix de la sortie.
const rpc = jest.fn();
jest.mock("../src/lib/supabase", () => ({ supabase: { rpc: (...a: unknown[]) => rpc(...a) } }));

import { DELETE_REASONS, DETAILS_MAX, sendDepartureFeedback } from "../src/lib/departure";

describe("sendDepartureFeedback", () => {
  beforeEach(() => rpc.mockReset());

  it("envoie le motif, la plateforme et la langue, texte borné", async () => {
    rpc.mockResolvedValue({ error: null });
    const ok = await sendDepartureFeedback({
      kind: "delete_account",
      reason: "privacy",
      details: " x".repeat(400),
      lang: "de",
    });
    expect(ok).toBe(true);
    expect(rpc).toHaveBeenCalledWith("leave_feedback", expect.objectContaining({
      p_kind: "delete_account",
      p_reason: "privacy",
      p_lang: "de",
    }));
    const details = rpc.mock.calls[0][1].p_details as string;
    expect(details.length).toBeLessThanOrEqual(DETAILS_MAX);
  });

  it("sans motif ni texte : 'none' et null, pas de chaîne vide", async () => {
    rpc.mockResolvedValue({ error: null });
    await sendDepartureFeedback({ kind: "cancel_subscription", reason: null, details: "   ", lang: "fr" });
    expect(rpc.mock.calls[0][1]).toMatchObject({ p_reason: "none", p_details: null });
  });

  it("ne lève jamais : une erreur réseau rend false", async () => {
    rpc.mockRejectedValue(new Error("offline"));
    await expect(
      sendDepartureFeedback({ kind: "delete_account", reason: "bug", lang: "fr" }),
    ).resolves.toBe(false);
  });

  it("ne propose pas « trop cher » à la suppression d'un compte gratuit", () => {
    expect(DELETE_REASONS).not.toContain("price");
    expect(DELETE_REASONS).toContain("privacy");
  });
});
