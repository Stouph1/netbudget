// Briques d'UI partagées de l'écran Budget (ex-app/index.tsx) : encadré de
// section, champ de saisie, liste déroulante, pilule d'état.
import React, { useState } from "react";
import { Modal, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { GOLD, TEXT_3 } from "./constants";
import { styles } from "./styles";
import type { DropdownOption } from "./types";

export function Section({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {action}
      </View>
      {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      {children}
    </View>
  );
}

export function Field({
  label,
  icon,
  right,
  value,
  onChangeText,
  keyboardType,
  placeholder,
  testID,
  hintText,
  onDelete,
  onLabelChange,
  renameHint,
  maxLength,
  keepEmpty,
  deleteA11yLabel,
}: {
  label: string;
  icon?: React.ReactNode;
  right?: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?: "default" | "numeric" | "decimal-pad" | "number-pad";
  placeholder?: string;
  testID?: string;
  hintText?: string;
  onDelete?: () => void;
  onLabelChange?: (next: string) => void;
  renameHint?: string;
  maxLength?: number;
  // Les champs de MONTANT retombent à "0" quand on les vide (pratique pour
  // saisir un chiffre). Un champ de DATE ne doit pas : "0" n'est pas une date.
  keepEmpty?: boolean;
  /** Annonce du bouton de suppression. Défaut : le libellé du champ — le
   *  bouton SUPPRIME la ligne, il annonçait « Fermer », ce qui faisait
   *  supprimer une catégorie à qui croyait refermer quelque chose. */
  deleteA11yLabel?: string;
}) {
  const [focused, setFocused] = useState(false);
  const handleFocus = () => {
    setFocused(true);
    if (!keepEmpty && value === "0") onChangeText("");
  };
  const handleBlur = () => {
    setFocused(false);
    if (!keepEmpty && value === "") onChangeText("0");
  };
  return (
    <View>
      <View style={[styles.inputWrap, focused && styles.inputWrapFocused]}>
        {icon && <View style={styles.inputIcon}>{icon}</View>}
        <View style={{ flex: 1 }}>
          {onLabelChange ? (
            <TextInput
              style={[styles.inputLabel, styles.inputLabelEditable]}
              value={label}
              onChangeText={onLabelChange}
              placeholder={renameHint ?? "Renomme cette catégorie"}
              placeholderTextColor={TEXT_3}
              selectTextOnFocus
              returnKeyType="done"
              testID={testID ? `${testID}-label` : undefined}
            />
          ) : (
            <Text style={styles.inputLabel}>{label}</Text>
          )}
          <TextInput
            style={styles.inputField}
            value={value}
            onChangeText={onChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            keyboardType={keyboardType || "default"}
            maxLength={maxLength}
            placeholder={placeholder}
            placeholderTextColor={TEXT_3}
            selectTextOnFocus
            returnKeyType="done"
            testID={testID}
          />
        </View>
        {right && <Text style={styles.inputRight}>{right}</Text>}
        {onDelete && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={deleteA11yLabel ?? label}
            onPress={onDelete}
            style={styles.fieldDeleteBtn}
            hitSlop={10}
            testID={testID ? `${testID}-delete` : undefined}
          >
            <Feather name="x" size={14} color={TEXT_3} />
          </TouchableOpacity>
        )}
      </View>
      {hintText && <Text style={styles.fieldHint}>{hintText}</Text>}
    </View>
  );
}

export function Dropdown<T extends string>({
  label,
  value,
  options,
  onChange,
  icon,
  testID,
}: {
  label: string;
  value: T;
  options: DropdownOption<T>[];
  onChange: (next: T) => void;
  icon?: React.ReactNode;
  testID?: string;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <>
      <TouchableOpacity
        style={styles.inputWrap}
        onPress={() => setOpen(true)}
        testID={testID}
        activeOpacity={0.8}
      >
        {icon && <View style={styles.inputIcon}>{icon}</View>}
        <View style={{ flex: 1 }}>
          <Text style={styles.inputLabel}>{label}</Text>
          <Text style={styles.inputValue}>{current?.label ?? "—"}</Text>
        </View>
        <Feather name="chevron-down" size={20} color={TEXT_3} />
      </TouchableOpacity>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.dropdownBackdrop}
          onPress={() => setOpen(false)}
        >
          <View style={styles.dropdownSheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.dropdownTitle}>{label}</Text>
            {options.map((opt) => {
              const active = opt.value === value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.dropdownItem, active && styles.dropdownItemActive]}
                  onPress={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  testID={testID ? `${testID}-opt-${opt.value}` : undefined}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.dropdownItemText, active && styles.dropdownItemTextActive]}>
                      {opt.label}
                    </Text>
                    {opt.hint && <Text style={styles.dropdownItemHint}>{opt.hint}</Text>}
                  </View>
                  {active && <Feather name="check" size={16} color={GOLD} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

export function StatusPill({
  label,
  active,
  onPress,
  testID,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.pill, active && styles.pillActive]}
      testID={testID}
      activeOpacity={0.8}
    >
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}
