#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Évènement intégré App Store « NETbudget 2.0 arrive », huit langues.

Textes (limites App Store Connect : nom 30, description courte 50, longue
120) écrits dans evenement/<lang>.md, et deux images par langue :
  - fiche de l'évènement : 1920 × 1080 (16:9)
  - page des détails : 1080 × 1920 (9:16)
Spécifications : App Store Connect Help, « In-app event media and audio
specifications » (JPEG ou PNG, 16:9 min 1920 × 1080, 9:16 min 1080 × 1920).

    marketing/promo-video/.venv/bin/python marketing/appstore/2.0/evenement.py
"""
import os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image, ImageDraw, ImageFilter
from visuels import font, shape, phone, CAPS, SITE, WHITE, MINT, MINT_DIM, INK, NAVY

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_T = os.path.join(HERE, "evenement"); OUT_I = os.path.join(HERE, "images"); os.makedirs(OUT_T, exist_ok=True); os.makedirs(OUT_I, exist_ok=True)
LIMITS = {"name": 30, "short": 50, "long": 120}

T = {
 "fr": {"name": "NETbudget 2.0 arrive", "short": "Budget partagé, Coach sourcé, projets. Le 15 nov.", "long": "Budget en couple ou en famille, Coach avec 282 conseils sourcés, repères officiels, projets guidés. Le 15 novembre.", "card": "2.0 arrive", "sub": "15 novembre"},
 "en": {"name": "NETbudget 2.0 is coming", "short": "Shared budgets, sourced Coach, projects. Nov 15.", "long": "Budgets for couples and families, a Coach with 282 sourced tips, official benchmarks, guided projects. Out November 15.", "card": "2.0 is coming", "sub": "November 15"},
 "es": {"name": "Llega NETbudget 2.0", "short": "Presupuesto compartido, Coach, proyectos. 15 nov.", "long": "Presupuesto en pareja o familia, Coach con 282 consejos con fuente, referencias oficiales, proyectos. 15 de noviembre.", "card": "Llega la 2.0", "sub": "15 de noviembre"},
 "pt": {"name": "O NETbudget 2.0 está a chegar", "short": "Orçamento partilhado, Coach, projetos. 15 nov.", "long": "Orçamento a dois ou em família, Coach com 282 dicas com fonte, referências oficiais, projetos guiados. A 15 de novembro.", "card": "A 2.0 chega", "sub": "15 de novembro"},
 "de": {"name": "NETbudget 2.0 kommt", "short": "Gemeinsames Budget, Coach, Projekte. Ab 15. Nov.", "long": "Budget für Paare und Familien, Coach mit 282 belegten Tipps, offizielle Vergleichswerte, Projekte. Ab 15. November.", "card": "2.0 kommt", "sub": "15. November"},
 "it": {"name": "Arriva NETbudget 2.0", "short": "Budget condiviso, Coach, progetti. Dal 15 nov.", "long": "Budget in coppia o in famiglia, Coach con 282 consigli con fonte, riferimenti ufficiali, progetti. Dal 15 novembre.", "card": "Arriva la 2.0", "sub": "15 novembre"},
 "ar": {"name": "NETbudget 2.0 قادم", "short": "ميزانية مشتركة، مرشد موثّق، مشاريع. 15 نوفمبر.", "long": "ميزانية للزوجين والعائلة، مرشد بـ 282 نصيحة موثّقة، معايير رسمية، مشاريع موجّهة. الإصدار في 15 نوفمبر.", "card": "2.0 قادم", "sub": "15 نوفمبر"},
 "ja": {"name": "NETbudget 2.0、まもなく", "short": "共有家計、出典つきコーチ、プロジェクト。11月15日。", "long": "カップル・家族で共有できる家計、出典つき282のアドバイスを持つコーチ、公的な目安、ガイドつきプロジェクト。11月15日公開。", "card": "2.0、まもなく", "sub": "11月15日"},
}
FIELDS = [("name", "Nom"), ("short", "Description courte"), ("long", "Description longue")]


def _segs(d, lang, text, size):
    """Segments (texte, police) : les chiffres en latin, le reste en arabe.
    Geeza Pro n'a pas de chiffres, ils sortaient en carrés."""
    if lang != "ar": return [(text, font(lang, size))]
    parts = re.findall(r"[0-9.,]+|[^0-9.,]+", text)
    segs = [(seg, "en" if re.match(r"[0-9.,]+", seg) else "ar") for seg in parts]
    # Lecture de droite à gauche : on dessine les segments en ordre inverse.
    return [((shape("ar", t) if k == "ar" else t), font(k, size)) for t, k in segs[::-1]]

def mixed_width(d, lang, text, size):
    return sum(d.textlength(t, font=f) for t, f in _segs(d, lang, text, size))

def mixed(d, x, y, lang, text, size, fill, anchor="la"):
    segs = _segs(d, lang, text, size); total = sum(d.textlength(t, font=f) for t, f in segs)
    cx = x - total if anchor[0] == "r" else (x - total / 2 if anchor[0] == "m" else x)
    for t, f in segs:
        d.text((cx, y), t, font=f, fill=fill, anchor="l" + anchor[1]); cx += d.textlength(t, font=f)

def bg(w, h):
    img = Image.new("RGB", (w, h), INK)
    grad = Image.new("RGB", (1, h))
    for y in range(h):
        t = 1 - abs(y / h - 0.5) * 2
        grad.putpixel((0, y), tuple(int(INK[i] + (NAVY[i] - INK[i]) * max(0, t)) for i in range(3)))
    img.paste(grad.resize((w, h)))
    halo = Image.new("RGB", (w, h), (0, 0, 0)); d = ImageDraw.Draw(halo)
    r = int(min(w, h) * 0.6); cx, cy = int(w * 0.6), int(h * 0.55)
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(16, 64, 52))
    halo = halo.filter(ImageFilter.GaussianBlur(min(w, h) * 0.2))
    return Image.blend(img, Image.composite(halo, img, halo.convert("L").point(lambda v: min(255, v * 3))), 0.6)

def card(lang):
    """16:9. Le logo, « 2.0 arrive », la date, un téléphone à droite. La fiche
    s'affiche petite : peu d'éléments, gros caractères."""
    w, h = 1920, 1080
    img = bg(w, h); d = ImageDraw.Draw(img); m = 110
    logo = Image.open(os.path.join(SITE, "logo.png")).convert("RGBA").resize((96, 96), Image.LANCZOS)
    img.paste(logo, (m, m), logo)
    d.text((m + 120, m + 18), "NETbudget", font=font("en", 56), fill=WHITE)
    head = T[lang]["card"]; size = 150
    while size > 60 and mixed_width(d, lang, head, size) > w * 0.5: size -= 6
    anchor_x, anchor = (m + int(w * 0.5), "ra") if lang == "ar" else (m, "la")
    mixed(d, anchor_x, int(h * 0.42), lang, head, size, WHITE, anchor)
    sub = T[lang]["sub"]; pw = int(mixed_width(d, lang, sub, 64)) + 70; ph = 100
    px = (m + int(w * 0.5) - pw) if lang == "ar" else m; py = int(h * 0.42) + size + 40
    d.rounded_rectangle((px, py, px + pw, py + ph), radius=50, fill=(16, 185, 129, 40), outline=MINT_DIM, width=3)
    mixed(d, px + pw / 2, py + ph / 2, lang, sub, 64, MINT, "mm")
    p = phone(os.path.join(CAPS, f"{lang}-budget.png"), int(h * 1.05))
    img.paste(p, (int(w * 0.62), int(h * 0.12)), p)
    img.save(os.path.join(OUT_I, f"evenement-fiche-1920x1080-{lang}.png"), optimize=True)

def details(lang):
    """9:16. Même composition, verticale : texte en haut, téléphone en bas."""
    w, h = 1080, 1920
    img = bg(w, h); d = ImageDraw.Draw(img); m = 90
    logo = Image.open(os.path.join(SITE, "logo.png")).convert("RGBA").resize((88, 88), Image.LANCZOS)
    img.paste(logo, (m, m), logo)
    d.text((m + 110, m + 16), "NETbudget", font=font("en", 52), fill=WHITE)
    head = T[lang]["card"]; size = 120
    while size > 50 and mixed_width(d, lang, head, size) > w - 2 * m: size -= 5
    anchor_x, anchor = (w - m, "ra") if lang == "ar" else (m, "la")
    mixed(d, anchor_x, 300, lang, head, size, WHITE, anchor)
    sub = T[lang]["sub"]; pw = int(mixed_width(d, lang, sub, 54)) + 60; ph = 88
    px = (w - m - pw) if lang == "ar" else m; py = 300 + size + 36
    d.rounded_rectangle((px, py, px + pw, py + ph), radius=44, fill=(16, 185, 129, 40), outline=MINT_DIM, width=3)
    mixed(d, px + pw / 2, py + ph / 2, lang, sub, 54, MINT, "mm")
    p = phone(os.path.join(CAPS, f"{lang}-projet.png"), int(h * 0.75))
    img.paste(p, ((w - p.width) // 2, int(h * 0.36)), p)
    img.save(os.path.join(OUT_I, f"evenement-details-1080x1920-{lang}.png"), optimize=True)

if __name__ == "__main__":
    bad = []
    for lang, t in T.items():
        lines = [f"# Évènement intégré · {lang}", ""]
        for k, label in FIELDS:
            n = len(t[k]); lim = LIMITS[k]
            if n > lim: bad.append((lang, k, n, lim))
            lines += [f"## {label} ({n}/{lim})", "", "```", t[k], "```", ""]
        lines += ["## Badge", "", "Mise à jour majeure (Major Update)", "", "## Dates (Paris)", "", "Début : 2026-10-15 09:00 · Fin : 2026-11-15 09:00 · Publication : 2026-10-15 09:00", "", "## Lien profond", "", "netbudget:///?tab=premium", ""]
        open(os.path.join(OUT_T, f"{lang}.md"), "w", encoding="utf-8").write("\n".join(lines))
        card(lang); details(lang); print(lang, {k: len(t[k]) for k, _ in FIELDS})
    if bad: raise SystemExit("DÉPASSEMENT : " + ", ".join(f"{l}.{k} {n}>{lim}" for l, k, n, lim in bad))
