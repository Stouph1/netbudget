// Panneau Événements : liste + assistant de création (type → infos → style).
// Rendu soit embarqué dans le pager (onglet tab bar), soit en écran autonome
// via app/(premium)/events.tsx. L'événement vit dans le scope actif.

import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";
import {
  buildEventItems,
  buildEventMilestones,
  EVENT_TEMPLATES,
  EVENT_TIERS,
  eventTotals,
  monthlyNeeded,
  templateFor,
  type EventTier,
} from "../constants/eventTemplates";
import ScopeSwitcher from "./ScopeSwitcher";
import { useLang } from "../contexts/LangContext";
import { useCurrency } from "../contexts/CurrencyContext";
import { useActiveScope } from "../contexts/ScopeContext";
import { useSession } from "../contexts/SessionContext";
import {
  loadAdviceProfile,
  loadEvents,
  saveEvents,
  type EventProject,
} from "../lib/premiumStore";
import { PaywallSheet } from "./PaywallSheet";
import { SyncBanner } from "./SyncBanner";
import { usePaywall } from "../hooks/usePaywall";
import { useTourTarget } from "./tour/TourContext";
import type { UserProfile } from "../types/advice";
import { scheduleEventNotifications } from "../utils/eventNotify";
import { notify } from "../utils/notify";
import { getRates, type RatesPayload } from "../utils/exchangeRates";
import {
  applyTripToItems,
  dominantDestination,
  toDisplayCurrency,
} from "../utils/travelEstimate";

const MIDNIGHT = "#0F172A";
const SURFACE = "#1A2238";
const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#94A3B8";
const TEXT_3 = "#8193AC";
const GOLD = "#4ADE80";
const BORDER = "rgba(255,255,255,0.08)";



// "JJ/MM/AAAA" futur → ISO (les événements sont devant nous, pas derrière)
function parseFutureDate(input: string): string | null {
  const m = input.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (!m) return null;
  const d = new Date(+m[3], +m[2] - 1, +m[1]);
  if (d.getFullYear() !== +m[3] || d.getMonth() !== +m[2] - 1 || d.getDate() !== +m[1]) return null;
  if (d.getTime() < Date.now() - 24 * 3600 * 1000) return null;
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// Événement qui mérite un point rouge : jalon en retard, ou J-7 sous-financé.
export function eventNeedsAttention(ev: EventProject, now: Date = new Date()): boolean {
  const dayMs = 24 * 3600 * 1000;
  const eventTime = new Date(ev.dateIso + "T09:00:00").getTime();
  if (eventTime < now.getTime() - dayMs) return false; // passé
  for (const ms of ev.milestones) {
    if (ms.done || ms.monthsBefore === 0) continue;
    const due = new Date(ev.dateIso + "T09:00:00");
    due.setMonth(due.getMonth() - ms.monthsBefore);
    if (due.getTime() < now.getTime()) return true; // jalon en retard
  }
  const { planned } = eventTotals(ev);
  if (eventTime - now.getTime() < 7 * dayMs && ev.saved < planned) return true; // J-7
  return false;
}

export default function EventsPanel({ standalone = false }: { standalone?: boolean }) {
  const { lang, t, tp } = useLang();
  // Devise active : « € » était codé en dur, changer de devise n'avait aucun effet ici.
  const { fmt, currency } = useCurrency();
  const { user, loading: sessionLoading } = useSession();
  const { workspaceId, scopeLabel, scopeLabelIsKey } = useActiveScope();
  // Le scope perso renvoie une CLÉ i18n, un espace nommé renvoie son nom.
  const resolvedScopeLabel = scopeLabelIsKey ? t(scopeLabel) : scopeLabel;
  const [list, setList] = useState<EventProject[] | null>(null);

  // Assistant de création
  const [creating, setCreating] = useState(false);
  const [type, setType] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [guests, setGuests] = useState("");
  const [tier, setTier] = useState<EventTier>("mid");
  const [styleKey, setStyleKey] = useState<string | null>(null);
  const [destInput, setDestInput] = useState("");
  const [destinations, setDestinations] = useState<string[]>([]);
  const [stayLength, setStayLength] = useState("");
  const [switcherOpen, setSwitcherOpen] = useState(false);
  // Profil : sert le pays de DÉPART (sans lui, aucun prix de billet) et les
  // animaux du foyer (garde à prévoir pendant l'absence).
  const [profile, setProfile] = useState<UserProfile | null>(null);
  // Taux de change : les barèmes sourcés sont en euros, l'affichage suit la
  // devise de l'utilisateur.
  const [rates, setRates] = useState<RatesPayload | null>(null);
  // Les limites de formule vivent dans un seul endroit (usePaywall) : les
  // recopier ici finirait par laisser passer ce qu'un autre écran refuse.
  const paywall = usePaywall();
  const [syncError, setSyncError] = useState<string | null>(null);
  const tourCreate = useTourTarget("events:create");

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      let cancelled = false;
      loadEvents(user.id, workspaceId, currency).then((l) => {
        if (!cancelled) setList(l);
      });
      return () => {
        cancelled = true;
      };
    }, [user?.id, workspaceId]),
  );

  // Le pays de départ vient du profil PERSO : on voyage depuis chez soi, pas
  // depuis l'espace partagé dans lequel on planifie.
  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      let cancelled = false;
      loadAdviceProfile(user.id, null)
        .then((p) => {
          if (!cancelled) setProfile(p);
        })
        .catch(() => {});
      getRates()
        .then((r) => {
          if (!cancelled) setRates(r);
        })
        .catch(() => {});
      return () => {
        cancelled = true;
      };
    }, [user?.id]),
  );

  const tpl = type ? templateFor(type) : undefined;

  // Le quota se vérifie AVANT d'ouvrir l'assistant : laisser quelqu'un
  // remplir un formulaire complet pour lui refuser à la validation est la
  // pire façon d'annoncer une limite.
  const startCreating = useCallback(() => {
    // On teste avec un type ordinaire : si SEUL le mariage est verrouillé,
    // l'assistant doit quand même s'ouvrir — le blocage se dira au moment de
    // choisir ce type-là, pas avant.
    if (paywall.require({ feature: "event", type: "travel", currentCount: (list ?? []).length })) {
      setCreating(true);
    }
  }, [paywall, list]);

  const days = Math.max(0, parseInt(stayLength, 10) || 0);
  const travelers = Math.max(1, parseInt(guests, 10) || 1);

  // Estimation recalculée à chaque frappe : l'utilisateur voit le budget se
  // former pendant qu'il saisit, au lieu de le découvrir après validation.
  const trip = useMemo(
    () =>
      tpl?.asksDestinations && destinations.length
        ? dominantDestination(destinations, profile?.country)
        : null,
    [tpl?.asksDestinations, destinations, profile?.country],
  );

  async function create() {
    if (!user?.id || !tpl) return;
    // Dernier garde-fou : entre l'ouverture de l'assistant et la validation,
    // un autre appareil du même espace a pu créer un événement.
    if (!paywall.require({
      feature: "event",
      type: tpl.type,
      currentCount: (list ?? []).length,
    })) {
      return;
    }
    const iso = parseFutureDate(dateStr);
    if (!iso) {
      notify(t("events.err.date.title"), t("events.err.date.body"));
      return;
    }
    const g = tpl.asksGuests ? Math.max(1, parseInt(guests, 10) || 0) : null;
    if (tpl.asksGuests && !g) {
      notify(
        tpl.guestsLabelKey ? t(tpl.guestsLabelKey) : t("events.guests.fallback"),
        t("events.err.guests.body"),
      );
      return;
    }
    const ev: EventProject = {
      id: `ev-${Date.now()}`,
      type: tpl.type,
      name: name.trim() || t(tpl.labelKey),
      emoji: tpl.emoji,
      dateIso: iso,
      guests: g,
      tier,
      style: styleKey ?? undefined,
      destinations: destinations.length ? destinations : undefined,
      // Le barème par gamme donne le point de départ ; l'estimation le
      // corrige avec la distance réelle, le coût de la vie sur place et la
      // garde des animaux. Destination non reconnue = barème inchangé.
      items: toDisplayCurrency(
        applyTripToItems({
          items: buildEventItems(tpl, tier, g, styleKey ?? undefined),
          estimate: trip,
          origin: profile?.country,
          travelers: g ?? travelers,
          days: days || undefined,
          pets: profile?.hasPets ? profile.pets : [],
        }),
        currency,
        await getRates(),
      ).map((it, idx) => ({
        id: `it-${idx}`,
        label: it.label,
        emoji: it.emoji,
        estimated: it.estimated,
        actual: null,
        done: false,
      })),
      milestones: buildEventMilestones(tpl),
      quotes: [],
      saved: 0,
      createdAt: new Date().toISOString(),
    };
    const next = [ev, ...(list ?? [])];
    setList(next);
    // On REGARDE le résultat. Il était ignoré : un événement créé avec le
    // coffre verrouillé restait sur l'appareil sans que personne le sache —
    // et dans un espace partagé, l'autre membre ne voyait jamais rien
    // apparaître, sans explication.
    const saved = await saveEvents(user.id, next, workspaceId, currency);
    setSyncError(saved.ok ? null : (saved.error ?? "unknown"));
    scheduleEventNotifications(ev, t); // best-effort, jamais bloquant
    setCreating(false);
    setType(null);
    setName("");
    setDateStr("");
    setGuests("");
    setTier("mid");
    setStyleKey(null);
    setDestinations([]);
    setDestInput("");
    setStayLength("");
    router.push({ pathname: "/(premium)/event-detail", params: { id: ev.id } } as never);
  }

  function addDestination() {
    const d = destInput.trim();
    if (!d) return;
    setDestinations((prev) => (prev.includes(d) ? prev : [...prev, d]));
    setDestInput("");
  }

  if (sessionLoading || (user?.id && list === null)) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={GOLD} />
      </View>
    );
  }

  if (!user?.id) {
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 34 }}>🗓️</Text>
        <Text style={styles.emptyTitle}>{t("events.plan.title")}</Text>
        <Text style={styles.emptyBody}>{t("events.locked.body")}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: 20, paddingBottom: standalone ? 60 : 130 }}
      showsVerticalScrollIndicator={false}
    >
      {!standalone ? <Text style={styles.pageTitle}>{t("events.title")}</Text> : null}
      <Text style={styles.intro}>{t("events.intro")}</Text>

      {/* Le bandeau est DANS le défilement ici : le panneau est intégré à
          l'onglet Projets, il n'a pas d'en-tête fixe où l'accrocher.
          Marge négative pour compenser le rembourrage du conteneur. */}
      <View style={{ marginHorizontal: -20 }}>
        <SyncBanner error={syncError} />
      </View>

      {/* Espace actif : les événements d'un espace partagé sont visibles par
          tous ses membres. Changer d'espace recharge la liste. */}
      <TouchableOpacity
        style={styles.scopeBar}
        activeOpacity={0.85}
        onPress={() => setSwitcherOpen(true)}
      >
        <Feather name="users" size={15} color={GOLD} />
        <Text style={styles.scopeBarText} numberOfLines={1}>
          {resolvedScopeLabel}
        </Text>
        <Text style={styles.scopeBarHint}>{t("events.scope.change")}</Text>
        <Feather name="chevron-down" size={16} color={TEXT_3} />
      </TouchableOpacity>

      {(list ?? []).length === 0 && !creating ? (
        <View style={styles.emptyBox}>
          <Text style={{ fontSize: 34 }}>🗓️</Text>
          <Text style={styles.emptyTitle}>{t("events.empty.title")}</Text>
          <Text style={styles.emptyBody}>{t("events.empty.body")}</Text>
        </View>
      ) : (
        (list ?? []).map((ev) => {
          const { planned } = eventTotals(ev);
          const pct = planned > 0 ? Math.min(100, (ev.saved / planned) * 100) : 0;
          const monthly = monthlyNeeded(ev);
          const attention = eventNeedsAttention(ev);
          return (
            // La suppression se fait depuis la fiche, mais elle se VOIT ici :
            // au retour, la liste rechargée démonte la carte et l'animation de
            // sortie se joue, pendant que les suivantes remontent à leur place.
            // Sans ça, l'événement disparaît d'un coup et on doute d'avoir
            // supprimé le bon.
            <Animated.View
              key={ev.id}
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(220)}
              layout={LinearTransition.duration(260)}
            >
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.85}
              onPress={() =>
                router.push({ pathname: "/(premium)/event-detail", params: { id: ev.id } } as never)
              }
            >
              <View style={styles.cardHead}>
                <View>
                  <Text style={{ fontSize: 24 }}>{ev.emoji}</Text>
                  {attention ? <View style={styles.redDot} /> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{ev.name}</Text>
                  <Text style={styles.cardMeta}>
                    {new Date(ev.dateIso + "T12:00:00").toLocaleDateString(lang, {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                    {ev.guests ? ` · ${tp("events.people", { count: ev.guests })}` : ""}
                  </Text>
                  {ev.destinations?.length ? (
                    <Text style={styles.cardMeta} numberOfLines={1}>
                      ✈️ {ev.destinations.join(" → ")}
                    </Text>
                  ) : null}
                </View>
                <Feather name="chevron-right" size={18} color={TEXT_3} />
              </View>
              <View
                style={styles.progressBar}
                accessibilityRole="progressbar"
                accessibilityLabel={tp("events.a11y.funding", { pct: pct.toFixed(0) })}
                accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
              >
                <View style={[styles.progressFill, { width: `${pct}%` }]} />
              </View>
              <Text style={styles.cardMeta}>
                {tp("events.card.funded", { saved: fmt(ev.saved), planned: fmt(planned) })}
                {monthly > 0
                  ? ` · ${tp("events.card.monthly", { amount: fmt(monthly) })}`
                  : ` · ${t("events.card.fullyFunded")}`}
              </Text>
            </TouchableOpacity>
            </Animated.View>
          );
        })
      )}

      {creating ? (
        <View style={styles.form}>
          <Text style={styles.formTitle}>
            {tpl ? `${tpl.emoji} ${t(tpl.labelKey)}` : t("events.form.pickType")}
          </Text>
          {!tpl ? (
            <View style={styles.typeGrid}>
              {EVENT_TEMPLATES.map((tpl0) => {
                // Un type indisponible reste VISIBLE mais marqué : le cacher
                // priverait l'utilisateur de la raison de monter de formule.
                const locked = !paywall.allows({
                  feature: "event",
                  type: tpl0.type,
                  currentCount: (list ?? []).length,
                });
                return (
                  <TouchableOpacity
                    key={tpl0.type}
                    style={[styles.typeCard, locked && styles.typeCardLocked]}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: locked }}
                    accessibilityLabel={
                      locked
                        ? `${t(tpl0.labelKey)} — ${t("events.plan.badge")}`
                        : t(tpl0.labelKey)
                    }
                    onPress={() => {
                      if (locked) {
                        paywall.require({
                          feature: "event",
                          type: tpl0.type,
                          currentCount: (list ?? []).length,
                        });
                        return;
                      }
                      setType(tpl0.type);
                    }}
                  >
                    <Text style={{ fontSize: 26, opacity: locked ? 0.5 : 1 }}>
                      {tpl0.emoji}
                    </Text>
                    <Text style={styles.typeLabel}>{t(tpl0.labelKey)}</Text>
                    <Text style={styles.typeTagline}>
                      {locked ? t("events.plan.badge") : t(tpl0.taglineKey)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder={tp("events.form.namePlaceholder", {
                  label: t(tpl.labelKey),
                  year: new Date().getFullYear() + 1,
                })}
                placeholderTextColor={TEXT_3}
              />
              <TextInput
                style={styles.input}
                value={dateStr}
                onChangeText={setDateStr}
                placeholder={t("events.form.datePlaceholder")}
                placeholderTextColor={TEXT_3}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
              />
              {tpl.asksDestinations ? (
                <>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      value={destInput}
                      onChangeText={setDestInput}
                      placeholder={t("events.form.destPlaceholder")}
                      placeholderTextColor={TEXT_3}
                      onSubmitEditing={addDestination}
                      returnKeyType="done"
                    />
                    <TouchableOpacity
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t("events.a11y.add")}
                      style={styles.addDestBtn}
                      onPress={addDestination}
                      activeOpacity={0.85}
                    >
                      <Feather name="plus" size={18} color="#000" />
                    </TouchableOpacity>
                  </View>
                  {destinations.length ? (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                      {destinations.map((d, i) => (
                        <TouchableOpacity
                          key={`${d}-${i}`}
                          style={styles.destChip}
                          onPress={() =>
                            setDestinations((prev) => prev.filter((_, j) => j !== i))
                          }
                          activeOpacity={0.8}
                        >
                          <Text style={styles.destChipText}>
                            {i + 1}. {d}
                          </Text>
                          <Feather name="x" size={12} color={TEXT_3} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.hint}>{t("events.form.destHint")}</Text>
                  )}

                  {/* Durée : sans elle, impossible de chiffrer la garde des
                      animaux. Facultative — le reste du budget s'estime
                      quand même. */}
                  <TextInput
                    style={styles.input}
                    value={stayLength}
                    onChangeText={setStayLength}
                    placeholder={t("events.form.stayPlaceholder")}
                    placeholderTextColor={TEXT_3}
                    keyboardType="number-pad"
                    maxLength={3}
                    accessibilityLabel={t("events.form.stayPlaceholder")}
                  />

                  {/* Ce qui a été compris de la destination, en clair. Un budget
                      qui change tout seul sans explication ressemble à un bug. */}
                  {trip ? (
                    <View style={styles.estimateBox}>
                      <Text style={styles.estimateTitle}>
                        {trip.km > 0
                          ? tp("events.est.route", {
                              place: trip.matched,
                              km: trip.km.toLocaleString(lang),
                            })
                          : tp("events.est.place", { place: trip.matched })}
                      </Text>
                      {trip.flightPerPerson > 0 ? (
                        <Text style={styles.estimateLine}>
                          {tp("events.est.flight", {
                            // Le barème est en euros : on l'affiche dans la
                            // devise de l'utilisateur, pas avec son symbole.
                            amount: fmt(
                              toDisplayCurrency(
                                [{ estimated: trip.flightPerPerson }],
                                currency,
                                rates,
                              )[0].estimated,
                            ),
                          })}
                        </Text>
                      ) : (
                        <Text style={styles.estimateLine}>
                          {t("events.est.noOrigin")}
                        </Text>
                      )}
                      <Text style={styles.estimateLine}>
                        {tp("events.est.cost", {
                          pct: Math.round(trip.costIndex * 100),
                        })}
                      </Text>
                      {trip.groundAlternative ? (
                        <Text style={styles.estimateLine}>
                          {t("events.est.ground")}
                        </Text>
                      ) : null}
                      {profile?.hasPets && profile.pets?.length && days > 0 ? (
                        <Text style={styles.estimateLine}>
                          {tp("events.est.pets", { days })}
                        </Text>
                      ) : null}
                      <Text style={styles.estimateHint}>{t("events.est.hint")}</Text>
                    </View>
                  ) : null}
                </>
              ) : null}
              {tpl.asksGuests ? (
                <TextInput
                  style={styles.input}
                  value={guests}
                  onChangeText={setGuests}
                  placeholder={
                    tpl.guestsLabelKey ? t(tpl.guestsLabelKey) : t("events.form.guestsPlaceholder")
                  }
                  placeholderTextColor={TEXT_3}
                  keyboardType="number-pad"
                  maxLength={4}
                />
              ) : null}
              <View style={{ flexDirection: "row", gap: 8 }}>
                {EVENT_TIERS.map(({ key }) => (
                  <TouchableOpacity
                    key={key}
                    onPress={() => setTier(key)}
                    style={[styles.chip, tier === key && styles.chipActive]}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.chipText, tier === key && styles.chipTextActive]}>
                      {t(tpl.tierLabelKeys[key])}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {tpl.styles?.length ? (
                <>
                  <Text style={styles.styleQuestion}>{t("events.form.styleQuestion")}</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {tpl.styles.map((st) => (
                      <TouchableOpacity
                        key={st.key}
                        onPress={() => setStyleKey(styleKey === st.key ? null : st.key)}
                        style={[styles.chipSmall, styleKey === st.key && styles.chipActive]}
                        activeOpacity={0.85}
                      >
                        <Text
                          style={[styles.chipText, styleKey === st.key && styles.chipTextActive]}
                        >
                          {t(st.labelKey)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              ) : null}
              <Text style={styles.hint}>
                {tp("events.form.amountsHint", {
                  styleSuffix: styleKey ? t("events.form.amountsHintStyle") : "",
                })}
              </Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={create} activeOpacity={0.85}>
                <Feather name="check" size={18} color="#000" />
                <Text style={styles.primaryBtnText}>{t("events.form.submit")}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setType(null)} style={{ alignSelf: "center" }}>
                <Text style={styles.linkText}>{t("events.form.changeType")}</Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity
            onPress={() => {
              setCreating(false);
              setType(null);
            }}
            style={{ alignSelf: "center", marginTop: 4 }}
          >
            <Text style={styles.linkText}>{t("events.form.cancel")}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // La vue enveloppe porte la cible de la visite guidée : Android
        // supprime de l'arbre natif une vue sans style, et measureInWindow ne
        // renverrait plus rien.
        <View ref={tourCreate} collapsable={false}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={startCreating}
            activeOpacity={0.85}
          >
            <Feather name="plus" size={18} color="#000" />
            <Text style={styles.primaryBtnText}>{t("events.new")}</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScopeSwitcher visible={switcherOpen} onClose={() => setSwitcherOpen(false)} />

      <PaywallSheet
        visible={paywall.visible}
        reason={paywall.reason}
        onClose={paywall.close}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 8 },
  pageTitle: { color: TEXT_1, fontSize: 22, fontWeight: "800", marginBottom: 8 },
  intro: { color: TEXT_2, fontSize: 13, lineHeight: 20, marginBottom: 18 },
  emptyBox: { alignItems: "center", paddingVertical: 28, gap: 8 },
  emptyTitle: { color: TEXT_1, fontSize: 16, fontWeight: "600" },
  emptyBody: { color: TEXT_2, fontSize: 13, textAlign: "center", maxWidth: 280, lineHeight: 19 },
  scopeBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  scopeBarText: { color: TEXT_1, fontSize: 14, fontWeight: "600", flex: 1 },
  scopeBarHint: { color: TEXT_3, fontSize: 12 },
  addDestBtn: {
    backgroundColor: GOLD,
    borderRadius: 11,
    width: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  destChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: MIDNIGHT,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  destChipText: { color: TEXT_1, fontSize: 12.5, fontWeight: "600" },
  card: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginBottom: 12,
    gap: 10,
  },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardTitle: { color: TEXT_1, fontSize: 16, fontWeight: "700" },
  cardMeta: { color: TEXT_3, fontSize: 12, marginTop: 2 },
  redDot: {
    position: "absolute",
    top: -2,
    right: -4,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#F87171",
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: GOLD },
  form: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    gap: 10,
    marginTop: 6,
  },
  formTitle: { color: TEXT_1, fontSize: 16, fontWeight: "700", marginBottom: 4 },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  typeCard: {
    width: "47.5%",
    backgroundColor: MIDNIGHT,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
    gap: 4,
  },
  typeLabel: { color: TEXT_1, fontSize: 14, fontWeight: "700" },
  typeTagline: { color: TEXT_3, fontSize: 11, lineHeight: 15 },
  input: {
    backgroundColor: MIDNIGHT,
    color: TEXT_1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 11,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
  },
  chip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: MIDNIGHT,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
  },
  chipSmall: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: MIDNIGHT,
    borderWidth: 1,
    borderColor: BORDER,
  },
  chipActive: { backgroundColor: GOLD, borderColor: GOLD },
  chipText: { color: TEXT_2, fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: "#000", fontWeight: "700" },
  styleQuestion: { color: TEXT_2, fontSize: 13, fontWeight: "700", marginTop: 4 },
  hint: { color: TEXT_3, fontSize: 11.5, lineHeight: 16 },
  estimateBox: {
    backgroundColor: "rgba(74,222,128,0.08)",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.25)",
    borderRadius: 12,
    padding: 12,
    gap: 3,
  },
  estimateTitle: { color: GOLD, fontSize: 13, fontWeight: "700" },
  estimateLine: { color: TEXT_2, fontSize: 12.5, lineHeight: 18 },
  estimateHint: { color: TEXT_3, fontSize: 11, lineHeight: 15, marginTop: 4 },
  // Type indisponible sur la formule : atténué mais lisible, sinon on ne
  // comprend pas ce qu'on gagnerait à monter de formule.
  typeCardLocked: { opacity: 0.55, borderStyle: "dashed" },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: GOLD,
    borderRadius: 11,
    paddingVertical: 12,
    marginTop: 6,
  },
  primaryBtnText: { color: "#000", fontSize: 14, fontWeight: "700" },
  linkText: { color: TEXT_2, fontSize: 13, paddingVertical: 6 },
});
