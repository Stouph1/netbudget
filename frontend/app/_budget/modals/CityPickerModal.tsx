// Sélecteur de localisation en 2 étapes : pays → ville.
//
// L'étape « pays » affiche AUSSI des suggestions globales de villes : si le
// user tape « argenteuil » sans avoir choisi de pays, il trouve quand même.
import React from "react";
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import {
  City,
  COUNTRIES,
  citiesByCountry,
  getCountry,
} from "../../../src/constants/cities";
import { GOLD, SUCCESS, TEXT_2, TEXT_3 } from "../constants";
import { styles } from "../styles";
import type { Translate } from "../types";

export default function CityPickerModal({
  visible,
  city,
  pickerStep,
  pickerCountry,
  citySearch,
  filteredCountries,
  globalCitySuggestions,
  filteredCities,
  sheetHeight,
  keyboardVerticalOffset,
  t,
  onCitySearchChange,
  onPickCountry,
  onBackToCountry,
  onPickCity,
  onClose,
}: {
  visible: boolean;
  city: City;
  pickerStep: "country" | "city";
  pickerCountry: string | null;
  citySearch: string;
  filteredCountries: typeof COUNTRIES;
  globalCitySuggestions: City[];
  filteredCities: City[];
  sheetHeight: number;
  keyboardVerticalOffset: number;
  t: Translate;
  onCitySearchChange: (next: string) => void;
  onPickCountry: (code: string) => void;
  onBackToCountry: () => void;
  onPickCity: (next: City) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={() => { Keyboard.dismiss(); onClose(); }}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={keyboardVerticalOffset}
          style={{ width: "100%" }}
        >
        <View style={[styles.sheet, { height: sheetHeight }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            {pickerStep === "city" ? (
              <TouchableOpacity
                onPress={onBackToCountry}
                hitSlop={10}
                testID="picker-back-to-country"
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Feather name="chevron-left" size={20} color={TEXT_2} />
                <Text style={styles.sheetTitle}>
                  {getCountry(pickerCountry ?? "")?.flag} {getCountry(pickerCountry ?? "")?.name}
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.sheetTitle}>{t("modal.chooseCountry")}</Text>
            )}
            <TouchableOpacity onPress={() => { Keyboard.dismiss(); onClose(); }} testID="close-city-picker">
              <Feather name="x" size={22} color={TEXT_2} />
            </TouchableOpacity>
          </View>
          <View style={styles.searchWrap}>
            <Feather name="search" size={16} color={TEXT_3} />
            <TextInput
              style={styles.searchInput}
              value={citySearch}
              onChangeText={onCitySearchChange}
              placeholder={pickerStep === "country" ? t("btn.searchCountry") : t("btn.search")}
              placeholderTextColor={TEXT_3}
              returnKeyType="search"
              testID="city-search-input"
            />
            {citySearch.length > 0 && (
              <TouchableOpacity
                onPress={() => onCitySearchChange("")}
                hitSlop={10}
                testID="city-search-clear"
              >
                <Feather name="x-circle" size={16} color={TEXT_3} />
              </TouchableOpacity>
            )}
          </View>
          {pickerStep === "country" ? (
            <FlatList
              data={filteredCountries}
              keyExtractor={(c) => c.code}
              keyboardShouldPersistTaps="handled"
              style={{ flex: 1 }}
              ListHeaderComponent={
                globalCitySuggestions.length > 0 ? (
                  <View>
                    <View style={styles.regionHeader}>
                      <Text style={styles.regionHeaderText}>{t("country.citySuggestions")}</Text>
                    </View>
                    {globalCitySuggestions.map((sug) => {
                      const country = COUNTRIES.find((c) => c.code === sug.countryCode);
                      return (
                        <TouchableOpacity
                          key={sug.id}
                          style={styles.cityRow}
                          onPress={() => onPickCity(sug)}
                          testID={`city-suggestion-${sug.id}`}
                        >
                          <Text style={{ fontSize: 20, marginRight: 12 }}>{country?.flag ?? "🌍"}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.cityName}>{sug.name}</Text>
                            <Text style={styles.cityRegion}>
                              {country?.name ?? sug.countryCode} · {sug.region}
                            </Text>
                          </View>
                          <View style={styles.cityIndex}>
                            <Text style={[styles.cityIndexText, { color: sug.index > 1 ? GOLD : SUCCESS }]}>
                              ×{sug.index.toFixed(2)}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                    {filteredCountries.length > 0 && (
                      <View style={[styles.regionHeader, { marginTop: 8 }]}>
                        <Text style={styles.regionHeaderText}>{t("country.allCountries")}</Text>
                      </View>
                    )}
                  </View>
                ) : null
              }
              ListEmptyComponent={
                globalCitySuggestions.length === 0 ? (
                  <View style={styles.cityEmpty} testID="country-empty">
                    <Feather name="search" size={20} color={TEXT_3} />
                    <Text style={styles.cityEmptyTitle}>{t("country.noResult")}</Text>
                    <Text style={styles.cityEmptyText}>{t("city.noResultHint")}</Text>
                  </View>
                ) : null
              }
              renderItem={({ item }) => {
                const active = city.countryCode === item.code;
                const count = citiesByCountry(item.code).length;
                return (
                  <TouchableOpacity
                    style={[styles.cityRow, active && styles.cityRowActive]}
                    onPress={() => onPickCountry(item.code)}
                    testID={`country-option-${item.code}`}
                  >
                    <Text style={{ fontSize: 24, marginRight: 12 }}>{item.flag}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cityName}>{item.name}</Text>
                      <Text style={styles.cityRegion}>{count} {count > 1 ? t("country.cities") : t("country.city")}</Text>
                    </View>
                    <Feather name="chevron-right" size={20} color={TEXT_3} />
                  </TouchableOpacity>
                );
              }}
            />
          ) : (
            <SectionList<City, { title: string }>
              sections={(() => {
                const grouped: Record<string, City[]> = {};
                for (const c of filteredCities) {
                  if (!grouped[c.region]) grouped[c.region] = [];
                  grouped[c.region].push(c);
                }
                return Object.entries(grouped).map(([region, data]) => ({ title: region, data }));
              })()}
              keyExtractor={(c) => c.id}
              keyboardShouldPersistTaps="handled"
              style={{ flex: 1 }}
              stickySectionHeadersEnabled={false}
              renderSectionHeader={({ section }) => (
                <View style={styles.regionHeader}>
                  <Text style={styles.regionHeaderText}>{section.title}</Text>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.cityEmpty} testID="city-empty">
                  <Feather name="search" size={20} color={TEXT_3} />
                  <Text style={styles.cityEmptyTitle}>{t("city.noResult")}</Text>
                  <Text style={styles.cityEmptyText}>{t("city.noResultHint")}</Text>
                </View>
              }
              renderItem={({ item }) => {
                const active = item.id === city.id;
                return (
                  <TouchableOpacity
                    style={[styles.cityRow, active && styles.cityRowActive]}
                    onPress={() => onPickCity(item)}
                    testID={`city-option-${item.id}`}
                  >
                    <View style={[styles.cityDot, { backgroundColor: item.theme.accent }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cityName}>{item.name}</Text>
                      <Text style={styles.cityRegion}>{item.region}</Text>
                    </View>
                    <View style={styles.cityIndex}>
                      <Text
                        style={[
                          styles.cityIndexText,
                          { color: item.index > 1 ? GOLD : SUCCESS },
                        ]}
                      >
                        ×{item.index.toFixed(2)}
                      </Text>
                    </View>
                    {active && <Feather name="check" size={18} color={GOLD} style={{ marginLeft: 10 }} />}
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
