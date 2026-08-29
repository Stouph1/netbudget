#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Image 1024x1024 de l'abonnement, pour App Store Connect.

OU ELLE APPARAIT : dans les offres de reconquete, a l'activation d'un code
promotionnel, et sur la fiche produit si la promotion App Store est activee.
Donc devant quelqu'un qui hesite ou qui vient de recevoir un code.

TROIS REGLES QUE JE ME SUIS DONNEES :

1. AUCUN PRIX. Ils varient par pays et changent avec le temps ; une image ne se
   met pas a jour. Un montant grave ici finirait par contredire ce qui est
   debite — c'est le meme raisonnement que pour le code de l'app.

2. LISIBLE A 60 PIXELS. Apple la reduit fortement selon les emplacements. Un
   visuel charge devient une bouillie grise. D'ou une forme unique, large, et
   trois mots au maximum.

3. LE VISUEL DIT LE PRODUIT. L'anneau reprend la repartition 50/30/20 avec les
   couleurs exactes de l'application — besoins, envies, epargne. Ce n'est pas
   une decoration : quelqu'un qui a deja ouvert l'app la reconnait.

Usage :
    marketing/promo-video/.venv/bin/python marketing/appstore/generer-image-abonnement.py
"""

import math
import os
import sys

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
LOGO = os.path.join(ROOT, "website", "public", "logo.png")

SIZE = 1024

# Couleurs de l'app, a l'identique.
INK = (10, 10, 12)
MIDNIGHT = (15, 30, 61)
BESOINS = (16, 185, 129)   # #10B981
ENVIES = (168, 85, 247)    # #A855F7
EPARGNE = (245, 158, 11)   # #F59E0B
TEXT_1 = (250, 250, 250)
TEXT_2 = (161, 161, 170)
MINT_LIGHT = (110, 231, 183)

FONT_DIRS = ["/System/Library/Fonts/Supplemental", "/System/Library/Fonts", "/Library/Fonts"]


def font(name, size):
    for d in FONT_DIRS:
        p = os.path.join(d, name)
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default(size)


bold = lambda s: font("Arial Bold.ttf", s)
regular = lambda s: font("Arial.ttf", s)


def gradient():
    """Fond en degrade diagonal doux, comme le heros du site."""
    g = Image.new("RGB", (SIZE, SIZE))
    px = g.load()
    for y in range(SIZE):
        for x in range(0, SIZE, 4):
            k = (x / SIZE * 0.35 + y / SIZE * 0.65)
            c = tuple(int(INK[i] + (MIDNIGHT[i] - INK[i]) * k) for i in range(3))
            for dx in range(4):
                if x + dx < SIZE:
                    px[x + dx, y] = c
    return g


def ring(img, cx, cy, radius, width):
    """Anneau 50/30/20 aux couleurs de l'application.

    Dessine en supersampling x4 : a cette taille, un arc non lisse se voit
    immediatement, et Apple affiche l'image jusqu'en pleine largeur.
    """
    S = 4
    layer = Image.new("RGBA", (SIZE * S, SIZE * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)

    box = [
        (cx - radius) * S, (cy - radius) * S,
        (cx + radius) * S, (cy + radius) * S,
    ]

    # On part du haut, dans le sens horaire. Un petit vide entre les segments
    # les separe sans avoir a tracer de contour.
    GAP = 3
    start = -90
    for part, color in ((50, BESOINS), (30, ENVIES), (20, EPARGNE)):
        sweep = 360 * part / 100
        d.arc(box, start + GAP / 2, start + sweep - GAP / 2, fill=color, width=width * S)
        start += sweep

    layer = layer.resize((SIZE, SIZE), Image.LANCZOS)
    img.paste(layer, (0, 0), layer)


def centered(d, text, f, y, fill):
    w = d.textlength(text, font=f)
    d.text(((SIZE - w) / 2, y), text, font=f, fill=fill)
    return w


def build(filename, tier_label):
    img = gradient()
    d = ImageDraw.Draw(img)

    # --- Anneau, centre haut ------------------------------------------------
    cx, cy, r = SIZE / 2, 415, 205
    ring(img, cx, cy, r, 56)
    d = ImageDraw.Draw(img)

    # --- Logo au centre de l'anneau ----------------------------------------
    #
    # logo.png n'a AUCUN canal alpha : ses coins sont blancs. Le coller tel quel
    # dessine un carre blanc au milieu de l'anneau. On lui applique donc un
    # masque aux coins arrondis, au meme rayon que l'icone elle-meme.
    if os.path.exists(LOGO):
        s = 150
        logo = Image.open(LOGO).convert("RGB").resize((s, s), Image.LANCZOS)

        S = 4  # masque dessine en plus grand puis reduit : bords lisses
        mask = Image.new("L", (s * S, s * S), 0)
        ImageDraw.Draw(mask).rounded_rectangle(
            [0, 0, s * S - 1, s * S - 1], radius=int(s * S * 0.225), fill=255,
        )
        mask = mask.resize((s, s), Image.LANCZOS)

        img.paste(logo, (int(cx - s / 2), int(cy - s / 2)), mask)

    # --- Nom de marque ------------------------------------------------------
    f_brand = bold(78)
    net_w = d.textlength("NET", font=f_brand)
    budget_w = d.textlength("budget", font=f_brand)
    x = (SIZE - (net_w + budget_w)) / 2
    d.text((x, 700), "NET", font=f_brand, fill=TEXT_1)
    d.text((x + net_w, 700), "budget", font=f_brand, fill=MINT_LIGHT)

    # --- Palier -------------------------------------------------------------
    if tier_label:
        f_tier = bold(40)
        # Lettrage espace a la main : Pillow n'a pas de letter-spacing, et sans
        # lui un mot court en capitales parait tasse.
        letters = tier_label.upper()
        total = sum(d.textlength(c, font=f_tier) + 8 for c in letters) - 8
        x = (SIZE - total) / 2
        for c in letters:
            d.text((x, 806), c, font=f_tier, fill=TEXT_2)
            x += d.textlength(c, font=f_tier) + 8

    # --- Accroche -----------------------------------------------------------
    centered(d, "Sache ce qu'il te reste", regular(38), 890, TEXT_2)

    out = os.path.join(HERE, filename)
    img.save(out, "PNG", optimize=True)
    print(f"  {filename}  {img.size[0]}x{img.size[1]}  ({os.path.getsize(out) // 1024} Ko)")


def main():
    print("Images d'abonnement :")
    build("abonnement-solo-1024.png", "Solo")
    build("abonnement-duo-1024.png", "Duo")
    build("abonnement-famille-1024.png", "Famille")
    build("abonnement-1024.png", "")
    return 0


if __name__ == "__main__":
    sys.exit(main())
