// Date de naissance : âge auto, tranche d'âge, anniversaire (notification +
// célébration in-app avec cartes personnalisées).

import type { AgeBracket } from "../types/advice";

// "JJ/MM/AAAA" → Date (ou null si invalide / incohérente).
// minAge par défaut 10 : garde-fou pour la date de naissance de l'UTILISATEUR
// (inscription). Pour un enfant ou un animal, passer { minAge: 0 } —
// un chaton de 3 mois ou un bébé sont des dates parfaitement valides.
export function parseBirthdate(
  input: string,
  opts: { minAge?: number; maxAge?: number } = {},
): Date | null {
  const { minAge = 10, maxAge = 110 } = opts;
  const m = input.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const year = parseInt(m[3], 10);
  const d = new Date(year, month - 1, day);
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day
  ) {
    return null;
  }
  if (d.getTime() > Date.now()) return null; // jamais dans le futur
  const age = computeAge(d);
  if (age < minAge || age > maxAge) return null;
  return d;
}

export function computeAge(birthdate: Date, at: Date = new Date()): number {
  let age = at.getFullYear() - birthdate.getFullYear();
  const beforeBirthday =
    at.getMonth() < birthdate.getMonth() ||
    (at.getMonth() === birthdate.getMonth() && at.getDate() < birthdate.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

export function ageToBracket(age: number): AgeBracket {
  if (age < 18) return "under_18";
  if (age <= 25) return "18-25";
  if (age <= 35) return "26-35";
  if (age <= 50) return "36-50";
  if (age <= 65) return "51-65";
  return "66+";
}

// "1999-04-23" (colonne SQL date) → "23/04/1999" pour l'input
export function isoToInput(iso: string | null): string {
  if (!iso) return "";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

export function dateToIso(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function isBirthdayToday(birthdateIso: string, now: Date = new Date()): boolean {
  const m = birthdateIso.match(/^\d{4}-(\d{2})-(\d{2})/);
  if (!m) return false;
  // 29 février : fêté le 28/02 les années non bissextiles
  const bMonth = parseInt(m[1], 10);
  const bDay = parseInt(m[2], 10);
  if (bMonth === 2 && bDay === 29) {
    const isLeap = new Date(now.getFullYear(), 1, 29).getDate() === 29;
    if (!isLeap) return now.getMonth() === 1 && now.getDate() === 28;
  }
  return now.getMonth() + 1 === bMonth && now.getDate() === bDay;
}

// Prochaine occurrence de l'anniversaire (aujourd'hui 09:00 si c'est le jour
// et qu'il n'est pas encore 09:00, sinon l'année prochaine).
export function nextBirthdayAt(birthdateIso: string, now: Date = new Date()): Date | null {
  const m = birthdateIso.match(/^\d{4}-(\d{2})-(\d{2})/);
  if (!m) return null;
  const month = parseInt(m[1], 10) - 1;
  const day = parseInt(m[2], 10);
  let candidate = new Date(now.getFullYear(), month, day, 9, 0, 0);
  if (candidate.getTime() <= now.getTime()) {
    candidate = new Date(now.getFullYear() + 1, month, day, 9, 0, 0);
  }
  return candidate;
}

// Planifie la notification du prochain anniversaire (si permission déjà
// accordée — on ne déclenche jamais la demande ici). Import dynamique :
// expo-notifications est inopérant sur le web.
export async function scheduleBirthdayNotification(
  birthdateIso: string,
  firstName: string | null,
): Promise<void> {
  try {
    const Notifications = await import("expo-notifications");
    const perms = await Notifications.getPermissionsAsync();
    if (!perms.granted) return;
    const next = nextBirthdayAt(birthdateIso);
    if (!next) return;
    await Notifications.cancelScheduledNotificationAsync("birthday").catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier: "birthday",
      content: {
        title: `Joyeux anniversaire${firstName ? ` ${firstName}` : ""} ! 🎂`,
        body: "Ouvre NetBudget — on t'a préparé quelque chose pour ton budget de l'année.",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: next,
      },
    });
  } catch {
    // best-effort : jamais bloquant
  }
}
