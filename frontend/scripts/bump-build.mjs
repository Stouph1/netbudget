// Incrémente le numéro de build, le MÊME pour iOS et Android.
//
// POURQUOI. Avec `appVersionSource: "remote"` et `autoIncrement`, EAS tenait un
// compteur PAR PLATEFORME : iOS en était à 25, Android à 20, pour un contenu
// identique. Les testeurs voyaient deux numéros différents sous « Réglages »
// et cherchaient une différence qui n'existait pas. Ici, un seul chiffre,
// écrit dans app.json, lu par les deux builds.
//
// Usage : `npm run bump` puis `eas build --platform all --profile store`.
import { readFileSync, writeFileSync } from "node:fs";

const path = new URL("../app.json", import.meta.url);
const app = JSON.parse(readFileSync(path, "utf8"));
const current = Math.max(
  parseInt(app.expo.ios?.buildNumber ?? "0", 10) || 0,
  app.expo.android?.versionCode ?? 0,
);
const next = current + 1;
app.expo.ios = { ...app.expo.ios, buildNumber: String(next) };
app.expo.android = { ...app.expo.android, versionCode: next };
writeFileSync(path, JSON.stringify(app, null, 2) + "\n");
console.log(`build ${current} → ${next} (iOS et Android)`);
