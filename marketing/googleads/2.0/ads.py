#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Kit Google Ads (campagne pour applications), NETbudget 2.0.

Textes (titres 30, descriptions 90) dans textes.md, et images aux trois
ratios que Google demande pour une campagne d'application :
  - paysage 1,91:1 : 1200 × 628
  - carré 1:1 : 1200 × 1200
  - portrait 4:5 : 1200 × 1500
Chaque ratio est produit avec les cinq écrans de l'app (reste à vivre, projet,
Coach, espaces, dépenses) en français : 15 images. Même charte que l'App
Store, mais sans accroche : Google refuse le texte dans les images, hors logo. Les vidéos sont celles de la série 2.0 (voir videos/).

    marketing/promo-video/.venv/bin/python marketing/googleads/2.0/ads.py
"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
APPSTORE = os.path.join(os.path.dirname(os.path.dirname(HERE)), "appstore", "2.0")
sys.path.insert(0, APPSTORE)
from PIL import Image, ImageDraw
from visuels import font, phone, WHITE, MINT_DIM, SITE
from evenement import bg, mixed, mixed_width

OUT_I = os.path.join(HERE, "images"); os.makedirs(OUT_I, exist_ok=True)
CAPS = os.path.join(APPSTORE, "captures")
LANG = "fr"
SCREENS = {
 "budget": "Sache ce qu'il te reste\nvraiment chaque mois",
 "projet": "Un budget\npar projet",
 "coach": "282 conseils qui\ncitent leurs sources",
 "espaces": "Un budget à deux\nou en famille",
 "depenses": "Un budget qui se lit\nd'un coup d'œil",
}
HEADLINES = [
 "Sache ce qu'il te reste",
 "Budget sans connexion bancaire",
 "Ton reste à vivre en 5 minutes",
 "Budget en couple ou en famille",
 "282 conseils, sources citées",
]
DESCRIPTIONS = [
 "Revenus, dépenses, reste à vivre. Ton budget reste sur ton téléphone, jamais ta banque.",
 "Un budget partagé par code d'invitation, un espace privé pour chacun. Sans publicité.",
 "Mariage, voyage, naissance : un budget guidé par projet, avec rétro-planning et rappels.",
 "Repères face aux moyennes officielles de ton pays : logement, courses, sorties.",
 "Gratuit pour commencer, sans compte. Huit langues, 59 pays, 499 villes.",
]
LIMITS = {"headline": 30, "description": 90}

def landscape(screen, caption):
    w, h = 1200, 628
    img = bg(w, h); d = ImageDraw.Draw(img); m = 60
    logo = Image.open(os.path.join(SITE, "logo.png")).convert("RGBA").resize((56, 56), Image.LANCZOS)
    img.paste(logo, (m, m), logo); d.text((m + 70, m + 10), "NETbudget", font=font("en", 34), fill=WHITE)
    p = phone(os.path.join(CAPS, f"{LANG}-{screen}.png"), int(h * 1.3))
    img.paste(p, ((w - p.width) // 2, int(h * 0.14)), p)
    img.convert("RGB").save(os.path.join(OUT_I, f"paysage-1200x628-{screen}.png"), optimize=True)

def square(screen, caption):
    w, h = 1200, 1200
    img = bg(w, h); d = ImageDraw.Draw(img); m = 70
    logo = Image.open(os.path.join(SITE, "logo.png")).convert("RGBA").resize((60, 60), Image.LANCZOS)
    img.paste(logo, (m, m), logo); d.text((m + 76, m + 10), "NETbudget", font=font("en", 38), fill=WHITE)
    p = phone(os.path.join(CAPS, f"{LANG}-{screen}.png"), int(h * 1.05))
    img.paste(p, ((w - p.width) // 2, 150), p)
    img.convert("RGB").save(os.path.join(OUT_I, f"carre-1200x1200-{screen}.png"), optimize=True)

def portrait(screen, caption):
    w, h = 1200, 1500
    img = bg(w, h); d = ImageDraw.Draw(img); m = 70
    logo = Image.open(os.path.join(SITE, "logo.png")).convert("RGBA").resize((60, 60), Image.LANCZOS)
    img.paste(logo, (m, m), logo); d.text((m + 76, m + 10), "NETbudget", font=font("en", 38), fill=WHITE)
    p = phone(os.path.join(CAPS, f"{LANG}-{screen}.png"), int(h * 1.0))
    img.paste(p, ((w - p.width) // 2, 160), p)
    img.convert("RGB").save(os.path.join(OUT_I, f"portrait-1200x1500-{screen}.png"), optimize=True)

if __name__ == "__main__":
    for s, c in SCREENS.items(): landscape(s, c); square(s, c); portrait(s, c)
    bad = [h for h in HEADLINES if len(h) > LIMITS["headline"]] + [x for x in DESCRIPTIONS if len(x) > LIMITS["description"]]
    md = ["# Google Ads · campagne pour applications · NETbudget 2.0", "", "## Titres (30 max)", ""]
    md += [f"- `{x}` ({len(x)})" for x in HEADLINES]
    md += ["", "## Descriptions (90 max)", ""] + [f"- `{x}` ({len(x)})" for x in DESCRIPTIONS]
    md += ["", "## Images", "", "15 fichiers dans images/ : 5 paysage 1200×628, 5 carré 1200×1200, 5 portrait 1200×1500.", "", "## Vidéos", "", "Dans videos/ : teaser (paysage 16:9, 22 s), formules (paysage 16:9 et portrait 9:16, 25 s, v4 refaite en format pub : hook, vrais écrans, trois formules), solo, duo, famille (portrait 9:16, 20 s). À publier sur YouTube (non répertoriées) puis coller les liens dans « Vidéos ». Annonce interactive HTML5 dans playable/ (deux ZIP, voir playable/README.md)."]
    open(os.path.join(HERE, "textes.md"), "w", encoding="utf-8").write("\n".join(md) + "\n")
    print("images:", len(os.listdir(OUT_I)), "| dépassements:", bad or "aucun")
