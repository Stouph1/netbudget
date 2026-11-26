// Bannière publicitaire de la formule gratuite. Les règles (consentement
// d'abord, pubs non personnalisées, rien sans identifiant) sont dans lib/ads.
import React, { useEffect, useRef, useState } from "react";
import { Platform, View } from "react-native";
import {
  BannerAd,
  BannerAdSize,
  useForeground,
} from "react-native-google-mobile-ads";
import AdRemoveLink from "./AdRemoveLink";
import { AD_REQUEST, BANNER_UNIT as UNIT_ID, startAds } from "../lib/ads";

export default function AdBanner({
  enabled,
  onHeight,
  removeLabel,
  onRemove,
}: {
  /** Formule gratuite, sur un écran qui porte la bannière. */
  enabled: boolean;
  /** Hauteur occupée (0 sans pub) : l'écran réserve la place sous sa liste. */
  onHeight?: (h: number) => void;
  /** « Supprimer les pubs » : ouvre les formules. */
  removeLabel?: string;
  onRemove?: () => void;
}) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const ref = useRef<BannerAd>(null);
  const show = enabled && !!UNIT_ID && ready && !failed;

  useEffect(() => {
    if (!enabled || !UNIT_ID) return;
    let alive = true;
    void startAds().then((ok) => {
      if (alive) setReady(ok);
    });
    return () => {
      alive = false;
    };
  }, [enabled]);

  useEffect(() => {
    if (!show) onHeight?.(0);
  }, [show, onHeight]);

  // iOS peut vider la bannière quand l'app est suspendue : on recharge au retour.
  useForeground(() => {
    if (Platform.OS === "ios") ref.current?.load();
  });

  if (!show || !UNIT_ID) return null;
  return (
    <View
      style={{ alignItems: "stretch", marginBottom: 6 }}
      onLayout={(e) => onHeight?.(e.nativeEvent.layout.height)}
      testID="ad-banner"
    >
      {removeLabel && onRemove ? (
        <AdRemoveLink label={removeLabel} onPress={onRemove} />
      ) : null}
      <View style={{ alignItems: "center" }}>
        <BannerAd
          ref={ref}
          unitId={UNIT_ID}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={AD_REQUEST}
          onAdFailedToLoad={() => setFailed(true)}
        />
      </View>
    </View>
  );
}
