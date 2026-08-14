// Feuille de style partagée de l'écran Budget (ex-app/index.tsx).
//
// Elle reste commune : les sous-composants (Section, Field, Dropdown), les
// modales et les trois écrans du pager piochent tous dans le même jeu de
// styles — les séparer par fichier dupliquerait la palette.
import { Dimensions, Platform, StyleSheet } from "react-native";
import {
  BG,
  BORDER,
  COLOR_PRETS,
  DANGER,
  GOLD,
  SURFACE,
  SURFACE_2,
  TEXT,
  TEXT_2,
  TEXT_3,
} from "./constants";

export const SCREEN_H = Dimensions.get("window").height;

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    // La tab bar flotte au-dessus du contenu (position absolute) : on
    // réserve sa hauteur pour que le bas des listes reste atteignable.
    paddingBottom: 130,
    maxWidth: 720,
    width: "100%",
    alignSelf: "center",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 16,
  },
  ratioWidget: {
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: SURFACE_2,
    borderWidth: 1,
    borderColor: BORDER,
  },
  ratioLabel: {
    color: TEXT_3,
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  ratioMixName: {
    color: GOLD,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
    maxWidth: 120,
  },
  ratioValue: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },
  budgetScopeBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: SURFACE_2,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 14,
  },
  budgetScopeBadgeText: {
    color: GOLD,
    fontSize: 12,
    fontWeight: "700",
    maxWidth: 220,
  },
  eyebrow: {
    color: GOLD,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    fontWeight: "700",
    marginBottom: 2,
  },
  title: { color: TEXT, fontSize: 32, fontWeight: "800", letterSpacing: -0.8 },
  resetBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER,
    alignItems: "center", justifyContent: "center",
  },
  headerActions: { flexDirection: "row", gap: 8 },
  headerBtn: {
    minWidth: 40, height: 40, paddingHorizontal: 10,
    borderRadius: 20, backgroundColor: SURFACE,
    borderWidth: 1, borderColor: BORDER,
    alignItems: "center", justifyContent: "center",
  },
  headerBtnText: { color: TEXT, fontSize: 14, fontWeight: "800" },

  currencyRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 14, paddingHorizontal: 8,
    borderBottomWidth: 1, borderBottomColor: BORDER, gap: 12,
  },
  currencyRowActive: { backgroundColor: SURFACE },
  currencyFlag: { fontSize: 24 },
  currencyName: { color: TEXT, fontSize: 15, fontWeight: "600" },
  currencyMeta: { color: TEXT_3, fontSize: 12, marginTop: 2 },
  currencySymbol: {
    backgroundColor: SURFACE_2, paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 10, minWidth: 50, alignItems: "center",
  },
  currencySymbolText: { color: GOLD, fontSize: 13, fontWeight: "700" },
  currencySymbolBig: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: SURFACE_2,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  currencySymbolBigText: { color: GOLD, fontSize: 18, fontWeight: "800" },

  convResultBox: {
    backgroundColor: SURFACE, borderRadius: 16,
    borderWidth: 1, borderColor: BORDER,
    padding: 18, marginTop: 8, alignItems: "center",
  },
  convResultLabel: {
    color: TEXT_3, fontSize: 11, letterSpacing: 1.2,
    textTransform: "uppercase", fontWeight: "700", marginBottom: 8,
  },
  convResultValue: { color: GOLD, fontSize: 28, fontWeight: "800", fontVariant: ["tabular-nums"] },
  convResultMeta: { color: TEXT_3, fontSize: 11, marginTop: 8 },

  // Google-Translate-like converter
  convCard: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 20,
    marginTop: 12,
  },
  convCardResult: { backgroundColor: SURFACE_2 },
  convChip: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingBottom: 14, marginBottom: 8,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  convChipFlag: { fontSize: 30 },
  convChipCode: { color: TEXT, fontSize: 14, fontWeight: "800", letterSpacing: 1 },
  convChipName: { color: TEXT_3, fontSize: 12, marginTop: 2 },
  convBigInput: {
    color: TEXT, fontSize: 38, fontWeight: "800",
    padding: 0, margin: 0, fontVariant: ["tabular-nums"],
  },
  convBigResult: {
    color: GOLD, fontSize: 38, fontWeight: "800",
    fontVariant: ["tabular-nums"], marginTop: 2,
  },
  convSymbolHint: {
    color: TEXT_3, fontSize: 13, fontWeight: "600", marginTop: 4,
  },
  convRateMeta: {
    color: TEXT_3, fontSize: 12, marginTop: 10,
  },
  convSwapWrap: {
    flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 4,
  },
  convDivider: { flex: 1, height: 1, backgroundColor: BORDER },
  convSwapBtn: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: GOLD,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },

  historyHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginBottom: 8,
  },
  historyClear: { color: DANGER, fontSize: 12, fontWeight: "700" },
  historyRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: SURFACE, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: BORDER, marginBottom: 8,
  },
  historyMain: { color: TEXT, fontSize: 14, fontWeight: "700" },
  historyMeta: { color: TEXT_3, fontSize: 11, marginTop: 4 },

  tabBarWrap: {
    // Flotte au-dessus du contenu : le contenu défile derrière et
    // transparaît à travers le flou (vrai effet "liquid glass").
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingTop: 6,
    backgroundColor: "transparent",
    zIndex: 50,
  },
  tabBarPill: {
    flexDirection: "row",
    borderRadius: 28,
    overflow: "hidden",
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "rgba(14,19,33,0.45)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  miniDonutsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
    marginTop: 18,
    marginBottom: 4,
  },
  miniDonutCell: { flex: 1, alignItems: "center", gap: 2 },
  miniDonutLabel: { color: TEXT, fontSize: 12, fontWeight: "700", marginTop: 6 },
  miniDonutTarget: { color: TEXT_2, fontSize: 10.5 },
  miniDonutAmount: { color: TEXT_2, fontSize: 11, fontWeight: "600" },
  previewHint: { color: TEXT_2, fontSize: 12, marginTop: 6, textAlign: "center" },
  loanProgressWrap: { marginTop: 8, gap: 4 },
  loanProgressBar: {
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  loanProgressFill: { height: 5, borderRadius: 3, backgroundColor: COLOR_PRETS },
  loanProgressText: { color: TEXT_2, fontSize: 11.5, fontWeight: "600" },
  loanSplitText: { color: TEXT_3, fontSize: 11 },
  profileLocNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(74,222,128,0.08)",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.28)",
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 11,
    marginBottom: 10,
  },
  profileLocNoteText: { color: TEXT_2, fontSize: 12.5, lineHeight: 18, flex: 1 },
  scheduleLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
    alignSelf: "flex-start",
  },
  scheduleLinkText: { color: GOLD, fontSize: 11.5, fontWeight: "700" },
  loanHintText: { color: TEXT_3, fontSize: 11, marginTop: 6, fontStyle: "italic" },
  tabBadge: {
    position: "absolute",
    top: -3,
    right: -5,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F87171",
  },
  tabIndicator: {
    position: "absolute",
    top: 8,
    bottom: 8,
    left: 0,
    borderRadius: 19,
    // backgroundColor piloté par l'animation (s'éclaircit au maintien)
    backgroundColor: "rgba(74,222,128,0.14)",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.22)",
    // Halo qui apparaît quand la bulle prend le focus
    shadowColor: "#4ADE80",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    shadowOpacity: 0,
    elevation: 0,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 7,
    paddingHorizontal: 2,
    gap: 3,
    borderRadius: 20,
  },
  tabLabel: { color: TEXT_3, fontSize: 10.5, fontWeight: "600", textAlign: "center" },
  tabLabelActive: { color: GOLD, fontWeight: "800" },

  topSummary: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginBottom: 24,
  },
  onboardingCard: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 20,
    marginBottom: 24,
  },
  onboardingHeader: {
    flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14,
  },
  onboardingTitle: { color: TEXT, fontSize: 16, fontWeight: "800" },
  onboardingStep: {
    color: TEXT_2, fontSize: 13, lineHeight: 19, marginBottom: 10,
  },
  onboardingNum: { color: GOLD, fontWeight: "800" },
  onboardingHl: { color: TEXT, fontWeight: "700" },
  onboardingTip: {
    color: TEXT_3, fontSize: 12, lineHeight: 18, marginTop: 4,
    fontStyle: "italic",
  },
  topSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  topSummaryBlock: { flex: 1, alignItems: "center" },
  topSummaryDivider: { width: 1, height: 36, backgroundColor: BORDER },
  topSummaryLabel: {
    color: TEXT_3, fontSize: 10, letterSpacing: 1.2,
    textTransform: "uppercase", fontWeight: "700", marginBottom: 6,
  },
  topSummaryValue: {
    color: TEXT, fontSize: 16, fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },

  section: { marginBottom: 28 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: { color: TEXT, fontSize: 17, fontWeight: "700", letterSpacing: 0.2 },
  sectionSubtitle: {
    color: TEXT_3, fontSize: 12, lineHeight: 17, marginBottom: 14, marginTop: -4,
  },
  addBtn: {
    flexDirection: "row", alignItems: "center", backgroundColor: GOLD,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, gap: 4,
  },
  addBtnText: { color: "#000", fontWeight: "700", fontSize: 13 },

  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 6,
  },
  inputWrapFocused: { borderColor: GOLD },
  inputIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: SURFACE_2, alignItems: "center", justifyContent: "center",
    marginRight: 12,
  },
  inputLabel: {
    color: TEXT_3, fontSize: 11, letterSpacing: 0.8,
    textTransform: "uppercase", fontWeight: "600", marginBottom: 2,
  },
  inputLabelEditable: { padding: 0, margin: 0, marginBottom: 2 },
  euroIcon: { color: GOLD, fontSize: 18, fontWeight: "800" },
  dismissKbBtn: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 16 : 24,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: GOLD,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  dismissKbBtnText: { color: "#000", fontSize: 13, fontWeight: "800" },
  inputField: {
    color: TEXT, fontSize: 18, fontWeight: "600", padding: 0, margin: 0,
  },
  inputValue: { color: TEXT, fontSize: 18, fontWeight: "600" },
  inputRight: { color: TEXT_2, fontSize: 16, fontWeight: "600", marginLeft: 8 },
  fieldHint: {
    color: TEXT_3, fontSize: 11, marginBottom: 10, paddingLeft: 4,
  },
  indexBadge: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, marginRight: 10,
  },
  indexBadgeText: { fontSize: 12, fontWeight: "700" },

  infoRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 4, paddingVertical: 6,
  },

  toggleRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: SURFACE_2, borderRadius: 14,
    borderWidth: 1, borderColor: BORDER, padding: 14,
  },
  toggleLabel: {
    color: TEXT, fontSize: 15, fontWeight: "600",
  },
  infoRowText: {
    color: TEXT_3, fontSize: 12, textDecorationLine: "underline",
  },

  hint: {
    color: TEXT_3, fontSize: 12, marginTop: 4, paddingHorizontal: 4, lineHeight: 18,
  },

  revenusSummary: {
    backgroundColor: SURFACE_2, borderRadius: 14,
    borderWidth: 1, borderColor: BORDER, padding: 14, marginTop: 6,
  },
  revenusRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingVertical: 4, gap: 10,
  },
  revenusLabel: { color: TEXT_2, fontSize: 13, flexShrink: 1 },
  revenusTotal: {
    color: TEXT, fontSize: 15, fontWeight: "700",
    flexShrink: 0, textAlign: "right",
  },
  revenusTotalMuted: {
    color: TEXT_3, fontSize: 14, fontWeight: "500",
    flexShrink: 0, textAlign: "right",
  },
  statusToggle: { flexDirection: "row", gap: 8, marginTop: 8, marginBottom: 12 },
  modeToggleRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  pillsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  pillSectionLabel: {
    color: TEXT_3, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase",
    fontWeight: "700", marginTop: 14, marginBottom: 8,
  },
  pill: {
    flex: 1, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 12,
    borderWidth: 1, borderColor: BORDER, alignItems: "center", backgroundColor: SURFACE,
  },
  pillActive: { borderColor: GOLD, backgroundColor: "rgba(74,222,128,0.12)" },
  pillText: { color: TEXT_2, fontSize: 12, fontWeight: "600" },
  pillTextActive: { color: GOLD, fontWeight: "800" },

  emptyCard: {
    backgroundColor: SURFACE, borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    borderStyle: "dashed", padding: 24, alignItems: "center",
  },
  emptyTitle: { color: TEXT, fontSize: 15, fontWeight: "700", marginTop: 10, marginBottom: 4 },
  emptyText: { color: TEXT_3, fontSize: 13, textAlign: "center", lineHeight: 18 },

  loanItem: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: SURFACE, borderRadius: 16, borderWidth: 1,
    borderColor: BORDER, padding: 14, marginBottom: 10,
  },
  loanIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: SURFACE_2, alignItems: "center", justifyContent: "center", marginRight: 12,
  },
  loanName: { color: TEXT, fontSize: 15, fontWeight: "700", marginBottom: 2 },
  loanMeta: { color: TEXT_3, fontSize: 12 },
  loanMetaSmall: { color: TEXT_3, fontSize: 11 },
  loanAmount: { color: COLOR_PRETS, fontSize: 15, fontWeight: "800" },
  trashBtn: { marginLeft: 10, width: 32, height: 32, alignItems: "center", justifyContent: "center" },

  expensesTotalRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginTop: 10, paddingHorizontal: 4,
  },
  expensesTotalLabel: {
    color: TEXT_3, fontSize: 12, letterSpacing: 1,
    textTransform: "uppercase", fontWeight: "700",
  },
  expensesTotalValue: {
    color: TEXT, fontSize: 15, fontWeight: "800", fontVariant: ["tabular-nums"],
  },

  hero: {
    borderRadius: 24, overflow: "hidden",
    borderWidth: 1, borderColor: BORDER,
  },
  heroOverlay: {
    alignItems: "center", paddingVertical: 28, paddingHorizontal: 18,
  },
  heroLabel: {
    fontSize: 11, letterSpacing: 2, fontWeight: "800", marginBottom: 18,
  },
  legendWrap: {
    alignSelf: "stretch", marginTop: 24,
    backgroundColor: "rgba(10,10,12,0.55)",
    borderRadius: 16, padding: 12, gap: 6,
  },
  legendItem: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 6,
  },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  legendText: { color: TEXT, flex: 1, fontSize: 13, fontWeight: "600" },
  legendValue: {
    color: TEXT, fontSize: 13, fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },

  modalBackdrop: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#0F0F12",
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 20, paddingBottom: 32,
    borderWidth: 1, borderColor: BORDER,
    height: Math.round(SCREEN_H * 0.85),
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
  },
  sheetHandle: {
    alignSelf: "center", width: 44, height: 4, borderRadius: 2,
    backgroundColor: BORDER, marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 16,
  },
  sheetTitle: { color: TEXT, fontSize: 20, fontWeight: "800", flex: 1, marginRight: 12 },
  searchWrap: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: SURFACE, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: BORDER, marginBottom: 10,
  },
  searchInput: { flex: 1, color: TEXT, fontSize: 15, marginLeft: 8, padding: 0 },
  cityRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 14, paddingHorizontal: 8,
    borderBottomWidth: 1, borderBottomColor: BORDER, gap: 10,
  },
  cityRowActive: { backgroundColor: SURFACE },
  cityDot: { width: 10, height: 10, borderRadius: 5 },
  cityName: { color: TEXT, fontSize: 15, fontWeight: "600" },
  cityRegion: { color: TEXT_3, fontSize: 12, marginTop: 2 },
  cityIndex: {
    backgroundColor: SURFACE_2, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
  },
  cityIndexText: { fontSize: 12, fontWeight: "700" },
  regionHeader: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 6,
    backgroundColor: "transparent",
  },
  regionHeaderText: {
    color: TEXT_3,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  sourceLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
  },
  sourceLinkText: {
    color: GOLD,
    fontSize: 13,
    textDecorationLine: "underline",
    flexShrink: 1,
  },
  cityEmpty: { paddingVertical: 24, alignItems: "center", gap: 6 },
  cityEmptyTitle: { color: TEXT, fontSize: 14, fontWeight: "700" },
  cityEmptyText: { color: TEXT_3, fontSize: 12, textAlign: "center", lineHeight: 18 },

  familySub: {
    color: TEXT_3, fontSize: 12, marginTop: -8, marginBottom: 12,
    fontStyle: "italic", flex: 1, paddingRight: 8,
  },
  familySubRow: {
    flexDirection: "row", alignItems: "flex-start", marginBottom: 4,
  },
  familyInfoBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: SURFACE_2, borderRadius: 12,
    paddingHorizontal: 8, paddingVertical: 4, marginTop: -6,
  },
  familyInfoBtnText: { color: GOLD, fontSize: 11, fontWeight: "700" },

  incomeRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: SURFACE, borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    padding: 14, marginBottom: 10,
  },
  incomeIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: SURFACE_2, alignItems: "center", justifyContent: "center",
    marginRight: 12,
  },
  incomeLabel: { color: TEXT, fontSize: 15, fontWeight: "700" },
  incomeMeta: { color: TEXT_3, fontSize: 11, marginTop: 2 },
  incomeNet: { color: GOLD, fontSize: 15, fontWeight: "800", fontVariant: ["tabular-nums"] },
  incomeMetaSmall: { color: TEXT_3, fontSize: 10, marginTop: 2 },
  familyTotalRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginTop: 6, paddingTop: 12, borderTopWidth: 1, borderTopColor: BORDER,
  },
  familyTotalLabel: { color: TEXT_2, fontSize: 12, fontWeight: "600" },
  familyTotalValue: { fontSize: 16, fontWeight: "800", fontVariant: ["tabular-nums"] },
  fieldDeleteBtn: {
    width: 28, height: 28, borderRadius: 14, alignItems: "center",
    justifyContent: "center", marginLeft: 6,
  },

  adviceCard: {
    backgroundColor: SURFACE, borderRadius: 12, borderLeftWidth: 4,
    borderTopWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: BORDER,
    padding: 14, marginBottom: 10,
  },
  adviceHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  adviceTitle: { fontSize: 14, fontWeight: "800" },
  adviceMessage: { color: TEXT_2, fontSize: 13, lineHeight: 19 },

  exportBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 14, borderRadius: 16,
  },
  exportBtnPrimary: { backgroundColor: GOLD },
  exportBtnTextDark: { color: "#000", fontSize: 14, fontWeight: "800" },

  previewBox: {
    backgroundColor: SURFACE, borderRadius: 16,
    borderWidth: 1, borderColor: BORDER,
    padding: 16, marginVertical: 14, alignItems: "center",
  },
  previewLabel: {
    color: TEXT_3, fontSize: 11, letterSpacing: 1.2,
    textTransform: "uppercase", fontWeight: "700", marginBottom: 6,
  },
  previewValue: { color: GOLD, fontSize: 26, fontWeight: "800" },

  primaryBtn: {
    backgroundColor: GOLD, borderRadius: 24, paddingVertical: 16,
    alignItems: "center", marginTop: 6,
  },
  primaryBtnText: { color: "#000", fontWeight: "800", fontSize: 15 },

  confirmBackdrop: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center", justifyContent: "center", padding: 24,
  },
  confirmBox: {
    width: "100%", maxWidth: 380, backgroundColor: "#141416",
    borderRadius: 20, padding: 22, borderWidth: 1, borderColor: BORDER,
  },
  confirmTitle: { color: TEXT, fontSize: 18, fontWeight: "800", marginBottom: 8 },
  confirmMessage: { color: TEXT_2, fontSize: 14, lineHeight: 20 },
  confirmActions: { flexDirection: "row", gap: 10, marginTop: 18 },
  confirmCancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1, borderColor: BORDER, alignItems: "center", backgroundColor: "transparent",
  },
  confirmCancelText: { color: TEXT_2, fontWeight: "600", fontSize: 14 },
  confirmOkBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    alignItems: "center", backgroundColor: GOLD, marginTop: 10,
  },
  confirmOkText: { color: "#000", fontWeight: "800", fontSize: 14 },

  dropdownBackdrop: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center", justifyContent: "center", padding: 24,
  },
  dropdownSheet: {
    width: "100%", maxWidth: 380, backgroundColor: "#141416",
    borderRadius: 20, padding: 18, borderWidth: 1, borderColor: BORDER,
  },
  dropdownTitle: {
    color: TEXT_3, fontSize: 11, fontWeight: "700", letterSpacing: 1.2,
    textTransform: "uppercase", marginBottom: 12, paddingHorizontal: 4,
  },
  dropdownItem: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12,
    marginBottom: 4,
  },
  dropdownItemActive: { backgroundColor: SURFACE_2 },
  dropdownItemText: { color: TEXT, fontSize: 15, fontWeight: "600" },
  dropdownItemTextActive: { color: GOLD, fontWeight: "800" },
  dropdownItemHint: { color: TEXT_3, fontSize: 12, marginTop: 2 },

  sheetFooter: {
    paddingTop: 12, borderTopWidth: 1, borderTopColor: BORDER, marginTop: 4,
  },

  infoCloseBtn: {
    paddingVertical: 14, paddingHorizontal: 24, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
    backgroundColor: GOLD, marginTop: 18,
  },
  infoCloseText: { color: "#000", fontWeight: "800", fontSize: 14 },

  variableDistribBox: {
    backgroundColor: SURFACE, borderRadius: 16,
    borderWidth: 1, borderColor: BORDER,
    padding: 14, marginBottom: 14,
  },
  variableDistribLabel: {
    color: TEXT_3, fontSize: 11, letterSpacing: 1,
    textTransform: "uppercase", fontWeight: "700", marginBottom: 10,
  },
  distribPill: {
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999,
    borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE_2,
  },
  distribPillActive: { backgroundColor: GOLD, borderColor: GOLD },
  distribPillText: { color: TEXT_2, fontSize: 12, fontWeight: "600" },
  distribPillTextActive: { color: "#000", fontWeight: "800" },
});
