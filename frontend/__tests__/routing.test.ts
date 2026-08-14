// Garde-fou sur le contenu de app/.
//
// expo-router charge TOUT ce qui se trouve sous app/ pour construire ses
// routes. Un fichier de test colocalisé y devient une route : au démarrage,
// l'app plante sur « describe is not defined » — écran blanc, aucun indice
// utile pour l'utilisateur.
//
// Ça s'est produit une fois. Ce test empêche que ça recommence.

import { readdirSync, statSync } from "fs";
import { join } from "path";

const APP_DIR = join(__dirname, "..", "app");

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

describe("contenu de app/", () => {
  const files = walk(APP_DIR).map((f) => f.slice(APP_DIR.length + 1));

  it("ne contient AUCUN fichier de test", () => {
    // Les tests des modules de app/_budget vivent dans __tests__/budget/.
    const tests = files.filter((f) => /\.(test|spec)\.(ts|tsx)$/.test(f));
    expect(tests).toEqual([]);
  });

  it("ne contient aucun écran de debug oublié", () => {
    // Tout fichier dans app/ devient une route ACCESSIBLE EN PRODUCTION.
    // `app/premium-test.tsx` traînait ainsi, avec un bouton de connexion.
    const debug = files.filter((f) => /(test|debug|tmp|scratch|sandbox)/i.test(f));
    expect(debug).toEqual([]);
  });

  it("ne contient pas de fichier de sauvegarde", () => {
    const backups = files.filter((f) => /\.(bak|orig|old|copy)$|~$/.test(f));
    expect(backups).toEqual([]);
  });
});
