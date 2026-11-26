// Pas de publicité sur le web : le SDK AdMob n'existe que sur iPhone et Android.
export default function AdBanner(_: {
  enabled: boolean;
  onHeight?: (h: number) => void;
  removeLabel?: string;
  onRemove?: () => void;
}) {
  return null;
}
