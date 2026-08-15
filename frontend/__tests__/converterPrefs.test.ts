// Persistance du convertisseur.
//
// Le bug d'origine : la paire choisie ne survivait pas à la fermeture de
// l'app — quelqu'un qui convertit des euros en francs CFA retrouvait EUR → USD
// à chaque ouverture. Ce qui est verrouillé ici : ce qu'on relit est bien ce
// qu'on a écrit, et un stockage abîmé ne casse jamais l'écran.

import {
  DEFAULT_CONVERTER_PREFS,
  sanitizeConverterPrefs,
} from "../src/utils/converterPrefs";

describe("sanitizeConverterPrefs", () => {
  it("restitue une préférence complète", () => {
    const stored = {
      from: "EUR",
      to: "XOF",
      amount: "250",
      history: [
        { id: "1", from: "EUR", to: "XOF", amount: 100, result: 65_596, timestamp: 1 },
      ],
    };
    expect(sanitizeConverterPrefs(stored)).toEqual(stored);
  });

  it("garde la devise choisie — c'est tout l'objet du correctif", () => {
    const out = sanitizeConverterPrefs({ from: "EUR", to: "XOF" });
    expect(out.to).toBe("XOF");
    expect(out.from).toBe("EUR");
  });

  it("retombe sur les valeurs par défaut sans rien de stocké", () => {
    expect(sanitizeConverterPrefs(null)).toEqual(DEFAULT_CONVERTER_PREFS);
    expect(sanitizeConverterPrefs(undefined)).toEqual(DEFAULT_CONVERTER_PREFS);
    expect(sanitizeConverterPrefs("cassé")).toEqual(DEFAULT_CONVERTER_PREFS);
  });

  it("ignore une devise inconnue du référentiel sans perdre le reste", () => {
    // Une devise retirée entre deux versions ne doit pas bloquer l'écran.
    const out = sanitizeConverterPrefs({ from: "ZZZ", to: "XOF", amount: "42" });
    expect(out.from).toBe(DEFAULT_CONVERTER_PREFS.from);
    expect(out.to).toBe("XOF");
    expect(out.amount).toBe("42");
  });

  it("remplace un montant vide", () => {
    expect(sanitizeConverterPrefs({ amount: "   " }).amount).toBe(
      DEFAULT_CONVERTER_PREFS.amount,
    );
  });

  it("écarte les entrées d'historique inexploitables", () => {
    const out = sanitizeConverterPrefs({
      history: [
        { id: "ok", from: "EUR", to: "XOF", amount: 10, result: 6560, timestamp: 5 },
        { id: "devise-morte", from: "ZZZ", to: "XOF", amount: 10, result: 1, timestamp: 6 },
        { id: "montant-nan", from: "EUR", to: "XOF", amount: NaN, result: 1, timestamp: 7 },
        "pas un objet",
        null,
      ],
    });
    expect(out.history.map((h) => h.id)).toEqual(["ok"]);
  });

  it("plafonne l'historique", () => {
    const many = Array.from({ length: 40 }, (_, i) => ({
      id: `h${i}`,
      from: "EUR",
      to: "USD",
      amount: 1,
      result: 1,
      timestamp: i,
    }));
    expect(sanitizeConverterPrefs({ history: many }).history).toHaveLength(15);
  });

  it("traite un historique non-tableau comme vide", () => {
    expect(sanitizeConverterPrefs({ history: "oups" }).history).toEqual([]);
  });
});
