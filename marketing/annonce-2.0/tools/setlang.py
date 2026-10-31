#!/usr/bin/env python3
"""Règle le stockage local de l'app (simulateur, app fermée) : langue, devise, ville, libellés, échelle.
  setlang.py <dossier RCTAsyncLocalStorage_V1> <lang> <devise> <cityId> <échelle> [pays profil] [région]"""
import json, sys, hashlib, os
LS, lang, cur, city, scale = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], float(sys.argv[5])
PCOUNTRY = sys.argv[6] if len(sys.argv) > 6 else ""; PREGION = sys.argv[7] if len(sys.argv) > 7 else ""
U = "90477ab6-acaa-43d6-9a64-7d725c2bebaf"
L = {"fr": ["Salaire","Missions freelance","Navigo","Électricité","Mutuelle","Forfait mobile","Basket","Streaming","Ski","Vacances d'été"],
     "en": ["Salary","Freelance work","Travel card","Electricity","Health plan","Phone plan","Basketball","Streaming","Ski","Summer holidays"]}.get(lang)
IDS = {"salary-demo":0,"free-demo":1,"oyster":2,"electricity":3,"health":4,"phone":5,"basket":6,"streaming":7,"ski":8,"holidays":9}
BASE = {"salary-demo":3400,"free-demo":400,"loyer":1250,"alimentation":320,"oyster":160,"electricity":70,"health":40,"phone":15,"sorties":150,"basket":25,"streaming":16,"ski":120,"epargne":300,"holidays":150}
FRLAB = {"loyer":"Loyer","alimentation":"Alimentation","sorties":"Sorties / Restos","epargne":"Épargne mensuelle"}
def rnd(v):
    if scale >= 100: return str(int(round(v / 1000.0)) * 1000)
    if scale >= 5: return str(int(round(v / 10.0)) * 10)
    return str(int(round(v)))
mp = os.path.join(LS, "manifest.json"); m = json.load(open(mp))
def get(k):
    v = m[k]; return open(os.path.join(LS, hashlib.md5(k.encode()).hexdigest()), encoding="utf-8").read() if v is None else v
def put(k, s):
    if k in m and m[k] is None: open(os.path.join(LS, hashlib.md5(k.encode()).hexdigest()), "w", encoding="utf-8").write(s)
    else: m[k] = s
for k in [f"netbudget:budget:user:{U}", "netbudget:state"]:
    d = json.loads(get(k))
    for it in d["incomes"] + d["expenseItems"]:
        if L and it["id"] in IDS: it["label"] = L[IDS[it["id"]]]
        if lang == "fr" and it["id"] in FRLAB: it["label"] = FRLAB[it["id"]]
        if it["id"] in BASE: it["amount"] = rnd(BASE[it["id"]] * scale)
    if k == "netbudget:state": d["currency"] = cur; d["lang"] = lang; d["cityId"] = city
    put(k, json.dumps(d, ensure_ascii=False))
if PCOUNTRY:
    k = f"netbudget:premium:cache:perso:{U}:advice_profile"; prof = json.loads(get(k)); prof["country"] = PCOUNTRY
    if PREGION: prof["region"] = PREGION
    else: prof.pop("region", None)
    put(k, json.dumps(prof, ensure_ascii=False))
json.dump(m, open(mp, "w"), ensure_ascii=False)
print(lang, cur, city)
