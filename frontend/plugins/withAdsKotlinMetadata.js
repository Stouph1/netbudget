// Android uniquement. Le SDK Google Mobile Ads 25.4 est compilé avec Kotlin 2.3,
// alors qu'Expo 54 compile avec Kotlin 2.1 : le module
// react-native-google-mobile-ads refuse alors de compiler (« binary version of
// its metadata is 2.3.0, expected version is 2.1.0 »). On demande au compilateur
// de ce seul module d'accepter ces métadonnées plus récentes.
// À retirer quand Expo passera à Kotlin 2.2 ou plus.
const { withProjectBuildGradle } = require("@expo/config-plugins");

const MARKER = "// netbudget: ads kotlin metadata";
const BLOCK = `
${MARKER}
subprojects { sub ->
  if (sub.name == "react-native-google-mobile-ads") {
    sub.tasks.matching { it.name.startsWith("compile") && it.name.endsWith("Kotlin") }.configureEach {
      it.compilerOptions.freeCompilerArgs.add("-Xskip-metadata-version-check")
    }
  }
}
`;

module.exports = function withAdsKotlinMetadata(config) {
  return withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language === "groovy" && !cfg.modResults.contents.includes(MARKER)) {
      cfg.modResults.contents += BLOCK;
    }
    return cfg;
  });
};
