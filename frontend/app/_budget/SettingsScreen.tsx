// Onglet Réglages : devise, langue, localisation, notifications, zone rouge.
//
// Indépendant du Budget : il ne lit que des réglages device + le profil.
import React from "react";
import { ScrollView, Switch, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { City, getCountry } from "../../src/constants/cities";
import { CurrencyCode, getCurrency } from "../../src/utils/currency";
import { Lang, LANGUAGES } from "../../src/i18n/translations";
import { interpolate } from "../../src/utils/advice";
import { BORDER, DANGER, GOLD, TEXT_3 } from "./constants";
import { styles } from "./styles";
import { Section } from "./ui";
import type { Translate } from "./types";

export default function SettingsScreen({
  currency,
  lang,
  city,
  monthlyReminder,
  locationFromProfile,
  canDeleteAccount,
  t,
  onOpenCurrencyPicker,
  onOpenLangPicker,
  onOpenCityPicker,
  onOpenCityInfo,
  onToggleMonthlyReminder,
  onResetAll,
  onDeleteAccount,
}: {
  currency: CurrencyCode;
  lang: Lang;
  city: City;
  monthlyReminder: boolean;
  /** Un profil existe (`premiumUser?.id`) : la localisation vient du profil. */
  locationFromProfile: boolean;
  /** Une session existe (`premiumUser`) : le compte cloud est supprimable. */
  canDeleteAccount: boolean;
  t: Translate;
  onOpenCurrencyPicker: () => void;
  onOpenLangPicker: () => void;
  onOpenCityPicker: () => void;
  onOpenCityInfo: () => void;
  onToggleMonthlyReminder: (next: boolean) => void;
  onResetAll: () => void;
  onDeleteAccount: () => void;
}) {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>{t("tab.settings")}</Text>
          <Text style={styles.title}>{t("settings.title")}</Text>
        </View>
      </View>
      <Text style={styles.sectionSubtitle}>{t("settings.intro")}</Text>

      <Section title={t("settings.currency.title")} subtitle={t("settings.currency.hint")}>
        <TouchableOpacity
          style={styles.inputWrap}
          onPress={onOpenCurrencyPicker}
          testID="open-currency-picker"
          activeOpacity={0.85}
        >
          <View style={[styles.currencySymbolBig, { marginRight: 12 }]}>
            <Text style={styles.currencySymbolBigText}>
              {getCurrency(currency).symbol}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>{getCurrency(currency).code}</Text>
            <Text style={styles.inputValue}>{getCurrency(currency).name}</Text>
          </View>
          <Feather name="chevron-right" size={20} color={TEXT_3} />
        </TouchableOpacity>
      </Section>

      <Section title={t("settings.language.title")} subtitle={t("settings.language.hint")}>
        <TouchableOpacity
          style={styles.inputWrap}
          onPress={onOpenLangPicker}
          testID="open-lang-picker"
          activeOpacity={0.85}
        >
          <Text style={[styles.currencyFlag, { marginRight: 12 }]}>
            {LANGUAGES.find((l) => l.code === lang)?.flag ?? "🌐"}
          </Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>{lang.toUpperCase()}</Text>
            <Text style={styles.inputValue}>
              {LANGUAGES.find((l) => l.code === lang)?.label ?? lang}
            </Text>
          </View>
          <Feather name="chevron-right" size={20} color={TEXT_3} />
        </TouchableOpacity>
      </Section>

      <Section title={t("settings.location.title")} subtitle={t("settings.location.hint")}>
        {locationFromProfile ? (
          <TouchableOpacity
            style={styles.profileLocNote}
            activeOpacity={0.85}
            onPress={() => router.push("/(premium)/complete-profile?edit=1" as never)}
            accessibilityRole="button"
            accessibilityLabel="Modifier ma localisation dans mon profil"
          >
            <Feather name="user" size={15} color={GOLD} />
            <Text style={styles.profileLocNoteText}>
              {interpolate(t("settings.locationFromProfile"), {
                place: city.region ? `${city.name}, ${city.region}` : city.name,
              })}
            </Text>
            <Feather name="chevron-right" size={16} color={TEXT_3} />
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={[styles.inputWrap, locationFromProfile ? { opacity: 0.5 } : null]}
          disabled={locationFromProfile}
          onPress={onOpenCityPicker}
          testID="city-picker-button"
          activeOpacity={0.8}
        >
          <Text style={[styles.currencyFlag, { marginRight: 12 }]}>
            {getCountry(city.countryCode)?.flag ?? "🌍"}
          </Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>{city.name}</Text>
            <Text style={styles.inputValue}>{city.region}</Text>
          </View>
          <View style={[styles.indexBadge, { borderColor: city.theme.accent, borderWidth: 1, marginRight: 6 }]}>
            <Text style={[styles.indexBadgeText, { color: city.theme.accent }]}>
              ×{city.index.toFixed(2)}
            </Text>
          </View>
          <Feather name="chevron-right" size={20} color={TEXT_3} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onOpenCityInfo}
          style={styles.infoRow}
          testID="city-info-button"
          activeOpacity={0.7}
        >
          <Feather name="info" size={14} color={TEXT_3} />
          <Text style={styles.infoRowText}>{t("info.indexHelp")}</Text>
        </TouchableOpacity>
      </Section>

      <Section title={t("settings.notifications.title")}>
        <View style={styles.toggleRow}>
          <Feather
            name="bell"
            size={20}
            color={monthlyReminder ? GOLD : TEXT_3}
            style={{ marginRight: 12 }}
          />
          <Text style={[styles.toggleLabel, { flex: 1 }]}>
            {t("settings.notifications.title")}
          </Text>
          <Switch
            value={monthlyReminder}
            onValueChange={onToggleMonthlyReminder}
            trackColor={{ false: BORDER, true: GOLD }}
            thumbColor="#fff"
            ios_backgroundColor={BORDER}
            testID="settings-notifications-toggle"
          />
        </View>

        {/* Réglages fins : catégories, fréquence, heure, et surtout l'aperçu
            de ce qui est réellement programmé. */}
        <TouchableOpacity
          onPress={() => router.push("/notifications")}
          style={styles.toggleRow}
          accessibilityRole="button"
          accessibilityLabel={t("settings.notifications.personalize")}
          testID="settings-notifications-personalize"
          activeOpacity={0.7}
        >
          <Feather name="sliders" size={20} color={TEXT_3} style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleLabel}>
              {t("settings.notifications.personalize")}
            </Text>
            <Text style={styles.infoRowText}>
              {t("settings.notifications.personalizeDesc")}
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color={TEXT_3} />
        </TouchableOpacity>
      </Section>

      <Section title={t("settings.danger.title")}>
        <TouchableOpacity
          onPress={onResetAll}
          style={[styles.exportBtn, { backgroundColor: DANGER }]}
          testID="settings-reset"
          activeOpacity={0.85}
        >
          <Feather name="trash-2" size={18} color="#fff" />
          <Text style={[styles.exportBtnTextDark, { color: "#fff" }]}>
            {t("settings.reset.btn")}
          </Text>
        </TouchableOpacity>

        {/* Suppression du COMPTE (RGPD + exigence App Store) — visible
            seulement si connecté. Double confirmation, irréversible :
            efface le compte, les workspaces possédés et toutes les
            données cloud (cascade + Edge Function delete-account). */}
        {canDeleteAccount ? (
          <TouchableOpacity
            onPress={onDeleteAccount}
            style={[
              styles.exportBtn,
              {
                backgroundColor: "transparent",
                borderWidth: 1,
                borderColor: DANGER,
                marginTop: 10,
              },
            ]}
            testID="settings-delete-account"
            activeOpacity={0.85}
          >
            <Feather name="user-x" size={18} color={DANGER} />
            <Text style={[styles.exportBtnTextDark, { color: DANGER }]}>
              Supprimer mon compte
            </Text>
          </TouchableOpacity>
        ) : null}
      </Section>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}
