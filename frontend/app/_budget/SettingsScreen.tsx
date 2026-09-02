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
import {
  useTourScroller,
  useTourTarget,
} from "../../src/components/tour/TourContext";
import { TierUnlock } from "../../src/components/TierUnlock";
import { TierGlyph } from "../../src/components/TierBadge";
import type { Tier } from "../../src/lib/entitlements";
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
  onReplayTour,
  isTester,
  onReplayBirthday,
  forcedTier,
  onForceTier,
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
  /** Remet la visite guidée à zéro. Développement et phase de test. */
  onReplayTour: () => void;
  /** Compte marqué testeur côté serveur. Voir la migration 019. */
  isTester: boolean;
  /** Rejoue une fête d'anniversaire. Phase de test. */
  onReplayBirthday: (kind: "self" | "child" | "pet") => void;
  /** Palier actuellement forcé, ou null. */
  forcedTier: Tier | null;
  onForceTier: (tier: Tier | null) => void;
}) {
  // Aperçu de l'écran de déverrouillage, en développement uniquement.
  const [previewTier, setPreviewTier] = React.useState<
    "solo" | "duo" | "family" | null
  >(null);

  // En développement, le panneau est toujours là. En production, il faut être
  // marqué testeur côté serveur.
  const showTesterPanel = __DEV__ || isTester;
  const tourNotifs = useTourTarget("settings:notifications");
  const tourScroll = useTourScroller("settings");

  return (
    <ScrollView
      ref={tourScroll.ref}
      onScroll={tourScroll.onScroll}
      scrollEventThrottle={64}
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
        <View ref={tourNotifs} collapsable={false}>
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
        </View>
      </Section>

      {/* Sauvegarde de la clé de chiffrement.
          Elle n'a de sens qu'avec un compte : sans cloud, rien ne quitte le
          téléphone et il n'y a rien à récupérer ailleurs. Elle vit ici et non
          sur l'accueil — c'est une action qu'on fait une fois, pas tous les
          jours — mais elle doit rester ATTEIGNABLE : sans elle, un changement
          de téléphone perd l'historique synchronisé, définitivement. */}
      {canDeleteAccount ? (
        <Section title={t("settings.vault.title")}>
          <TouchableOpacity
            onPress={() => router.push("/vault-backup" as never)}
            style={styles.toggleRow}
            accessibilityRole="button"
            accessibilityLabel={t("settings.vault.backup")}
            testID="settings-vault-backup"
            activeOpacity={0.7}
          >
            <Feather name="key" size={20} color={TEXT_3} style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>{t("settings.vault.backup")}</Text>
              <Text style={styles.infoRowText}>{t("settings.vault.backupDesc")}</Text>
            </View>
            <Feather name="chevron-right" size={18} color={TEXT_3} />
          </TouchableOpacity>
        </Section>
      ) : null}

      {/* Panneau de test.
          Ouvert aux comptes marqués testeur CÔTÉ SERVEUR (migration 019), et
          en développement. Le drapeau ne vient pas d'un réglage local : ce
          panneau force des états, il serait sinon activable par n'importe qui.

          Les libellés ne sont pas traduits, et c'est délibéré : ce panneau
          n'existe pas pour les clients, et huit traductions par bouton
          d'outillage sont huit occasions de se tromper ailleurs. */}
      {showTesterPanel ? (
        <Section title="Test">
          <Text style={styles.infoRowText}>
            {"Ces boutons rejouent des écrans qui ne s'affichent normalement qu'une fois. Ils ne changent ni ton abonnement ni tes données."}
          </Text>

          <Text style={[styles.infoRowText, { marginTop: 12 }]}>
            {"Palier affiché — change ce que l'interface autorise, sans toucher à ton abonnement réel"}
          </Text>
          <View style={{ flexDirection: "row", gap: 6, marginTop: 8 }}>
            {(["free", "solo", "duo", "family"] as const).map((tier) => {
              const active = forcedTier === tier;
              return (
                <TouchableOpacity
                  key={tier}
                  onPress={() => onForceTier(tier)}
                  style={[styles.testTile, active && styles.testTileOn]}
                  activeOpacity={0.8}
                  testID={`test-tier-${tier}`}
                >
                  <TierGlyph tier={tier} size={18} />
                  <Text
                    style={[
                      styles.infoRowText,
                      { marginTop: 4 },
                      active && { color: GOLD, fontWeight: "700" },
                    ]}
                  >
                    {t(`plan.${tier}.name`)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {forcedTier ? (
            <TouchableOpacity
              onPress={() => onForceTier(null)}
              style={{ marginTop: 8, alignSelf: "flex-start" }}
              hitSlop={8}
              testID="test-tier-reset"
            >
              <Text style={[styles.infoRowText, { color: GOLD }]}>
                {"Revenir à mon palier réel"}
              </Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            onPress={onReplayTour}
            style={styles.toggleRow}
            activeOpacity={0.7}
            testID="test-replay-tour"
          >
            <Feather name="compass" size={20} color={TEXT_3} style={{ marginRight: 12 }} />
            <Text style={[styles.toggleLabel, { flex: 1 }]}>{"Rejouer la visite guidée"}</Text>
            <Feather name="chevron-right" size={18} color={TEXT_3} />
          </TouchableOpacity>

          <Text style={[styles.infoRowText, { marginTop: 12 }]}>
            {"Anniversaires — ne s'ouvrent qu'un jour par an et par personne"}
          </Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            {(
              [
                { kind: "self", icon: "user", label: "Le mien" },
                { kind: "child", icon: "smile", label: "Un enfant" },
                { kind: "pet", icon: "github", label: "Un animal" },
              ] as const
            ).map((b) => (
              <TouchableOpacity
                key={b.kind}
                onPress={() => onReplayBirthday(b.kind)}
                style={styles.testTile}
                activeOpacity={0.8}
                testID={`test-bday-${b.kind}`}
              >
                <Feather name={b.icon} size={18} color={GOLD} />
                <Text style={[styles.infoRowText, { marginTop: 5 }]}>{b.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.infoRowText, { marginTop: 14 }]}>
            {"Écran de déverrouillage d'abonnement"}
          </Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            {(["solo", "duo", "family"] as const).map((tier) => (
              <TouchableOpacity
                key={tier}
                onPress={() => setPreviewTier(tier)}
                style={styles.testTile}
                activeOpacity={0.8}
                testID={`test-unlock-${tier}`}
              >
                <TierGlyph tier={tier} size={20} />
                <Text style={[styles.infoRowText, { marginTop: 5 }]}>
                  {t(`plan.${tier}.name`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>
      ) : null}

      {previewTier ? (
        <TierUnlock
          tier={previewTier}
          visible
          onClose={() => setPreviewTier(null)}
        />
      ) : null}

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
