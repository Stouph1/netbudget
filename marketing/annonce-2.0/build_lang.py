#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Versions localisées de l'annonce 2.0 (es, pt, de, it, ar, ja).

Reprend video/index.html, traduit les textes, passe les montants dans la devise de la langue
(valeurs lues sur l'écran Budget des plans enregistrés) et remplace les plans par ceux de
rec-<lang>/ (tools/record_clips_lang.sh <lang>).

    python3 marketing/annonce-2.0/build_lang.py <lang>           # compositions + check
    python3 marketing/annonce-2.0/build_lang.py <lang> render    # + rendus compressés, copiés dans googleads/2.0/videos

Polices : Manrope ne couvre que le latin. L'arabe prend Noto Sans Arabic (fonts-extra/), le japonais
Noto Sans JP réduit aux caractères du texte (téléchargé depuis Google Fonts au moment du build).
"""
import os, re, shutil, subprocess, sys, pathlib, urllib.request, urllib.parse
HERE = pathlib.Path(__file__).resolve().parent
SRC = HERE / "video"; EXTRA = HERE / "fonts-extra"
ADS = HERE.parent / "googleads" / "2.0" / "videos"
CLIPS = ["budget", "revenu", "reperes", "projet", "coach", "espaces"]

# Montants de l'accroche : net du mois, dépenses, reste (écran Budget de rec-<lang>/budget-top.png).
# EUR : même format que l'app et que la version française (« 2 567,20 € »).
MONEY = {
    "eur": dict(inc=2567.2, exp=2346, left="221,20 €", unknown="? €",
                fmt='const fr = (v) => v.toFixed(2).replace(".", ",").replace(/\\B(?=(\\d{3})+(?!\\d))/g, " ") + " €";\n',
                scr='let s = ""; for (let i = 0; i < 5; i++) s += Math.floor(rnd(k * 7 + i) * 10); return s.slice(0, 3) + "," + s.slice(3) + " €";',
                zero="0,00 €"),
    # JPY : sans décimales, symbole devant, virgule des milliers (format de l'app)
    "jpy": dict(inc=410752, exp=375000, left="¥35,752", unknown="¥?",
                fmt='const fr = (v) => "¥" + Math.round(v).toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g, ",");\n',
                scr='let s = ""; for (let i = 0; i < 5; i++) s += Math.floor(rnd(k * 7 + i) * 10); return "¥" + s.slice(0, 2) + "," + s.slice(2);',
                zero="¥0"),
    # MAD : l'app écrit « 26 955,60 DH »
    "mad": dict(inc=26955.6, exp=24640, left="2 315,60 DH", unknown="? DH",
                fmt='const fr = (v) => v.toFixed(2).replace(".", ",").replace(/\\B(?=(\\d{3})+(?!\\d))/g, " ") + " DH";\n',
                scr='let s = ""; for (let i = 0; i < 6; i++) s += Math.floor(rnd(k * 7 + i) * 10); return s.slice(0, 1) + " " + s.slice(1, 4) + "," + s.slice(4) + " DH";',
                zero="0,00 DH"),
}

# Textes : clés = identifiants de chaînes, remplacées dans le HTML français.
T = {
 "es": dict(cur="eur",
   mq=["INGRESOS · INGRESOS · INGRESOS", "REFERENCIAS · REFERENCIAS", "PROYECTOS · PROYECTOS", "COACH · COACH · COACH · COACH", "EN PAREJA · EN FAMILIA"],
   ln=["Lo que te queda,", "tus ingresos,", "tus referencias,", "tus proyectos,", "tu coach,", "en pareja o en familia."],
   ok=["Sin conexión bancaria.", "Sin anuncios.", "Cifrado de extremo a extremo."],
   back="Tus datos.<br/>Solo tuyos.",
   ch=["Bruto <b>→</b> neto, impuestos incluidos", "Frente a las <b>medias</b> de tu país", "Un presupuesto <b>por proyecto</b>", "<b>282</b> consejos, con fuentes", "Cada uno <b>su espacio</b>"],
   ga="Ya se usa en", gb=" países.", gc="En 8 idiomas. Y esto solo empieza.",
   hook=["Ganas.", "Gastas.", "Y te queda…", "¿cuánto?"],
   cta=("Gratis para", "empezar."), outro="Ya disponible en iPhone y Android."),
 "pt": dict(cur="eur",
   mq=["RENDIMENTOS · RENDIMENTOS", "REFERÊNCIAS · REFERÊNCIAS", "PROJETOS · PROJETOS · PROJETOS", "COACH · COACH · COACH · COACH", "A DOIS · EM FAMÍLIA · A DOIS"],
   ln=["O que te sobra,", "os teus rendimentos,", "as tuas referências,", "os teus projetos,", "o teu coach,", "a dois ou em família."],
   ok=["Sem ligação bancária.", "Sem anúncios.", "Encriptação ponta a ponta."],
   back="Os teus dados.<br/>Só teus.",
   ch=["Bruto <b>→</b> líquido, impostos incluídos", "Face às <b>médias</b> do teu país", "Um orçamento <b>por projeto</b>", "<b>282</b> conselhos, com fontes", "Cada um <b>com o seu espaço</b>"],
   ga="Já usado em", gb=" países.", gc="Em 8 línguas. E isto é só o começo.",
   hook=["Ganhas.", "Gastas.", "E sobra-te…", "quanto?"],
   cta=("Grátis para", "começar."), outro="Já disponível para iPhone e Android."),
 "de": dict(cur="eur",
   mq=["EINKOMMEN · EINKOMMEN · EINKOMMEN", "VERGLEICH · VERGLEICH", "PROJEKTE · PROJEKTE · PROJEKTE", "COACH · COACH · COACH · COACH", "ZU ZWEIT · ALS FAMILIE"],
   ln=["Was dir bleibt,", "dein Einkommen,", "deine Vergleichswerte,", "deine Projekte,", "dein Coach,", "zu zweit oder als Familie."],
   ok=["Ohne Bankverbindung.", "Ohne Werbung.", "Ende-zu-Ende-verschlüsselt."],
   back="Deine Daten.<br/>Bleiben bei dir.",
   ch=["Brutto <b>→</b> netto, Steuern inklusive", "Im Vergleich zum <b>Landesschnitt</b>", "Ein Budget <b>pro Projekt</b>", "<b>282</b> Tipps, mit Quellen", "Jedem <b>seinen Bereich</b>"],
   ga="Schon genutzt in", gb=" Ländern.", gc="In 8 Sprachen. Und das ist erst der Anfang.",
   hook=["Du verdienst.", "Du gibst aus.", "Und dir bleibt…", "wie viel?"],
   cta=("Kostenlos", "loslegen."), outro="Jetzt verfügbar für iPhone und Android."),
 "it": dict(cur="eur",
   mq=["ENTRATE · ENTRATE · ENTRATE", "RIFERIMENTI · RIFERIMENTI", "PROGETTI · PROGETTI · PROGETTI", "COACH · COACH · COACH · COACH", "IN COPPIA · IN FAMIGLIA"],
   ln=["Quello che ti resta,", "le tue entrate,", "i tuoi riferimenti,", "i tuoi progetti,", "il tuo coach,", "in coppia o in famiglia."],
   ok=["Nessuna connessione bancaria.", "Zero pubblicità.", "Crittografato end-to-end."],
   back="I tuoi dati.<br/>Restano tuoi.",
   ch=["Lordo <b>→</b> netto, tasse incluse", "Rispetto alle <b>medie</b> del tuo paese", "Un budget <b>per progetto</b>", "<b>282</b> consigli, fonti citate", "Ognuno <b>il suo spazio</b>"],
   ga="Già usato in", gb=" paesi.", gc="In 8 lingue. Ed è solo l'inizio.",
   hook=["Guadagni.", "Spendi.", "E ti resta…", "quanto?"],
   cta=("Gratis per", "iniziare."), outro="Disponibile ora su iPhone e Android."),
 "ar": dict(cur="mad", rtl=True,
   mq=["الدخل · الدخل · الدخل · الدخل", "مقارنات · مقارنات · مقارنات", "مشاريع · مشاريع · مشاريع", "مدرب · مدرب · مدرب · مدرب", "معاً · للعائلة · معاً · للعائلة"],
   ln=["ما يتبقى لك،", "دخلك،", "مقارناتك،", "مشاريعك،", "مدربك،", "مع الشريك أو العائلة."],
   ok=["بلا ربط بالبنك.", "بلا إعلانات.", "تشفير من طرف إلى طرف."],
   back="بياناتك.<br/>تبقى لك.",
   ch=["الإجمالي <b>←</b> الصافي، مع الضرائب", "مقارنة <b>بمتوسطات</b> بلدك", "ميزانية <b>لكل مشروع</b>", "<b>282</b> نصيحة مع ذكر المصادر", "لكلٍّ <b>مساحته</b>"],
   ga="يُستخدم بالفعل في", gb=" دولة.", gc="بـ8 لغات. وهذه مجرد البداية.",
   hook=["تكسب.", "تنفق.", "ويتبقى لك…", "كم؟"],
   cta=("ابدأ", "مجاناً."), outro="متوفر الآن على iPhone وAndroid."),
 "ja": dict(cur="jpy", cjk=True,
   mq=["収入 · 収入 · 収入 · 収入 · 収入", "目安 · 目安 · 目安 · 目安 · 目安", "プロジェクト · プロジェクト", "コーチ · コーチ · コーチ · コーチ", "ふたりで · 家族で · ふたりで"],
   ln=["手元に残るお金、", "収入、", "目安、", "プロジェクト、", "コーチ、", "ふたりでも、家族でも。"],
   ok=["銀行連携なし。", "広告なし。", "エンドツーエンド暗号化。"],
   back="あなたのデータは<br/>あなたのもの。",
   ch=["額面 <b>→</b> 手取りを自動計算", "自国の<b>平均</b>と比べる", "<b>プロジェクトごと</b>の予算", "<b>282</b>の助言、出典つき", "それぞれの<b>専用スペース</b>"],
   ga="すでに使われている国は", gb="か国。", gc="8言語に対応。まだ始まったばかり。",
   hook=["稼いで、", "使って、", "残るのは…", "いくら？"],
   cta=("無料で", "始められる。"), outro="iPhoneとAndroidで配信中。"),
}

# Retouches de taille par langue (sélecteur CSS ajouté en fin de feuille) : 16:9 puis 9:16.
SIZE = {
 "es": (".sent .ln { font-size: 92px; } .gtxt .b { font-size: 185px; white-space: nowrap; } .ok { font-size: 66px; }",
        "#root.p .sent .ln { font-size: 80px; } #root.p .gtxt .b { font-size: 170px; } #root.p .ok { font-size: 56px; } #root.p .ok svg { width: 56px; height: 56px; }"),
 "pt": (".sent .ln { font-size: 92px; } .gtxt .b { font-size: 185px; white-space: nowrap; } .ok { font-size: 66px; } .chip { font-size: 28px; }",
        "#root.p .sent .ln { font-size: 78px; } #root.p .gtxt .b { font-size: 170px; } #root.p .ok { font-size: 56px; } #root.p .ok svg { width: 56px; height: 56px; }"),
 "de": (".sent .ln { font-size: 88px; } .gtxt .b { font-size: 165px; white-space: nowrap; } .gtxt .c { font-size: 44px; } .ok { font-size: 66px; } .ctat { font-size: 140px; }",
        "#root.p .sent .ln { font-size: 74px; } #root.p .gtxt .b { font-size: 150px; } #root.p .ok { font-size: 56px; } #root.p .ok svg { width: 56px; height: 56px; } #root.p #hcap { font-size: 58px; } #root.p .ctat { font-size: 112px; }"),
 "it": (".sent .ln { font-size: 92px; } .gtxt .b { font-size: 185px; white-space: nowrap; } .ok { font-size: 64px; }",
        "#root.p .sent .ln { font-size: 80px; } #root.p .gtxt .b { font-size: 175px; } #root.p .ok { font-size: 56px; } #root.p .ok svg { width: 56px; height: 56px; }"),
 "ar": ("#hnum { font-size: 220px; } .gtxt .b { font-size: 200px; white-space: nowrap; } .ok { font-size: 70px; }",
        "#root.p #hnum { font-size: 128px; } #root.p .gtxt .b { font-size: 190px; } #root.p .ok { font-size: 62px; }"),
 "ja": (".sent .ln { font-size: 86px; } .gtxt .a { font-size: 56px; } .gtxt .b { font-size: 190px; white-space: nowrap; } .gtxt .c { font-size: 46px; } .ok { font-size: 64px; } .ctat { font-size: 130px; } #hcap { font-size: 70px; } .back .t { font-size: 30px; }",
        "#root.p .sent .ln { font-size: 76px; } #root.p .gtxt .b { font-size: 180px; } #root.p .ok { font-size: 56px; } #root.p .ctat { font-size: 104px; } #root.p #hcap { font-size: 60px; }"),
}

FR = dict(
   mq=["REVENUS · REVENUS · REVENUS", "REPÈRES · REPÈRES · REPÈRES", "PROJETS · PROJETS · PROJETS", "COACH · COACH · COACH · COACH", "À DEUX · EN FAMILLE · À DEUX"],
   ln=["Ce qu'il te reste,", "tes revenus,", "tes repères,", "tes projets,", "ton coach,", "à deux ou en famille."],
   ok=["Sans connexion bancaire.", "Sans pub.", "Chiffré de bout en bout."],
   back="Tes données.<br/>Chez toi.",
   ch=["Brut <b>→</b> net, impôt à la source", "Face aux <b>moyennes</b> de ton pays", "Un budget <b>par projet</b>", "<b>282</b> conseils, sources citées", "Chacun <b>son espace</b>"],
   ga="Déjà utilisé dans", gb=" pays.", gc="En 8 langues. Et ce n'est qu'un début.",
   hook=["Tu gagnes.", "Tu dépenses.", "Et il te reste…", "combien ?"],
   cta=("Gratuit pour", "commencer."), outro="Disponible maintenant sur iPhone et Android.")


def rep(s, a, b, count=None):
    assert a in s, a[:80]
    return s.replace(a, b) if count is None else s.replace(a, b, count)


def localize(s, lang):
    L = T[lang]; M = MONEY[L["cur"]]
    s = rep(s, '<html lang="fr">', f'<html lang="{lang}"' + (' dir="ltr"' if L.get("rtl") else "") + '>')
    s = rep(s, '<title>NETbudget 2.0 - Annonce</title>', f'<title>NETbudget 2.0 - Launch ({lang.upper()})</title>')
    for a, b in zip(FR["mq"], L["mq"]): s = rep(s, f">{a}<", f">{b}<")
    for a, b in zip(FR["ln"], L["ln"]): s = rep(s, f">{a}<", f">{b}<")
    for a, b in zip(FR["ok"], L["ok"]): s = rep(s, f"</svg>{a}</div>", f"</svg>{b}</div>")
    s = rep(s, FR["back"], L["back"])
    for a, b in zip(FR["ch"], L["ch"]): s = rep(s, f">{a}<", f">{b}<")
    s = rep(s, f'>{FR["ga"]}<', f'>{L["ga"]}<')
    s = rep(s, f'>0{FR["gb"]}<', f'>0{L["gb"]}<')
    s = rep(s, f'"{FR["gb"]}"', f'"{L["gb"]}"')
    s = rep(s, f'>{FR["gc"]}<', f'>{L["gc"]}<')
    for i, (a, b) in enumerate(zip(FR["hook"], L["hook"])):
        s = rep(s, f'id="w{i + 1}"' + (' style="color:inherit"' if i == 3 else '') + f'>{a}<', f'id="w{i + 1}"' + (' style="color:inherit"' if i == 3 else '') + f'>{b}<')
    s = rep(s, f'{FR["cta"][0]}<br/><span class="accent">{FR["cta"][1]}</span>', f'{L["cta"][0]}<br/><span class="accent">{L["cta"][1]}</span>')
    s = rep(s, f'>{FR["outro"]}<', f'>{L["outro"]}<')
    # montants
    s = rep(s, '<span id="hnum">0,00 €</span>', f'<span id="hnum">{M["zero"]}</span>')
    s = re.sub(r"const fr = \(v\) => .*?;\n", lambda m: M["fmt"], s, count=1)
    s = re.sub(r'(const scramble = \(k\) => \{ ).*?\};', lambda m: m.group(1) + M["scr"] + " };", s, count=1)
    s = re.sub(r'textContent: "\?[^"]*€"', f'textContent: "{M["unknown"]}"', s, count=1)
    s = re.sub(r'textContent: "221,20[^"]*€"', f'textContent: "{M["left"]}"', s, count=1)
    s = rep(s, "{ v: 2567.2,", f'{{ v: {M["inc"]},')
    s = rep(s, "{ v: 2346,", f'{{ v: {M["exp"]},')
    if L["cur"] != "eur":
        assert "€" not in s, s[s.index("€") - 80:s.index("€") + 10]
    # polices et sens d'écriture
    extra = ""
    if L.get("rtl"):
        extra += '@font-face { font-family: "Noto Sans Arabic"; font-style: normal; font-weight: 400 900; font-display: block; src: url("fonts/NotoSansArabic-arabic.woff2") format("woff2"); }\n'
        s = rep(s, 'font-family: "Manrope", sans-serif;', 'font-family: "Manrope", "Noto Sans Arabic", sans-serif;')
        # l'arabe se lit de droite à gauche ; l'interlettrage négatif casse les liaisons
        extra += ("#hcap, .sent, .gtxt, .back .t, .chip, .ctat, #outro { direction: rtl; unicode-bidi: isolate; }\n"
                  ".sent, .gtxt { text-align: right; } .sent .eb { direction: ltr; text-align: right; }\n"
                  "#priv { align-items: flex-end; } .ok { width: fit-content; } #root:not(.p) #sent { width: 880px; }\n"
                  "#root *:not(.mono):not(.eb) { letter-spacing: 0 !important; }\n"
                  "#hnum, .store { direction: ltr; unicode-bidi: isolate; }\n")
    if L.get("cjk"):
        for w in (600, 700, 800):
            extra += f'@font-face {{ font-family: "Noto Sans JP"; font-style: normal; font-weight: {w}; font-display: block; src: url("fonts/NotoSansJP-{w}.woff2") format("woff2"); }}\n'
        s = rep(s, 'font-family: "Manrope", sans-serif;', 'font-family: "Manrope", "Noto Sans JP", sans-serif;')
        extra += "#root *:not(.mono):not(.eb) { letter-spacing: -0.01em !important; }\n"
        extra += ".chip { white-space: nowrap !important; }\n"
    # bulles : les textes traduits sont plus longs, elles passent sur deux lignes au lieu de sortir du cadre
    extra += ".chip { white-space: normal; width: max-content; max-width: 380px; line-height: 1.2; }\n"
    a, b = SIZE.get(lang, ("", ""))
    extra += a + "\n" + b + "\n"
    s = rep(s, "    </style>", "      /* " + lang + " */\n" + extra + "    </style>", 1)
    return s


def jp_fonts(dest, html):
    chars = "".join(sorted({c for c in re.sub(r"<[^>]+>", "", html) if ord(c) > 0x2000}))
    UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
    for w in (600, 700, 800):
        q = urllib.parse.urlencode({"family": f"Noto Sans JP:wght@{w}", "text": chars + "0123456789", "display": "block"})
        css = urllib.request.urlopen(urllib.request.Request("https://fonts.googleapis.com/css2?" + q, headers={"User-Agent": UA})).read().decode()
        url = re.search(r"url\((https://[^)]+)\)", css).group(1)
        (dest / "fonts" / f"NotoSansJP-{w}.woff2").write_bytes(urllib.request.urlopen(url).read())


def run(cmd, cwd=None):
    return subprocess.run(cmd, cwd=cwd, shell=True, capture_output=True, text=True).stdout


def dur(p):
    return float(run(f'ffprobe -v error -show_entries format=duration -of csv=p=0 "{p}"').strip())


def project(lang, dest, html, reels=False):
    rec = HERE / f"rec-{lang}"
    if dest.exists(): shutil.rmtree(dest)
    shutil.copytree(SRC, dest, ignore=shutil.ignore_patterns("renders", ".hyperframes", "node_modules", "index.html"))
    cid = f"annonce20{lang}" + ("reels" if reels else "")
    (dest / "meta.json").write_text('{"id": "%s", "name": "%s", "createdAt": "2026-11-04T10:00:00.000Z"}\n' % (cid, cid))
    for c in CLIPS:
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(rec / f"{c}.mp4"), "-an", "-r", "30", "-vf", "scale=800:-2", "-c:v", "libx264",
                        "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(dest / "assets" / "rec" / f"{c}.mp4")], check=True)
    # le plan budget sert 5,81 s à partir de 1,0 s : on recule le départ si l'enregistrement est plus court
    d = dur(dest / "assets" / "rec" / "budget.mp4")
    ms = max(0.2, min(1.0, round(d - 5.9, 2)))
    html = rep(html, 'src="assets/rec/budget.mp4" data-start="4.0" data-duration="5.81" data-media-start="1.0"',
               f'src="assets/rec/budget.mp4" data-start="4.0" data-duration="5.81" data-media-start="{ms}"')
    if lang == "ar":
        shutil.copy(EXTRA / "NotoSansArabic-arabic.woff2", dest / "fonts")
    if lang == "ja":
        jp_fonts(dest, html)
    if reels:
        sys.path.insert(0, str(HERE)); import build
        for a, b in build.REELS: html = rep(html, a, b)
        html = rep(html, 'data-composition-id="annonce20reels"', f'data-composition-id="{cid}"')
    else:
        html = rep(html, 'data-composition-id="annonce20"', f'data-composition-id="{cid}"')
    (dest / "index.html").write_text(html)


if __name__ == "__main__":
    lang = sys.argv[1]; assert lang in T, "langues : " + ", ".join(T)
    html = localize((SRC / "index.html").read_text(), lang)
    for name, reels in (("16x9", False), ("9x16", True)):
        d = HERE / (f"video-{lang}" + ("-reels" if reels else ""))
        project(lang, d, html, reels)
        print(lang, name, run("npx --yes hyperframes@0.8.157 check 2>&1 | grep -E 'error\\(s\\)' | tail -1", d).strip())
        if "render" in sys.argv:
            print("  ", run("npx --yes hyperframes@0.8.157 render --workers 1 2>&1 | tr '\\r' '\\n' | grep -E '✗|MB|renders/' | tail -2", d).strip().replace("\n", " | "))
            mp4s = sorted((d / "renders").glob("*.mp4"), key=os.path.getmtime)
            if mp4s:
                out = HERE / f"annonce-2.0-{lang}-{name}.mp4"
                subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(mp4s[-1]), "-c:v", "libx264", "-preset", "slow", "-b:v", "1900k", "-maxrate", "2400k",
                                "-bufsize", "4000k", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", str(out)], check=True)
                ADS.mkdir(parents=True, exist_ok=True); shutil.copy(out, ADS / out.name)
                shutil.rmtree(d / "renders"); print("   ->", out.name)
