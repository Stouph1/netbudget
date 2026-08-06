// Budgets d'événements — liste + assistant de création.
// L'événement vit dans le scope actif : en espace couple/famille il est
// partagé avec les membres, en Perso il reste local.

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
import { SafeAreaView } from "react-native-safe-area-context";
import {
  buildEventItems,
  buildEventMilestones,
  EVENT_TEMPLATES,
  EVENT_TIERS,
  eventTotals,
  monthlyNeeded,
  templateFor,
  type EventTier,
} from "../../src/constants/eventTemplates";
import { useSession } from "../../src/contexts/SessionContext";
import { useActiveScope } from "../../src/contexts/ScopeContext";
import {
  loadEvents,
  saveEvents,
  type EventProject,
} from "../../src/lib/premiumStore";
import { scheduleEventNotifications } from "../../src/utils/eventNotify";
import { notify } from "../../src/utils/notify";

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

export default function Events() {
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
      items: buildEventItems(tpl, tier, g),
      milestones: buildEventMilestones(tpl),
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
    router.push({ pathname: "/(premium)/event-detail", params: { id: ev.id } } as never);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={22} color={TEXT_1} />
        </TouchableOpacity>
        <Text style={styles.title}>Événements</Text>
        <View style={{ width: 22 }} />
      </View>

      {sessionLoading || list === null ? (
        <View style={styles.center}>
          <ActivityIndicator color={GOLD} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
          <Text style={styles.intro}>
            Mariage, voyage, naissance, fête… prépare chaque grand moment avec
            un budget guidé, un rétro-planning et des rappels — ici dans «{" "}
            {scopeLabel} ».
          </Text>

          {/* Liste des événements */}
          {list.length === 0 && !creating ? (
            <View style={styles.emptyBox}>
              <Text style={{ fontSize: 34 }}>🗓️</Text>
              <Text style={styles.emptyTitle}>Aucun événement pour l'instant</Text>
              <Text style={styles.emptyBody}>
                Crée le premier : 3 questions et ton budget est posé.
              </Text>
            </View>
          ) : (
            list.map((ev) => {
              const { planned } = eventTotals(ev);
              const pct = planned > 0 ? Math.min(100, (ev.saved / planned) * 100) : 0;
              const monthly = monthlyNeeded(ev);
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
                    <Text style={{ fontSize: 24 }}>{ev.emoji}</Text>
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
                    </View>
                    <Feather name="chevron-right" size={18} color={TEXT_3} />
                  </View>
                  <View style={styles.progressBar}>
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

          {/* Assistant de création */}
          {creating ? (
            <View style={styles.form}>
              <Text style={styles.formTitle}>
                {tpl ? `${tpl.emoji} ${tpl.label}` : "Quel événement ?"}
              </Text>
              {!tpl ? (
                <View style={styles.typeGrid}>
                  {EVENT_TEMPLATES.map((t) => (
                    <TouchableOpacity
                      key={t.type}
                      style={styles.typeCard}
                      activeOpacity={0.85}
                      onPress={() => setType(t.type)}
                    >
                      <Text style={{ fontSize: 26 }}>{t.emoji}</Text>
                      <Text style={styles.typeLabel}>{t.label}</Text>
                      <Text style={styles.typeTagline}>{t.tagline}</Text>
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
                  <Text style={styles.hint}>
                    Les montants proposés sont des ordres de grandeur (études
                    2025-2026) — tu les remplaceras par tes vrais devis.
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
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: MIDNIGHT },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: { color: TEXT_1, fontSize: 18, fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  intro: { color: TEXT_2, fontSize: 13, lineHeight: 20, marginBottom: 18 },
  emptyBox: { alignItems: "center", paddingVertical: 28, gap: 8 },
  emptyTitle: { color: TEXT_1, fontSize: 16, fontWeight: "600" },
  emptyBody: { color: TEXT_2, fontSize: 13, textAlign: "center", maxWidth: 260 },
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
  chipActive: { backgroundColor: GOLD, borderColor: GOLD },
  chipText: { color: TEXT_2, fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: "#000", fontWeight: "700" },
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
