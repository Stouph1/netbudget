// La version de l'app, tout en bas des Réglages. Une touche la copie.
import * as Application from "expo-application";
import * as Clipboard from "expo-clipboard";
import * as Updates from "expo-updates";
import { useMemo, useState } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity } from "react-native";
import { useLang } from "../contexts/LangContext";
import { versionClipboard, versionLabel, versionMeta, type VersionInfo } from "../lib/appVersion";
import Constants from "expo-constants";

const TEXT_2 = "#94A3B8";
const TEXT_3 = "#8193AC";

function readVersion(): VersionInfo {
  let channel: string | null = null;
  let updateId: string | null = null;
  let embedded = true;
  try {
    channel = Updates.channel ?? null;
    updateId = Updates.updateId ?? null;
    embedded = Updates.isEmbeddedLaunch;
  } catch {
    // Hors build EAS (client de dev), le module peut ne pas être configuré.
  }
  return {
    version: Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? "0.0.0",
    build: Application.nativeBuildVersion ?? null,
    platform: Platform.OS,
    channel,
    updateId,
    embedded,
  };
}

export function AppVersionLine({ testID = "settings-version" }: { testID?: string }) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);
  const info = useMemo(readVersion, []);
  const words = {
    dev: t("settings.version.dev"),
    embedded: t("settings.version.embedded"),
    update: t("settings.version.update"),
  };

  async function copy() {
    try {
      await Clipboard.setStringAsync(versionClipboard(info, words));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Le presse-papier peut être indisponible : rien à faire de plus.
    }
  }

  return (
    <TouchableOpacity
      onPress={() => void copy()}
      activeOpacity={0.7}
      style={styles.wrap}
      accessibilityRole="button"
      accessibilityLabel={`${t("settings.version.title")} ${versionLabel(info)}`}
      testID={testID}
    >
      <Text style={styles.label}>
        {t("settings.version.title")} {versionLabel(info)}
      </Text>
      <Text style={styles.meta}>{versionMeta(info, words)}</Text>
      <Text style={styles.hint}>{copied ? t("settings.version.copied") : t("settings.version.hint")}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", paddingTop: 28, paddingBottom: 8, gap: 3 },
  label: { color: TEXT_2, fontSize: 13, fontWeight: "700", fontVariant: ["tabular-nums"] },
  meta: { color: TEXT_3, fontSize: 12, fontVariant: ["tabular-nums"] },
  hint: { color: TEXT_3, fontSize: 11, marginTop: 4, opacity: 0.8 },
});
