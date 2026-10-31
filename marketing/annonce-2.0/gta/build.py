"""Version Vice (hommage) de l'annonce 2.0.

Le gabarit video/template.html est écrit en mesures : chaque musique a son tempo et son entrée
de groove, le script calcule les temps et produit une composition par musique.

    python3 marketing/annonce-2.0/gta/build.py                      # génère et vérifie toutes les variantes
    python3 marketing/annonce-2.0/gta/build.py render lust          # rend une variante (16:9 et 9:16)
    python3 marketing/annonce-2.0/gta/build.py render lust 16x9     # rend un seul format
"""
import os, shutil, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "video"
OUT = ROOT / "variantes"
DEFAULT = "lust"

# entrée du groove dans le morceau (premier temps d'une mesure), durée d'une mesure, volume avant l'entrée
MUSIQUES = {
    "lust": dict(file="lust.mp3", groove=15.36, bar=1.93, pre=0.6,
                 credit="« Lust » (Michael Ramir C., Mixkit, licence commerciale sans attribution), disco-funk, 125 BPM"),
    "better-times": dict(file="better-times.mp3", groove=38.13, bar=2.0, pre=0.45,
                         credit="« Better Times are Coming » (Mixkit, licence commerciale sans attribution), synthwave, 120 BPM"),
    "funkee-monkeee": dict(file="funkee-monkeee.mp3", groove=8.01, bar=2.0, pre=0.7,
                           credit="« Funkee Monkeee » (Michael Ramir C., Mixkit, licence commerciale sans attribution), funk, 120 BPM"),
    "life-is-a-dream": dict(file="life-is-a-dream.mp3", groove=8.11, bar=2.0, pre=0.9,
                            credit="« Life is a Dream » (Michael Ramir C., Mixkit, licence commerciale sans attribution), disco-pop, 120 BPM"),
}
HIT = 8.0  # instant de la vidéo où le groove entre (fin du plan d'ouverture)

REELS = [
    ('<meta name="viewport" content="width=1920, height=1080" />', '<meta name="viewport" content="width=1080, height=1920" />'),
    ('html, body { width: 1920px; height: 1080px;', 'html, body { width: 1080px; height: 1920px;'),
    ('<div id="root" data-composition-id="gtavibe" data-width="1920" data-height="1080"', '<div id="root" class="p" data-composition-id="gtavibereels" data-width="1080" data-height="1920"'),
]


def compose(slug):
    m = MUSIQUES[slug]
    b = m["bar"]
    L0 = HIT
    D = round(L0 + 20 * b + 0.3, 2)
    t = dict(
        BAR=b, L0=L0, N0=round(L0 + 3 * b, 3), M0=round(L0 + 6 * b, 3), E0=round(L0 + 12 * b, 3),
        O0=round(L0 + 15 * b, 3), F0=round(L0 + 18 * b, 3), D=D, B3=round(3 * b, 3),
        MD=round(9 * b, 3), FD=round(D - (L0 + 18 * b), 3), S1D=round(L0 - 3.6 + 0.05, 3),
        MS=round(m["groove"] - HIT, 3), PRE=m["pre"], HM=round(L0 - 0.15, 2), FO=round(D - 2.2, 2),
        MUSIC=m["file"], CREDIT=m["credit"],
    )
    s = (SRC / "template.html").read_text()
    for k, v in t.items():
        s = s.replace(f"@@{k}@@", str(v))
    assert "@@" not in s, s[s.index("@@"):s.index("@@") + 30]
    return s


def write_project(dest, html, reels=False):
    if dest.exists():
        shutil.rmtree(dest)
    shutil.copytree(SRC, dest, ignore=shutil.ignore_patterns("renders", ".hyperframes", "node_modules", "template.html", "index.html"))
    if reels:
        for a, b in REELS:
            assert a in html, a[:60]
            html = html.replace(a, b)
        (dest / "meta.json").write_text('{"id": "gtavibereels", "name": "gtavibereels", "createdAt": "2026-10-31T10:00:00.000Z"}\n')
    (dest / "index.html").write_text(html)


def run(cmd, cwd):
    return subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True).stdout


def main():
    args = sys.argv[1:]
    render = "render" in args
    slugs = [a for a in args if a in MUSIQUES] or list(MUSIQUES)
    fmts = [a for a in args if a in ("16x9", "9x16")] or ["16x9", "9x16"]
    (SRC / "index.html").write_text(compose(DEFAULT))
    for slug in slugs:
        html = compose(slug)
        for fmt in fmts:
            d = OUT / slug / fmt
            write_project(d, html, reels=(fmt == "9x16"))
            print(slug, fmt, run("npx --yes hyperframes@0.8.157 check 2>&1 | grep -E 'error\\(s\\)' | tail -1", d).strip())
            if render:
                print("  ", run("npx --yes hyperframes@0.8.157 render --workers 1 2>&1 | tr '\\r' '\\n' | grep -E '✗|MB|renders/' | tail -2", d).strip().replace("\n", " | "))
                mp4s = sorted((d / "renders").glob("*.mp4"), key=os.path.getmtime)
                if mp4s:
                    dst = ROOT / f"annonce-2.0-vice-{slug}-{fmt}.mp4"
                    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(mp4s[-1]), "-c:v", "libx264", "-preset", "slow", "-crf", "22",
                                    "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(dst)], check=True)
                    shutil.rmtree(d / "renders")
                    print("   ->", dst.name)


if __name__ == "__main__":
    main()
