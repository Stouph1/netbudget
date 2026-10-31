"""Version Vice (hommage) de l'annonce 2.0 : dérive le format Reels 1080x1920 depuis video/index.html.

    python3 marketing/annonce-2.0/gta/build.py           # vérifie les deux formats
    python3 marketing/annonce-2.0/gta/build.py render    # + rendus, mp4 copiés dans gta/
"""
import os, shutil, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC, REELS_DIR = ROOT / "video", ROOT / "video-reels"
REELS = [
    ('<meta name="viewport" content="width=1920, height=1080" />', '<meta name="viewport" content="width=1080, height=1920" />'),
    ('html, body { width: 1920px; height: 1080px;', 'html, body { width: 1080px; height: 1920px;'),
    ('<div id="root" data-composition-id="gtavibe" data-width="1920" data-height="1080"', '<div id="root" class="p" data-composition-id="gtavibereels" data-width="1080" data-height="1920"'),
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
    (REELS_DIR / "meta.json").write_text('{"id": "gtavibereels", "name": "gtavibereels", "createdAt": "2026-10-31T10:00:00.000Z"}\n')

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
