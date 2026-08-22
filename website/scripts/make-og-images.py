#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Genere les images de partage sur les reseaux sociaux (Open Graph).

POURQUOI CE SCRIPT : le gabarit du site declarait <meta property="og:image"
content="/og-image.png"> alors que le fichier n'existait pas. Resultat, chaque
partage sur Instagram, WhatsApp, LinkedIn ou iMessage affichait un apercu vide
— le pire moment pour paraitre amateur, puisque c'est exactement quand
quelqu'un recommande l'app a un ami.

Format 1200x630 : ratio 1.91:1 attendu par toutes les plateformes. En PNG et
non en SVG, que ni Facebook ni Twitter ne savent lire.

Une image par page, pour que le partage d'une page precise dise de quoi elle
parle plutot que de renvoyer l'accroche generique.

Usage :
    marketing/promo-video/.venv/bin/python website/scripts/make-og-images.py
"""

import os
import sys

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
WEBSITE = os.path.dirname(HERE)
PUBLIC = os.path.join(WEBSITE, "public")
LOGO = os.path.join(PUBLIC, "logo.png")

W, H = 1200, 630

# Couleurs reprises de tailwind.config.mjs — une image de partage qui ne
# ressemble pas au site cree un doute au moment du clic.
INK = (10, 10, 12)
MIDNIGHT = (15, 30, 61)
MINT = (16, 185, 129)
MINT_LIGHT = (110, 231, 183)
TEXT_1 = (250, 250, 250)
TEXT_2 = (161, 161, 170)

FONT_DIRS = [
    "/System/Library/Fonts",
    "/System/Library/Fonts/Supplemental",
    "/Library/Fonts",
]


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    """Charge une police systeme, avec repli sur la police par defaut."""
    for d in FONT_DIRS:
        path = os.path.join(d, name)
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default(size)


def bold(size: int) -> ImageFont.FreeTypeFont:
    return font("Arial Bold.ttf", size)


def regular(size: int) -> ImageFont.FreeTypeFont:
    return font("Arial.ttf", size)


def vertical_gradient(top: tuple, bottom: tuple) -> Image.Image:
    """Degrade vertical — un fond plat fait daté sur un aperçu de partage."""
    grad = Image.new("RGB", (1, H))
    for y in range(H):
        k = y / (H - 1)
        grad.putpixel(
            (0, y),
            tuple(int(top[i] + (bottom[i] - top[i]) * k) for i in range(3)),
        )
    return grad.resize((W, H))


def glow(img: Image.Image) -> None:
    """Halo vert diffus en bas a droite, comme sur le site."""
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cx, cy = int(W * 0.86), int(H * 0.88)
    # Cercles concentriques de plus en plus transparents : un flou gaussien
    # coûterait un import de plus pour un rendu equivalent a cette echelle.
    for r in range(420, 0, -20):
        alpha = int(26 * (1 - r / 420))
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(*MINT, alpha))
    img.paste(Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB"), (0, 0))


def wrap(draw: ImageDraw.ImageDraw, text: str, f, max_w: int) -> list:
    """Coupe le texte aux mots pour tenir dans la largeur donnee."""
    words, lines, cur = text.split(), [], ""
    for w in words:
        trial = f"{cur} {w}".strip()
        if draw.textlength(trial, font=f) <= max_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def build(filename: str, eyebrow: str, title: str, subtitle: str) -> None:
    img = vertical_gradient(INK, MIDNIGHT)
    glow(img)
    d = ImageDraw.Draw(img)

    margin = 80
    y = margin

    # --- Logo + nom de marque -------------------------------------------
    if os.path.exists(LOGO):
        logo = Image.open(LOGO).convert("RGBA").resize((72, 72), Image.LANCZOS)
        img.paste(logo, (margin, y), logo)
        text_x = margin + 72 + 22
    else:
        text_x = margin

    f_brand = bold(38)
    d.text((text_x, y + 14), "NET", font=f_brand, fill=TEXT_1)
    d.text(
        (text_x + d.textlength("NET", font=f_brand), y + 14),
        "budget",
        font=f_brand,
        fill=MINT_LIGHT,
    )

    # --- Eyebrow ---------------------------------------------------------
    y = 232
    f_eyebrow = bold(21)
    # Lettrage espace a la main : Pillow n'a pas de letter-spacing.
    x = margin
    for ch in eyebrow.upper():
        d.text((x, y), ch, font=f_eyebrow, fill=MINT)
        x += d.textlength(ch, font=f_eyebrow) + 3

    # --- Titre -----------------------------------------------------------
    y = 278
    f_title = bold(64)
    for line in wrap(d, title, f_title, W - margin * 2)[:3]:
        d.text((margin, y), line, font=f_title, fill=TEXT_1)
        y += 76

    # --- Sous-titre ------------------------------------------------------
    y += 14
    f_sub = regular(29)
    for line in wrap(d, subtitle, f_sub, W - margin * 2 - 120)[:2]:
        d.text((margin, y), line, font=f_sub, fill=TEXT_2)
        y += 40

    # --- Adresse en bas --------------------------------------------------
    f_url = bold(24)
    d.text((margin, H - margin - 12), "netbudget.app", font=f_url, fill=MINT_LIGHT)

    out = os.path.join(PUBLIC, filename)
    img.save(out, "PNG", optimize=True)
    print(f"  {filename}  ({os.path.getsize(out) // 1024} Ko)")


# Une image par page. Le texte reprend la promesse de la page concernee : un
# apercu generique partout gaspille le seul espace visuel d'un partage.
PAGES = [
    (
        "og-image.png",
        "Budget personnel",
        "Sache ce qu'il te reste vraiment chaque mois",
        "Reste à vivre, prêts, objectifs. Sans compte, sans publicité, hors ligne.",
    ),
    (
        "og-image-en.png",
        "Personal budget",
        "Know what you really have left each month",
        "Disposable income, loans, goals. No account, no ads, works offline.",
    ),
    (
        "og-privacy.png",
        "Vie privée",
        "Ce que NETbudget fait de tes données",
        "Sans compte, rien ne quitte ton téléphone. Avec un compte, tu choisis quoi.",
    ),
    (
        "og-faq.png",
        "Questions fréquentes",
        "Tout ce qu'on nous demande",
        "Comment ça marche, ce que ça coûte, ce qui reste sur ton téléphone.",
    ),
]


def main() -> int:
    if not os.path.isdir(PUBLIC):
        print(f"Dossier introuvable : {PUBLIC}", file=sys.stderr)
        return 1
    print("Generation des images de partage :")
    for args in PAGES:
        build(*args)
    print("Termine.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
