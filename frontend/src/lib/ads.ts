// Publicité (Google AdMob) de la formule gratuite : démarrage et plein écran.
//
// TROIS RÈGLES, et elles tiennent ici :
//  1. Rien ne part avant le consentement. La fenêtre de consentement de Google
//     (UMP) passe d'abord, là où la loi l'exige ; le SDK publicitaire n'est
//     initialisé qu'ensuite. Un abonné ne l'initialise jamais.
//  2. Publicités NON personnalisées, toujours. L'app ne demande pas
//     l'autorisation de suivi d'Apple et n'utilise pas l'identifiant
//     publicitaire.
//  3. Sans identifiant de bloc publicitaire, pas de pub : un build sans les
//     variables EXPO_PUBLIC_ADMOB_* n'affiche rien plutôt qu'une pub de test
//     en production.
import { Platform } from "react-native";
import mobileAds, {
  AdEventType,
  AdsConsent,
  InterstitialAd,
  MaxAdContentRating,
  TestIds,
} from "react-native-google-mobile-ads";

export const AD_REQUEST = { requestNonPersonalizedAdsOnly: true } as const;

export const BANNER_UNIT: string | undefined = __DEV__
  ? TestIds.ADAPTIVE_BANNER
  : Platform.select({
      ios: process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS,
      android: process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID,
    }) || undefined;

const INTERSTITIAL_UNIT: string | undefined = __DEV__
  ? TestIds.INTERSTITIAL
  : Platform.select({
      ios: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS,
      android: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID,
    }) || undefined;

let started: Promise<boolean> | null = null;

/** Consentement, puis initialisation. Une seule fois par lancement. */
export function startAds(): Promise<boolean> {
  if (!started) {
    started = (async () => {
      // Une erreur de consentement (hors ligne…) ne bloque pas : le SDK
      // reprend le choix de la session précédente, et `canRequestAds` tranche.
      try {
        await AdsConsent.gatherConsent();
      } catch {}
      const { canRequestAds } = await AdsConsent.getConsentInfo();
      if (!canRequestAds) return false;
      await mobileAds().setRequestConfiguration({ maxAdContentRating: MaxAdContentRating.PG });
      await mobileAds().initialize();
      return true;
    })().catch(() => false);
  }
  return started;
}

// ---- Plein écran à l'export PDF ----
let interstitial: InterstitialAd | null = null;
let loaded = false;

/** Charge la pub d'export à l'avance, pour qu'elle soit prête au clic. */
export function preloadExportAd(): void {
  if (!INTERSTITIAL_UNIT || interstitial) return;
  void startAds().then((ok) => {
    if (!ok || interstitial) return;
    const ad = InterstitialAd.createForAdRequest(INTERSTITIAL_UNIT, AD_REQUEST);
    interstitial = ad;
    ad.addAdEventListener(AdEventType.LOADED, () => {
      loaded = true;
    });
    ad.addAdEventListener(AdEventType.ERROR, () => {
      // Pas de pub disponible : on réessaiera au prochain préchargement.
      loaded = false;
      if (interstitial === ad) interstitial = null;
    });
    ad.load();
  });
}

/**
 * Montre la pub d'export si elle est prête, et rend la main à sa fermeture.
 * Pas prête, refusée, en erreur : rend la main tout de suite. L'export ne
 * dépend jamais de la publicité.
 */
export function showExportAd(): Promise<void> {
  const ad = interstitial;
  if (!ad || !loaded) {
    preloadExportAd();
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      offClosed();
      offError();
      loaded = false;
      interstitial = null;
      preloadExportAd(); // la suivante
      resolve();
    };
    const offClosed = ad.addAdEventListener(AdEventType.CLOSED, finish);
    const offError = ad.addAdEventListener(AdEventType.ERROR, finish);
    ad.show().catch(finish);
  });
}
