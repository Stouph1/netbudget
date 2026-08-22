// Toute clé écrite en dur dans le code doit exister dans le catalogue.
//
// POURQUOI CE TEST EXISTE : les tests de traduction comparaient les huit
// langues ENTRE ELLES. Une clé appelée par un écran mais absente PARTOUT
// passait donc au travers — et `t()` renvoie la clé elle-même quand elle
// manque. Résultat à l'écran : « ADV.MIX.BENCHMARK » à la place de « Repère »,
// et « adv.mix.generic.intro » en pleine explication de la règle 50/30/20.
//
// Ce test lit les sources et vérifie chaque appel `t("…")` / `tp("…", …)`
// littéral. Les clés construites dynamiquement (`t(`notifPrefs.cat.${k}`)`) ne
// sont pas détectables ici — pour celles-là, ce sont les tests de l'écran
// concerné qui doivent couvrir chaque valeur possible.

import fs from "fs";
import path from "path";
import { fr } from "../src/i18n/locales/fr";

const ROOT = path.join(__dirname, "..");

/** Fichiers de code applicatif — pas les catalogues ni les tests. */
function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "locales") continue;
      sourceFiles(full, out);
    } else if (/\.tsx?$/.test(entry.name) && !entry.name.includes(".test.")) {
      out.push(full);
    }
  }
  return out;
}

// `t("clé")` ou `tp("clé", {…})`. On exige une minuscule en tête pour écarter
// les appels à d'autres fonctions d'une lettre.
const CALL = /\bt{1,2}\(\s*"([a-z][a-zA-Z0-9_.\-]*)"/g;

type Usage = { key: string; file: string };

function collectUsages(): Usage[] {
  const files = [
    ...sourceFiles(path.join(ROOT, "app")),
    ...sourceFiles(path.join(ROOT, "src")),
  ];
  const out: Usage[] = [];
  for (const file of files) {
    if (file.includes(`${path.sep}i18n${path.sep}`)) continue;
    const code = fs.readFileSync(file, "utf8");
    for (const m of code.matchAll(CALL)) {
      out.push({ key: m[1], file: path.relative(ROOT, file) });
    }
  }
  return out;
}

describe("couverture des clés i18n", () => {
  const usages = collectUsages();

  it("trouve bien des appels à traduire (le collecteur fonctionne)", () => {
    // Sans ce garde-fou, une regex cassée ferait passer le test suivant en
    // vérifiant zéro clé.
    expect(usages.length).toBeGreaterThan(500);
  });

  it("aucune clé utilisée n'est absente du catalogue français", () => {
    const missing = usages
      .filter((u) => !(u.key in fr))
      .map((u) => `${u.key}  (${u.file})`);
    expect([...new Set(missing)]).toEqual([]);
  });

  it("aucune clé ne se traduit par elle-même en français", () => {
    // Une valeur égale à sa clé est un oubli de traduction déguisé : à
    // l'écran, l'utilisateur lit un identifiant technique.
    const echoes = Object.keys(fr).filter((k) => fr[k] === k);
    expect(echoes).toEqual([]);
  });
});
