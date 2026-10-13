#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""En-tête et visuel de résultats de recherche de la fiche App Store, 2.0.

Deux tailles imposées par App Store Connect :
  - en-tête de page produit : 5244 × 2950 px
  - résultats de recherche : 3840 × 1646 px

Un visuel par langue (fr, en, es, pt, de, it, ar, ja), épuré : fond nuit,
halo menthe, une accroche de quelques mots, et deux écrans de l'app pris
dans cette langue : le reste à vivre, et un projet (voyage) avec son budget
guidé. Rien d'autre. Les captures viennent de caps-i18n/<lang>-budget.png et
<lang>-projet.png (prises sur le simulateur, app réglée dans la langue).

    marketing/promo-video/.venv/bin/python marketing/appstore/2.0/visuels.py

Sortie : marketing/appstore/2.0/images/<taille>-<lang>.png
"""
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
CAPS = os.path.join(HERE, "captures")
SITE = "/Users/stephane.pizeuil/projet/netbudget-main/website/public"
OUT = os.path.join(HERE, "images")
os.makedirs(OUT, exist_ok=True)

INK, NAVY = (10, 10, 12), (10, 18, 36)
MINT, MINT_DIM, WHITE = (110, 231, 183), (16, 185, 129), (250, 250, 250)

# Une accroche, courte. Deux lignes maximum, pas de sous-titre.
COPY = {
  "fr": "Ton budget.\nTes projets.",
  "en": "Your budget.\nYour plans.",
  "es": "Tu presupuesto.\nTus proyectos.",
  "pt": "O teu orçamento.\nOs teus projetos.",
  "de": "Dein Budget.\nDeine Pläne.",
  "it": "Il tuo budget.\nI tuoi progetti.",
  "ar": "ميزانيتك.\nمشاريعك.",
  "ja": "あなたの家計。\nあなたの計画。",
}

def font(lang, size):
    cands = {
        "ja": [("/System/Library/Fonts/ヒラギノ角ゴシック W7.ttc", 0), ("/System/Library/Fonts/Hiragino Sans GB.ttc", 0), ("/Library/Fonts/Arial Unicode.ttf", 0)],
        "ar": [("/System/Library/Fonts/GeezaPro.ttc", 1), ("/Library/Fonts/Arial Unicode.ttf", 0)],
    }.get(lang, [("/System/Library/Fonts/HelveticaNeue.ttc", 1), ("/System/Library/Fonts/Helvetica.ttc", 1)])
    for path, idx in cands:
        if os.path.exists(path):
            try: return ImageFont.truetype(path, size, index=idx)
            except Exception: continue
    return ImageFont.truetype("/Library/Fonts/Arial Unicode.ttf", size)

def shape(lang, text):
    if lang != "ar": return text
    import arabic_reshaper
    from bidi.algorithm import get_display
    return "\n".join(get_display(arabic_reshaper.reshape(l)) for l in text.split("\n"))

def background(w, h):
    img = Image.new("RGB", (w, h), INK)
    grad = Image.new("RGB", (1, h))
    for y in range(h):
        t = 1 - abs(y / h - 0.55) * 2
        grad.putpixel((0, y), tuple(int(INK[i] + (NAVY[i] - INK[i]) * max(0, t)) for i in range(3)))
    img.paste(grad.resize((w, h)))
    halo = Image.new("RGB", (w, h), (0, 0, 0)); d = ImageDraw.Draw(halo)
    r = int(h * 0.7); cx, cy = int(w * 0.70), int(h * 0.55)
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(16, 64, 52))
    halo = halo.filter(ImageFilter.GaussianBlur(h * 0.2))
    return Image.blend(img, Image.composite(halo, img, halo.convert("L").point(lambda v: min(255, v * 3))), 0.6)

def phone(path, height):
    cap = Image.open(path).convert("RGB")
    sh = height; sw = int(sh * cap.width / cap.height)
    cap = cap.resize((sw, sh), Image.LANCZOS)
    pad = int(sh * 0.012); radius = int(sh * 0.085)
    w, h = sw + 2 * pad, sh + 2 * pad
    body = Image.new("RGBA", (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(body)
    d.rounded_rectangle((0, 0, w - 1, h - 1), radius=radius + pad, fill=(22, 24, 32, 255), outline=(255, 255, 255, 40), width=max(2, pad // 3))
    mask = Image.new("L", (sw, sh), 0); ImageDraw.Draw(mask).rounded_rectangle((0, 0, sw - 1, sh - 1), radius=radius, fill=255)
    body.paste(cap, (pad, pad), mask)
    glow = Image.new("RGBA", (w + 400, h + 400), (0, 0, 0, 0))
    ImageDraw.Draw(glow).rounded_rectangle((200, 240, 200 + w, 240 + h), radius=radius + pad, fill=(16, 185, 129, 100))
    glow = glow.filter(ImageFilter.GaussianBlur(90))
    glow.alpha_composite(body, (200, 200))
    return glow

def compose(lang, w, h, name):
    img = background(w, h); d = ImageDraw.Draw(img)
    m = int(w * 0.06)
    # Logo et nom, discrets, en haut à gauche.
    logo = Image.open(os.path.join(SITE, "logo.png")).convert("RGBA")
    ls = int(h * 0.07); logo = logo.resize((ls, ls), Image.LANCZOS)
    img.paste(logo, (m, m), logo)
    d.text((m + ls + int(ls * 0.35), m + int(ls * 0.17)), "NETbudget", font=font("en", int(ls * 0.6)), fill=WHITE)

    # Deux téléphones côte à côte, tous deux lisibles : le reste à vivre à
    # gauche, le projet (son nom, son budget prévu, sa mensualité) à droite,
    # légèrement plus bas. Les écrans dépassent le bord bas : on ne voit que
    # la partie haute, celle qui compte.
    ph_h = int(h * 0.80)
    budget = phone(os.path.join(CAPS, f"{lang}-budget.png"), ph_h)
    projet = phone(os.path.join(CAPS, f"{lang}-projet.png"), ph_h)
    gap = int(w * 0.012)
    total = budget.width + projet.width - 400 + gap  # 200 px de marge de lueur de chaque côté
    x0 = int(w * 0.95) - total - 200
    top = int(h * 0.16)
    img.paste(budget, (x0, top), budget)
    img.paste(projet, (x0 + budget.width - 400 + gap, top + int(h * 0.06)), projet)
    # Accroche : grande, deux lignes, centrée verticalement dans la colonne.
    text_w = x0 - int(w * 0.03) - m
    head = shape(lang, COPY[lang])
    size = int(h * 0.15)
    while size > int(h * 0.05):
        f = font(lang, size)
        if max(d.textlength(l, font=f) for l in head.split("\n")) <= text_w: break
        size -= int(h * 0.003)
    anchor_x, anchor, align = (m + text_w, "ra", "right") if lang == "ar" else (m, "la", "left")
    bbox = d.multiline_textbbox((anchor_x, 0), head, font=f, spacing=int(h * 0.02), anchor=anchor)
    y = (h - (bbox[3] - bbox[1])) // 2
    d.multiline_text((anchor_x, y), head, font=f, fill=WHITE, spacing=int(h * 0.02), align=align, anchor=anchor)
    # Un trait menthe sous l'accroche : le seul ornement.
    ly = y + (bbox[3] - bbox[1]) + int(h * 0.05)
    lx = (m + text_w - int(w * 0.07)) if lang == "ar" else m
    d.rounded_rectangle((lx, ly, lx + int(w * 0.07), ly + int(h * 0.012)), radius=int(h * 0.006), fill=MINT_DIM)

    # Deux téléphones : le reste à vivre devant, le projet derrière, décalé.
    img.save(os.path.join(OUT, f"{name}-{lang}.png"), optimize=True)

if __name__ == "__main__":
    for lang in COPY:
        compose(lang, 5244, 2950, "en-tete-5244x2950")
        compose(lang, 3840, 1646, "recherche-3840x1646")
        print(lang, "ok")
