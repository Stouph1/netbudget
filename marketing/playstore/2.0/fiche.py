#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fiche Google Play pour la 2.0, huit langues.

Textes aux limites de la Play Console (nom 30, description courte 80,
description complète 4 000, notes de version 500 par langue) écrits dans
textes/<lang>.md, et l'image de présentation 1024 × 500 (JPEG ou PNG 24 bits,
sans transparence) dans images/presentation-1024x500-<lang>.png.

La description complète reprend celle de l'App Store, sans les lignes propres
à Apple. Aucun prix, aucun emoji, aucun concurrent.

    marketing/promo-video/.venv/bin/python marketing/playstore/2.0/fiche.py
"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
APPSTORE = os.path.join(os.path.dirname(os.path.dirname(HERE)), "appstore", "2.0")
sys.path.insert(0, APPSTORE)
from PIL import Image, ImageDraw
from textes import T as APPLE
from visuels import font, shape, phone, CAPS, SITE, WHITE, MINT, MINT_DIM
from evenement import bg, mixed, mixed_width

LIMITS = {"title": 30, "short": 80, "full": 4000, "notes": 500}
TITLE = "NETbudget"
SHORT = {
 "fr": "Reste à vivre, Coach sourcé, budget partagé. Sans connexion bancaire.",
 "en": "Money left, sourced Coach, shared budgets. No bank connection, no ads.",
 "es": "Lo que te queda, Coach con fuentes, presupuesto compartido. Sin banco.",
 "pt": "O que te sobra, Coach com fontes, orçamento partilhado. Sem banco.",
 "de": "Was bleibt, belegter Coach, geteiltes Budget. Ohne Bankverbindung.",
 "it": "Quanto ti resta, Coach con fonti, budget condiviso. Senza banca.",
 "ar": "ما يتبقّى لك، مرشد موثّق، ميزانية مشتركة. دون ربط بالبنك.",
 "ja": "残るお金、出典つきコーチ、共有家計。銀行連携なし、広告なし。",
}
# Notes de version : 500 caractères par langue sur Play, on condense.
NOTES = {
 "fr": "NETbudget 2.0 : espaces partagés en couple ou en famille par code d'invitation, Coach avec 282 conseils sourcés et conseil de la semaine, repères face aux moyennes nationales (Eurostat, BLS, ONS, Statistique Canada, ABS), projets guidés (mariage, voyage, naissance, fête), budget épuré avec pictogrammes et dépenses par période, impôt prélevé à la source dans 32 pays, notifications utiles, chiffrement de bout en bout, export PDF refait, huit langues.",
 "en": "NETbudget 2.0: shared spaces for couples and families with an invitation code, a Coach with 282 sourced tips and a tip of the week, benchmarks against national averages (Eurostat, BLS, ONS, Statistics Canada, ABS), guided projects (wedding, trip, baby, party), a lighter budget with pictograms and expenses by period, income tax withheld at source in 32 countries, useful notifications, end-to-end encryption, rebuilt PDF export, eight languages.",
 "es": "NETbudget 2.0: espacios compartidos en pareja o en familia con código de invitación, Coach con 282 consejos con fuente y consejo de la semana, referencias frente a las medias nacionales (Eurostat, BLS, ONS, Statistics Canada, ABS), proyectos guiados (boda, viaje, nacimiento, fiesta), presupuesto más ligero con pictogramas y gastos por periodo, impuesto retenido en nómina en 32 países, notificaciones útiles, cifrado de extremo a extremo, PDF renovado, ocho idiomas.",
 "pt": "NETbudget 2.0: espaços partilhados a dois ou em família com código de convite, Coach com 282 dicas com fonte e dica da semana, referências face às médias nacionais (Eurostat, BLS, ONS, Statistics Canada, ABS), projetos guiados (casamento, viagem, nascimento, festa), orçamento mais leve com pictogramas e despesas por período, imposto retido na fonte em 32 países, notificações úteis, cifra de ponta a ponta, PDF renovado, oito idiomas.",
 "de": "NETbudget 2.0: gemeinsame Bereiche für Paare und Familien per Einladungscode, Coach mit 282 belegten Tipps und Tipp der Woche, Vergleichswerte gegenüber nationalen Durchschnitten (Eurostat, BLS, ONS, Statistics Canada, ABS), geführte Projekte (Hochzeit, Reise, Baby, Feier), schlankeres Budget mit Piktogrammen und Ausgaben nach Zeitraum, einbehaltene Lohnsteuer in 32 Ländern, nützliche Benachrichtigungen, Ende-zu-Ende-Verschlüsselung, neuer PDF-Export, acht Sprachen.",
 "it": "NETbudget 2.0: spazi condivisi in coppia o in famiglia con codice di invito, Coach con 282 consigli con fonte e consiglio della settimana, riferimenti rispetto alle medie nazionali (Eurostat, BLS, ONS, Statistics Canada, ABS), progetti guidati (matrimonio, viaggio, nascita, festa), budget più leggero con pittogrammi e spese per periodo, imposta trattenuta alla fonte in 32 paesi, notifiche utili, cifratura end-to-end, PDF rinnovato, otto lingue.",
 "ar": "NETbudget 2.0: مساحات مشتركة للزوجين والعائلة برمز دعوة، مرشد بـ 282 نصيحة موثّقة ونصيحة الأسبوع، معايير مقارنة بالمتوسطات الوطنية (يوروستات، BLS، ONS، إحصاءات كندا، ABS)، مشاريع موجّهة (زفاف، سفر، مولود، حفلة)، ميزانية أخف برموز ومصاريف حسب الفترة، ضريبة مقتطعة من المصدر في 32 بلدًا، إشعارات مفيدة، تشفير من طرف إلى طرف، تصدير PDF جديد، ثماني لغات.",
 "ja": "NETbudget 2.0：招待コードで共有できるカップル・家族のスペース、出典つき282のアドバイスと今週のアドバイスを持つコーチ、全国平均との比較（ユーロスタット、BLS、ONS、カナダ統計局、ABS）、ガイドつきプロジェクト（結婚式、旅行、出産、パーティー）、ピクトグラムと期間つき支出で軽くなった家計画面、32か国の源泉徴収税、役立つ通知、エンドツーエンド暗号化、刷新されたPDF書き出し、8言語対応。",
}
NAMES = {"fr": "Français", "en": "English", "es": "Español", "pt": "Português", "de": "Deutsch", "it": "Italiano", "ar": "العربية", "ja": "日本語"}
HEAD = {"fr": "Ton budget. Tes projets.", "en": "Your budget. Your plans.", "es": "Tu presupuesto. Tus proyectos.", "pt": "O teu orçamento. Os teus projetos.", "de": "Dein Budget. Deine Pläne.", "it": "Il tuo budget. I tuoi progetti.", "ar": "ميزانيتك. مشاريعك.", "ja": "あなたの家計。あなたの計画。"}

def feature_graphic(lang):
    """1024 × 500, l'image en tête de la fiche Play. Texte à gauche, un
    téléphone à droite, coupé par le bas : la zone est petite, on va à
    l'essentiel."""
    w, h = 1024, 500
    img = bg(w, h); d = ImageDraw.Draw(img); m = 56
    logo = Image.open(os.path.join(SITE, "logo.png")).convert("RGBA").resize((52, 52), Image.LANCZOS)
    img.paste(logo, (m, m), logo)
    d.text((m + 66, m + 9), "NETbudget", font=font("en", 32), fill=WHITE)
    head = HEAD[lang]; size = 60
    while size > 28 and mixed_width(d, lang, head, size) > w * 0.55: size -= 2
    anchor_x, anchor = (m + int(w * 0.55), "ra") if lang == "ar" else (m, "la")
    mixed(d, anchor_x, int(h * 0.47), lang, head, size, WHITE, anchor)
    lx = (m + int(w * 0.55) - 70) if lang == "ar" else m
    d.rounded_rectangle((lx, int(h * 0.47) + size + 26, lx + 70, int(h * 0.47) + size + 34), radius=4, fill=MINT_DIM)
    p = phone(os.path.join(CAPS, f"{lang}-budget.png"), int(h * 1.15))
    img.paste(p, (int(w * 0.63), int(h * 0.1)), p)
    img.convert("RGB").save(os.path.join(HERE, "images", f"presentation-1024x500-{lang}.png"), optimize=True)

if __name__ == "__main__":
    os.makedirs(os.path.join(HERE, "textes"), exist_ok=True); os.makedirs(os.path.join(HERE, "images"), exist_ok=True)
    bad = []
    for lang in APPLE:
        full = APPLE[lang]["description"].strip()
        fields = [("title", "Nom de l'application", TITLE), ("short", "Description courte", SHORT[lang]), ("full", "Description complète", full), ("notes", "Nouveautés (notes de version)", NOTES[lang])]
        lines = [f"# Google Play · {NAMES[lang]} ({lang})", ""]
        for k, label, v in fields:
            n = len(v); lim = LIMITS[k]
            if n > lim: bad.append((lang, k, n, lim))
            lines += [f"## {label} ({n}/{lim})", "", "```", v, "```", ""]
        open(os.path.join(HERE, "textes", f"{lang}.md"), "w", encoding="utf-8").write("\n".join(lines))
        feature_graphic(lang)
        print(lang, {k: len(v) for k, _, v in fields})
    if bad: raise SystemExit("DÉPASSEMENT : " + ", ".join(f"{l}.{k} {n}>{lim}" for l, k, n, lim in bad))
