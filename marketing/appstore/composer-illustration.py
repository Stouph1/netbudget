#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Reprend une illustration generee et en fait l'image d'abonnement finale.

POURQUOI CE SCRIPT PLUTOT QU'UN OUTIL D'IMAGE :

1. LE FOND EST A REFAIRE. Le modele a rendu « degrade diagonal » comme une
   coupure franche : une ligne traverse toute l'image. On isole donc les
   formes coloree et on les repose sur un degrade propre.

2. LE TEXTE EST AJOUTE ICI, pas par le modele. Les generateurs d'image
   produisent presque toujours des lettres deformees — le nom d'une marque ne
   se confie pas a eux.

3. C'est REPRODUCTIBLE. Une nouvelle illustration, une commande, et les quatre
   fichiers sont regeneres a l'identique.

Usage :
    marketing/promo-video/.venv/bin/python marketing/appstore/composer-illustration.py <illustration.png>
"""

import os
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
SIZE = 1024

INK = (10, 10, 12)
MIDNIGHT = (15, 30, 61)
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


def gradient(w, h):
    """Degrade diagonal DOUX, calcule pixel par pixel. Aucune couture."""
    g = Image.new("RGB", (w, h))
    px = g.load()
    for y in range(h):
        for x in range(w):
            k = (x / w) * 0.35 + (y / h) * 0.65
            px[x, y] = tuple(int(INK[i] + (MIDNIGHT[i] - INK[i]) * k) for i in range(3))
    return g


def isolate(src):
    """Masque des formes colorees, en ignorant le fond sombre.

    Le critere est la LUMINOSITE, pas une couleur precise : les arcs sont
    satures et clairs, le fond est sombre quelle que soit sa teinte. Cela
    fonctionne donc des deux cotes de la coupure, ce qu'un simple « retire
    cette couleur » ne ferait pas.
    """
    rgb = src.convert("RGB")
    w, h = rgb.size
    mask = Image.new("L", (w, h), 0)
    mpx = mask.load()
    spx = rgb.load()

    for y in range(h):
        for x in range(w):
            r, g, b = spx[x, y]
            lum = 0.299 * r + 0.587 * g + 0.114 * b
            # Seuil bas : le fond le plus clair de l'image monte a ~40 de
            # luminosite, les formes demarrent bien au-dessus.
            if lum > 60:
                mpx[x, y] = 255
            elif lum > 42:
                # Zone de transition : demi-opacite, pour ne pas decouper les
                # bords en escalier.
                mpx[x, y] = int((lum - 42) / 18 * 255)

    # Un flou tres leger adoucit le contour sans manger les formes.
    return mask.filter(ImageFilter.GaussianBlur(0.6))


def centered(d, text, f, y, fill):
    w = d.textlength(text, font=f)
    d.text(((SIZE - w) / 2, y), text, font=f, fill=fill)


def compose(illustration_path, filename, tier_label):
    src = Image.open(illustration_path).convert("RGB")
    if src.size != (SIZE, SIZE):
        src = src.resize((SIZE, SIZE), Image.LANCZOS)

    img = gradient(SIZE, SIZE)

    # RECADRAGE SUR LE CONTENU REEL. L'illustration generee porte ses propres
    # marges, differentes a chaque generation. S'y fier laisse un vide entre le
    # motif et le nom de marque, et ce vide change d'une image a l'autre. On
    # decoupe donc sur la boite englobante des formes : la mise en page devient
    # previsible quelle que soit l'illustration fournie.
    mask = isolate(src)
    box = mask.getbbox()
    if box:
        src = src.crop(box)
        mask = mask.crop(box)

    # Carre, pour ne pas deformer : on complete le cote le plus court.
    w, h = src.size
    side = max(w, h)
    square = Image.new("RGB", (side, side), INK)
    square_mask = Image.new("L", (side, side), 0)
    off = ((side - w) // 2, (side - h) // 2)
    square.paste(src, off)
    square_mask.paste(mask, off)

    art_size = 620
    art = square.resize((art_size, art_size), Image.LANCZOS)
    art_mask = square_mask.resize((art_size, art_size), Image.LANCZOS)
    img.paste(art, ((SIZE - art_size) // 2, 110), art_mask)

    d = ImageDraw.Draw(img)

    f_brand = bold(76)
    net_w = d.textlength("NET", font=f_brand)
    budget_w = d.textlength("budget", font=f_brand)
    x = (SIZE - (net_w + budget_w)) / 2
    d.text((x, 786), "NET", font=f_brand, fill=TEXT_1)
    d.text((x + net_w, 786), "budget", font=f_brand, fill=MINT_LIGHT)

    if tier_label:
        f_tier = bold(38)
        letters = tier_label.upper()
        total = sum(d.textlength(c, font=f_tier) + 8 for c in letters) - 8
        x = (SIZE - total) / 2
        for c in letters:
            d.text((x, 888), c, font=f_tier, fill=TEXT_2)
            x += d.textlength(c, font=f_tier) + 8
    else:
        centered(d, "Sache ce qu'il te reste", regular(36), 886, TEXT_2)

    out = os.path.join(HERE, filename)
    img.save(out, "PNG", optimize=True)
    print(f"  {filename}  ({os.path.getsize(out) // 1024} Ko)")


def main():
    if len(sys.argv) < 2:
        print("Usage : composer-illustration.py <illustration.png>", file=sys.stderr)
        return 1
    src = sys.argv[1]
    if not os.path.exists(src):
        print(f"Introuvable : {src}", file=sys.stderr)
        return 1

    print("Images composees :")
    compose(src, "abonnement-solo-1024.png", "Solo")
    compose(src, "abonnement-duo-1024.png", "Duo")
    compose(src, "abonnement-famille-1024.png", "Famille")
    compose(src, "abonnement-1024.png", "")
    return 0


if __name__ == "__main__":
    sys.exit(main())
