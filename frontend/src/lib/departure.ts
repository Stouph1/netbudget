// Retours de départ : ce que quelqu'un nous dit en résiliant ou en supprimant
// son compte. Enregistré côté serveur, anonyme (migration 028).
//
// Toujours « au mieux » : un échec ici ne doit JAMAIS bloquer la sortie. On
// n'échange pas une résiliation contre un questionnaire, et encore moins
// contre un réseau qui marche.
import { Platform } from "react-native";
import { supabase } from "./supabase";

export type DepartureKind = "cancel_subscription" | "delete_account";
export type DepartureReason = "price" | "unused" | "missing" | "bug" | "privacy" | "other";

/** Motifs proposés à la suppression de compte. Pas « trop cher » : le compte est gratuit. */
export const DELETE_REASONS: DepartureReason[] = ["unused", "missing", "bug", "privacy", "other"];

export const DETAILS_MAX = 300;

export function platformLabel(): "ios" | "android" | "web" | "unknown" {
  if (Platform.OS === "ios" || Platform.OS === "android" || Platform.OS === "web") return Platform.OS;
  return "unknown";
}

export async function sendDepartureFeedback(input: {
  kind: DepartureKind;
  reason: DepartureReason | null;
  details?: string;
  lang: string;
}): Promise<boolean> {
  try {
    const { error } = await supabase.rpc("leave_feedback", {
      p_kind: input.kind,
      p_reason: input.reason ?? "none",
      p_details: (input.details ?? "").trim().slice(0, DETAILS_MAX) || null,
      p_platform: platformLabel(),
      p_lang: input.lang,
    });
    return !error;
  } catch {
    return false;
  }
}
