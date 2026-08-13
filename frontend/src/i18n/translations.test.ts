// Intégrité des 8 catalogues de traduction.
//
// Cette suite existe parce que trois bugs réels sont passés en production sans
// que rien ne les signale :
//  - 323 textes français corrompus (mojibake « VÃ©rifier », « 1 041,59 â¬ ») ;
//  - des cartes migrées vers des clés dont aucune traduction n'existait :
//    l'app affichait « adv.ae-acre-2026.title » à l'écran ;
//  - les cartes d'anniversaire, dont le catalogue était entièrement vide.
// Aucun de ces trois ne casse la compilation. Ils ne se voient qu'ici.

import { CATALOGS, DEFAULT_LANG, LANGUAGES, t } from "./translations";

const LANGS = Object.keys(CATALOGS) as (keyof typeof CATALOGS)[];
const fr = CATALOGS[DEFAULT_LANG];
const frKeys = Object.keys(fr);

describe("structure", () => {
  it("expose les 8 langues annoncées dans les réglages", () => {
    expect(LANGS).toHaveLength(8);
    expect(LANGUAGES.map((l) => l.code).sort()).toEqual([...LANGS].sort());
  });

  it("contient un catalogue non trivial", () => {
    expect(frKeys.length).toBeGreaterThan(2000);
  });
});

describe.each(LANGS)("catalogue %s", (lang) => {
  it("possède toutes les clés du français", () => {
    const missing = frKeys.filter((k) => !(k in CATALOGS[lang]));
    expect(missing).toEqual([]);
  });

  it("n'a pas de clé en trop", () => {
    const extra = Object.keys(CATALOGS[lang]).filter((k) => !(k in fr));
    expect(extra).toEqual([]);
  });

  it("n'a aucune valeur nulle ou non-texte", () => {
    const bad = Object.entries(CATALOGS[lang])
      .filter(([, v]) => typeof v !== "string")
      .map(([k]) => k);
    expect(bad).toEqual([]);
  });
});

describe("encodage", () => {
  // Le mojibake vient d'un UTF-8 relu comme du latin-1. Ces séquences ne
  // peuvent PAS apparaître dans du texte correct.
  const MOJIBAKE = /Ã[©¨ª«¬®¯°±²³´µ¹º»¼]|â¬|Ã|â€™|Â /;

  it.each(LANGS)("le catalogue %s n'est pas corrompu", (lang) => {
    const corrupted = Object.entries(CATALOGS[lang])
      .filter(([, v]) => MOJIBAKE.test(v))
      .map(([k, v]) => `${k} → ${v.slice(0, 40)}`);
    expect(corrupted).toEqual([]);
  });
});

describe("jetons d'interpolation", () => {
  const tokens = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

  it.each(LANGS)("le catalogue %s porte les mêmes {jetons} que le français", (lang) => {
    // Un jeton oublié affiche « {name} » à l'écran ; un jeton inventé ne sera
    // jamais remplacé.
    const mismatched = frKeys
      .filter((k) => {
        const a = tokens(fr[k]);
        const b = tokens(CATALOGS[lang][k] ?? "");
        return a.join() !== b.join();
      })
      .slice(0, 10);
    expect(mismatched).toEqual([]);
  });
});

describe("qualité de traduction", () => {
  // Une chaîne longue identique au français signale une traduction oubliée.
  // Les chaînes courtes sont exclues : « PDF », « OK », « Budget » ou « en »
  // sont de vrais cognats.
  const LONG = 25;

  it.each(LANGS.filter((l) => l !== DEFAULT_LANG))(
    "le catalogue %s ne recopie pas le français",
    (lang) => {
      const copied = frKeys
        .filter((k) => fr[k].length > LONG && CATALOGS[lang][k] === fr[k])
        .slice(0, 10);
      expect(copied).toEqual([]);
    },
  );
});

describe("t()", () => {
  it("renvoie la traduction demandée", () => {
    expect(t("tab.budget", "en")).toBe(CATALOGS.en["tab.budget"]);
  });

  it("retombe sur le français pour une langue incomplète", () => {
    // @ts-expect-error langue volontairement inconnue
    expect(t("tab.budget", "xx")).toBe(fr["tab.budget"]);
  });

  it("renvoie la clé elle-même si elle n'existe pas", () => {
    expect(t("cette.cle.nexiste.pas", "fr")).toBe("cette.cle.nexiste.pas");
  });

  it("ne renvoie JAMAIS une clé pour une clé existante, dans aucune langue", () => {
    // C'est le test qui aurait attrapé les cartes migrées sans traduction.
    const raw: string[] = [];
    for (const lang of LANGS) {
      for (const k of frKeys) {
        if (t(k, lang) === k && fr[k] !== k) raw.push(`${k}/${lang}`);
      }
    }
    expect(raw.slice(0, 10)).toEqual([]);
  });
});
