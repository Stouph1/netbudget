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
 ('<meta name="viewport" content="width=1920, height=1080" />', '<meta name="viewport" content="width=1080, height=1920" />'),
 ('html, body { width: 1920px; height: 1080px;', 'html, body { width: 1080px; height: 1920px;'),
 ('<div id="root" data-composition-id="annonce20" data-width="1920" data-height="1080"', '<div id="root" class="p" data-composition-id="annonce20reels" data-width="1080" data-height="1920"'),
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
