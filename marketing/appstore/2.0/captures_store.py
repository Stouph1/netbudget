#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Captures d'écran de la fiche App Store, 2.0, huit langues, trois formats.

Formats acceptés par App Store Connect (relevés dans la console) :
  - iPhone avec Dynamic Island (6,1 / 6,3 pouces) : 1206 × 2622
  - iPhone Duo : 1398 × 2034
  - iPad 13 pouces : 2064 × 2752

Cinq captures par langue et par format, dans l'ordre de la fiche : le reste à
vivre, un projet, le Coach, les espaces partagés, les dépenses. Chaque image :
fond nuit, une accroche en haut, l'écran de l'app dans un cadre. Les écrans
viennent de captures/<lang>-<ecran>.png (iPhone) et captures/ipad/ (iPad).

    marketing/promo-video/.venv/bin/python marketing/appstore/2.0/captures_store.py

Sortie : images/store/<format>/<lang>/<n>-<ecran>.png
"""
import os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from PIL import Image, ImageDraw, ImageFilter
from visuels import font, shape, WHITE, MINT_DIM, INK, NAVY
from evenement import mixed, mixed_width

CAPS = os.path.join(HERE, "captures")
OUT = os.path.join(HERE, "images", "store")
FORMATS = {"iphone-dynamic-island": (1206, 2622), "iphone-duo": (1398, 2034), "ipad-13": (2064, 2752)}
SCREENS = ["budget", "projet", "coach", "espaces", "depenses"]
CAPTIONS = {
 "fr": ["Sache ce qu'il te reste\nvraiment chaque mois", "Un budget\npar projet", "282 conseils qui\ncitent leurs sources", "Un budget à deux\nou en famille", "Un budget qui se lit\nd'un coup d'œil"],
 "en": ["Know what you really\nhave left each month", "One budget\nper project", "282 tips that\ncite their sources", "A budget for two\nor for the family", "A budget you read\nat a glance"],
 "es": ["Sabe lo que te queda\nde verdad cada mes", "Un presupuesto\npor proyecto", "282 consejos que\ncitan sus fuentes", "Un presupuesto en pareja\no en familia", "Un presupuesto que se lee\nde un vistazo"],
 "pt": ["Sabe o que te sobra\nmesmo todos os meses", "Um orçamento\npor projeto", "282 dicas que\ncitam as fontes", "Um orçamento a dois\nou em família", "Um orçamento que se lê\nnum relance"],
 "de": ["Wissen, was dir jeden\nMonat wirklich bleibt", "Ein Budget\npro Projekt", "282 Tipps, die ihre\nQuellen nennen", "Ein Budget zu zweit\noder als Familie", "Ein Budget auf\neinen Blick"],
 "it": ["Sai quanto ti resta\ndavvero ogni mese", "Un budget\nper progetto", "282 consigli che\ncitano le fonti", "Un budget in coppia\no in famiglia", "Un budget che si legge\na colpo d'occhio"],
 "ar": ["اعرف ما يتبقّى لك\nفعلًا كل شهر", "ميزانية\nلكل مشروع", "282 نصيحة\nتذكر مصادرها", "ميزانية لاثنين\nأو للعائلة", "ميزانية تُقرأ\nبنظرة واحدة"],
 "ja": ["毎月、本当に残る\nお金がわかる", "プロジェクトごとの\n予算", "出典を示す\n282のアドバイス", "二人で、家族で\n使える家計", "ひと目でわかる\n家計"],
}

def bg(w, h):
    img = Image.new("RGB", (w, h), INK)
    grad = Image.new("RGB", (1, h))
    for y in range(h):
        t = max(0, 1 - abs(y / h - 0.6) * 2)
        grad.putpixel((0, y), tuple(int(INK[i] + (NAVY[i] - INK[i]) * t) for i in range(3)))
    img.paste(grad.resize((w, h)))
    halo = Image.new("RGB", (w, h), (0, 0, 0)); d = ImageDraw.Draw(halo)
    r = int(w * 0.75); d.ellipse((w // 2 - r, int(h * 0.62) - r, w // 2 + r, int(h * 0.62) + r), fill=(16, 64, 52))
    halo = halo.filter(ImageFilter.GaussianBlur(w * 0.25))
    return Image.blend(img, Image.composite(halo, img, halo.convert("L").point(lambda v: min(255, v * 3))), 0.6)

def framed(path, width, radius_ratio=0.085):
    cap = Image.open(path).convert("RGB")
    sw = width; sh = int(sw * cap.height / cap.width)
    cap = cap.resize((sw, sh), Image.LANCZOS)
    pad = int(sw * 0.025); radius = int(sw * radius_ratio)
    w, h = sw + 2 * pad, sh + 2 * pad
    body = Image.new("RGBA", (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(body)
    d.rounded_rectangle((0, 0, w - 1, h - 1), radius=radius + pad, fill=(22, 24, 32, 255), outline=(255, 255, 255, 45), width=max(2, pad // 4))
    mask = Image.new("L", (sw, sh), 0); ImageDraw.Draw(mask).rounded_rectangle((0, 0, sw - 1, sh - 1), radius=radius, fill=255)
    body.paste(cap, (pad, pad), mask)
    g = int(sw * 0.3)
    glow = Image.new("RGBA", (w + 2 * g, h + 2 * g), (0, 0, 0, 0))
    ImageDraw.Draw(glow).rounded_rectangle((g, g + int(sw * 0.06), g + w, g + int(sw * 0.06) + h), radius=radius + pad, fill=(16, 185, 129, 90))
    glow = glow.filter(ImageFilter.GaussianBlur(sw * 0.12)); glow.alpha_composite(body, (g, g))
    return glow, g

def compose(lang, fmt, n, screen, w, h, cap_path):
    img = bg(w, h); d = ImageDraw.Draw(img); m = int(w * 0.07)
    text = CAPTIONS[lang][n]
    lines = text.split("\n")
    size = int(w * 0.085)
    while size > int(w * 0.04) and max(mixed_width(d, lang, l, size) for l in lines) > w - 2 * m: size -= int(w * 0.003)
    y = int(h * 0.055); lh = int(size * 1.18)
    for l in lines:
        mixed(d, w // 2, y, lang, l, size, WHITE, "ma"); y += lh
    d.rounded_rectangle((w // 2 - int(w * 0.05), y + int(h * 0.012), w // 2 + int(w * 0.05), y + int(h * 0.012) + int(h * 0.005)), radius=int(h * 0.0025), fill=MINT_DIM)
    top = y + int(h * 0.045)
    ipad = fmt == "ipad-13"
    fw = int(w * (0.86 if ipad else 0.80))
    ph, g = framed(cap_path, fw, 0.06 if ipad else 0.085)
    img.paste(ph, ((w - ph.width) // 2, top - g), ph)
    out = os.path.join(OUT, fmt, lang); os.makedirs(out, exist_ok=True)
    img.save(os.path.join(out, f"{n + 1}-{screen}.png"), optimize=True)

if __name__ == "__main__":
    only = sys.argv[1:] or list(FORMATS)
    missing = []
    for fmt in only:
        w, h = FORMATS[fmt]
        for lang in CAPTIONS:
            for n, screen in enumerate(SCREENS):
                path = os.path.join(CAPS, "ipad" if fmt == "ipad-13" else "", f"{lang}-{screen}.png")
                if not os.path.exists(path): missing.append(f"{fmt}/{lang}-{screen}"); continue
                compose(lang, fmt, n, screen, w, h, path)
        print(fmt, "ok")
    if missing: print("MANQUANT :", ", ".join(missing))
