#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Annonce interactive HTML5 (« playable ») Google Ads, campagne pour applications.

Démo « reste à vivre » : un net mensuel fixe, trois curseurs (loyer, courses,
sorties), le reste à vivre se recalcule en direct, puis un bouton qui ouvre la
fiche du store via l'ExitApi de Google. Deux tailles, un ZIP chacune :
  - portrait 320 × 480
  - paysage 480 × 320
Règles Google suivies : index.html à la racine, meta ad.size, tout embarqué
(logo en base64), aucun chargement externe hormais exitapi.js, pas de son,
ZIP sous 5 Mo. Aucun emoji, aucun concurrent, aucun chiffre inventé sur l'app.

    python3 marketing/googleads/2.0/playable.py
Sortie : playable/netbudget-playable-320x480.zip, playable/netbudget-playable-480x320.zip
"""
import base64, os, zipfile
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "playable"); os.makedirs(OUT, exist_ok=True)
LOGO = "/Users/stephane.pizeuil/projet/netbudget-main/website/public/logo.png"
logo64 = base64.b64encode(open(LOGO, "rb").read()).decode()

HTML = r"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="ad.size" content="width=__W__,height=__H__">
<meta name="viewport" content="width=__W__,height=__H__,initial-scale=1,user-scalable=no">
<title>NETbudget</title>
<script src="https://tpc.googlesyndication.com/pagead/gadgets/html5/api/exitapi.js"></script>
<style>
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
html,body{width:__W__px;height:__H__px;overflow:hidden;background:#0a0a0c;color:#fafafa;font-family:-apple-system,"Helvetica Neue",Roboto,Arial,sans-serif;-webkit-user-select:none;user-select:none}
#ad{position:relative;width:__W__px;height:__H__px;background:radial-gradient(120% 70% at 70% 60%,#10403a 0%,#0a1224 45%,#0a0a0c 100%);display:flex;flex-direction:column;padding:12px 14px 12px}
.top{display:flex;align-items:center;gap:7px}
.top img{width:20px;height:20px;border-radius:5px}
.top b{font-size:14px;letter-spacing:.2px}
.top span{margin-left:auto;font-size:9px;color:#9aa3b2;letter-spacing:.6px;text-transform:uppercase}
h1{font-size:19px;line-height:1.15;margin-top:8px;font-weight:800;letter-spacing:-.2px}
h1 em{font-style:normal;color:#6ee7b7}
.net{margin-top:6px;font-size:10.5px;color:#9aa3b2}
.net b{color:#fafafa;font-weight:600}
.rows{margin-top:8px;display:flex;flex-direction:column;gap:7px}
.row{display:grid;grid-template-columns:18px 1fr 56px;align-items:center;gap:7px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:7px 9px}
.row svg{width:16px;height:16px;fill:none;stroke:#6ee7b7;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.row label{font-size:9px;color:#9aa3b2;letter-spacing:.5px;text-transform:uppercase;display:block}
.row input{width:100%;height:18px;-webkit-appearance:none;appearance:none;background:transparent;margin:0}
.row input::-webkit-slider-runnable-track{height:4px;border-radius:2px;background:linear-gradient(90deg,#10b981 var(--p,50%),rgba(255,255,255,.14) var(--p,50%))}
.row input::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:#fafafa;margin-top:-6px;box-shadow:0 1px 4px rgba(0,0,0,.5)}
.row input::-moz-range-track{height:4px;border-radius:2px;background:rgba(255,255,255,.14)}
.row input::-moz-range-thumb{width:16px;height:16px;border-radius:50%;background:#fafafa;border:0}
.row output{font-size:12px;font-weight:700;text-align:right;font-variant-numeric:tabular-nums}
.rest{margin-top:auto;display:flex;align-items:baseline;justify-content:space-between;gap:8px;padding:8px 10px;border-radius:12px;background:rgba(16,185,129,.12);border:1px solid rgba(110,231,183,.25)}
.rest small{font-size:9px;color:#9aa3b2;letter-spacing:.6px;text-transform:uppercase;display:block}
.rest strong{font-size:30px;font-weight:800;letter-spacing:-.5px;font-variant-numeric:tabular-nums;color:#6ee7b7;transition:color .2s}
.rest strong.warn{color:#fbbf24}.rest strong.bad{color:#f87171}
.rest .hint{font-size:9.5px;color:#cbd5e1;max-width:44%;text-align:right;line-height:1.2}
.cta{margin-top:10px;display:block;width:100%;border:0;border-radius:12px;background:#10b981;color:#06251c;font-size:13px;font-weight:800;padding:12px 8px;cursor:pointer;box-shadow:0 6px 18px rgba(16,185,129,.35)}
.cta.pulse{animation:pulse 1.4s ease-in-out infinite}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.03)}}
.foot{margin-top:6px;font-size:8.5px;color:#7c8696;text-align:center;letter-spacing:.2px}
@media (prefers-reduced-motion:reduce){.cta.pulse{animation:none}}
/* paysage : deux colonnes */
.land #ad{padding:10px 14px}
.land .body{display:grid;grid-template-columns:1fr 168px;gap:10px;flex:1;min-height:0;margin-top:4px}
.land h1{font-size:15px;margin-top:4px}
.land .rows{margin-top:4px;gap:4px}
.land .row{padding:4px 7px}
.land .side{display:flex;flex-direction:column;justify-content:flex-end;gap:7px}
.land .rest{margin-top:0;flex-direction:column;align-items:flex-start;gap:2px}
.land .rest .hint{max-width:none;text-align:left}
.land .cta{margin-top:0;font-size:12px;padding:9px 6px}
.land .foot{margin-top:0}
</style>
</head>
<body class="__CLASS__">
<div id="ad">
  <div class="top"><img src="data:image/png;base64,__LOGO__" alt=""><b>NETbudget</b><span>Sans banque. Sans pub.</span></div>
  <div class="body">
    <div class="main">
      <h1>Fin du mois, <em>il te reste combien ?</em></h1>
      <p class="net">Net ce mois-ci : <b>2 100 €</b>. Bouge les curseurs.</p>
      <div class="rows">
        <div class="row"><svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg><div><label>Loyer</label><input id="s0" type="range" min="300" max="1500" step="10" value="850"></div><output id="o0">850 €</output></div>
        <div class="row"><svg viewBox="0 0 24 24"><path d="M3 4h2l2.4 11h11l2-7H7"/><circle cx="9" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/></svg><div><label>Courses</label><input id="s1" type="range" min="100" max="700" step="10" value="320"></div><output id="o1">320 €</output></div>
        <div class="row"><svg viewBox="0 0 24 24"><path d="M6 3h12l-5 8v6h3v2H8v-2h3v-6z"/></svg><div><label>Sorties</label><input id="s2" type="range" min="0" max="600" step="10" value="150"></div><output id="o2">150 €</output></div>
        <div class="row"><svg viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M11 18h2"/></svg><div><label>Abonnements</label><input id="s3" type="range" min="0" max="250" step="5" value="45"></div><output id="o3">45 €</output></div>
      </div>
    </div>
    <div class="side">
      <div class="rest"><div><small>Reste à vivre</small><strong id="rest">735 €</strong></div><div class="hint" id="hint">De quoi mettre de côté.</div></div>
      <button class="cta" id="cta" type="button">Vois le tien dans NETbudget</button>
      <p class="foot">Gratuit pour commencer. Sans compte, sans connexion bancaire.</p>
    </div>
  </div>
</div>
<script>
(function(){
  var NET=2100, ids=[0,1,2,3], touched=false, t0=Date.now();
  function fmt(n){var s=String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g," ");return s+" €";}
  function paint(i){var el=document.getElementById("s"+i);var p=(el.value-el.min)/(el.max-el.min)*100;el.style.setProperty("--p",p+"%");document.getElementById("o"+i).textContent=fmt(el.value);}
  function update(){
    var spent=0;ids.forEach(function(i){paint(i);spent+=+document.getElementById("s"+i).value;});
    var rest=NET-spent, r=document.getElementById("rest"), h=document.getElementById("hint");
    r.textContent=(rest<0?"−":"")+fmt(Math.abs(rest));
    r.className=rest<0?"bad":(rest<300?"warn":"");
    h.textContent=rest<0?"Le mois ne passe pas. On ajuste ?":rest<300?"Ça passe, mais sans marge.":"De quoi mettre de côté.";
  }
  ids.forEach(function(i){var el=document.getElementById("s"+i);el.addEventListener("input",function(){touched=true;update();});el.addEventListener("change",update);});
  update();
  setTimeout(function(){document.getElementById("cta").className="cta pulse";},touched?5000:4000);
  function exit(){if(window.ExitApi&&ExitApi.exit){ExitApi.exit();}else{window.open("https://netbudget.app/","_blank");}}
  document.getElementById("cta").addEventListener("click",exit);
})();
</script>
</body>
</html>
"""

def build(w, h, cls):
    html = HTML.replace("__W__", str(w)).replace("__H__", str(h)).replace("__LOGO__", logo64).replace("__CLASS__", cls)
    d = os.path.join(OUT, f"{w}x{h}"); os.makedirs(d, exist_ok=True)
    p = os.path.join(d, "index.html"); open(p, "w", encoding="utf-8").write(html)
    z = os.path.join(OUT, f"netbudget-playable-{w}x{h}.zip")
    with zipfile.ZipFile(z, "w", zipfile.ZIP_DEFLATED) as zf: zf.write(p, "index.html")
    print(z, os.path.getsize(z), "octets")

if __name__ == "__main__":
    build(320, 480, "port"); build(480, 320, "land")
