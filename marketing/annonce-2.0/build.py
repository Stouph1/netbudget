#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Vidéo d'annonce NETbudget 2.0 (30 s) : transcode les plans d'utilisation
enregistrés sur le simulateur, dérive la version Reels 9:16 de la composition
16:9, vérifie et rend les deux.

    python3 marketing/annonce-2.0/build.py            # transcode + compositions + check
    python3 marketing/annonce-2.0/build.py render     # + rendus, mp4 copiés à la racine
"""
import os, shutil, subprocess, sys, pathlib
HERE = pathlib.Path(__file__).resolve().parent
V = HERE / "video"; R = HERE / "video-reels"; REC = HERE / "rec"
CLIPS = ["budget", "revenu", "reperes", "projet", "coach", "espaces"]

def run(cmd, cwd=None):
    return subprocess.run(cmd, cwd=cwd, shell=True, capture_output=True, text=True).stdout

def transcode():
    (V / "assets" / "rec").mkdir(parents=True, exist_ok=True)
    for c in CLIPS:
        src = REC / f"{c}.mp4"; dst = V / "assets" / "rec" / f"{c}.mp4"
        if not src.exists(): print("MANQUE", src); continue
        # 30 i/s constantes, 800 px de large (le téléphone fait 400 px à l'écran), sans son
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-an", "-r", "30", "-vf", "scale=800:-2", "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(dst)], check=True)
        d = run(f'ffprobe -v error -show_entries format=duration -of csv=p=0 "{dst}"').strip()
        print(f"{c}: {float(d):.1f} s")

REELS = [
 ('<meta name="viewport" content="width=1920, height=1080" />','<meta name="viewport" content="width=1080, height=1920" />'),
 ('html, body { width: 1920px; height: 1080px;','html, body { width: 1080px; height: 1920px;'),
 ('radial-gradient(ellipse 1100px 700px at 68% 55%','radial-gradient(ellipse 800px 1100px at 50% 60%'),
 ('.phone { position: absolute; left: 1180px; top: 100px; width: 420px; height: 900px;','.phone { position: absolute; left: 300px; top: 760px; width: 480px; height: 1030px;'),
 ('.phone .scr { width: 400px; height: 880px; border-radius: 58px;','.phone .scr { width: 460px; height: 1010px; border-radius: 64px;'),
 ('.phone .scr video { position: absolute; left: 0; top: 0; width: 400px; height: 880px;','.phone .scr video { position: absolute; left: 0; top: 0; width: 460px; height: 1010px;'),
 ('.word { position: absolute; left: 120px; top: 0; height: 1080px; width: 980px; display: flex; flex-direction: column; justify-content: center; gap: 26px; }','.word { position: absolute; left: 80px; top: 150px; height: 560px; width: 920px; display: flex; flex-direction: column; justify-content: center; gap: 20px; }'),
 ('.word .big { font-size: 170px;','.word .big { font-size: 150px;'),
 ('.word .sub { font-size: 44px;','.word .sub { font-size: 40px;'),
 ('.kt { position: absolute; left: 120px; top: 0; height: 1080px; width: 1600px;','.kt { position: absolute; left: 80px; top: 0; height: 1920px; width: 920px;'),
 ('.kt .l { font-size: 160px;','.kt .l { font-size: 130px;'),
 ('.center .big { font-size: 180px;','.center .big { font-size: 130px; padding: 0 60px;'),
 ('#logo img { width: 230px; height: 230px;','#logo img { width: 280px; height: 280px;'),
 ('#logo .name { font-size: 120px;','#logo .name { font-size: 100px;'),
 ('#stores { display: flex; gap: 22px; margin-top: 44px; }','#stores { display: flex; gap: 18px; margin-top: 36px; flex-wrap: wrap; }'),
 ('<span class="l accent" id="h2">Il te reste combien ?</span>','<span class="l accent" id="h2">Il te reste<br/>combien ?</span>'),
 ('<div class="big accent" id="p3">Chiffré de bout en bout.</div>','<div class="big accent" id="p3">Chiffré de<br/>bout en bout.</div>'),
 ('<div class="big" style="font-size:110px">netbudget.app</div>','<div class="big" style="font-size:88px">netbudget.app</div>'),
 ('data-composition-id="annonce20" data-width="1920" data-height="1080"','data-composition-id="annonce20reels" data-width="1080" data-height="1920"'),
 ('window.__timelines["annonce20"] = tl;','window.__timelines["annonce20reels"] = tl;'),
 ('tl.fromTo(id + " .phone", { x: 200, opacity: 0, rotation: 3 }, { x: 0, opacity: 1, rotation: 0, duration: 0.4, ease: "power3.out" }, t);','tl.fromTo(id + " .phone", { y: 200, opacity: 0, rotation: 2 }, { y: 0, opacity: 1, rotation: 0, duration: 0.4, ease: "power3.out" }, t);'),
 ('tl.to(id + " .phone", { y: -16, duration: dur - 0.6, ease: "sine.inOut" }, t + 0.4);','tl.to(id + " .phone", { y: -12, duration: dur - 0.6, ease: "sine.inOut" }, t + 0.4);'),
 ('tl.fromTo("#ctaphone", { x: 200, opacity: 0, rotation: 3 }, { x: 0, opacity: 1, rotation: 0, duration: 0.45, ease: "power3.out" }, 21.4);','tl.fromTo("#ctaphone", { y: 200, opacity: 0, rotation: 2 }, { y: 0, opacity: 1, rotation: 0, duration: 0.45, ease: "power3.out" }, 21.4);'),
]

def reels():
    if R.exists(): shutil.rmtree(R)
    R.mkdir()
    for d in ("assets", "fonts"): shutil.copytree(V / d, R / d)
    for n in ("package.json", "hyperframes.json"): shutil.copy(V / n, R / n)
    (R / "meta.json").write_text('{"id": "annonce20reels", "name": "annonce20reels", "createdAt": "2026-10-31T10:00:00.000Z"}\n')
    s = (V / "index.html").read_text()
    for a, b in REELS:
        assert a in s, a[:60]
        s = s.replace(a, b)
    (R / "index.html").write_text(s)

if __name__ == "__main__":
    transcode(); reels()
    for d, name in ((V, "16x9"), (R, "9x16")):
        print(name, run("npm run check 2>&1 | grep -E 'error\\(s\\)' | head -1", d).strip())
        if "render" in sys.argv:
            print("  ", run("npx --yes hyperframes@0.8.157 render --workers 1 2>&1 | tr '\\r' '\\n' | grep -E '✗|MB|renders/' | tail -2", d).strip().replace("\n", " | "))
            mp4s = sorted((d / "renders").glob("*.mp4"), key=os.path.getmtime)
            if mp4s: shutil.copy(mp4s[-1], HERE / f"annonce-2.0-{name}.mp4"); print("   ->", f"annonce-2.0-{name}.mp4")
