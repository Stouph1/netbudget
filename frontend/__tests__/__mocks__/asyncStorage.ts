// Stockage en mémoire : suffisant pour les modules testés, qui ne font que
// lire/écrire un cache. Réinitialisé entre les tests via clear().
const store = new Map<string, string>();

export default {
  getItem: async (k: string) => store.get(k) ?? null,
  setItem: async (k: string, v: string) => void store.set(k, v),
  removeItem: async (k: string) => void store.delete(k),
  getAllKeys: async () => [...store.keys()],
  multiRemove: async (ks: string[]) => ks.forEach((k) => store.delete(k)),
  clear: async () => store.clear(),
};
