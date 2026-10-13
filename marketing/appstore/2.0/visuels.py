#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""En-tête et visuel de résultats de recherche de la fiche App Store, 2.0.

Deux tailles imposées par App Store Connect :
  - en-tête de page produit : 5244 × 2950 px
  - résultats de recherche : 3840 × 1646 px

Un visuel par langue (fr, en, es, pt, de, it, ar, ja) : fond nuit, halo
menthe, une accroche courte dans la langue, et trois vrais écrans de l'app
dans des téléphones. Les écrans français servent au français, les écrans
anglais (Londres, livres sterling) aux sept autres langues : l'app y est
traduite, mais seules ces deux séries de captures existent.

    marketing/promo-video/.venv/bin/python marketing/appstore/2.0/visuels.py

Sortie : marketing/appstore/2.0/images/<taille>-<lang>.png
"""
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = "/Users/stephane.pizeuil/projet/netbudget-main/website/public"
OUT = os.path.join(HERE, "images")
os.makedirs(OUT, exist_ok=True)

NAVY, NAVY2, INK = (10, 18, 36), (15, 30, 61), (10, 10, 12)
MINT, MINT_DIM, WHITE, GREY = (110, 231, 183), (16, 185, 129), (250, 250, 250), (168, 179, 199)

COPY = {
  "fr": ("Sache ce qu'il te reste\nvraiment chaque mois.", "Budget, Coach sourcé, espaces partagés. Sans connexion bancaire."),
  "en": ("Know what you really\nhave left each month.", "Budget, sourced Coach, shared spaces. No bank connection."),
  "es": ("Sabe lo que te queda\nde verdad cada mes.", "Presupuesto, Coach con fuentes, espacios compartidos. Sin conexión bancaria."),
  "pt": ("Sabe o que te sobra\nmesmo todos os meses.", "Orçamento, Coach com fontes, espaços partilhados. Sem ligação ao banco."),
  "de": ("Wissen, was dir jeden\nMonat wirklich bleibt.", "Budget, belegter Coach, geteilte Bereiche. Ohne Bankverbindung."),
  "it": ("Sai quanto ti resta\ndavvero ogni mese.", "Budget, Coach con fonti, spazi condivisi. Senza collegamento alla banca."),
  "ar": ("اعرف ما يتبقّى لك\nفعلًا كل شهر.", "ميزانية، مرشد موثّق، مساحات مشتركة. دون ربط بالبنك."),
  "ja": ("毎月、本当に残るお金が\nわかる。", "家計、出典つきコーチ、共有スペース。銀行連携なし。"),
}
SCREENS = {"fr": ["budget", "coach", "espaces"], "en": ["budget", "coach", "espaces"]}

def font(lang, size, bold=True):
    """Police système adaptée à l'écriture. Repli sur Arial Unicode."""
    cands = {
        "ja": [("/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc", 0), ("/System/Library/Fonts/Hiragino Sans GB.ttc", 0), ("/Library/Fonts/Arial Unicode.ttf", 0)],
        "ar": [("/System/Library/Fonts/GeezaPro.ttc", 1 if bold else 0), ("/Library/Fonts/Arial Unicode.ttf", 0)],
    }.get(lang, [("/System/Library/Fonts/HelveticaNeue.ttc", 1 if bold else 0), ("/System/Library/Fonts/Helvetica.ttc", 1 if bold else 0)])
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
    # Dégradé vertical nuit, puis halo menthe à droite (derrière les téléphones).
    grad = Image.new("RGB", (1, h))
    for y in range(h):
        t = y / h
        grad.putpixel((0, y), tuple(int(INK[i] + (NAVY[i] - INK[i]) * (1 - abs(t - 0.5) * 2) * 0.9) for i in range(3)))
    img.paste(grad.resize((w, h)))
    halo = Image.new("RGB", (w, h), (0, 0, 0)); d = ImageDraw.Draw(halo)
    r = int(h * 0.75); cx, cy = int(w * 0.72), int(h * 0.5)
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(18, 70, 56))
    r2 = int(h * 0.35); cx2, cy2 = int(w * 0.18), int(h * 0.85)
    d.ellipse((cx2 - r2, cy2 - r2, cx2 + r2, cy2 + r2), fill=(12, 40, 60))
    halo = halo.filter(ImageFilter.GaussianBlur(h * 0.18))
    return Image.blend(img, Image.composite(halo, img, halo.convert("L").point(lambda v: min(255, v * 3))), 0.55)

def phone(capture_path, height):
    """Un téléphone : coins arrondis, liseré, lueur douce. Renvoie une image RGBA."""
    cap = Image.open(capture_path).convert("RGB")
    ratio = cap.width / cap.height
    sh = height; sw = int(sh * ratio)
    cap = cap.resize((sw, sh), Image.LANCZOS)
    pad = int(sh * 0.012); radius = int(sh * 0.085)
    w, h = sw + 2 * pad, sh + 2 * pad
    body = Image.new("RGBA", (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(body)
    d.rounded_rectangle((0, 0, w - 1, h - 1), radius=radius + pad, fill=(22, 24, 32, 255), outline=(255, 255, 255, 40), width=max(2, pad // 3))
    mask = Image.new("L", (sw, sh), 0); ImageDraw.Draw(mask).rounded_rectangle((0, 0, sw - 1, sh - 1), radius=radius, fill=255)
    body.paste(cap, (pad, pad), mask)
    # Lueur sous le téléphone
    glow = Image.new("RGBA", (w + 400, h + 400), (0, 0, 0, 0))
    ImageDraw.Draw(glow).rounded_rectangle((200, 230, 200 + w, 230 + h), radius=radius + pad, fill=(16, 185, 129, 110))
    glow = glow.filter(ImageFilter.GaussianBlur(90))
    glow.alpha_composite(body, (200, 200))
    return glow

def compose(lang, w, h, name):
    img = background(w, h)
    d = ImageDraw.Draw(img)
    # Marges proportionnelles
    m = int(w * 0.055)
    # Logo + nom
    logo = Image.open(os.path.join(SITE, "logo.png")).convert("RGBA")
    ls = int(h * 0.075); logo = logo.resize((ls, ls), Image.LANCZOS)
    img.paste(logo, (m, m), logo)
    f_name = font("en", int(ls * 0.62))
    d.text((m + ls + int(ls * 0.35), m + int(ls * 0.16)), "NETbudget", font=f_name, fill=WHITE)

    # Accroche
    head, sub = COPY[lang]
    text_w = int(w * 0.46)
    # L'accroche se réduit jusqu'à tenir dans sa colonne : une ligne qui passe
    # sous les téléphones est une accroche illisible.
    size = int(h * 0.105)
    while size > int(h * 0.05):
        f_head = font(lang, size)
        if max(ImageDraw.Draw(img).textlength(shape(lang, l), font=f_head) for l in head.split("\n")) <= text_w: break
        size -= int(h * 0.004)
    f_sub = font(lang, int(h * 0.04), bold=False)
    y = int(h * 0.30)
    if lang == "ar":
        # Droite à gauche : le texte s'aligne au bord droit de sa colonne.
        anchor_x = m + text_w; align = "right"; anchor = "ra"
    else:
        anchor_x = m; align = "left"; anchor = "la"
    d.multiline_text((anchor_x, y), shape(lang, head), font=f_head, fill=WHITE, spacing=int(h * 0.02), align=align, anchor=anchor)
    bbox = d.multiline_textbbox((anchor_x, y), shape(lang, head), font=f_head, spacing=int(h * 0.02), anchor=anchor)
    # Sous-titre, en deux lignes si trop long
    sub_s = shape(lang, sub)
    # Japonais : pas d'espaces, on coupe au caractère, sinon au mot.
    units = list(sub_s) if lang == "ja" else sub_s.split(" ")
    joiner = "" if lang == "ja" else " "
    lines = []; cur = ""
    for wd in units:
        trial = (cur + joiner + wd) if cur else wd
        if d.textlength(trial, font=f_sub) > text_w and cur: lines.append(cur); cur = wd
        else: cur = trial
    lines.append(cur)
    if lang == "ar": lines = lines[::-1] if len(lines) > 1 else lines
    d.multiline_text((anchor_x, bbox[3] + int(h * 0.05)), "\n".join(lines), font=f_sub, fill=GREY, spacing=int(h * 0.015), align=align, anchor=anchor)

    # Pastille « 2.0 »
    f_pill = font("en", int(h * 0.034))
    pill_txt = "2.0"; pw = int(d.textlength(pill_txt, font=f_pill)) + int(h * 0.05); ph = int(h * 0.062)
    px, py = (m + text_w - pw) if lang == "ar" else m, int(h * 0.20)
    d.rounded_rectangle((px, py, px + pw, py + ph), radius=ph // 2, fill=(16, 185, 129, 40), outline=MINT_DIM, width=max(2, h // 500))
    d.text((px + pw / 2, py + ph / 2), pill_txt, font=f_pill, fill=MINT, anchor="mm")

    # Téléphones : trois écrans, le central devant.
    series = "fr" if lang == "fr" else "en"
    keys = SCREENS[series]
    ph_h = int(h * 0.82)
    phones = [phone(os.path.join(SITE, "screens", series, f"{k}-720.png"), ph_h if i == 1 else int(ph_h * 0.86)) for i, k in enumerate(keys)]
    cx = int(w * 0.72); base_y = int(h * 0.5)
    spread = int(w * 0.11)
    order = [0, 2, 1]  # les latéraux d'abord, le central par-dessus
    for i in order:
        p = phones[i]; dx = (i - 1) * spread
        x = cx + dx - p.width // 2; yy = base_y - p.height // 2 + (0 if i == 1 else int(h * 0.04))
        img.paste(p, (x, yy), p)

    img.save(os.path.join(OUT, f"{name}-{lang}.png"), optimize=True)

if __name__ == "__main__":
    for lang in COPY:
        compose(lang, 5244, 2950, "en-tete-5244x2950")
        compose(lang, 3840, 1646, "recherche-3840x1646")
        print(lang, "ok")
