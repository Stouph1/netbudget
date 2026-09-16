// Le foyer tel que l'app le connaît : les enfants et animaux enregistrés dans
// « Anniversaires », relus par le Coach et le Profil.
//
// POURQUOI CE MODULE. Le Coach demandait les tranches d'âge des enfants ; les
// Anniversaires demandaient leurs prénoms et dates. Deux saisies pour la même
// réalité, et deux écrans qui ne se parlaient pas : un parent ajoutait Natan,
// 3 ans, dans Anniversaires, et le Coach continuait à ignorer la petite
// enfance. Ici, on dérive les tranches des dates de naissance — une seule
// vérité, celle qui a un prénom.

import type { ChildAgeBracket } from "../types/advice";
import { computeAge } from "../utils/birthday";

/** Ce dont on a besoin d'une personne du foyer — le type complet vit dans premiumStore. */
export type HouseholdPerson = {
  id: string;
  kind: "child" | "pet";
  name: string;
  birthdate: string; // ISO "AAAA-MM-JJ"
  species?: "dog" | "cat" | "other";
};

export const CHILD_BRACKETS: readonly ChildAgeBracket[] = ["0-6", "7-11", "12-15", "16-18", "19+"];

/** Tranche du Coach pour un âge d'enfant. Les bornes sont celles des options. */
export function childBracket(age: number): ChildAgeBracket {
  if (age <= 6) return "0-6";
  if (age <= 11) return "7-11";
  if (age <= 15) return "12-15";
  if (age <= 18) return "16-18";
  return "19+";
}

export type HouseholdChild = { id: string; name: string; age: number; bracket: ChildAgeBracket };

/** Les enfants du foyer, avec leur âge du jour et leur tranche. */
export function childrenOf(persons: readonly HouseholdPerson[], now: Date = new Date()): HouseholdChild[] {
  return persons
    .filter((p) => p.kind === "child")
    .map((p) => {
      const d = new Date(p.birthdate + "T12:00:00");
      const age = Number.isNaN(d.getTime()) ? 0 : Math.max(0, computeAge(d, now));
      return { id: p.id, name: p.name, age, bracket: childBracket(age) };
    });
}

/** Tranches d'âge que les Anniversaires imposent au profil Coach. */
export function derivedChildBrackets(persons: readonly HouseholdPerson[], now: Date = new Date()): ChildAgeBracket[] {
  const set = new Set(childrenOf(persons, now).map((c) => c.bracket));
  return CHILD_BRACKETS.filter((b) => set.has(b));
}

/**
 * Tranches effectives : celles des Anniversaires, plus celles cochées à la
 * main pour un enfant qui n'y figure pas. Triées dans l'ordre des options,
 * pour que deux profils égaux s'écrivent pareil.
 */
export function mergeChildBrackets(
  manual: readonly ChildAgeBracket[] | undefined,
  derived: readonly ChildAgeBracket[],
): ChildAgeBracket[] {
  const set = new Set<ChildAgeBracket>([...(manual ?? []), ...derived]);
  return CHILD_BRACKETS.filter((b) => set.has(b));
}

export function sameBrackets(a: readonly ChildAgeBracket[] | undefined, b: readonly ChildAgeBracket[]): boolean {
  const x = mergeChildBrackets(a, []);
  const y = mergeChildBrackets(b, []);
  return x.length === y.length && x.every((v, i) => v === y[i]);
}

/** Les animaux du foyer, avec leur âge. */
export function petsOf(persons: readonly HouseholdPerson[], now: Date = new Date()) {
  return persons
    .filter((p) => p.kind === "pet")
    .map((p) => {
      const d = new Date(p.birthdate + "T12:00:00");
      return { id: p.id, name: p.name, species: p.species ?? "other", age: Number.isNaN(d.getTime()) ? 0 : Math.max(0, computeAge(d, now)) };
    });
}
