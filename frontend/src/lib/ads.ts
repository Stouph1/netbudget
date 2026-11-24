// Publicité (Google AdMob) de la formule gratuite : démarrage et plein écran.
//
// TROIS RÈGLES, et elles tiennent ici :
//  1. Rien ne part avant le consentement. La fenêtre de consentement de Google
//     (UMP) passe d'abord, là où la loi l'exige ; le SDK publicitaire n'est
//     initialisé qu'ensuite. Un abonné ne l'initialise jamais.
//  2. Publicités NON personnalisées, toujours. L'app ne demande pas
//     l'autorisation de suivi d'Apple et n'utilise pas l'identifiant
//     publicitaire.
//  3. Les identifiants de blocs ci-dessous sont ceux du compte AdMob de
//     NETbudget. Ils sont publics (ils voyagent dans l'app) ; une variable
//     EXPO_PUBLIC_ADMOB_* les remplace si elle est définie. En développement,
//     ce sont les blocs de test de Google.
import { Platform } from "react-native";
import mobileAds, {
  AdEventType,
  AdsConsent,
  AdsConsentPrivacyOptionsRequirementStatus,
  InterstitialAd,
  MaxAdContentRating,
  TestIds,
} from "react-native-google-mobile-ads";

export const AD_REQUEST = { requestNonPersonalizedAdsOnly: true } as const;

export const BANNER_UNIT: string | undefined = __DEV__
  ? TestIds.ADAPTIVE_BANNER
  : Platform.select({
      ios: process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS || "ca-app-pub-8277496768662994/4322125943",
      android:
        process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID || "ca-app-pub-8277496768662994/2725459896",
    }) || undefined;

const INTERSTITIAL_UNIT: string | undefined = __DEV__
  ? TestIds.INTERSTITIAL
  : Platform.select({
      ios:
        process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS || "ca-app-pub-8277496768662994/8549592673",
      android:
        process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID ||
        "ca-app-pub-8277496768662994/6756717594",
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

// ---- Revenir sur son choix ----
/**
 * Vrai là où la loi impose de pouvoir revenir sur son consentement (Europe,
 * Royaume-Uni, Suisse). Ailleurs il n'y a pas de fenêtre à rouvrir.
 */
export async function adChoicesAvailable(): Promise<boolean> {
  try {
    await startAds();
    const info = await AdsConsent.getConsentInfo();
    return (
      info.privacyOptionsRequirementStatus === AdsConsentPrivacyOptionsRequirementStatus.REQUIRED
    );
  } catch {
    return false;
  }
}

/** Rouvre la fenêtre de consentement de Google. */
export async function showAdChoices(): Promise<void> {
  try {
    await AdsConsent.showPrivacyOptionsForm();
  } catch {}
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
