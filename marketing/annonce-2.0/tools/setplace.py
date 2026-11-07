#!/usr/bin/env python3
"""Aide pour l'écran complete-profile (app ouverte dessus, faite défiler jusqu'au lieu).
  setplace.py field            -> "x y" du champ ville (premier TextField sous les puces pays)
  setplace.py button <needle>  -> "x y" du premier élément dont le libellé contient needle
  setplace.py value            -> texte du champ ville
  setplace.py suggest          -> "x y" de la première suggestion de ville (Button sous le champ)
  setplace.py azerty <texte>   -> texte à envoyer à idb ui text (clavier AZERTY du Mac)"""
import json, subprocess, sys
U = "FF0F4486-F797-4111-8ADA-06507385144B"
mode = sys.argv[1]
if mode == "azerty":
    m = {"a": "q", "q": "a", "z": "w", "w": "z", "m": ";", "A": "Q", "Q": "A", "Z": "W", "W": "Z", "M": ":"}
    print("".join(m.get(c, c) for c in sys.argv[2])); sys.exit()
els = json.loads(subprocess.run(["idb", "ui", "describe-all", "--udid", U], capture_output=True, text=True).stdout or "[]")
c = lambda e: (int(e["frame"]["x"] + e["frame"]["width"] / 2), int(e["frame"]["y"] + e["frame"]["height"] / 2))
if mode == "button":
    for e in els:
        if sys.argv[2] in (e.get("AXLabel") or ""): print(*c(e)); break
elif mode == "field":
    tf = [e for e in els if e.get("type") == "TextField" and 150 < e["frame"]["y"] < 800]
    # le champ ville est le premier TextField au-dessus du champ « part réservée » (largeur 360)
    tf = [e for e in tf if e["frame"]["width"] > 300]
    if tf: print(*c(tf[-1]))
elif mode == "value":
    tf = [e for e in els if e.get("type") == "TextField" and 150 < e["frame"]["y"] < 800 and e["frame"]["width"] > 300]
    if tf: print(tf[-1].get("AXValue") or "")
elif mode == "suggest":
    b = [e for e in els if e.get("type") == "Button" and e["frame"]["width"] > 300]
    if b: print(*c(b[0]))
