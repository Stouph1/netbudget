// Panneau Événements : liste + assistant de création (type → infos → style).
// Rendu soit embarqué dans le pager (onglet tab bar), soit en écran autonome
// via app/(premium)/events.tsx. L'événement vit dans le scope actif.

import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
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
import { useActiveScope } from "../contexts/ScopeContext";
import { useSession } from "../contexts/SessionContext";
import {
  loadEvents,
  saveEvents,
  type EventProject,
} from "../lib/premiumStore";
import { scheduleEventNotifications } from "../utils/eventNotify";
import { notify } from "../utils/notify";

const MIDNIGHT = "#0F172A";
const SURFACE = "#1A2238";
const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#94A3B8";
const TEXT_3 = "#64748B";
const GOLD = "#4ADE80";
const BORDER = "rgba(255,255,255,0.08)";

function fmt(n: number): string {
  return `${Math.round(n).toLocaleString("fr-FR")} €`;
}

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
  const { user, loading: sessionLoading } = useSession();
  const { workspaceId, scopeLabel } = useActiveScope();
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
  const [switcherOpen, setSwitcherOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      let cancelled = false;
      loadEvents(user.id, workspaceId).then((l) => {
        if (!cancelled) setList(l);
      });
      return () => {
        cancelled = true;
      };
    }, [user?.id, workspaceId]),
  );

  const tpl = type ? templateFor(type) : undefined;

  async function create() {
    if (!user?.id || !tpl) return;
    const iso = parseFutureDate(dateStr);
    if (!iso) {
      notify("Date invalide", "Format JJ/MM/AAAA, dans le futur (ex. 20/06/2027).");
      return;
    }
    const g = tpl.asksGuests ? Math.max(1, parseInt(guests, 10) || 0) : null;
    if (tpl.asksGuests && !g) {
      notify(tpl.guestsLabel ?? "Invités", "Indique un nombre (même approximatif — tu ajusteras).");
      return;
    }
    const ev: EventProject = {
      id: `ev-${Date.now()}`,
      type: tpl.type,
      name: name.trim() || tpl.label,
      emoji: tpl.emoji,
      dateIso: iso,
      guests: g,
      tier,
      style: styleKey ?? undefined,
      destinations: destinations.length ? destinations : undefined,
      items: buildEventItems(tpl, tier, g, styleKey ?? undefined),
      milestones: buildEventMilestones(tpl),
      quotes: [],
      saved: 0,
      createdAt: new Date().toISOString(),
    };
    const next = [ev, ...(list ?? [])];
    setList(next);
    await saveEvents(user.id, next, workspaceId);
    scheduleEventNotifications(ev); // best-effort, jamais bloquant
    setCreating(false);
    setType(null);
    setName("");
    setDateStr("");
    setGuests("");
    setTier("mid");
    setStyleKey(null);
    setDestinations([]);
    setDestInput("");
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
        <Text style={styles.emptyTitle}>Événements — avec Premium</Text>
        <Text style={styles.emptyBody}>
          Mariage, voyage, naissance… prépare chaque grand moment avec un
          budget guidé. Connecte-toi depuis l'onglet Profil pour commencer.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: 20, paddingBottom: standalone ? 60 : 130 }}
      showsVerticalScrollIndicator={false}
    >
      {!standalone ? <Text style={styles.pageTitle}>Événements</Text> : null}
      <Text style={styles.intro}>
        Mariage, voyage, naissance, fête… prépare chaque grand moment avec un
        budget guidé, un rétro-planning et des rappels.
      </Text>

      {/* Espace actif : les événements d'un espace partagé sont visibles par
          tous ses membres. Changer d'espace recharge la liste. */}
      <TouchableOpacity
        style={styles.scopeBar}
        activeOpacity={0.85}
        onPress={() => setSwitcherOpen(true)}
      >
        <Feather name="users" size={15} color={GOLD} />
        <Text style={styles.scopeBarText} numberOfLines={1}>
          {scopeLabel}
        </Text>
        <Text style={styles.scopeBarHint}>changer</Text>
        <Feather name="chevron-down" size={16} color={TEXT_3} />
      </TouchableOpacity>

      {(list ?? []).length === 0 && !creating ? (
        <View style={styles.emptyBox}>
          <Text style={{ fontSize: 34 }}>🗓️</Text>
          <Text style={styles.emptyTitle}>Aucun événement pour l'instant</Text>
          <Text style={styles.emptyBody}>
            Crée le premier : 3 questions et ton budget est posé.
          </Text>
        </View>
      ) : (
        (list ?? []).map((ev) => {
          const { planned } = eventTotals(ev);
          const pct = planned > 0 ? Math.min(100, (ev.saved / planned) * 100) : 0;
          const monthly = monthlyNeeded(ev);
          const attention = eventNeedsAttention(ev);
          return (
            <TouchableOpacity
              key={ev.id}
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
                    {new Date(ev.dateIso + "T12:00:00").toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                    {ev.guests ? ` · ${ev.guests} pers.` : ""}
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
                accessibilityLabel={`Financement : ${pct.toFixed(0)} pour cent`}
                accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
              >
                <View style={[styles.progressFill, { width: `${pct}%` }]} />
              </View>
              <Text style={styles.cardMeta}>
                {fmt(ev.saved)} / {fmt(planned)} financés
                {monthly > 0 ? ` · ${fmt(monthly)}/mois pour y arriver` : " · financé 🎉"}
              </Text>
            </TouchableOpacity>
          );
        })
      )}

      {creating ? (
        <View style={styles.form}>
          <Text style={styles.formTitle}>
            {tpl ? `${tpl.emoji} ${tpl.label}` : "Quel événement ?"}
          </Text>
          {!tpl ? (
            <View style={styles.typeGrid}>
              {EVENT_TEMPLATES.map((tp) => (
                <TouchableOpacity
                  key={tp.type}
                  style={styles.typeCard}
                  activeOpacity={0.85}
                  onPress={() => setType(tp.type)}
                >
                  <Text style={{ fontSize: 26 }}>{tp.emoji}</Text>
                  <Text style={styles.typeLabel}>{tp.label}</Text>
                  <Text style={styles.typeTagline}>{tp.tagline}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder={`Nom (ex. ${tpl.label} ${new Date().getFullYear() + 1})`}
                placeholderTextColor={TEXT_3}
              />
              <TextInput
                style={styles.input}
                value={dateStr}
                onChangeText={setDateStr}
                placeholder="Date de l'événement — JJ/MM/AAAA"
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
                      placeholder="Destination (ex. Lisbonne)"
                      placeholderTextColor={TEXT_3}
                      onSubmitEditing={addDestination}
                      returnKeyType="done"
                    />
                    <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Ajouter"
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
                    <Text style={styles.hint}>
                      Ajoute une ou plusieurs étapes — un tour d'Europe se
                      budgète mieux ville par ville.
                    </Text>
                  )}
                </>
              ) : null}
              {tpl.asksGuests ? (
                <TextInput
                  style={styles.input}
                  value={guests}
                  onChangeText={setGuests}
                  placeholder={tpl.guestsLabel ?? "Nombre d'invités"}
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
                      {tpl.tierLabels[key]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {tpl.styles?.length ? (
                <>
                  <Text style={styles.styleQuestion}>Quel esprit ?</Text>
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
                          {st.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              ) : null}
              <Text style={styles.hint}>
                Les montants proposés sont des ordres de grandeur (études
                2025-2026){styleKey ? ", ajustés à ton style" : ""} — tu les
                remplaceras par tes vrais devis.
              </Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={create} activeOpacity={0.85}>
                <Feather name="check" size={18} color="#000" />
                <Text style={styles.primaryBtnText}>Créer le budget</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setType(null)} style={{ alignSelf: "center" }}>
                <Text style={styles.linkText}>← Changer de type</Text>
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
            <Text style={styles.linkText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => setCreating(true)}
          activeOpacity={0.85}
        >
          <Feather name="plus" size={18} color="#000" />
          <Text style={styles.primaryBtnText}>Nouvel événement</Text>
        </TouchableOpacity>
      )}

      <ScopeSwitcher visible={switcherOpen} onClose={() => setSwitcherOpen(false)} />
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
