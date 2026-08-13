/**
 * Tests unitaires de la LOGIQUE MÉTIER.
 *
 * Choix assumé : pas de `jest-expo`, pas de rendu de composants React Native.
 * Ce qui casse dans cette app et coûte cher, c'est le calcul — amortissement
 * de prêt, conversion de devise, ciblage des conseils, complétude des
 * traductions. Ces modules sont volontairement écrits comme des fonctions
 * pures, donc testables sans simulateur ni DOM. Un test qui tourne en 2
 * secondes est un test qu'on lance ; une suite qui démarre un simulateur, non.
 *
 * (Bonus : jest-expo@57 exige React 19.2 alors que le SDK 54 fournit 19.1 —
 * on évite au passage un conflit de dépendances inutile.)
 */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src", "<rootDir>/__tests__"],
  testMatch: ["**/*.test.ts"],
  moduleNameMapper: {
    // Les modules testés touchent parfois au stockage natif : on le remplace
    // par une implémentation en mémoire (voir __mocks__/asyncStorage.ts).
    "^@react-native-async-storage/async-storage$":
      "<rootDir>/__tests__/__mocks__/asyncStorage.ts",
    // react-native n'est pas chargeable hors bundler Metro ; les modules
    // testés n'en utilisent que Platform.
    "^react-native$": "<rootDir>/__tests__/__mocks__/reactNative.ts",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        // Pas de vérification de types pendant les tests : `npx tsc --noEmit`
        // s'en charge déjà, et ça garde le démarrage sous la seconde.
        diagnostics: false,
      },
    ],
  },
  collectCoverageFrom: [
    "src/utils/**/*.ts",
    "src/lib/adviceEngine.ts",
    "src/constants/eventTemplates.ts",
    "src/i18n/translations.ts",
  ],
};
