// Surface minimale de react-native utilisée par les modules de logique.
export const Platform = { OS: "ios" as const, select: (o: Record<string, unknown>) => o.ios };
export const Alert = { alert: () => {} };
export const Linking = { openURL: async () => {}, createURL: (p: string) => `netbudget://${p}` };
export const Share = { share: async () => ({ action: "sharedAction" }) };
