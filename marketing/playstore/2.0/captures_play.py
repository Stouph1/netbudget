#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Captures d'écran de la fiche Google Play, 2.0, huit langues, trois formats.

Règles de la Play Console (relevées dans la console) : PNG ou JPEG, 16:9 ou
9:16, chaque côté entre 320 et 3 840 px, 8 Mo max, de deux à huit captures ;
au moins quatre captures d'au moins 1 080 × 1 080 pour être éligible à la
promotion. Formats produits, tous en 9:16 :
  - téléphone : 1080 × 1920
  - tablette 7 pouces : 1242 × 2208
  - tablette 10 pouces : 1440 × 2560

Même composition que les captures App Store (captures_store.py) : fond nuit,
accroche, écran dans un cadre. Les écrans viennent de l'App Store :
captures/<lang>-<ecran>.png (téléphone) et captures/ipad/ (tablettes).

    marketing/promo-video/.venv/bin/python marketing/playstore/2.0/captures_play.py

Sortie : images/captures/<format>/<lang>/<n>-<ecran>.png
"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
APPSTORE = os.path.join(os.path.dirname(os.path.dirname(HERE)), "appstore", "2.0")
sys.path.insert(0, APPSTORE)
import captures_store as cs

FORMATS = {"telephone": (1080, 1920), "tablette-7": (1242, 2208), "tablette-10": (1440, 2560)}
cs.OUT = os.path.join(HERE, "images", "captures")

if __name__ == "__main__":
    only = sys.argv[1:] or list(FORMATS)
    missing = []
    for fmt in only:
        w, h = FORMATS[fmt]
        tablet = fmt != "telephone"
        for lang in cs.CAPTIONS:
            for n, screen in enumerate(cs.SCREENS):
                path = os.path.join(cs.CAPS, "ipad" if tablet else "", f"{lang}-{screen}.png")
                if not os.path.exists(path): missing.append(f"{fmt}/{lang}-{screen}"); continue
                # compose() cadre l'iPad plus large et avec des coins moins ronds quand fmt == "ipad-13"
                cs.compose(lang, "ipad-13" if tablet else fmt, n, screen, w, h, path)
                if tablet:
                    src = os.path.join(cs.OUT, "ipad-13", lang, f"{n + 1}-{screen}.png")
                    dst_dir = os.path.join(cs.OUT, fmt, lang); os.makedirs(dst_dir, exist_ok=True)
                    os.replace(src, os.path.join(dst_dir, f"{n + 1}-{screen}.png"))
        print(fmt, w, "x", h, "ok")
    if os.path.isdir(os.path.join(cs.OUT, "ipad-13")):
        for lang in os.listdir(os.path.join(cs.OUT, "ipad-13")):
            d = os.path.join(cs.OUT, "ipad-13", lang)
            if os.path.isdir(d) and not os.listdir(d): os.rmdir(d)
        if not os.listdir(os.path.join(cs.OUT, "ipad-13")): os.rmdir(os.path.join(cs.OUT, "ipad-13"))
    if missing: print("MANQUANT :", ", ".join(missing))
