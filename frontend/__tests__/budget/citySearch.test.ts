import {
  filterCitiesInCountry,
  filterCountries,
  resolveProfileCity,
  suggestCitiesGlobally,
} from "../../app/_budget/citySearch";
import { CITIES, COUNTRIES } from "../../src/constants/cities";

describe("filterCountries", () => {
  it("renvoie tous les pays sans recherche", () => {
    expect(filterCountries("")).toBe(COUNTRIES);
  });

  it("filtre sur le nom, insensible aux accents et à la casse", () => {
    const hits = filterCountries("FRANCE");
    expect(hits.some((c) => c.code === "FR")).toBe(true);
    expect(hits.length).toBeLessThan(COUNTRIES.length);
  });

  it("renvoie une liste vide quand rien ne correspond", () => {
    expect(filterCountries("zzzzzzzz")).toEqual([]);
  });
});

describe("suggestCitiesGlobally", () => {
  it("ignore les recherches de moins de 2 caractères", () => {
    expect(suggestCitiesGlobally("")).toEqual([]);
    expect(suggestCitiesGlobally("p")).toEqual([]);
  });

  it("trouve une ville par son nom, tous pays confondus", () => {
    const hits = suggestCitiesGlobally("paris");
    expect(hits.some((c) => c.name.toLowerCase().includes("paris"))).toBe(true);
  });

  it("plafonne les correspondances exactes à 12 résultats", () => {
    // "a" est trop court ; "an" matche beaucoup de villes/régions.
    expect(suggestCitiesGlobally("an").length).toBeLessThanOrEqual(12);
  });

  it("rattrape une faute de frappe via Levenshtein (max 8 résultats)", () => {
    const hits = suggestCitiesGlobally("pariss");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.length).toBeLessThanOrEqual(8);
  });

  it("ne suggère rien pour une saisie sans rapport", () => {
    expect(suggestCitiesGlobally("zzzzzzzzzzzz")).toEqual([]);
  });
});

describe("filterCitiesInCountry", () => {
  it("renvoie une liste vide sans pays sélectionné", () => {
    expect(filterCitiesInCountry("paris", null)).toEqual([]);
  });

  it("renvoie toutes les villes du pays sans recherche", () => {
    const all = filterCitiesInCountry("", "FR");
    expect(all.length).toBeGreaterThan(0);
    expect(all.every((c) => c.countryCode === "FR")).toBe(true);
  });

  it("ne sort jamais du pays sélectionné", () => {
    const hits = filterCitiesInCountry("a", "FR");
    expect(hits.every((c) => c.countryCode === "FR")).toBe(true);
  });

  it("rattrape une faute de frappe dans le pays (max 8 résultats)", () => {
    const hits = filterCitiesInCountry("pariss", "FR");
    expect(hits.length).toBeLessThanOrEqual(8);
    expect(hits.every((c) => c.countryCode === "FR")).toBe(true);
  });
});

describe("resolveProfileCity", () => {
  it("ne résout rien sans compte", () => {
    expect(resolveProfileCity(false, "Paris", "Île-de-France", "FR")).toBeNull();
  });

  it("la ville du profil bat la région et le pays", () => {
    const paris = CITIES.find((c) => c.name === "Paris");
    expect(paris).toBeDefined();
    const got = resolveProfileCity(true, "paris", undefined, "US");
    expect(got?.id).toBe(paris!.id);
  });

  it("tolère les accents et la casse dans la ville du profil", () => {
    const got = resolveProfileCity(true, "  PARIS  ", undefined, undefined);
    expect(got?.name).toBe("Paris");
  });

  it("retombe sur la ville d'indice MÉDIAN de la région", () => {
    const region = CITIES[0].region;
    const pool = [...CITIES.filter((c) => c.region === region)]
      .sort((a, b) => a.index - b.index);
    const expected = pool[Math.floor(pool.length / 2)];
    expect(resolveProfileCity(true, null, region, undefined)?.id).toBe(expected.id);
  });

  it("retombe sur la ville d'indice MÉDIAN du pays si pas de région", () => {
    const pool = [...CITIES.filter((c) => c.countryCode === "FR")]
      .sort((a, b) => a.index - b.index);
    const expected = pool[Math.floor(pool.length / 2)];
    expect(resolveProfileCity(true, null, undefined, "FR")?.id).toBe(expected.id);
  });

  it("renvoie null quand ni ville, ni région, ni pays ne matchent", () => {
    expect(resolveProfileCity(true, "zzzz", "Nulle-Part", undefined)).toBeNull();
    expect(resolveProfileCity(true, null, undefined, undefined)).toBeNull();
  });
});
