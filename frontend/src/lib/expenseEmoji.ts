// Emoji d'un poste de dépense, deviné depuis son nom, dans les huit langues.
//
// « Essence » tapé en français, « gas » en anglais, « Benzin » en allemand ou
// « ガソリン » en japonais donnent tous ⛽. La liste est courte à dessein : une
// cinquantaine de postes qui couvrent l'essentiel d'un budget, chacun avec ses
// mots dans chaque langue. Rien de deviné n'est imposé : la personne peut
// choisir un autre emoji dans la grille.
//
// Chaque entrée porte aussi sa FAMILLE de comparaison (`bucket`), au sens de
// la nomenclature COICOP des statistiques officielles : c'est ce qui permet de
// comparer « ton logement » ou « tes restaurants » aux moyennes nationales
// (voir spendingShares.ts), quel que soit le nom donné au poste.

export type SpendingBucket = "housing" | "food" | "transport" | "health" | "recreation" | "restaurants";

export type EmojiEntry = {
  emoji: string;
  bucket?: SpendingBucket;
  keywords: string[];
};

/** Retire accents et majuscules : « Électricité » et « electricite » se valent. */
export function normalizeLabel(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export const EMOJI_CATALOG: EmojiEntry[] = [
  { emoji: "🏠", bucket: "housing", keywords: ["loyer", "rent", "alquiler", "renda", "aluguel", "miete", "affitto", "ايجار", "إيجار", "家賃", "logement", "housing", "vivienda", "wohnung", "casa", "住宅", "hypotheque", "mortgage", "hipoteca", "hypothek", "mutuo", "رهن", "ローン"] },
  { emoji: "⚡", bucket: "housing", keywords: ["electricite", "electricity", "electricidad", "eletricidade", "strom", "elettricita", "كهرباء", "電気", "edf", "energie", "energy", "energia", "エネルギー", "طاقة"] },
  { emoji: "🔥", bucket: "housing", keywords: ["gaz", "gas", "gás", "chauffage", "heating", "calefaccion", "aquecimento", "heizung", "riscaldamento", "تدفئة", "ガス", "暖房"] },
  { emoji: "💧", bucket: "housing", keywords: ["eau", "water", "agua", "água", "wasser", "acqua", "ماء", "مياه", "水道", "水"] },
  { emoji: "📶", bucket: "housing", keywords: ["internet", "box", "fibre", "fiber", "wifi", "wlan", "إنترنت", "インターネット", "ネット"] },
  { emoji: "📱", bucket: "housing", keywords: ["telephone", "téléphone", "phone", "mobile", "forfait", "movil", "móvil", "celular", "handy", "telefono", "cellulare", "هاتف", "جوال", "携帯", "スマホ", "電話"] },
  { emoji: "🛡️", bucket: "housing", keywords: ["assurance habitation", "home insurance", "seguro hogar", "seguro casa", "hausrat", "assicurazione casa", "تأمين المنزل", "火災保険"] },
  { emoji: "🧾", bucket: "housing", keywords: ["taxe", "tax", "impot", "impôt", "impuesto", "imposto", "steuer", "tassa", "imposta", "ضريبة", "税", "charges", "copropriete", "copropriété", "condominio", "condomínio", "nebenkosten"] },
  { emoji: "🛒", bucket: "food", keywords: ["courses", "alimentation", "groceries", "grocery", "supermarche", "supermarché", "supermarket", "compra", "compras", "mercado", "supermercado", "lebensmittel", "einkauf", "spesa", "alimentari", "بقالة", "تسوق", "طعام", "食費", "スーパー", "食料品", "nourriture", "food", "comida", "essen", "cibo"] },
  { emoji: "🍎", bucket: "food", keywords: ["fruits", "legumes", "légumes", "vegetables", "verduras", "frutas", "obst", "gemuse", "gemüse", "frutta", "verdura", "فواكه", "خضار", "野菜", "果物", "marche", "marché", "market"] },
  { emoji: "🥖", bucket: "food", keywords: ["boulangerie", "pain", "bakery", "bread", "panaderia", "panadería", "padaria", "backerei", "bäckerei", "panetteria", "خبز", "パン"] },
  { emoji: "☕", bucket: "restaurants", keywords: ["cafe", "café", "coffee", "kaffee", "caffe", "caffè", "قهوة", "コーヒー", "カフェ"] },
  { emoji: "🍽️", bucket: "restaurants", keywords: ["restaurant", "resto", "restos", "sorties", "dining", "eating out", "restaurante", "restaurantes", "ristorante", "مطعم", "مطاعم", "外食", "レストラン"] },
  { emoji: "🍕", bucket: "restaurants", keywords: ["livraison", "delivery", "uber eats", "deliveroo", "pizza", "fast food", "takeaway", "a domicilio", "lieferung", "consegna", "توصيل", "出前", "デリバリー"] },
  { emoji: "🍺", bucket: "restaurants", keywords: ["bar", "bars", "biere", "bière", "beer", "cerveza", "cerveja", "bier", "birra", "apero", "apéro", "drinks", "pub", "居酒屋", "ビール"] },
  { emoji: "🚗", bucket: "transport", keywords: ["voiture", "auto", "car", "coche", "carro", "wagen", "macchina", "سيارة", "車", "自動車", "entretien", "maintenance", "garage"] },
  { emoji: "⛽", bucket: "transport", keywords: ["essence", "carburant", "gasoline", "petrol", "fuel", "gasolina", "combustible", "benzin", "kraftstoff", "benzina", "carburante", "بنزين", "وقود", "ガソリン", "燃料", "diesel", "gasoil"] },
  { emoji: "🚌", bucket: "transport", keywords: ["bus", "metro", "métro", "transport", "transports", "navigo", "pass", "transit", "transporte", "transportes", "ov", "nahverkehr", "trasporti", "مواصلات", "نقل", "交通", "電車", "バス", "定期"] },
  { emoji: "🚆", bucket: "transport", keywords: ["train", "sncf", "tgv", "rail", "tren", "comboio", "trem", "bahn", "zug", "treno", "قطار", "新幹線"] },
  { emoji: "🅿️", bucket: "transport", keywords: ["parking", "stationnement", "peage", "péage", "toll", "aparcamiento", "estacionamiento", "estacionamento", "parkplatz", "maut", "parcheggio", "pedaggio", "موقف", "駐車", "高速"] },
  { emoji: "🚲", bucket: "transport", keywords: ["velo", "vélo", "bike", "bicycle", "bici", "bicicleta", "fahrrad", "دراجة", "自転車", "trottinette", "scooter"] },
  { emoji: "✈️", bucket: "recreation", keywords: ["vacances", "voyage", "voyages", "holiday", "holidays", "vacation", "travel", "trip", "vacaciones", "viaje", "ferias", "férias", "viagem", "urlaub", "reise", "vacanze", "viaggio", "عطلة", "سفر", "旅行", "休暇", "avion", "vol", "flight"] },
  { emoji: "🏥", bucket: "health", keywords: ["sante", "santé", "health", "salud", "saude", "saúde", "gesundheit", "salute", "صحة", "医療", "健康", "medecin", "médecin", "doctor", "medico", "médico", "arzt", "dottore", "طبيب", "病院"] },
  { emoji: "💊", bucket: "health", keywords: ["pharmacie", "pharmacy", "medicament", "médicament", "medicine", "farmacia", "farmácia", "apotheke", "medikament", "صيدلية", "دواء", "薬", "薬局"] },
  { emoji: "🩺", bucket: "health", keywords: ["mutuelle", "insurance", "seguro medico", "seguro médico", "seguro saude", "krankenversicherung", "assicurazione sanitaria", "تأمين صحي", "保険"] },
  { emoji: "🦷", bucket: "health", keywords: ["dentiste", "dentist", "dentista", "zahnarzt", "أسنان", "歯医者", "歯科"] },
  { emoji: "👓", bucket: "health", keywords: ["lunettes", "opticien", "glasses", "optician", "gafas", "oculos", "óculos", "brille", "occhiali", "نظارات", "メガネ"] },
  { emoji: "🎬", bucket: "recreation", keywords: ["netflix", "streaming", "cinema", "cinéma", "movies", "film", "disney", "prime", "kino", "سينما", "映画", "動画"] },
  { emoji: "🎵", bucket: "recreation", keywords: ["spotify", "musique", "music", "musica", "música", "musik", "deezer", "موسيقى", "音楽", "concert", "concierto", "konzert", "concerto"] },
  { emoji: "🎮", bucket: "recreation", keywords: ["jeux", "jeu", "games", "gaming", "playstation", "xbox", "nintendo", "juegos", "jogos", "spiele", "giochi", "ألعاب", "ゲーム"] },
  { emoji: "📚", bucket: "recreation", keywords: ["livres", "livre", "books", "book", "libros", "livros", "bucher", "bücher", "libri", "كتب", "本", "書籍", "presse", "journal", "magazine", "kindle"] },
  { emoji: "⚽", bucket: "recreation", keywords: ["sport", "sports", "gym", "salle", "fitness", "club", "deporte", "esporte", "academia", "verein", "palestra", "رياضة", "ジム", "スポーツ", "yoga", "piscine", "pool"] },
  { emoji: "🎨", bucket: "recreation", keywords: ["loisirs", "hobby", "hobbies", "ocio", "lazer", "freizeit", "hobbys", "svago", "هوايات", "趣味", "activites", "activités", "activities"] },
  { emoji: "🎁", bucket: "recreation", keywords: ["cadeaux", "cadeau", "gifts", "gift", "regalos", "regalo", "presentes", "presente", "geschenke", "geschenk", "regali", "هدايا", "هدية", "プレゼント", "ギフト", "anniversaire", "birthday", "noel", "noël", "christmas", "navidad", "natal", "weihnachten", "natale"] },
  { emoji: "👕", keywords: ["vetements", "vêtements", "clothes", "clothing", "fashion", "mode", "ropa", "roupa", "roupas", "kleidung", "vestiti", "abbigliamento", "ملابس", "服", "衣類", "chaussures", "shoes", "zapatos", "sapatos", "schuhe", "scarpe", "أحذية", "靴"] },
  { emoji: "💇", keywords: ["coiffeur", "coiffure", "hair", "haircut", "barber", "peluqueria", "peluquería", "cabeleireiro", "friseur", "parrucchiere", "حلاق", "美容院", "理髪", "beaute", "beauté", "beauty", "belleza", "beleza", "schonheit", "schönheit", "bellezza", "تجميل", "美容", "cosmetique", "cosmétique", "cosmetics"] },
  { emoji: "🐾", keywords: ["chien", "chat", "animal", "animaux", "dog", "cat", "pet", "pets", "perro", "gato", "mascota", "cachorro", "cão", "hund", "katze", "haustier", "cane", "gatto", "animali", "كلب", "قطة", "حيوان", "犬", "猫", "ペット", "veterinaire", "vétérinaire", "vet"] },
  { emoji: "👶", keywords: ["enfant", "enfants", "bebe", "bébé", "child", "children", "kids", "baby", "nounou", "creche", "crèche", "nanny", "daycare", "nino", "niño", "niños", "hijos", "guarderia", "guardería", "filhos", "criança", "crianças", "creche", "kind", "kinder", "kita", "bambino", "bambini", "asilo", "أطفال", "طفل", "حضانة", "子供", "赤ちゃん", "保育"] },
  { emoji: "🎓", keywords: ["ecole", "école", "etudes", "études", "scolarite", "scolarité", "school", "tuition", "university", "college", "escuela", "colegio", "universidad", "escola", "faculdade", "schule", "studium", "uni", "scuola", "universita", "università", "مدرسة", "جامعة", "دراسة", "学校", "学費", "大学", "formation", "training", "cours", "course", "lessons"] },
  { emoji: "🧹", keywords: ["menage", "ménage", "femme de menage", "cleaning", "cleaner", "limpieza", "limpeza", "putzen", "reinigung", "pulizie", "تنظيف", "掃除", "家事"] },
  { emoji: "🧴", keywords: ["hygiene", "hygiène", "toiletries", "produits", "droguerie", "drogerie", "igiene", "higiene", "نظافة", "日用品", "lessive", "laundry", "pressing", "lavanderia", "wascherei", "wäscherei", "غسيل", "洗濯"] },
  { emoji: "🪑", bucket: "housing", keywords: ["meubles", "meuble", "furniture", "muebles", "moveis", "móveis", "mobel", "möbel", "mobili", "أثاث", "家具", "ikea", "decoration", "décoration", "decor", "deco", "déco", "bricolage", "diy", "travaux", "works"] },
  { emoji: "🚬", keywords: ["tabac", "cigarettes", "cigarette", "tobacco", "vape", "tabaco", "cigarrillos", "cigarros", "tabak", "zigaretten", "tabacco", "sigarette", "تبغ", "سجائر", "タバコ", "煙草"] },
  { emoji: "💳", keywords: ["credit", "crédit", "banque", "bank", "frais", "fees", "agios", "banco", "tarifas", "comisiones", "gebuhren", "gebühren", "banca", "commissioni", "بنك", "رسوم", "銀行", "手数料", "abonnement", "abonnements", "subscription", "subscriptions", "suscripcion", "suscripción", "assinatura", "assinaturas", "abo", "abbonamento", "اشتراك", "サブスク"] },
  { emoji: "💸", keywords: ["dettes", "dette", "debt", "remboursement", "repayment", "deuda", "deudas", "divida", "dívida", "schulden", "debito", "debiti", "دين", "ديون", "借金", "返済", "pension", "alimony", "pension alimentaire", "manutencao", "unterhalt", "mantenimento", "نفقة", "養育費"] },
  { emoji: "🐖", keywords: ["epargne", "épargne", "savings", "saving", "livret", "ahorro", "ahorros", "poupanca", "poupança", "sparen", "ersparnisse", "risparmio", "risparmi", "ادخار", "توفير", "貯金", "貯蓄", "precaution", "urgence", "emergency", "emergencia", "notfall", "emergenza", "طوارئ", "緊急"] },
  { emoji: "📈", keywords: ["investissement", "investissements", "bourse", "actions", "pea", "cto", "etf", "invest", "investment", "investments", "stocks", "inversion", "inversión", "inversiones", "investimento", "investimentos", "acoes", "ações", "anlage", "aktien", "investimenti", "azioni", "استثمار", "أسهم", "投資", "株", "crypto", "bitcoin"] },
  { emoji: "🏦", keywords: ["assurance vie", "life insurance", "retraite", "retirement", "pension", "per", "seguro de vida", "jubilacion", "jubilación", "aposentadoria", "previdencia", "previdência", "lebensversicherung", "rente", "altersvorsorge", "assicurazione vita", "previdenza", "تقاعد", "تأمين على الحياة", "年金", "退職", "生命保険"] },
  { emoji: "🙏", keywords: ["don", "dons", "dime", "dîme", "zakat", "offrande", "charity", "donation", "donations", "tithe", "donacion", "donación", "diezmo", "doacao", "doação", "dizimo", "dízimo", "spende", "spenden", "zehnt", "donazione", "decima", "صدقة", "زكاة", "تبرع", "寄付", "献金"] },
  { emoji: "🎉", bucket: "recreation", keywords: ["fete", "fête", "fetes", "party", "mariage", "wedding", "fiesta", "boda", "festa", "casamento", "feier", "hochzeit", "matrimonio", "حفلة", "زفاف", "パーティー", "結婚式", "evenement", "événement", "event"] },
];

/** Emoji deviné pour un nom, ou `null` si aucun mot ne correspond. */
export function suggestEmoji(label: string): string | null {
  const n = normalizeLabel(label);
  if (!n) return null;
  // Mots entiers d'abord (« bar » ne doit pas matcher « barbecue »), puis
  // inclusion pour les langues sans espaces (japonais, arabe agglutiné).
  const words = new Set(n.split(/[\s,\/\-_·.()]+/).filter(Boolean));
  for (const e of EMOJI_CATALOG) {
    for (const k of e.keywords) {
      const nk = normalizeLabel(k);
      if (nk.includes(" ") ? n.includes(nk) : words.has(nk)) return e.emoji;
    }
  }
  for (const e of EMOJI_CATALOG) {
    for (const k of e.keywords) {
      const nk = normalizeLabel(k);
      if (nk.length >= 2 && !/^[a-z]+$/.test(nk) && n.includes(nk)) return e.emoji;
    }
  }
  return null;
}

/** Famille de comparaison d'un emoji, s'il en a une. */
export function bucketOfEmoji(emoji: string | undefined): SpendingBucket | null {
  if (!emoji) return null;
  return EMOJI_CATALOG.find((e) => e.emoji === emoji)?.bucket ?? null;
}

/** La grille proposée au choix : tout le catalogue, sans doublon. */
export const EMOJI_CHOICES: string[] = [...new Set(EMOJI_CATALOG.map((e) => e.emoji))];
