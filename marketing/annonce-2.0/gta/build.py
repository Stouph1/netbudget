"""Version Vice (hommage) de l'annonce 2.0 : dérive le format Reels 1080x1920 depuis video/index.html.

    python3 marketing/annonce-2.0/gta/build.py           # vérifie les deux formats
    python3 marketing/annonce-2.0/gta/build.py render    # + rendus, mp4 copiés dans gta/
"""
import os, shutil, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC, REELS_DIR = ROOT / "video", ROOT / "video-reels"

REELS = [
    ('width=1920, height=1080', 'width=1080, height=1920'),
    ('html, body { width: 1920px; height: 1080px;', 'html, body { width: 1080px; height: 1920px;'),
    ('data-composition-id="gtavibe" data-width="1920" data-height="1080"', 'data-composition-id="gtavibereels" data-width="1080" data-height="1920"'),
    ('window.__timelines["gtavibe"]', 'window.__timelines["gtavibereels"]'),
    ('#sun { position: absolute; left: 560px; top: 250px;', '#sun { position: absolute; left: 140px; top: 740px;'),
    ('#sea { position: absolute; left: 0; right: 0; top: 896px;', '#sea { position: absolute; left: 0; right: 0; top: 1540px; height: 380px;'),
    ('#grid { position: absolute; left: -400px; right: -400px; top: 896px; height: 184px;', '#grid { position: absolute; left: -400px; right: -400px; top: 1540px; height: 380px;'),
    ('82%, #2a0f45 83%', '80%, #2a0f45 80.2%'),
    ('.palm { position: absolute; bottom: 150px;', '.palm { position: absolute; bottom: 360px;'),
    ('.palm.l { left: -80px; } .palm.r { right: -60px;', '.palm.l { left: -260px; } .palm.r { right: -260px;'),
    ('.t { font-family: "Bebas", sans-serif; font-size: 240px;', '.t { font-family: "Bebas", sans-serif; font-size: 160px;'),
    ('.t.small { font-size: 120px; }', '.t.small { font-size: 96px; }'),
    ('.date { font-family: "Bebas", sans-serif; font-size: 70px; letter-spacing: 0.3em;', '.date { font-family: "Bebas", sans-serif; font-size: 46px; letter-spacing: 0.12em;'),
    ('.title { position: absolute; left: 0; right: 0;', '.title { position: absolute; left: 60px; right: 60px;'),
    ('.phone { position: absolute; left: 1180px; top: 100px;', '.phone { position: absolute; left: 330px; top: 820px;'),
    ('.shade { position: absolute; left: 0; top: 0; bottom: 0; width: 1200px; background: linear-gradient(90deg,', '.shade { position: absolute; left: 0; right: 0; top: 0; height: 900px; background: linear-gradient(180deg,'),
    ('.word { position: absolute; left: 120px; top: 0; height: 1080px; width: 1000px;', '.word { position: absolute; left: 80px; top: 160px; height: 600px; width: 920px;'),
    ('.word .t { text-align: left; font-size: 200px; }', '.word .t { text-align: left; font-size: 128px; }'),
    ('.stamp .t { font-size: 220px;', '.stamp .t { font-size: 150px;'),
    ('#stores { display: flex; gap: 22px;', '#stores { display: flex; flex-wrap: wrap; justify-content: center; gap: 22px;'),
    ('{ x: 260, opacity: 0, rotation: 5 }, { x: 0,', '{ y: 260, opacity: 0, rotation: 3 }, { y: 0,'),
]

def run(cmd, cwd):
    return subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True).stdout

def reels():
    if REELS_DIR.exists():
        shutil.rmtree(REELS_DIR)
    shutil.copytree(SRC, REELS_DIR, ignore=shutil.ignore_patterns("renders", ".hyperframes", "node_modules"))
    s = (SRC / "index.html").read_text()
    for a, b in REELS:
        assert a in s, a[:60]
        s = s.replace(a, b)
    (REELS_DIR / "index.html").write_text(s)

def main():
    reels()
    for name, d in (("16x9", SRC), ("9x16", REELS_DIR)):
        out = run("npx --yes hyperframes@0.8.157 check 2>&1 | grep -E 'error\\(s\\)' | tail -1", d)
        print(name, out.strip())
        if "render" in sys.argv:
            print("  ", run("npx --yes hyperframes@0.8.157 render --workers 1 2>&1 | tr '\\r' '\\n' | grep -E '✗|MB|renders/' | tail -2", d).strip().replace("\n", " | "))
            mp4s = sorted((d / "renders").glob("*.mp4"), key=os.path.getmtime)
            if mp4s:
                shutil.copy(mp4s[-1], ROOT / f"annonce-2.0-vice-{name}.mp4")

if __name__ == "__main__":
    main()
