// Détail d'un budget d'événement : postes ajustables, financement, message
// personnalisé du coach, rétro-planning avec jalons cochables, rappels.

import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useRef, useState } from "react";
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
  eventMessage,
  eventTotals,
  monthlyNeeded,
  monthsUntil,
  styleFor,
  templateFor,
} from "../../src/constants/eventTemplates";
import { useActiveScope } from "../../src/contexts/ScopeContext";
import { useSession } from "../../src/contexts/SessionContext";
import {
  loadAdviceProfile,
  loadEvents,
  saveEvents,
  type EventProject,
  type EventQuote,
} from "../../src/lib/premiumStore";
import {
  cancelEventNotifications,
  milestoneDate,
  scheduleEventNotifications,
} from "../../src/utils/eventNotify";
import { confirmDialog, notify } from "../../src/utils/notify";

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

export default function EventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, loading: sessionLoading } = useSession();
  const { workspaceId } = useActiveScope();
  const [all, setAll] = useState<EventProject[] | null>(null);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [draftEstimated, setDraftEstimated] = useState("");
  const [draftActual, setDraftActual] = useState("");
  const [draftPaidBy, setDraftPaidBy] = useState("");
  const [savedDraft, setSavedDraft] = useState<string | null>(null);
  const [placeLabel, setPlaceLabel] = useState<string | null>(null);
  const [quoteLabel, setQuoteLabel] = useState("");
  const [quotePrice, setQuotePrice] = useState("");
  const [quoteSource, setQuoteSource] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      let cancelled = false;
      loadEvents(user.id, workspaceId).then((l) => {
        if (!cancelled) setAll(l);
      });
      loadAdviceProfile(user.id, null).then((prof) => {
        if (cancelled) return;
        const parts = [prof.region, prof.country].filter(Boolean) as string[];
        setPlaceLabel(parts.length ? parts.join(", ") : null);
      });
      return () => {
        cancelled = true;
      };
    }, [user?.id, workspaceId]),
  );

  const ev = all?.find((e) => e.id === id) ?? null;

  // Persiste (debounce léger) et replanifie les notifications.
  function persist(next: EventProject, reschedule = false) {
    if (!user?.id || !all) return;
    const nextAll = all.map((e) => (e.id === next.id ? next : e));
    setAll(nextAll);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void saveEvents(user.id, nextAll, workspaceId);
      if (reschedule) void scheduleEventNotifications(next);
    }, 600);
  }

  function openEdit(itemId: string) {
    if (!ev) return;
    const it = ev.items.find((x) => x.id === itemId);
    if (!it) return;
    setEditingItem(itemId);
    setDraftEstimated(it.estimated ? String(it.estimated) : "");
    setDraftActual(it.actual != null ? String(it.actual) : "");
    setDraftPaidBy(it.paidBy ?? "");
  }

  function commitEdit() {
    if (!ev || !editingItem) return;
    const next: EventProject = {
      ...ev,
      items: ev.items.map((it) =>
        it.id === editingItem
          ? {
              ...it,
              estimated: Math.max(0, parseFloat(draftEstimated.replace(",", ".")) || 0),
              actual: draftActual.trim() === "" ? null : Math.max(0, parseFloat(draftActual.replace(",", ".")) || 0),
              paidBy: draftPaidBy.trim() || undefined,
            }
          : it,
      ),
    };
    setEditingItem(null);
    persist(next);
  }

  function remove() {
    if (!ev || !user?.id || !all) return;
    confirmDialog(
      "Supprimer l'événement",
      `« ${ev.name} » et son budget seront supprimés. Continuer ?`,
      "Supprimer",
      () => {
        const nextAll = all.filter((e) => e.id !== ev.id);
        setAll(nextAll);
        void saveEvents(user.id, nextAll, workspaceId);
        void cancelEventNotifications(ev.id);
        router.back();
      },
    );
  }

  if (sessionLoading || all === null) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.center}>
          <ActivityIndicator color={GOLD} />
        </View>
      </SafeAreaView>
    );
  }
  if (!ev) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.center}>
          <Text style={{ color: TEXT_2 }}>Événement introuvable dans cet espace.</Text>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
            <Text style={{ color: GOLD }}>← Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  function addQuote() {
    if (!ev) return;
    const price = Math.max(0, parseFloat(quotePrice.replace(",", ".")) || 0);
    if (!quoteLabel.trim() || !price) {
      notify("Relevé de prix", "Indique au moins un intitulé et un prix (ex. Vol Paris-Dakar, 480).");
      return;
    }
    const q: EventQuote = {
      id: `q-${Date.now()}`,
      label: quoteLabel.trim(),
      price,
      date: new Date().toISOString(),
      source: quoteSource.trim() || undefined,
    };
    persist({ ...ev, quotes: [q, ...(ev.quotes ?? [])] });
    setQuoteLabel(q.label); // garder l'intitulé : on suit le MÊME prix dans le temps
    setQuotePrice("");
    setQuoteSource("");
  }

  function removeQuote(qid: string) {
    if (!ev) return;
    persist({ ...ev, quotes: (ev.quotes ?? []).filter((q) => q.id !== qid) });
  }

  // Delta vs relevé précédent du même intitulé (insensible à la casse).
  function quoteDelta(q: EventQuote): number | null {
    const others = (ev?.quotes ?? [])
      .filter((x) => x.id !== q.id && x.label.toLowerCase() === q.label.toLowerCase())
      .filter((x) => x.date < q.date)
      .sort((a, b) => b.date.localeCompare(a.date));
    return others.length ? q.price - others[0].price : null;
  }

  const { planned, spent } = eventTotals(ev);
  const pct = planned > 0 ? Math.min(100, (ev.saved / planned) * 100) : 0;
  const monthly = monthlyNeeded(ev);
  const months = monthsUntil(ev.dateIso);
  const message = eventMessage(ev);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={22} color={TEXT_1} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {ev.emoji} {ev.name}
        </Text>
        <TouchableOpacity onPress={remove} hitSlop={10}>
          <Feather name="trash-2" size={18} color={TEXT_3} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        {/* Vue d'ensemble */}
        <View style={styles.overview}>
          <Text style={styles.overviewDate}>
            {new Date(ev.dateIso + "T12:00:00").toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            {months > 0.2 ? ` · dans ${months < 1.5 ? "moins de 2 mois" : `${Math.round(months)} mois`}` : " · c'est aujourd'hui 🎉"}
            {ev.guests ? ` · ${ev.guests} pers.` : ""}
          </Text>
          <View style={styles.overviewRow}>
            <Text style={styles.bigAmount}>{fmt(planned)}</Text>
            <Text style={styles.bigAmountSub}>budget prévu</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
          <Text style={styles.overviewMeta}>
            {fmt(ev.saved)} mis de côté ({pct.toFixed(0)} %)
            {spent > 0 ? ` · ${fmt(spent)} déjà dépensés` : ""}
          </Text>
          {monthly > 0 && months > 0.5 ? (
            <View style={styles.monthlyBox}>
              <Feather name="trending-up" size={14} color={GOLD} />
              <Text style={styles.monthlyText}>
                {fmt(monthly)}/mois d'ici l'événement pour tout financer
              </Text>
            </View>
          ) : null}
        </View>

        {/* Message personnalisé */}
        {message ? (
          <View style={styles.coachBox}>
            <Text style={{ fontSize: 18 }}>💬</Text>
            <Text style={styles.coachText}>{message}</Text>
          </View>
        ) : null}

        {/* Suggestion selon le style choisi + lieu de vie */}
        {(() => {
          const tpl = templateFor(ev.type);
          const st = styleFor(tpl!, ev.style);
          if (!st) return null;
          return (
            <View style={styles.styleBox}>
              <Text style={styles.styleTitle}>{st.label}</Text>
              <Text style={styles.styleTip}>{st.tip}</Text>
              {placeLabel ? (
                <Text style={styles.stylePlace}>📍 Pensé depuis {placeLabel} — les prix locaux peuvent varier, note tes vrais devis ci-dessous.</Text>
              ) : null}
            </View>
          );
        })()}

        {/* Épargne mise de côté */}
        <Text style={styles.sectionTitle}>Financement</Text>
        <View style={styles.savedRow}>
          <Text style={styles.savedLabel}>Déjà mis de côté</Text>
          <TextInput
            style={styles.savedInput}
            defaultValue={ev.saved ? String(ev.saved) : ""}
            key={`saved-${savedDraft ?? ev.id}`}
            placeholder="0"
            placeholderTextColor={TEXT_3}
            keyboardType="decimal-pad"
            onChangeText={(v) => setSavedDraft(v)}
            onEndEditing={() => {
              if (savedDraft === null) return;
              persist({ ...ev, saved: Math.max(0, parseFloat(savedDraft.replace(",", ".")) || 0) });
              setSavedDraft(null);
            }}
          />
          <Text style={styles.savedEuro}>€</Text>
        </View>

        {/* Postes */}
        <Text style={styles.sectionTitle}>Postes de dépense</Text>
        {ev.items.map((it) => (
          <View key={it.id} style={styles.itemCard}>
            <TouchableOpacity
              style={styles.itemRow}
              activeOpacity={0.8}
              onPress={() => (editingItem === it.id ? commitEdit() : openEdit(it.id))}
            >
              <TouchableOpacity
                hitSlop={8}
                onPress={() =>
                  persist({
                    ...ev,
                    items: ev.items.map((x) => (x.id === it.id ? { ...x, done: !x.done } : x)),
                  })
                }
              >
                <Feather
                  name={it.done ? "check-circle" : "circle"}
                  size={18}
                  color={it.done ? GOLD : TEXT_3}
                />
              </TouchableOpacity>
              <Text style={{ fontSize: 16 }}>{it.emoji}</Text>
              <Text style={[styles.itemLabel, it.done && styles.itemDone]} numberOfLines={2}>
                {it.label}
              </Text>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.itemAmount}>{fmt(it.actual ?? it.estimated)}</Text>
                {it.actual != null && it.actual !== it.estimated ? (
                  <Text style={styles.itemEstimated}>prévu {fmt(it.estimated)}</Text>
                ) : null}
                {it.paidBy ? <Text style={styles.itemPaidBy}>{it.paidBy}</Text> : null}
              </View>
            </TouchableOpacity>
            {editingItem === it.id ? (
              <View style={styles.editBox}>
                <View style={styles.editRow}>
                  <Text style={styles.editLabel}>Prévu</Text>
                  <TextInput
                    style={styles.editInput}
                    value={draftEstimated}
                    onChangeText={setDraftEstimated}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={TEXT_3}
                  />
                  <Text style={styles.editLabel}>Réel</Text>
                  <TextInput
                    style={styles.editInput}
                    value={draftActual}
                    onChangeText={setDraftActual}
                    keyboardType="decimal-pad"
                    placeholder="—"
                    placeholderTextColor={TEXT_3}
                  />
                </View>
                <TextInput
                  style={[styles.editInput, { flex: 1 }]}
                  value={draftPaidBy}
                  onChangeText={setDraftPaidBy}
                  placeholder="Payé par… (utile à plusieurs)"
                  placeholderTextColor={TEXT_3}
                />
                <TouchableOpacity style={styles.okBtn} onPress={commitEdit} activeOpacity={0.85}>
                  <Text style={styles.okBtnText}>OK</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        ))}

        {/* Rétro-planning */}
        <Text style={styles.sectionTitle}>Rétro-planning</Text>
        {ev.milestones.map((ms) => {
          const due = milestoneDate(ev.dateIso, ms.monthsBefore);
          const overdue = !ms.done && due.getTime() < Date.now() && ms.monthsBefore > 0;
          return (
            <TouchableOpacity
              key={ms.id}
              style={styles.msRow}
              activeOpacity={0.8}
              onPress={() =>
                persist(
                  {
                    ...ev,
                    milestones: ev.milestones.map((x) =>
                      x.id === ms.id ? { ...x, done: !x.done } : x,
                    ),
                  },
                  true,
                )
              }
            >
              <Feather
                name={ms.done ? "check-circle" : "circle"}
                size={18}
                color={ms.done ? GOLD : overdue ? "#F87171" : TEXT_3}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.msLabel, ms.done && styles.itemDone]}>{ms.label}</Text>
                <Text style={[styles.msDate, overdue && { color: "#F87171" }]}>
                  {ms.monthsBefore === 0
                    ? "Jour J"
                    : due.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
                  {overdue ? " · en retard" : ""}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Suivi des prix — vols, hôtels, prestataires : on note, on compare */}
        <Text style={styles.sectionTitle}>Suivi des prix</Text>
        <Text style={styles.trackerHint}>
          Repère un prix (vol, hôtel, traiteur…), note-le ici, et re-note-le
          plus tard : l'app te montre s'il monte ou descend — le bon moment
          pour réserver se voit d'un coup d'œil.
        </Text>
        <View style={styles.quoteForm}>
          <TextInput
            style={styles.quoteInput}
            value={quoteLabel}
            onChangeText={setQuoteLabel}
            placeholder="Quoi ? (ex. Vol CDG-DSS, Salle Château X)"
            placeholderTextColor={TEXT_3}
          />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TextInput
              style={[styles.quoteInput, { flex: 1 }]}
              value={quotePrice}
              onChangeText={setQuotePrice}
              placeholder="Prix (€)"
              placeholderTextColor={TEXT_3}
              keyboardType="decimal-pad"
            />
            <TextInput
              style={[styles.quoteInput, { flex: 1.4 }]}
              value={quoteSource}
              onChangeText={setQuoteSource}
              placeholder="Où ? (site, agence…)"
              placeholderTextColor={TEXT_3}
            />
            <TouchableOpacity style={styles.quoteAddBtn} onPress={addQuote} activeOpacity={0.85}>
              <Feather name="plus" size={18} color="#000" />
            </TouchableOpacity>
          </View>
        </View>
        {(ev.quotes ?? []).map((q) => {
          const delta = quoteDelta(q);
          return (
            <View key={q.id} style={styles.quoteRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.quoteLabel}>{q.label}</Text>
                <Text style={styles.quoteMeta}>
                  {new Date(q.date).toLocaleDateString("fr-FR")}
                  {q.source ? ` · ${q.source}` : ""}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.quotePrice}>{fmt(q.price)}</Text>
                {delta !== null ? (
                  <Text style={[styles.quoteDelta, { color: delta > 0 ? "#F87171" : delta < 0 ? GOLD : TEXT_3 }]}>
                    {delta > 0 ? "↗ +" : delta < 0 ? "↘ " : "= "}
                    {delta === 0 ? "stable" : fmt(Math.abs(delta))}
                  </Text>
                ) : null}
              </View>
              <TouchableOpacity onPress={() => removeQuote(q.id)} hitSlop={8}>
                <Feather name="x" size={15} color={TEXT_3} />
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Rappels */}
        <TouchableOpacity
          style={styles.notifBtn}
          activeOpacity={0.85}
          onPress={async () => {
            const n = await scheduleEventNotifications(ev);
            notify(
              "Rappels",
              n > 0
                ? `${n} rappel${n > 1 ? "s" : ""} programmé${n > 1 ? "s" : ""} (jalons, J-7 et jour J).`
                : "Active les notifications dans les réglages du téléphone pour recevoir les rappels.",
            );
          }}
        >
          <Feather name="bell" size={16} color={GOLD} />
          <Text style={styles.notifBtnText}>Programmer les rappels</Text>
        </TouchableOpacity>
      </ScrollView>
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
    gap: 12,
  },
  title: { color: TEXT_1, fontSize: 17, fontWeight: "700", flex: 1, textAlign: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  overview: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    gap: 10,
  },
  overviewDate: { color: TEXT_2, fontSize: 13 },
  overviewRow: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  bigAmount: { color: TEXT_1, fontSize: 30, fontWeight: "800" },
  bigAmountSub: { color: TEXT_3, fontSize: 13 },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: GOLD },
  overviewMeta: { color: TEXT_2, fontSize: 12.5 },
  monthlyBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(74,222,128,0.10)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  monthlyText: { color: GOLD, fontSize: 13, fontWeight: "600", flex: 1 },
  coachBox: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.35)",
    padding: 14,
    marginTop: 12,
  },
  coachText: { color: TEXT_2, fontSize: 13, lineHeight: 19, flex: 1 },
  sectionTitle: {
    color: TEXT_2,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 22,
    marginBottom: 10,
  },
  savedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  savedLabel: { color: TEXT_1, fontSize: 14, flex: 1 },
  savedInput: {
    color: TEXT_1,
    fontSize: 16,
    fontWeight: "700",
    minWidth: 90,
    textAlign: "right",
    paddingVertical: 4,
  },
  savedEuro: { color: TEXT_2, fontSize: 15 },
  itemCard: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 13,
  },
  itemLabel: { color: TEXT_1, fontSize: 13.5, flex: 1, lineHeight: 18 },
  itemDone: { textDecorationLine: "line-through", color: TEXT_3 },
  itemAmount: { color: TEXT_1, fontSize: 14, fontWeight: "700" },
  itemEstimated: { color: TEXT_3, fontSize: 11 },
  itemPaidBy: { color: GOLD, fontSize: 11, marginTop: 1 },
  editBox: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
    padding: 12,
    gap: 8,
  },
  editRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  editLabel: { color: TEXT_3, fontSize: 12 },
  editInput: {
    backgroundColor: MIDNIGHT,
    color: TEXT_1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 14,
    flex: 1,
  },
  okBtn: {
    backgroundColor: GOLD,
    borderRadius: 9,
    paddingVertical: 9,
    alignItems: "center",
  },
  okBtnText: { color: "#000", fontSize: 13, fontWeight: "700" },
  msRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
    marginBottom: 8,
  },
  msLabel: { color: TEXT_1, fontSize: 13.5 },
  msDate: { color: TEXT_3, fontSize: 11.5, marginTop: 2, textTransform: "capitalize" },
  styleBox: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    marginTop: 12,
    gap: 6,
  },
  styleTitle: { color: TEXT_1, fontSize: 14, fontWeight: "700" },
  styleTip: { color: TEXT_2, fontSize: 13, lineHeight: 19 },
  stylePlace: { color: TEXT_3, fontSize: 12, lineHeight: 17 },
  trackerHint: { color: TEXT_3, fontSize: 12, lineHeight: 17, marginBottom: 10 },
  quoteForm: { gap: 8, marginBottom: 10 },
  quoteInput: {
    backgroundColor: SURFACE,
    color: TEXT_1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
  },
  quoteAddBtn: {
    backgroundColor: GOLD,
    borderRadius: 10,
    width: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  quoteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
    marginBottom: 8,
  },
  quoteLabel: { color: TEXT_1, fontSize: 13.5, fontWeight: "600" },
  quoteMeta: { color: TEXT_3, fontSize: 11.5, marginTop: 2 },
  quotePrice: { color: TEXT_1, fontSize: 14, fontWeight: "700" },
  quoteDelta: { fontSize: 11.5, fontWeight: "700", marginTop: 1 },
  notifBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.4)",
    borderRadius: 11,
    paddingVertical: 12,
    marginTop: 16,
  },
  notifBtnText: { color: GOLD, fontSize: 14, fontWeight: "600" },
});
