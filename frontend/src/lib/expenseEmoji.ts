// Pictogramme d'un poste, deviné depuis son nom, dans les huit langues.
//
// PRÉCISION AVANT TOUT. « basketball » doit donner 🏀, « piano » 🎹,
// « natation » 🏊, « Benzin » ⛽, « ガソリン » ⛽. Le catalogue couvre donc
// plusieurs centaines de mots : sports, loisirs, courses, transports,
// famille, banque, tech, animaux, fêtes. Il sert aussi aux espaces partagés,
// aux objectifs d'épargne et aux projets : même moteur, même précision.
//
// CE QUE FAIT LA RECHERCHE, dans l'ordre :
//   1. un mot entier du nom égal à un mot-clé (« bar » ≠ « barbecue ») ;
//   2. un mot du nom qui commence par un mot-clé, ou l'inverse, dès quatre
//      lettres (« basket » ↔ « basketball », « nager » ↔ « nage ») ;
//   3. pour les langues sans espaces (japonais, arabe agglutiné), l'inclusion.
// Les pluriels simples sont ramenés au singulier (« courses » ↔ « course »
// n'est pas concerné : « courses » est un mot-clé à part entière).
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
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export const EMOJI_CATALOG: EmojiEntry[] = [
  { emoji: "🏡", keywords: ["apport", "down payment", "achat immobilier", "house deposit", "entrada", "enganche", "eigenkapital", "anticipo casa", "دفعة أولى", "頭金", "projet immobilier", "home purchase", "acheter maison", "buy house"] },
  { emoji: "🏠", bucket: "housing", keywords: ["loyer", "rent", "alquiler", "renda", "aluguel", "miete", "affitto", "ايجار", "إيجار", "家賃", "logement", "housing", "vivienda", "wohnung", "casa", "住宅", "hypotheque", "mortgage", "hipoteca", "hypothek", "mutuo", "رهن", "ローン", "maison", "house", "home", "haus", "سكن", "家"] },
  { emoji: "🏢", bucket: "housing", keywords: ["appartement", "appart", "apartment", "flat", "apartamento", "piso", "wohnung", "appartamento", "شقة", "マンション", "アパート", "copropriete", "condo", "condominio", "condomínio", "syndic"] },
  { emoji: "⚡", bucket: "housing", keywords: ["electricite", "electricity", "electricidad", "eletricidade", "strom", "elettricita", "كهرباء", "電気", "edf", "engie", "energie", "energy", "energia", "エネルギー", "طاقة", "light", "luz"] },
  { emoji: "🔥", bucket: "housing", keywords: ["gaz", "gas", "gás", "chauffage", "heating", "calefaccion", "aquecimento", "heizung", "riscaldamento", "تدفئة", "ガス", "暖房", "fioul", "bois", "firewood", "pellets", "granules"] },
  { emoji: "💧", bucket: "housing", keywords: ["eau", "water", "agua", "água", "wasser", "acqua", "ماء", "مياه", "水道", "水"] },
  { emoji: "📶", bucket: "housing", keywords: ["internet", "box", "fibre", "fiber", "wifi", "wlan", "إنترنت", "インターネット", "ネット", "freebox", "livebox", "adsl"] },
  { emoji: "📱", bucket: "housing", keywords: ["telephone", "phone", "mobile", "forfait", "movil", "celular", "handy", "telefono", "cellulare", "هاتف", "جوال", "携帯", "スマホ", "電話", "sim", "orange", "sfr", "bouygues", "free mobile"] },
  { emoji: "🛡️", bucket: "housing", keywords: ["assurance habitation", "home insurance", "seguro hogar", "seguro casa", "hausrat", "assicurazione casa", "تأمين المنزل", "火災保険", "assurance", "insurance", "seguro", "versicherung", "assicurazione", "تأمين", "保険"] },
  { emoji: "🧾", bucket: "housing", keywords: ["taxe", "tax", "impot", "impuesto", "imposto", "steuer", "tassa", "imposta", "ضريبة", "税", "charges", "taxe fonciere", "taxe habitation", "council tax", "irpf", "ir", "income tax", "abgaben", "nebenkosten"] },
  { emoji: "🪑", bucket: "housing", keywords: ["meuble", "meubles", "furniture", "muebles", "moveis", "móveis", "mobel", "möbel", "mobili", "أثاث", "家具", "ikea", "decoration", "decor", "deco", "travaux", "works", "bricolage", "diy", "renovation", "reforma", "umbau", "ristrutturazione", "تجديد", "リフォーム", "jardin", "garden", "jardinage", "gardening"] },
  { emoji: "🧹", bucket: "housing", keywords: ["menage", "cleaning", "cleaner", "limpieza", "limpeza", "putzen", "reinigung", "pulizie", "تنظيف", "掃除", "家事", "femme de menage", "aide menagere"] },
  { emoji: "🔧", bucket: "housing", keywords: ["plombier", "plumber", "reparation", "repair", "depannage", "fontanero", "encanador", "klempner", "idraulico", "سباك", "修理", "electricien", "electrician", "bricoleur", "handyman"] },
  { emoji: "🛒", bucket: "food", keywords: ["courses", "alimentation", "groceries", "grocery", "supermarche", "supermarket", "compra", "compras", "mercado", "supermercado", "lebensmittel", "einkauf", "spesa", "alimentari", "بقالة", "تسوق", "طعام", "食費", "スーパー", "食料品", "nourriture", "food", "comida", "essen", "cibo", "carrefour", "leclerc", "lidl", "aldi", "auchan", "monoprix", "intermarche", "walmart", "tesco", "costco", "picard"] },
  { emoji: "🍎", bucket: "food", keywords: ["fruits", "fruit", "legumes", "vegetables", "verduras", "frutas", "obst", "gemuse", "frutta", "verdura", "فواكه", "خضار", "野菜", "果物", "marche", "market", "primeur", "bio", "organic", "organico", "farmer"] },
  { emoji: "🥖", bucket: "food", keywords: ["boulangerie", "pain", "bakery", "bread", "panaderia", "padaria", "backerei", "panetteria", "خبز", "パン", "croissant", "patisserie", "pastry", "pasteleria", "konditorei", "pasticceria", "ケーキ"] },
  { emoji: "🥩", bucket: "food", keywords: ["boucherie", "viande", "butcher", "meat", "carniceria", "carne", "talho", "metzger", "fleisch", "macelleria", "لحم", "肉", "poisson", "fish", "pescado", "peixe", "fisch", "pesce", "سمك", "魚", "charcuterie"] },
  { emoji: "🍼", bucket: "food", keywords: ["lait", "milk", "leche", "leite", "milch", "latte", "حليب", "牛乳", "lait bebe", "formula", "biberon", "couches", "diapers", "panales", "pañales", "fraldas", "windeln", "pannolini", "حفاضات", "おむつ"] },
  { emoji: "☕", bucket: "restaurants", keywords: ["cafe", "coffee", "kaffee", "caffe", "قهوة", "コーヒー", "カフェ", "starbucks", "the", "tea", "chai", "شاي", "お茶"] },
  { emoji: "🍽️", bucket: "restaurants", keywords: ["restaurant", "resto", "restos", "sorties", "dining", "eating out", "restaurante", "restaurantes", "ristorante", "مطعم", "مطاعم", "外食", "レストラン", "dejeuner", "lunch", "diner", "dinner", "cantine", "canteen", "comedor", "cantina", "mensa", "食堂"] },
  { emoji: "🍕", bucket: "restaurants", keywords: ["livraison", "delivery", "uber eats", "ubereats", "deliveroo", "just eat", "pizza", "fast food", "fastfood", "takeaway", "a domicilio", "lieferung", "consegna", "توصيل", "出前", "デリバリー", "mcdo", "mcdonalds", "burger", "kebab", "sushi", "tacos"] },
  { emoji: "🍺", bucket: "restaurants", keywords: ["bar", "bars", "biere", "beer", "cerveza", "cerveja", "bier", "birra", "apero", "drinks", "pub", "居酒屋", "ビール", "vin", "wine", "vino", "wein", "نبيذ", "ワイン", "cocktail", "boite", "club", "nightclub", "discoteca", "disco", "ナイトクラブ"] },
  { emoji: "🍫", bucket: "food", keywords: ["chocolat", "chocolate", "bonbons", "candy", "sweets", "dulces", "doces", "susses", "dolci", "حلويات", "お菓子", "snack", "snacks", "gouter"] },
  { emoji: "🚗", bucket: "transport", keywords: ["voiture", "auto", "car", "coche", "carro", "wagen", "macchina", "سيارة", "車", "自動車", "entretien voiture", "maintenance", "garage", "controle technique", "mot", "revision", "pneus", "tires", "tyres", "neumaticos", "reifen", "gomme"] },
  { emoji: "⛽", bucket: "transport", keywords: ["essence", "carburant", "gasoline", "petrol", "fuel", "gasolina", "combustible", "benzin", "kraftstoff", "benzina", "carburante", "بنزين", "وقود", "ガソリン", "燃料", "diesel", "gasoil", "gazole", "sans plomb", "recharge", "charging"] },
  { emoji: "🚌", bucket: "transport", keywords: ["bus", "metro", "subway", "tube", "transport", "transports", "navigo", "pass navigo", "transit", "transporte", "transportes", "ov", "nahverkehr", "trasporti", "مواصلات", "نقل", "交通", "電車", "バス", "定期", "tram", "tramway", "ratp", "tcl", "abonnement transport", "monthly pass"] },
  { emoji: "🚆", bucket: "transport", keywords: ["train", "sncf", "tgv", "ter", "rail", "tren", "comboio", "trem", "bahn", "zug", "deutsche bahn", "treno", "قطار", "新幹線", "eurostar", "ouigo", "interrail"] },
  { emoji: "🅿️", bucket: "transport", keywords: ["parking", "stationnement", "peage", "toll", "aparcamiento", "estacionamiento", "estacionamento", "parkplatz", "maut", "parcheggio", "pedaggio", "موقف", "駐車", "高速", "autoroute", "highway", "vignette"] },
  { emoji: "🚲", bucket: "transport", keywords: ["velo", "bike", "bicycle", "bici", "bicicleta", "fahrrad", "دراجة", "自転車", "velib", "trottinette", "scooter", "patinete", "roller", "monopattino", "سكوتر", "キックボード"] },
  { emoji: "🏍️", bucket: "transport", keywords: ["moto", "motorcycle", "motorbike", "motocicleta", "motorrad", "motocicletta", "دراجة نارية", "バイク", "scooter 125", "vespa"] },
  { emoji: "🚕", bucket: "transport", keywords: ["taxi", "uber", "bolt", "lyft", "vtc", "cabify", "didi", "grab", "タクシー", "تاكسي", "cab"] },
  { emoji: "✈️", bucket: "recreation", keywords: ["avion", "vol", "flight", "flights", "plane", "vuelo", "voo", "flug", "volo", "طيران", "飛行機", "航空券", "ryanair", "easyjet", "air france", "billet avion"] },
  { emoji: "🧳", bucket: "recreation", keywords: ["vacances", "voyage", "voyages", "holiday", "holidays", "vacation", "travel", "trip", "vacaciones", "viaje", "ferias", "férias", "viagem", "urlaub", "reise", "vacanze", "viaggio", "عطلة", "سفر", "旅行", "休暇", "week-end", "weekend", "escapade", "getaway"] },
  { emoji: "🏨", bucket: "recreation", keywords: ["hotel", "hôtel", "airbnb", "booking", "hostel", "auberge", "alojamiento", "hospedagem", "unterkunft", "albergo", "فندق", "ホテル", "宿泊", "gite"] },
  { emoji: "🏥", bucket: "health", keywords: ["sante", "health", "salud", "saude", "saúde", "gesundheit", "salute", "صحة", "医療", "健康", "medecin", "doctor", "medico", "médico", "arzt", "dottore", "طبيب", "病院", "hopital", "hospital", "clinique", "clinic", "consultation"] },
  { emoji: "💊", bucket: "health", keywords: ["pharmacie", "pharmacy", "medicament", "medicaments", "medicine", "meds", "farmacia", "farmácia", "apotheke", "medikament", "صيدلية", "دواء", "薬", "薬局", "vitamines", "vitamins", "complements"] },
  { emoji: "🩺", bucket: "health", keywords: ["mutuelle", "complementaire", "health insurance", "seguro medico", "seguro saude", "krankenversicherung", "krankenkasse", "assicurazione sanitaria", "تأمين صحي", "健康保険", "lamal", "obamacare", "nhs", "medicare"] },
  { emoji: "🦷", bucket: "health", keywords: ["dentiste", "dentist", "dentista", "zahnarzt", "أسنان", "歯医者", "歯科", "orthodontiste", "orthodontist", "appareil dentaire", "braces"] },
  { emoji: "👓", bucket: "health", keywords: ["lunettes", "opticien", "glasses", "optician", "optique", "gafas", "oculos", "óculos", "brille", "occhiali", "نظارات", "メガネ", "lentilles", "contacts", "lenses", "lentes"] },
  { emoji: "🧠", bucket: "health", keywords: ["psy", "psychologue", "therapie", "therapy", "therapist", "psychologist", "psicologo", "psicólogo", "terapia", "psychologe", "psicologa", "نفسي", "カウンセリング", "セラピー", "osteo", "osteopathe", "kine", "physio", "physiotherapy", "fisioterapia", "physiotherapie"] },
  { emoji: "🧘", bucket: "health", keywords: ["yoga", "pilates", "meditation", "meditación", "meditação", "meditazione", "تأمل", "瞑想", "ヨガ", "bien-etre", "wellness", "wellbeing", "spa", "massage", "masaje", "massagem", "massaggio", "مساج", "マッサージ", "sauna"] },
  { emoji: "👟", keywords: ["chaussures", "shoes", "baskets", "sneakers", "zapatos", "zapatillas", "sapatos", "tenis", "schuhe", "scarpe", "أحذية", "靴", "スニーカー", "nike", "adidas"] },
  { emoji: "🏀", bucket: "recreation", keywords: ["basket", "basketball", "baloncesto", "basquete", "バスケ", "バスケットボール", "كرة السلة"] },
  { emoji: "⚽", bucket: "recreation", keywords: ["foot", "football", "soccer", "futbol", "fútbol", "futebol", "fussball", "fußball", "calcio", "كرة القدم", "サッカー", "五人制", "futsal"] },
  { emoji: "🎾", bucket: "recreation", keywords: ["tennis", "tenis", "ténis", "テニス", "تنس", "padel", "paddle", "badminton", "squash", "バドミントン"] },
  { emoji: "🏊", bucket: "recreation", keywords: ["natation", "nage", "piscine", "swimming", "swim", "pool", "natacion", "natación", "natação", "piscina", "schwimmen", "schwimmbad", "nuoto", "سباحة", "水泳", "プール", "aquagym", "surf", "surfing"] },
  { emoji: "🏃", bucket: "recreation", keywords: ["course", "running", "run", "jogging", "trail", "marathon", "correr", "corrida", "laufen", "joggen", "corsa", "جري", "ランニング", "マラソン", "athletisme", "athletics"] },
  { emoji: "🏋️", bucket: "recreation", keywords: ["gym", "salle", "salle de sport", "fitness", "muscu", "musculation", "workout", "crossfit", "gimnasio", "academia", "fitnessstudio", "palestra", "نادي رياضي", "ジム", "筋トレ", "basic fit", "basic-fit", "planet fitness", "peloton"] },
  { emoji: "🚴", bucket: "recreation", keywords: ["cyclisme", "cycling", "vtt", "mountain bike", "ciclismo", "radsport", "بركوب الدراجات", "サイクリング", "spinning"] },
  { emoji: "⛷️", bucket: "recreation", keywords: ["ski", "skiing", "snowboard", "esqui", "esquí", "esqui", "skifahren", "sci", "تزلج", "スキー", "スノボ", "forfait ski", "ski pass", "montagne", "mountain"] },
  { emoji: "🥋", bucket: "recreation", keywords: ["judo", "karate", "karaté", "boxe", "boxing", "mma", "taekwondo", "kung fu", "arts martiaux", "martial arts", "artes marciales", "kampfsport", "arti marziali", "ملاكمة", "柔道", "空手", "ボクシング", "escrime", "fencing"] },
  { emoji: "🏌️", bucket: "recreation", keywords: ["golf", "ゴルフ", "غولف", "green fee"] },
  { emoji: "🧗", bucket: "recreation", keywords: ["escalade", "climbing", "bloc", "bouldering", "escalada", "klettern", "arrampicata", "تسلق", "クライミング", "ボルダリング", "randonnee", "hiking", "rando", "senderismo", "caminhada", "wandern", "trekking", "escursione", "ハイキング", "登山"] },
  { emoji: "🏇", bucket: "recreation", keywords: ["equitation", "cheval", "horse", "riding", "equitacion", "equitación", "equitação", "cavalo", "reiten", "equitazione", "cavallo", "ركوب الخيل", "乗馬"] },
  { emoji: "⛳", bucket: "recreation", keywords: ["sport", "sports", "deporte", "esporte", "verein", "club sportif", "licence", "license", "abonnement sport", "スポーツ", "رياضة"] },
  { emoji: "🎿", bucket: "recreation", keywords: ["patinage", "skating", "ice skating", "hockey", "patinaje", "patinação", "eislaufen", "pattinaggio", "تزلج على الجليد", "スケート", "ホッケー"] },
  { emoji: "🏐", bucket: "recreation", keywords: ["volley", "volleyball", "voleibol", "volei", "vôlei", "pallavolo", "バレー", "バレーボール", "الكرة الطائرة", "handball", "hand", "balonmano", "handebol", "pallamano", "ハンドボール", "rugby", "ラグビー"] },
  { emoji: "🎳", bucket: "recreation", keywords: ["bowling", "boliche", "ボウリング", "بولينغ", "billard", "billiards", "pool table", "laser game", "escape game", "karting", "paintball"] },
  { emoji: "🎬", bucket: "recreation", keywords: ["netflix", "streaming", "cinema", "cinéma", "movies", "film", "films", "disney", "disney+", "prime video", "canal", "canal+", "hbo", "apple tv", "kino", "سينما", "映画", "動画", "ugc", "pathe", "mk2"] },
  { emoji: "🎵", bucket: "recreation", keywords: ["spotify", "musique", "music", "musica", "música", "musik", "deezer", "apple music", "youtube music", "موسيقى", "音楽", "concert", "concierto", "konzert", "concerto", "festival", "live"] },
  { emoji: "🎸", bucket: "recreation", keywords: ["guitare", "guitar", "guitarra", "gitarre", "chitarra", "غيتار", "ギター", "basse", "bass"] },
  { emoji: "🎹", bucket: "recreation", keywords: ["piano", "clavier", "keyboard", "teclado", "klavier", "pianoforte", "بيانو", "ピアノ", "solfege", "conservatoire", "music lessons", "cours de musique", "clases de musica"] },
  { emoji: "🎮", bucket: "recreation", keywords: ["jeux", "jeu", "jeux video", "games", "gaming", "video games", "playstation", "ps5", "xbox", "nintendo", "switch", "steam", "juegos", "videojuegos", "jogos", "spiele", "videospiele", "giochi", "videogiochi", "ألعاب", "ゲーム", "twitch", "fortnite"] },
  { emoji: "📚", bucket: "recreation", keywords: ["livres", "livre", "books", "book", "libros", "livros", "bucher", "bücher", "libri", "كتب", "本", "書籍", "presse", "journal", "magazine", "kindle", "audible", "fnac", "librairie", "bookshop", "bibliotheque", "library", "manga", "bd", "comics"] },
  { emoji: "🎨", bucket: "recreation", keywords: ["loisirs", "hobby", "hobbies", "ocio", "lazer", "freizeit", "hobbys", "svago", "هوايات", "趣味", "activites", "activities", "peinture", "painting", "dessin", "drawing", "art", "arte", "kunst", "atelier", "poterie", "pottery", "couture", "sewing", "tricot", "knitting", "photo", "photography", "fotografia", "fotografie"] },
  { emoji: "🎭", bucket: "recreation", keywords: ["theatre", "théâtre", "theater", "teatro", "مسرح", "演劇", "opera", "ópera", "ballet", "danse", "dance", "baile", "dança", "tanz", "danza", "رقص", "ダンス", "spectacle", "show", "musee", "museum", "museo", "متحف", "博物館", "exposition", "exhibition"] },
  { emoji: "🎲", bucket: "recreation", keywords: ["jeux de societe", "board games", "juegos de mesa", "jogos de tabuleiro", "brettspiele", "giochi da tavolo", "ボードゲーム", "puzzle", "cartes", "cards", "poker", "echecs", "chess", "ajedrez", "xadrez", "schach", "scacchi", "شطرنج", "将棋", "囲碁"] },
  { emoji: "🎣", bucket: "recreation", keywords: ["peche", "fishing", "pesca", "angeln", "صيد", "釣り", "chasse", "hunting", "caza", "caça", "jagd", "caccia"] },
  { emoji: "📷", bucket: "recreation", keywords: ["camera", "appareil photo", "photographie", "objectif", "lens", "gopro", "drone", "カメラ", "كاميرا"] },
  { emoji: "🎪", bucket: "recreation", keywords: ["parc", "parc d'attractions", "theme park", "disneyland", "parque", "freizeitpark", "parco", "遊園地", "ملاهي", "zoo", "aquarium", "cirque", "circus", "fete foraine", "funfair"] },
  { emoji: "🎁", bucket: "recreation", keywords: ["cadeaux", "cadeau", "gifts", "gift", "regalos", "regalo", "presentes", "presente", "geschenke", "geschenk", "regali", "هدايا", "هدية", "プレゼント", "ギフト"] },
  { emoji: "🎂", bucket: "recreation", keywords: ["anniversaire", "birthday", "cumpleanos", "cumpleaños", "aniversario", "aniversário", "geburtstag", "compleanno", "عيد ميلاد", "誕生日"] },
  { emoji: "🎄", bucket: "recreation", keywords: ["noel", "noël", "christmas", "navidad", "natal", "weihnachten", "natale", "عيد الميلاد", "クリスマス", "fetes", "holidays season"] },
  { emoji: "🎉", bucket: "recreation", keywords: ["fete", "fêtes", "party", "fiesta", "festa", "feier", "حفلة", "パーティー", "evenement", "event", "celebration", "nouvel an", "new year", "reveillon", "halloween", "paques", "easter"] },
  { emoji: "💍", bucket: "recreation", keywords: ["mariage", "wedding", "boda", "casamento", "hochzeit", "matrimonio", "زفاف", "結婚式", "fiancailles", "engagement", "bague", "ring", "alliance"] },
  { emoji: "🕌", bucket: "recreation", keywords: ["ramadan", "eid", "aid", "رمضان", "عيد", "kippour", "hanoukka", "hanukkah", "diwali", "paque", "pessah"] },
  { emoji: "👕", keywords: ["vetements", "vêtements", "vetement", "clothes", "clothing", "fashion", "mode", "ropa", "roupa", "roupas", "kleidung", "vestiti", "abbigliamento", "ملابس", "服", "衣類", "zara", "h&m", "uniqlo", "primark", "shein", "vinted"] },
  { emoji: "👜", keywords: ["sac", "bag", "handbag", "bolso", "bolsa", "tasche", "borsa", "حقيبة", "バッグ", "bijoux", "jewelry", "jewellery", "joyas", "joias", "schmuck", "gioielli", "مجوهرات", "アクセサリー", "montre", "watch", "reloj", "relogio", "uhr", "orologio", "ساعة", "時計"] },
  { emoji: "💇", keywords: ["coiffeur", "coiffure", "hair", "haircut", "barber", "barbier", "peluqueria", "peluquería", "cabeleireiro", "barbearia", "friseur", "parrucchiere", "barbiere", "حلاق", "美容院", "理髪", "美容室"] },
  { emoji: "💄", keywords: ["beaute", "beauté", "beauty", "maquillage", "makeup", "belleza", "beleza", "schonheit", "schönheit", "bellezza", "تجميل", "美容", "cosmetique", "cosmetics", "cosmetica", "kosmetik", "parfum", "perfume", "sephora", "manucure", "nails", "ongles", "epilation", "waxing", "esthetique", "esthéticienne"] },
  { emoji: "🧴", keywords: ["hygiene", "hygiène", "toiletries", "droguerie", "drogerie", "igiene", "higiene", "نظافة", "日用品", "lessive", "laundry", "pressing", "dry cleaning", "lavanderia", "wascherei", "wäscherei", "غسيل", "洗濯", "クリーニング", "produits menagers", "cleaning products", "papier toilette"] },
  { emoji: "🐕", keywords: ["chien", "dog", "perro", "cachorro", "cão", "hund", "cane", "كلب", "犬", "croquettes", "kibble", "dog food", "toilettage", "grooming"] },
  { emoji: "🐈", keywords: ["chat", "cat", "gato", "katze", "gatto", "قطة", "猫", "litiere", "litter"] },
  { emoji: "🐾", keywords: ["animal", "animaux", "pet", "pets", "mascota", "mascotas", "haustier", "animali", "حيوان", "ペット", "veterinaire", "vétérinaire", "vet", "veterinario", "veterinário", "tierarzt", "بيطري", "動物病院", "lapin", "rabbit", "hamster", "poisson rouge", "oiseau", "bird"] },
  { emoji: "🐎", keywords: ["cheval", "horse", "pension cheval", "livery", "caballo", "cavalo", "pferd", "cavallo", "حصان", "馬"] },
  { emoji: "👶", keywords: ["enfant", "enfants", "bebe", "bébé", "child", "children", "kids", "baby", "nounou", "creche", "crèche", "nanny", "daycare", "nino", "niño", "niños", "hijos", "guarderia", "guardería", "filhos", "criança", "crianças", "kind", "kinder", "kita", "tagesmutter", "bambino", "bambini", "asilo", "أطفال", "طفل", "حضانة", "子供", "赤ちゃん", "保育", "garde", "babysitter", "babysitting", "assistante maternelle"] },
  { emoji: "🎓", keywords: ["ecole", "école", "etudes", "études", "scolarite", "scolarité", "school", "tuition", "university", "college", "escuela", "colegio", "universidad", "escola", "faculdade", "schule", "studium", "uni", "scuola", "universita", "università", "مدرسة", "جامعة", "دراسة", "学校", "学費", "大学", "formation", "training", "cours", "course", "courses particulieres", "lessons", "tutoring", "soutien scolaire", "fournitures", "school supplies", "cantine scolaire", "frais de scolarite"] },
  { emoji: "🎒", keywords: ["periscolaire", "garderie", "centre aere", "colonie", "summer camp", "camp", "activites enfants", "kids activities", "actividades extraescolares", "atividades", "nachmittagsbetreuung", "doposcuola", "学童", "塾", "juku"] },
  { emoji: "👵", keywords: ["parents", "grands-parents", "grandparents", "abuelos", "avos", "avós", "grosseltern", "nonni", "أجداد", "祖父母", "ehpad", "maison de retraite", "nursing home", "residencia", "altersheim", "casa di riposo", "aide parents", "famille", "family", "familia", "familie", "famiglia", "عائلة", "家族"] },
  { emoji: "💑", keywords: ["couple", "conjoint", "partner", "pareja", "casal", "paar", "coppia", "زوج", "夫婦", "date", "rendez-vous", "saint valentin", "valentine"] },
  { emoji: "💳", keywords: ["credit", "crédit", "banque", "bank", "frais", "fees", "agios", "banco", "tarifas", "comisiones", "gebuhren", "gebühren", "banca", "commissioni", "بنك", "رسوم", "銀行", "手数料", "carte", "card", "abonnement", "abonnements", "subscription", "subscriptions", "suscripcion", "suscripción", "assinatura", "assinaturas", "abo", "abbonamento", "اشتراك", "サブスク", "revolut", "n26", "boursorama", "paypal"] },
  { emoji: "💸", keywords: ["dettes", "dette", "debt", "remboursement", "repayment", "deuda", "deudas", "divida", "dívida", "schulden", "debito", "debiti", "دين", "ديون", "借金", "返済", "pension alimentaire", "alimony", "child support", "manutencao", "unterhalt", "mantenimento", "نفقة", "養育費", "amende", "fine", "pv", "contravention", "multa"] },
  { emoji: "🚙", bucket: "transport", keywords: ["credit auto", "car loan", "leasing", "loa", "lld", "prestamo coche", "financiamento carro", "autokredit", "finanziamento auto", "قرض سيارة", "カーローン"] },
  { emoji: "🐖", keywords: ["epargne", "épargne", "savings", "saving", "livret", "livret a", "ldds", "lep", "ahorro", "ahorros", "poupanca", "poupança", "sparen", "ersparnisse", "sparbuch", "risparmio", "risparmi", "ادخار", "توفير", "貯金", "貯蓄", "precaution", "urgence", "emergency", "emergencia", "notfall", "emergenza", "طوارئ", "緊急", "matelas", "cushion", "fonds"] },
  { emoji: "📈", keywords: ["investissement", "investissements", "bourse", "actions", "pea", "cto", "etf", "invest", "investment", "investments", "stocks", "inversion", "inversión", "inversiones", "investimento", "investimentos", "acoes", "ações", "anlage", "aktien", "investimenti", "azioni", "استثمار", "أسهم", "投資", "株", "crypto", "bitcoin", "ethereum", "scpi", "trade republic", "degiro"] },
  { emoji: "🏦", keywords: ["assurance vie", "life insurance", "retraite", "retirement", "pension", "per", "seguro de vida", "jubilacion", "jubilación", "aposentadoria", "previdencia", "previdência", "lebensversicherung", "rente", "altersvorsorge", "assicurazione vita", "previdenza", "تقاعد", "تأمين على الحياة", "年金", "退職", "生命保険", "401k", "ira", "isa"] },
  { emoji: "🙏", keywords: ["don", "dons", "dime", "dîme", "zakat", "offrande", "charity", "donation", "donations", "tithe", "donacion", "donación", "diezmo", "doacao", "doação", "dizimo", "dízimo", "spende", "spenden", "zehnt", "donazione", "decima", "صدقة", "زكاة", "تبرع", "寄付", "献金", "eglise", "church", "iglesia", "igreja", "kirche", "chiesa", "كنيسة", "教会", "mosquee", "mosque", "مسجد", "association", "ong", "ngo", "restos du coeur", "croix rouge", "red cross", "unicef"] },
  { emoji: "💻", keywords: ["ordinateur", "pc", "laptop", "mac", "macbook", "computer", "ordenador", "computador", "notebook", "rechner", "コンピュータ", "パソコン", "حاسوب", "informatique", "it", "logiciel", "software", "licence", "adobe", "microsoft", "office", "icloud", "google one", "dropbox", "chatgpt", "openai", "claude", "github"] },
  { emoji: "📺", keywords: ["tele", "télé", "tv", "television", "télévision", "televisor", "fernseher", "televisione", "تلفاز", "テレビ", "redevance", "licence fee", "canal sat", "sky", "home cinema"] },
  { emoji: "🎧", keywords: ["casque", "headphones", "ecouteurs", "earbuds", "airpods", "auriculares", "fones", "kopfhorer", "kopfhörer", "cuffie", "سماعات", "イヤホン", "enceinte", "speaker", "sonos"] },
  { emoji: "📦", keywords: ["amazon", "colis", "package", "commande", "order", "pedido", "encomenda", "bestellung", "ordine", "طلب", "注文", "aliexpress", "temu", "cdiscount", "ebay", "achats en ligne", "online shopping", "compras online"] },
  { emoji: "🚬", keywords: ["tabac", "cigarettes", "cigarette", "tobacco", "vape", "cigarette electronique", "e-liquide", "tabaco", "cigarrillos", "cigarros", "tabak", "zigaretten", "tabacco", "sigarette", "تبغ", "سجائر", "タバコ", "煙草"] },
  { emoji: "🎰", keywords: ["loto", "lottery", "paris sportifs", "betting", "bets", "fdj", "pmu", "casino", "loteria", "lotería", "apuestas", "apostas", "lotto", "wetten", "scommesse", "يانصيب", "宝くじ", "競馬", "パチンコ"] },
  { emoji: "🧺", keywords: ["pressing", "blanchisserie", "laverie", "laundromat", "lavanderia", "waschsalon", "lavanderia a gettoni", "مغسلة", "コインランドリー", "repassage", "ironing"] },
  { emoji: "🪪", keywords: ["papiers", "passeport", "passport", "carte identite", "id card", "visa", "pasaporte", "passaporte", "reisepass", "passaporto", "جواز", "パスポート", "permis", "driving licence", "driver license", "licencia", "carta", "fuhrerschein", "führerschein", "patente", "رخصة", "免許", "timbre fiscal", "stamp"] },
  { emoji: "⚖️", keywords: ["avocat", "lawyer", "notaire", "notary", "abogado", "advogado", "anwalt", "notar", "avvocato", "notaio", "محامي", "弁護士", "juridique", "legal", "proces", "lawsuit", "comptable", "accountant", "contador", "contabilista", "steuerberater", "commercialista", "محاسب", "税理士"] },
  { emoji: "🌐", keywords: ["vpn", "nom de domaine", "domain", "hebergement", "hosting", "serveur", "server", "cloud", "aws", "ovh", "site web", "website", "dominio", "hospedagem", "domäne", "dominio web", "نطاق", "ドメイン", "サーバー"] },
  { emoji: "🧒", keywords: ["argent de poche", "pocket money", "allowance", "paga", "mesada", "taschengeld", "paghetta", "مصروف", "お小遣い"] },
  { emoji: "🛍️", keywords: ["shopping", "achats", "purchases", "compras", "einkaufen", "acquisti", "تسوق عام", "買い物", "soldes", "sales", "rebajas", "promocoes", "schnappchen", "saldi", "セール", "تخفيضات"] },
  { emoji: "🎁", bucket: "recreation", keywords: ["souvenirs", "souvenir", "recuerdos", "lembrancas", "lembranças", "andenken", "お土産", "تذكارات"] },
  { emoji: "🚚", keywords: ["demenagement", "déménagement", "moving", "move", "mudanza", "mudança", "umzug", "trasloco", "نقل الأثاث", "引っ越し", "garde-meuble", "storage", "self storage", "box de stockage", "trastero", "lager", "deposito"] },
  { emoji: "🌱", keywords: ["plantes", "plants", "fleurs", "flowers", "flores", "pflanzen", "blumen", "piante", "fiori", "نباتات", "زهور", "植物", "花", "fleuriste", "florist", "jardinerie", "garden center", "vivero", "gartencenter", "vivaio"] },
  { emoji: "🎤", keywords: ["karaoke", "karaoké", "chant", "singing", "canto", "gesang", "カラオケ", "كاريوكي", "micro", "microphone", "podcast"] },
  { emoji: "🏖️", bucket: "recreation", keywords: ["plage", "beach", "playa", "praia", "strand", "spiaggia", "شاطئ", "ビーチ", "海", "mer", "sea", "ete", "summer", "verano", "verão", "sommer", "estate", "صيف", "夏"] },
  { emoji: "⛺", bucket: "recreation", keywords: ["camping", "tente", "tent", "caravane", "caravan", "camper", "van", "camping-car", "motorhome", "carpa", "barraca", "zelt", "wohnmobil", "tenda", "تخييم", "キャンプ", "bivouac", "glamping"] },
  { emoji: "🚢", bucket: "recreation", keywords: ["croisiere", "croisière", "cruise", "bateau", "boat", "ferry", "crucero", "barco", "cruzeiro", "kreuzfahrt", "schiff", "crociera", "barca", "رحلة بحرية", "クルーズ", "船", "voile", "sailing", "kayak", "paddle", "plongee", "diving", "buceo", "mergulho", "tauchen", "immersione", "غوص", "ダイビング"] },
];

const SPLIT = /[\s,\/\-_·.()'’!?:;]+/;
const LATIN = /^[a-z0-9&+ ]+$/;

function singular(w: string): string {
  return w.length > 4 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w;
}

/** Emoji deviné pour un nom, ou `null` si aucun mot ne correspond. */
export function suggestEmoji(label: string): string | null {
  const n = normalizeLabel(label);
  if (!n) return null;
  const rawWords = n.split(SPLIT).filter(Boolean);
  const words = new Set([...rawWords, ...rawWords.map(singular)]);

  // 1. mot entier (ou expression entière)
  for (const e of EMOJI_CATALOG) {
    for (const k of e.keywords) {
      const nk = normalizeLabel(k);
      if (nk.includes(" ") ? n.includes(nk) : words.has(nk)) return e.emoji;
    }
  }
  // 2. préfixe, dès quatre lettres, dans les deux sens
  for (const e of EMOJI_CATALOG) {
    for (const k of e.keywords) {
      const nk = normalizeLabel(k);
      if (nk.includes(" ") || !LATIN.test(nk) || nk.length < 4) continue;
      for (const w of words) {
        if (w.length >= 4 && (w.startsWith(nk) || nk.startsWith(w))) return e.emoji;
      }
    }
  }
  // 3. langues sans espaces : inclusion
  for (const e of EMOJI_CATALOG) {
    for (const k of e.keywords) {
      const nk = normalizeLabel(k);
      if (nk.length >= 2 && !LATIN.test(nk) && n.includes(nk)) return e.emoji;
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
