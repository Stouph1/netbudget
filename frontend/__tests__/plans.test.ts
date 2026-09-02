// Catalogue des formules.
//
// CE QUI EST VERROUILLÉ ICI : l'écran de vente ne peut pas promettre autre
// chose que ce que le contrôle applique. Les points forts sont dérivés de
// `entitlements.ts`, donc changer une limite change automatiquement l'argument
// de vente — et ce test le prouve.
//
// Verrouillé aussi : AUCUN prix dans le code. Un prix codé en dur finit par
// différer de ce qui est débité, ce qui est un litige garanti et un motif de
// refus en revue App Store.

import { limitsFor } from "../src/lib/entitlements";
import {
  annualSaving,
  HIGHLIGHTED_TIER,
  monthlyEquivalent,
  periodFromProductId,
  planFeatures,
  planMembers,
  PRODUCT_IDS,
  SELLABLE_TIERS,
  tierFromProductId,
} from "../src/lib/billing/plans";

describe("identifiants de produits", () => {
  it("couvre les trois formules et les deux périodicités", () => {
    for (const tier of SELLABLE_TIERS) {
      expect(PRODUCT_IDS[tier].monthly).toMatch(/^netbudget\./);
      expect(PRODUCT_IDS[tier].yearly).toMatch(/^netbudget\./);
    }
  });

  it("n'a aucun doublon — un doublon facturerait la mauvaise formule", () => {
    const all = SELLABLE_TIERS.flatMap((t) => [
      PRODUCT_IDS[t].monthly,
      PRODUCT_IDS[t].yearly,
    ]);
    expect(new Set(all).size).toBe(all.length);
  });

  it("retrouve la formule et la périodicité depuis l'identifiant", () => {
    expect(tierFromProductId(PRODUCT_IDS.duo.yearly)).toBe("duo");
    expect(periodFromProductId(PRODUCT_IDS.duo.yearly)).toBe("yearly");
    expect(tierFromProductId(PRODUCT_IDS.solo.monthly)).toBe("solo");
    expect(periodFromProductId(PRODUCT_IDS.solo.monthly)).toBe("monthly");
  });

  it("renvoie null sur un identifiant inconnu au lieu de deviner", () => {
    // Deviner accorderait des droits sur un produit non reconnu.
    expect(tierFromProductId("netbudget.inconnu")).toBeNull();
    expect(periodFromProductId("")).toBeNull();
  });
});

describe("points forts affichés", () => {
  const keysOf = (tier: Parameters<typeof planFeatures>[0]) =>
    planFeatures(tier).map((f) => f.key);

  it("ne promettent jamais plus que la formule n'autorise", () => {
    for (const tier of SELLABLE_TIERS) {
      const keys = keysOf(tier);
      const limits = limitsFor(tier);

      // Le mariage n'est annoncé que là où il est réellement permis. Et une
      // carte de vente n'énumère PAS ce qu'on n'a pas : l'absence se tait.
      if (limits.blockedEventTypes.includes("wedding")) {
        expect(keys).not.toContain("plan.feature.wedding");
      } else {
        expect(keys).toContain("plan.feature.wedding");
      }

      // Le partage n'est annoncé que là où il existe.
      const shared = keys.some((k) => k.startsWith("plan.feature.shared"));
      expect(shared).toBe(limits.maxWorkspaces > 0);

      // Les anniversaires appartiennent à Famille seule.
      expect(keys.includes("plan.feature.birthdays")).toBe(limits.birthdays);

      // L'échéancier complet n'est annoncé que s'il est réellement complet.
      expect(keys.includes("plan.feature.schedule")).toBe(
        limits.loanScheduleYears === null,
      );
    }
  });

  it("annonce un seul événement pour Solo, illimité pour les autres", () => {
    expect(keysOf("solo")).toContain("plan.feature.eventsOne");
    expect(keysOf("duo")).toContain("plan.feature.eventsUnlimited");
    expect(keysOf("family")).toContain("plan.feature.eventsUnlimited");
  });

  it("met la synchronisation et les conseils dans toutes les formules", () => {
    for (const tier of SELLABLE_TIERS) {
      expect(keysOf(tier)).toContain("plan.feature.sync");
      expect(keysOf(tier)).toContain("plan.feature.advice");
    }
  });

  it("tire les NOMBRES des limites, jamais d'un texte", () => {
    // « trois objectifs » doit venir de maxGoals. Sinon, changer la limite
    // laisserait l'écran de vente promettre l'ancienne — c'est-à-dire vendre
    // autre chose que le produit.
    const solo = planFeatures("solo").find((f) => f.key === "plan.feature.goalsCount");
    expect(solo?.params?.n).toBe(limitsFor("solo").maxGoals);

    const family = planFeatures("family").find((f) =>
      f.key.startsWith("plan.feature.shared"),
    );
    expect(family?.params?.members).toBe(limitsFor("family").maxMembersPerWorkspace);
    expect(family?.params?.spaces).toBe(limitsFor("family").maxWorkspaces);
  });

  it("met en tête ce qui DISTINGUE la formule", () => {
    // Les cartes n'affichent que les deux premiers arguments. Si « tes données
    // sur tous tes appareils » arrivait en tête partout, les trois cartes
    // seraient indiscernables.
    for (const tier of SELLABLE_TIERS) {
      expect(keysOf(tier)[0]).not.toBe("plan.feature.sync");
    }
    expect(keysOf("duo")[0]).toMatch(/^plan\.feature\.shared/);
    expect(keysOf("family")[0]).toMatch(/^plan\.feature\.shared/);
  });
});

describe("nombre de membres", () => {
  it("n'est annoncé que pour les formules à plusieurs", () => {
    expect(planMembers("solo")).toBeNull();
    expect(planMembers("duo")).toBe(2);
    expect(planMembers("family")).toBeGreaterThan(2);
  });
});

describe("mise en avant", () => {
  it("ne met en avant qu'une seule formule", () => {
    // Deux formules mises en avant, c'est aucune : le regard ne choisit plus.
    expect(SELLABLE_TIERS).toContain(HIGHLIGHTED_TIER);
  });
});

describe("économie annuelle", () => {
  const eur = (priceAmount: number) => ({ priceAmount, currency: "EUR" });

  it("calcule l'économie réelle sur les prix de la boutique", () => {
    // 4,99 x 12 = 59,88 contre 39,99 : 19,89 d'économie, soit 33 %.
    const saving = annualSaving(eur(4.99), eur(39.99))!;
    expect(saving.amount).toBeCloseTo(19.89, 2);
    expect(saving.percent).toBe(33);
    expect(saving.currency).toBe("EUR");
  });

  it("n'annonce RIEN quand l'annuel n'est pas avantageux", () => {
    // Afficher « 0 % » ou un chiffre négatif comme un avantage serait une
    // annonce trompeuse. On préfère ne rien dire.
    expect(annualSaving(eur(4.99), eur(59.88))).toBeNull();
    expect(annualSaving(eur(4.99), eur(70))).toBeNull();
  });

  it("refuse de comparer deux devises différentes", () => {
    // Arrive quand la boutique n'a pas fini de répondre pour l'une des offres.
    expect(
      annualSaving({ priceAmount: 4.99, currency: "EUR" }, { priceAmount: 39.99, currency: "USD" }),
    ).toBeNull();
  });

  it("ne dit rien tant qu'un prix manque", () => {
    expect(annualSaving(undefined, eur(39.99))).toBeNull();
    expect(annualSaving(eur(4.99), undefined)).toBeNull();
    expect(annualSaving(eur(0), eur(39.99))).toBeNull();
  });

  it("donne l'équivalent mensuel de l'annuel", () => {
    expect(monthlyEquivalent(39.99)).toBeCloseTo(3.33, 2);
    expect(monthlyEquivalent(94.99)).toBeCloseTo(7.92, 2);
  });
});
