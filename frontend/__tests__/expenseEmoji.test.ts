// Le pictogramme se devine depuis le nom, dans les huit langues, avec précision.
import { EMOJI_CATALOG, bucketOfEmoji, normalizeLabel, suggestEmoji } from "../src/lib/expenseEmoji";

describe("suggestEmoji : précision", () => {
  it.each([
    ["basketball", "🏀"], ["Basket", "🏀"], ["バスケ", "🏀"], ["baloncesto", "🏀"],
    ["Piano", "🎹"], ["cours de piano", "🎹"], ["Guitare", "🎸"],
    ["Natation", "🏊"], ["piscine", "🏊"], ["schwimmen", "🏊"],
    ["Foot", "⚽"], ["Fußball", "⚽"], ["サッカー", "⚽"],
    ["Tennis", "🎾"], ["Padel", "🎾"], ["Escalade", "🧗"], ["Randonnée", "🧗"],
    ["Essence", "⛽"], ["petrol", "⛽"], ["Gasolina", "⛽"], ["Benzin", "⛽"], ["ガソリン", "⛽"], ["بنزين", "⛽"],
    ["Loyer", "🏠"], ["Rent", "🏠"], ["Miete", "🏠"], ["家賃", "🏠"], ["إيجار", "🏠"],
    ["Netflix", "🎬"], ["Spotify", "🎵"], ["Chien", "🐕"], ["Chat", "🐈"], ["Crèche", "👶"],
    ["Nounou", "👶"], ["Dentiste", "🦷"], ["Lunettes", "👓"], ["Mutuelle", "🩺"],
    ["Uber", "🚕"], ["Navigo", "🚌"], ["Vélo", "🚲"], ["Moto", "🏍️"],
    ["Voyage Japon", "🧳"], ["Apport maison", "🏡"], ["Retraite", "🏦"], ["Livret A", "🐖"],
    ["Mariage", "💍"], ["Noël", "🎄"], ["Cadeaux", "🎁"], ["Coiffeur", "💇"], ["Vêtements", "👕"],
    ["Amazon", "📦"], ["Ordinateur", "💻"], ["Tabac", "🚬"], ["Déménagement", "🚚"], ["Ski", "⛷️"],
    ["Golf", "🏌️"], ["Judo", "🥋"], ["Yoga", "🧘"], ["Salle de sport", "🏋️"], ["Camping", "⛺"],
  ])("%s → %s", (label, emoji) => {
    expect(suggestEmoji(label)).toBe(emoji);
  });

  it("ignore accents, majuscules, pluriels et mots autour", () => {
    expect(suggestEmoji("ÉLECTRICITÉ EDF")).toBe("⚡");
    expect(suggestEmoji("Abonnement Netflix")).toBe("🎬");
    expect(suggestEmoji("Courses du samedi")).toBe("🛒");
    expect(suggestEmoji("Baskets Nike")).toBe("👟");
  });
  it("ne devine rien sur un mot inconnu", () => {
    expect(suggestEmoji("Zorglub")).toBeNull();
    expect(suggestEmoji("")).toBeNull();
  });
  it("« bar » ne matche pas « barbecue »", () => {
    expect(suggestEmoji("barbecue")).not.toBe("🍺");
  });
  it("rattache l'emoji à une famille de comparaison", () => {
    expect(bucketOfEmoji("🏠")).toBe("housing");
    expect(bucketOfEmoji("⛽")).toBe("transport");
    expect(bucketOfEmoji("🏀")).toBe("recreation");
    expect(bucketOfEmoji("👕")).toBeNull();
    expect(normalizeLabel("Été")).toBe("ete");
  });
  it("le catalogue est large et sans mot-clé vide", () => {
    expect(EMOJI_CATALOG.length).toBeGreaterThan(100);
    for (const e of EMOJI_CATALOG) for (const k of e.keywords) expect(k.trim().length).toBeGreaterThan(0);
  });
});
