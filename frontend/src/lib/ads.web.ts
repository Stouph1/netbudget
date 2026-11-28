// Pas de publicité sur le web : le SDK AdMob n'existe que sur iPhone et Android.
export function preloadExportAd(): void {}
export function showExportAd(): Promise<void> {
  return Promise.resolve();
}
export function adChoicesAvailable(): Promise<boolean> {
  return Promise.resolve(false);
}
export function showAdChoices(): Promise<void> {
  return Promise.resolve();
}
export const rewardedSupported = false;
export type RewardedOutcome = "earned" | "dismissed" | "unavailable";
export function showRewardedAd(): Promise<RewardedOutcome> {
  return Promise.resolve("unavailable");
}
