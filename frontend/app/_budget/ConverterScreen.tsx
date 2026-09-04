// Onglet Convertisseur (rendu façon Google Traduction) + historique local.
//
// Indépendant du Budget : il ne travaille que sur les taux de change.
import React from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { CurrencyCode, formatCurrency, getCurrency } from "../../src/utils/currency";
import { convert, RatesPayload } from "../../src/utils/exchangeRates";
import { GOLD, TEXT_3 } from "./constants";
import { relativeAgoParts } from "./helpers";
import { styles } from "./styles";
import {
  useTourScroller,
  useTourTarget,
} from "../../src/components/tour/TourContext";
import type { ConvHistoryItem, Translate } from "./types";

export default function ConverterScreen({
  convFrom,
  convTo,
  convAmount,
  convResult,
  rates,
  ratesLoading,
  convHistory,
  t,
  onAmountChange,
  onOpenPicker,
  onSwap,
  onRefreshRates,
  onRestoreHistory,
  onClearHistory,
}: {
  convFrom: CurrencyCode;
  convTo: CurrencyCode;
  convAmount: string;
  convResult: number;
  rates: RatesPayload | null;
  ratesLoading: boolean;
  convHistory: ConvHistoryItem[];
  t: Translate;
  onAmountChange: (next: string) => void;
  onOpenPicker: (which: "from" | "to") => void;
  onSwap: () => void;
  onRefreshRates: () => void;
  onRestoreHistory: (h: ConvHistoryItem) => void;
  onClearHistory: () => void;
}) {
  // Ancienneté localisée : l'utilitaire ne renvoie que l'unité et la valeur,
  // la phrase se compose ici. `t` arrive par props, on interpole donc {n}
  // sur place plutôt que d'ajouter une prop `tp` juste pour ça.
  const agoLabel = (ts: number) => {
    const { unit, value } = relativeAgoParts(ts);
    if (unit === "now") return t("ago.now");
    return t(`ago.${unit}`).replace("{n}", String(value));
  };

  const tourConverter = useTourTarget("converter:main");
  const tourScroll = useTourScroller("converter");

  return (
    <ScrollView
      automaticallyAdjustKeyboardInsets
      keyboardDismissMode="interactive"
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
          <Text style={styles.eyebrow}>{t("tab.converter")}</Text>
          <Text style={styles.title}>{t("section.converter.title")}</Text>
        </View>
        <TouchableOpacity
          onPress={onRefreshRates}
          style={styles.headerBtn}
          testID="refresh-rates"
          activeOpacity={0.85}
          disabled={ratesLoading}
        >
          <Feather name="refresh-cw" size={16} color={ratesLoading ? TEXT_3 : GOLD} />
        </TouchableOpacity>
      </View>

      {/* From card */}
      <View style={styles.convCard} ref={tourConverter} collapsable={false}>
        <TouchableOpacity
          style={styles.convChip}
          onPress={() => onOpenPicker("from")}
          testID="conv-from-chip"
          activeOpacity={0.85}
        >
          <Text style={styles.convChipFlag}>{getCurrency(convFrom).flag}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.convChipCode}>{getCurrency(convFrom).code}</Text>
            <Text style={styles.convChipName}>{getCurrency(convFrom).name}</Text>
          </View>
          <Feather name="chevron-down" size={20} color={TEXT_3} />
        </TouchableOpacity>
        <TextInput
          style={styles.convBigInput}
          value={convAmount}
          onChangeText={onAmountChange}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={TEXT_3}
          selectTextOnFocus
          returnKeyType="done"
          testID="conv-amount"
        />
        <Text style={styles.convSymbolHint}>{getCurrency(convFrom).symbol}</Text>
      </View>

      {/* Swap button */}
      <View style={styles.convSwapWrap}>
        <View style={styles.convDivider} />
        <TouchableOpacity
          hitSlop={10}
          onPress={onSwap}
          style={styles.convSwapBtn}
          testID="conv-swap"
          activeOpacity={0.85}
        >
          <Feather name="repeat" size={20} color="#000" />
        </TouchableOpacity>
        <View style={styles.convDivider} />
      </View>

      {/* To card */}
      <View style={[styles.convCard, styles.convCardResult]}>
        <TouchableOpacity
          style={styles.convChip}
          onPress={() => onOpenPicker("to")}
          testID="conv-to-chip"
          activeOpacity={0.85}
        >
          <Text style={styles.convChipFlag}>{getCurrency(convTo).flag}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.convChipCode}>{getCurrency(convTo).code}</Text>
            <Text style={styles.convChipName}>{getCurrency(convTo).name}</Text>
          </View>
          <Feather name="chevron-down" size={20} color={TEXT_3} />
        </TouchableOpacity>
        <Text style={styles.convBigResult} testID="conv-result">
          {formatCurrency(convResult, convTo)}
        </Text>
        <Text style={styles.convRateMeta}>
          {rates
            ? `1 ${convFrom} ≈ ${formatCurrency(
                convert(1, convFrom, convTo, rates),
                convTo
              )} · ${t("converter.updated")} ${agoLabel(rates.fetchedAt)}`
            : t("converter.loading")}
        </Text>
      </View>

      {/* History */}
      <View style={{ marginTop: 24 }}>
        <View style={styles.historyHeader}>
          <Text style={styles.sectionTitle}>{t("converter.history")}</Text>
          {convHistory.length > 0 && (
            <TouchableOpacity onPress={onClearHistory} testID="clear-history">
              <Text style={styles.historyClear}>{t("converter.clearHistory")}</Text>
            </TouchableOpacity>
          )}
        </View>
        {convHistory.length === 0 ? (
          <Text style={styles.familySub}>{t("converter.historyEmpty")}</Text>
        ) : (
          convHistory.map((h) => (
            <TouchableOpacity
              key={h.id}
              style={styles.historyRow}
              onPress={() => onRestoreHistory(h)}
              testID={`history-${h.id}`}
              activeOpacity={0.85}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.historyMain}>
                  {formatCurrency(h.amount, h.from)} → {formatCurrency(h.result, h.to)}
                </Text>
                <Text style={styles.historyMeta}>
                  {h.from} → {h.to} · {agoLabel(h.timestamp)}
                </Text>
              </View>
              <Feather name="corner-up-left" size={16} color={TEXT_3} />
            </TouchableOpacity>
          ))
        )}
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}
