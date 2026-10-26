#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Affiche de remerciement : 500 personnes utilisent NETbudget (octobre 2026).

Trois formats, en français et en anglais : carré 1080 × 1080 (Instagram,
Facebook), story 1080 × 1920, paysage 1920 × 1080 (site, LinkedIn). Même
charte que les fiches : fond nuit, anneau 50/30/20 aux couleurs de l'app,
le chiffre en très grand, un seul mot de titre. Aucun emoji, aucun prix,
aucun chiffre autre que celui-ci.

    marketing/promo-video/.venv/bin/python marketing/merci-500/affiche.py
"""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "appstore", "2.0"))
from PIL import Image, ImageDraw, ImageFilter
from visuels import font, SITE, INK, NAVY, MINT, MINT_DIM, WHITE

BESOINS, ENVIES, EPARGNE = (16, 185, 129), (168, 85, 247), (245, 158, 11)
GREY = (161, 161, 170)
T = {
 "fr": {"n": "500", "title": "Merci.", "sub": "500 personnes utilisent NETbudget.", "line": "Sans connexion bancaire, sans publicité. Un budget qui reste à vous.", "foot": "netbudget.app · La 2.0 arrive le 15 novembre"},
 "en": {"n": "500", "title": "Thank you.", "sub": "500 people now use NETbudget.", "line": "No bank connection, no ads. A budget that stays yours.", "foot": "netbudget.app · 2.0 ships November 15"},
}

def bg(w, h):
    img = Image.new("RGB", (w, h), INK)
    grad = Image.new("RGB", (1, h))
    for y in range(h):
        t = 1 - abs(y / h - 0.45) * 1.6
        grad.putpixel((0, y), tuple(int(INK[i] + (NAVY[i] - INK[i]) * max(0, t)) for i in range(3)))
    img.paste(grad.resize((w, h)))
    halo = Image.new("RGB", (w, h), (0, 0, 0)); d = ImageDraw.Draw(halo)
    r = int(min(w, h) * 0.55); cx, cy = int(w * 0.5), int(h * 0.42)
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(16, 64, 52))
    halo = halo.filter(ImageFilter.GaussianBlur(min(w, h) * 0.22))
    return Image.blend(img, Image.composite(halo, img, halo.convert("L").point(lambda v: min(255, v * 3))), 0.55)

def ring(img, cx, cy, radius, width, alpha=255):
    S = 3
    layer = Image.new("RGBA", (img.width * S, img.height * S), (0, 0, 0, 0)); d = ImageDraw.Draw(layer)
    box = [(cx - radius) * S, (cy - radius) * S, (cx + radius) * S, (cy + radius) * S]
    start = -90
    for part, color in ((50, BESOINS), (30, ENVIES), (20, EPARGNE)):
        sweep = 360 * part / 100
        d.arc(box, start + 2, start + sweep - 2, fill=color + (alpha,), width=width * S); start += sweep
    layer = layer.resize(img.size, Image.LANCZOS); img.paste(layer, (0, 0), layer)

def wrap(d, text, f, max_w):
    words, lines, cur = text.split(), [], ""
    for wd in words:
        trial = (cur + " " + wd).strip()
        if d.textlength(trial, font=f) <= max_w or not cur: cur = trial
        else: lines.append(cur); cur = wd
    if cur: lines.append(cur)
    return lines

def center(d, text, f, y, fill, w):
    tw = d.textlength(text, font=f); d.text(((w - tw) / 2, y), text, font=f, fill=fill)

def compose(lang, w, h, name):
    t = T[lang]; img = bg(w, h); d = ImageDraw.Draw(img)
    portrait = h > w
    landscape = w > h * 1.3
    # Trois mises en page : story (anneau haut, texte dessous), carré (anneau
    # plus petit, texte dessous), paysage (anneau à gauche, texte à droite).
    if portrait:
        cx, cy, R = w // 2, int(h * 0.40), int(w * 0.36)
    elif landscape:
        cx, cy, R = int(w * 0.30), int(h * 0.47), int(h * 0.30)
    else:
        cx, cy, R = w // 2, int(h * 0.29), int(w * 0.20)
    ring(img, cx, cy, R, int(R * 0.14), alpha=235)
    d = ImageDraw.Draw(img)
    f_n = font("en", int(R * 1.05))
    tw = d.textlength(t["n"], font=f_n); bbox = f_n.getbbox(t["n"]); th = bbox[3] - bbox[1]
    d.text((cx - tw / 2, cy - th / 2 - bbox[1]), t["n"], font=f_n, fill=WHITE)
    base = min(w, h)
    f_t = font("en", int(base * (0.11 if portrait else 0.09)))
    f_s = font("en", int(base * 0.045))
    f_l = font("en", int(base * 0.03))
    if landscape:
        x = int(w * 0.56); y = int(h * 0.30)
        d.text((x, y), t["title"], font=f_t, fill=MINT); y += int(f_t.size * 1.25)
        d.text((x, y), t["sub"], font=f_s, fill=WHITE); y += int(f_s.size * 1.6)
        for line in wrap(d, t["line"], f_l, w - x - int(w * 0.06)):
            d.text((x, y), line, font=f_l, fill=GREY); y += int(f_l.size * 1.4)
    else:
        y = cy + R + int(R * (0.32 if portrait else 0.28))
        center(d, t["title"], f_t, y, MINT, w); y += int(f_t.size * 1.25)
        center(d, t["sub"], f_s, y, WHITE, w); y += int(f_s.size * 1.6)
        for line in wrap(d, t["line"], f_l, int(w * 0.86)):
            center(d, line, f_l, y, GREY, w); y += int(f_l.size * 1.4)
    # logo et pied
    s = int(min(w, h) * 0.07)
    logo = Image.open(os.path.join(SITE, "logo.png")).convert("RGB").resize((s, s), Image.LANCZOS)
    mask = Image.new("L", (s * 4, s * 4), 0); ImageDraw.Draw(mask).rounded_rectangle([0, 0, s * 4 - 1, s * 4 - 1], radius=int(s * 4 * 0.22), fill=255)
    mask = mask.resize((s, s), Image.LANCZOS)
    f_f = font("en", int(min(w, h) * 0.026))
    fw = d.textlength(t["foot"], font=f_f); gap = int(s * 0.3)
    x0 = (w - (s + gap + fw)) / 2; y0 = h - int(min(w, h) * 0.09) - s
    img.paste(logo, (int(x0), y0), mask)
    d.text((x0 + s + gap, y0 + (s - f_f.size) / 2 - 2), t["foot"], font=f_f, fill=GREY)
    out = os.path.join(HERE, f"merci-500-{name}-{lang}.png"); img.save(out, optimize=True); print(out, img.size)

if __name__ == "__main__":
    for lang in ("fr", "en"):
        compose(lang, 1080, 1080, "carre"); compose(lang, 1080, 1920, "story"); compose(lang, 1920, 1080, "paysage")
