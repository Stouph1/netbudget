// Approbation du contrat de test, à distance.
//
// POURQUOI CET ÉCRAN EXISTE. La session est 100 % à distance. Un PDF à
// imprimer, signer et scanner ne revient jamais — et un accord qu'on n'a pas ne
// protège personne, ni le testeur, ni nous. Ici il lit, il tape son nom, c'est
// enregistré. Trente secondes.
//
// TROIS CHOSES QUI NE SONT PAS DES DÉTAILS :
//
// 1. LE BOUTON RESTE INACTIF TANT QUE LE TEXTE N'A PAS ÉTÉ DÉROULÉ. Un accord
//    donné sans avoir vu le texte n'est pas un accord. Ça se contourne en
//    faisant défiler sans lire, évidemment — mais on ne peut au moins pas
//    approuver sans que le document soit passé sous les yeux.
//
// 2. LE REFUS EST UNE VRAIE SORTIE. Il retire le statut de testeur côté serveur
//    et la question n'est plus posée. Un « non » qui revient au lancement
//    suivant n'est pas un choix, c'est du harcèlement.
//
// 3. LE TEXTE N'EST PAS TRADUIT, et c'est assumé : les testeurs sont recrutés
//    en français par nos soins. Traduire un engagement en huit langues sans
//    relecture juridique par langue serait pire que de ne pas le traduire.

import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import type { Tier } from "../lib/entitlements";
import { APPROVAL, contractSections } from "../lib/testerContract";

const MIDNIGHT = "#0F172A";
const SURFACE = "#1A2238";
const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#94A3B8";
const TEXT_3 = "#8193AC";
const GOLD = "#4ADE80";
const DANGER = "#F87171";
const BORDER = "rgba(255,255,255,0.10)";

export function TesterConsent({
  visible,
  tier,
  defaultName,
  busy,
  onAccept,
  onDecline,
}: {
  visible: boolean;
  tier: Tier;
  /** Prénom du profil, pour ne pas faire ressaisir ce qu'on sait déjà. */
  defaultName?: string | null;
  busy: boolean;
  onAccept: (fullName: string) => void;
  onDecline: () => void;
}) {
  const [name, setName] = useState(defaultName ?? "");
  const [checks, setChecks] = useState<boolean[]>(APPROVAL.cases.map(() => false));
  const [readToEnd, setReadToEnd] = useState(false);

  const sections = contractSections(tier);
  const allChecked = checks.every(Boolean);
  const canAccept = readToEnd && allChecked && name.trim().length >= 3 && !busy;

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    // 40 points de marge : exiger le pixel exact rend le bouton inatteignable
    // sur certains appareils, et le testeur croit à un blocage.
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 40) {
      setReadToEnd(true);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={() => {}}>
      <View style={s.root}>
        <View style={s.head}>
          <Text style={s.title}>{APPROVAL.titre}</Text>
          <Text style={s.intro}>{APPROVAL.intro}</Text>
        </View>

        <ScrollView
          style={s.scroll}
          contentContainerStyle={{ padding: 20, paddingBottom: 30 }}
          onScroll={onScroll}
          scrollEventThrottle={80}
          showsVerticalScrollIndicator
        >
          {sections.map((sec) => (
            <View key={sec.id} style={{ marginBottom: 18 }}>
              <Text style={s.h2}>{sec.title}</Text>
              {sec.body?.map((p, i) => (
                <Text key={i} style={s.body}>
                  {p}
                </Text>
              ))}
              {sec.bullets?.map((b, i) => (
                <View key={i} style={s.bulletRow}>
                  <Text style={s.bulletDot}>•</Text>
                  <Text style={[s.body, { flex: 1, marginBottom: 4 }]}>{b}</Text>
                </View>
              ))}
            </View>
          ))}

          {!readToEnd ? (
            <Text style={s.scrollHint}>
              {"Fais défiler jusqu'en bas pour pouvoir approuver."}
            </Text>
          ) : null}
        </ScrollView>

        <View style={s.foot}>
          {APPROVAL.cases.map((label, i) => (
            <TouchableOpacity
              key={label}
              style={s.checkRow}
              onPress={() =>
                setChecks((c) => c.map((v, j) => (j === i ? !v : v)))
              }
              activeOpacity={0.7}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: checks[i] }}
              testID={`consent-check-${i}`}
            >
              <View style={[s.box, checks[i] && s.boxOn]}>
                {checks[i] ? <Feather name="check" size={13} color="#04140B" /> : null}
              </View>
              <Text style={s.checkLabel}>{label}</Text>
            </TouchableOpacity>
          ))}

          <TextInput
            style={s.input}
            value={name}
            onChangeText={setName}
            placeholder={APPROVAL.champNom}
            placeholderTextColor={TEXT_3}
            autoCapitalize="words"
            autoCorrect={false}
            testID="consent-name"
          />

          <TouchableOpacity
            style={[s.cta, !canAccept && s.ctaOff]}
            onPress={() => onAccept(name.trim())}
            disabled={!canAccept}
            activeOpacity={0.85}
            accessibilityRole="button"
            testID="consent-accept"
          >
            {busy ? (
              <ActivityIndicator color="#04140B" />
            ) : (
              <Text style={s.ctaText}>{APPROVAL.boutonAccepter}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onDecline}
            disabled={busy}
            hitSlop={10}
            style={{ alignSelf: "center", paddingVertical: 10 }}
            accessibilityRole="button"
            testID="consent-decline"
          >
            <Text style={s.decline}>{APPROVAL.boutonRefuser}</Text>
          </TouchableOpacity>

          <Text style={s.trace}>{APPROVAL.mentionTrace}</Text>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: MIDNIGHT },
  head: { paddingHorizontal: 20, paddingTop: 54, paddingBottom: 12 },
  title: { color: TEXT_1, fontSize: 23, fontWeight: "800", marginBottom: 6 },
  intro: { color: TEXT_2, fontSize: 13.5, lineHeight: 19 },
  scroll: { flex: 1, borderTopWidth: 1, borderBottomWidth: 1, borderColor: BORDER },
  h2: { color: TEXT_1, fontSize: 15, fontWeight: "800", marginBottom: 6 },
  body: { color: TEXT_2, fontSize: 13, lineHeight: 19.5, marginBottom: 8 },
  bulletRow: { flexDirection: "row", gap: 8 },
  bulletDot: { color: GOLD, fontSize: 13, lineHeight: 19.5 },
  scrollHint: { color: TEXT_3, fontSize: 12, textAlign: "center", marginTop: 4 },
  foot: { padding: 20, paddingBottom: 30, gap: 10 },
  checkRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.4,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  boxOn: { backgroundColor: GOLD, borderColor: GOLD },
  checkLabel: { flex: 1, color: TEXT_2, fontSize: 13, lineHeight: 18.5 },
  input: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: TEXT_1,
    fontSize: 15,
    marginTop: 4,
  },
  cta: {
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 4,
  },
  // Inactif mais VISIBLE : un bouton qui disparaît laisse croire qu'il n'y a
  // pas d'issue. Grisé, il indique qu'il reste quelque chose à faire.
  ctaOff: { opacity: 0.4 },
  ctaText: { color: "#04140B", fontSize: 15.5, fontWeight: "800" },
  decline: { color: DANGER, fontSize: 13, fontWeight: "600" },
  trace: { color: TEXT_3, fontSize: 11, lineHeight: 15, textAlign: "center" },
});
