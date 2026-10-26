#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Vidéo « Merci 500 » : quatre musiques, deux formats (16:9 et Reels 9:16).

La composition de base est video/index.html (HyperFrames). Ce script en
dérive huit projets dans videos/<musique>-<format>/, chacun avec son morceau
(licence Mixkit, usage commercial, sans mention) calé pour que la montée
tombe sur « Et ce n'est qu'un début » à 20,5 s, puis lance les rendus.

    python3 marketing/merci-500/build-videos.py        # projets + check
    python3 marketing/merci-500/build-videos.py render # + rendus, copie des mp4
"""
import os, shutil, subprocess, sys, pathlib
HERE = pathlib.Path(__file__).resolve().parent
BASE = HERE / "video"
SRC = BASE / "assets" / "music"
MUSIC = {  # slug : (fichier Mixkit, début dans le morceau en secondes, titre)
 "dreaming-big": ("dreaming-big.mp3", 40.0, "Dreaming Big · Ahjay Stelino"),
 "classical-vibes-4": ("classical-vibes-4.mp3", 28.0, "Classical vibes 4 · Grigoriy Nuzhny"),
 "well-be-okay": ("well-be-okay.mp3", 1.5, "We'll Be Okay · Michael Ramir C."),
 "discover": ("discover.mp3", 0.0, "Discover · Eugenio Mininni"),
}
STORY = [
 ('<meta name="viewport" content="width=1920, height=1080" />','<meta name="viewport" content="width=1080, height=1920" />'),
 ('html, body { width: 1920px; height: 1080px;','html, body { width: 1080px; height: 1920px;'),
 ('radial-gradient(ellipse 1100px 700px at 50% 50%','radial-gradient(ellipse 800px 1100px at 50% 48%'),
 ('.big { font-size: 190px;','.big { font-size: 170px;'),
 ('.sub { font-size: 54px;','.sub { font-size: 46px;'),
 ('#dots { position: absolute; left: 460px; top: 180px; width: 1000px; height: 720px; }','#dots { position: absolute; left: 40px; top: 560px; width: 1000px; height: 800px; }'),
 ('#count { position: absolute; left: 0; right: 0; top: 390px;','#count { position: absolute; left: 0; right: 0; top: 800px;'),
 ('#countlbl { position: absolute; left: 0; right: 0; top: 700px;','#countlbl { position: absolute; left: 0; right: 0; top: 1130px;'),
 ('#ringwrap { position: absolute; left: 1340px; top: 40px; width: 600px; height: 600px; opacity: 0; }','#ringwrap { position: absolute; left: 520px; top: 1280px; width: 600px; height: 600px; opacity: 0; }'),
 ('.foot { position: absolute; left: 0; right: 0; bottom: 110px;','.foot { position: absolute; left: 0; right: 0; bottom: 200px; flex-wrap: wrap; padding: 0 60px;'),
 ('.foot span { font-size: 40px;','.foot span { font-size: 36px;'),
 ('.center { position: absolute; inset: 0; display: flex;','.center { position: absolute; inset: 0; padding: 0 70px; display: flex;'),
 ('<div id="l1" class="big" style="font-size:120px"><span class="accent">+ 500</span> personnes qui savent<br/>ce qu\'il leur reste.</div>','<div id="l1" class="big" style="font-size:104px"><span class="accent">+ 500</span> personnes<br/>qui savent ce<br/>qu\'il leur reste.</div>'),
 ('<div id="l2" class="sub"><span class="accent" style="font-weight:800">Rejoins-les.</span> Gratuit, sans compte, en cinq minutes.</div>','<div id="l2" class="sub"><span class="accent" style="font-weight:800">Rejoins-les.</span><br/>Gratuit, sans compte, en cinq minutes.</div>'),
 ('<div id="debut" class="big" style="font-size:150px">','<div id="debut" class="big" style="font-size:128px">'),
 ('<div class="big" style="font-size:170px">La <span class="accent">2.0</span> arrive.</div>','<div class="big" style="font-size:150px">La <span class="accent">2.0</span><br/>arrive.</div>'),
 ("d.style.left = (500 + Math.cos(a) * r * 480 - 5) + \"px\";\n          d.style.top = (360 + Math.sin(a) * r * 340 - 5) + \"px\";","d.style.left = (500 + Math.cos(a) * r * 440 - 5) + \"px\";\n          d.style.top = (400 + Math.sin(a) * r * 400 - 5) + \"px\";"),
]

def make(slug, fmt):
    f, start, _ = MUSIC[slug]
    out = HERE / "videos" / f"{slug}-{fmt}"
    if out.exists(): shutil.rmtree(out)
    out.mkdir(parents=True)
    for d in ("assets", "fonts"): shutil.copytree(BASE / d, out / d)
    for n in ("package.json", "hyperframes.json"): shutil.copy(BASE / n, out / n)
    shutil.copy(SRC / f, out / "assets" / "music" / f"{slug}.mp3")
    cid = f"merci500-{slug}-{fmt}".replace("-", "")
    (out / "meta.json").write_text('{"id": "%s", "name": "%s", "createdAt": "2026-10-26T10:00:00.000Z"}\n' % (cid, cid))
    s = (BASE / "index.html").read_text()
    s = s.replace("__MUSIC__", f"{slug}.mp3").replace("__MEDIA_START__", str(start))
    s = s.replace('data-composition-id="merci500"', f'data-composition-id="{cid}"').replace('window.__timelines["merci500"]', f'window.__timelines["{cid}"]')
    if fmt == "9x16":
        for a, b in STORY:
            assert a in s, a[:60]
            s = s.replace(a, b)
        s = s.replace('data-width="1920" data-height="1080"', 'data-width="1080" data-height="1920"')
    (out / "index.html").write_text(s)
    return out

def run(cmd, cwd):
    return subprocess.run(cmd, cwd=cwd, shell=True, capture_output=True, text=True).stdout

if __name__ == "__main__":
    render = "render" in sys.argv
    only = [a for a in sys.argv[1:] if a in MUSIC]
    for slug in (only or MUSIC):
        for fmt in ("16x9", "9x16"):
            out = make(slug, fmt)
            chk = run("npm run check 2>&1 | grep -E 'error\\(s\\)' | head -1", out)
            print(slug, fmt, chk.strip())
            if render:
                log = run("npx --yes hyperframes@0.8.157 render --workers 1 2>&1 | tr '\\r' '\\n' | grep -E '✗|MB|renders/' | tail -2", out)
                print("  ", log.strip().replace("\n", " | "))
                mp4s = sorted((out / "renders").glob("*.mp4"), key=os.path.getmtime)
                if mp4s:
                    shutil.copy(mp4s[-1], HERE / f"merci-500-{slug}-{fmt}.mp4")
                    print("   ->", f"merci-500-{slug}-{fmt}.mp4")
