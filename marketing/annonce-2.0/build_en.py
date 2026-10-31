#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Version anglaise de l'annonce 2.0 (pour les campagnes en anglais).

Reprend video/index.html, traduit les textes, passe les montants en dollars et remplace
les plans par ceux enregistrés en anglais (rec-en/, app en anglais, USD, New York).

    python3 marketing/annonce-2.0/build_en.py           # transcode + compositions + check
    python3 marketing/annonce-2.0/build_en.py render    # + rendus
"""
import os, re, shutil, subprocess, sys, pathlib
HERE = pathlib.Path(__file__).resolve().parent
SRC = HERE / "video"; V = HERE / "video-en"; R = HERE / "video-en-reels"; REC = HERE / "rec-en"
CLIPS = ["budget", "revenu", "reperes", "projet", "coach", "espaces"]

TXT = [
    ('<html lang="fr">', '<html lang="en">'),
    ('<span id="hnum">0,00 €</span>', '<span id="hnum">$0.00</span>'),
    ('<title>NETbudget 2.0 - Annonce</title>', '<title>NETbudget 2.0 - Launch (EN)</title>'),
    ('>REVENUS · REVENUS · REVENUS<', '>INCOME · INCOME · INCOME · INCOME<'),
    ('>REPÈRES · REPÈRES · REPÈRES<', '>BENCHMARKS · BENCHMARKS<'),
    ('>PROJETS · PROJETS · PROJETS<', '>PROJECTS · PROJECTS · PROJECTS<'),
    ('>À DEUX · EN FAMILLE · À DEUX<', '>COUPLES · FAMILIES · COUPLES<'),
    ('>Ce qu\'il te reste,<', '>What you have left,<'),
    ('>tes revenus,<', '>your income,<'),
    ('>tes repères,<', '>your benchmarks,<'),
    ('>tes projets,<', '>your projects,<'),
    ('>ton coach,<', '>your coach,<'),
    ('>à deux ou en famille.<', '>your shared budget.<'),
    ('.gtxt .b { font-size: 215px;', '.gtxt .b { font-size: 165px; white-space: nowrap;'),
    ('#root.p .gtxt .b { font-size: 220px; }', '#root.p .gtxt .b { font-size: 150px; }'),
    ('</svg>Sans connexion bancaire.</div>', '</svg>No bank connection.</div>'),
    ('</svg>Sans pub.</div>', '</svg>No ads.</div>'),
    ('</svg>Chiffré de bout en bout.</div>', '</svg>End-to-end encrypted.</div>'),
    ('Tes données.<br/>Chez toi.', 'Your data.<br/>Stays yours.'),
    ('>Brut <b>→</b> net, impôt à la source<', '>Gross <b>→</b> net, tax included<'),
    ('>Face aux <b>moyennes</b> de ton pays<', '>Against your country\'s <b>averages</b><'),
    ('>Un budget <b>par projet</b><', '>A budget <b>per project</b><'),
    ('><b>282</b> conseils, sources citées<', '><b>282</b> tips, sources cited<'),
    ('>Chacun <b>son espace</b><', '>Everyone gets <b>their space</b><'),
    ('>Déjà utilisé dans<', '>Already used in<'),
    ('>0 pays.<', '>0 countries.<'),
    ('" pays."', '" countries."'),
    ('>En 8 langues. Et ce n\'est qu\'un début.<', '>In 8 languages. And it\'s just the beginning.<'),
    ('<span id="w1">Tu gagnes.</span> <span id="w2">Tu dépenses.</span><br/><span id="w3">Et il te reste…</span> <span id="w4" style="color:inherit">combien ?</span>',
     '<span id="w1">You earn.</span> <span id="w2">You spend.</span><br/><span id="w3">And what\'s left…</span> <span id="w4" style="color:inherit">how much?</span>'),
    ('Gratuit pour<br/><span class="accent">commencer.</span>', 'Free to<br/><span class="accent">get started.</span>'),
    ('Disponible maintenant sur iPhone et Android.', 'Available now on iPhone and Android.'),
]


def localize(s):
    for a, b in TXT:
        assert a in s, a[:70]
        s = s.replace(a, b)
    # montants en dollars : $2,567.20 ; tirage aléatoire $ddd.dd ; « ? $ » ; valeur finale $221.20
    FR = 'const fr = (v) => "$" + v.toFixed(2).replace(/\\B(?=(\\d{3})+(?!\\d))/g, ",");\n'
    s = re.sub(r"const fr = \(v\) => .*?;\n", lambda m: FR, s, count=1)
    s = re.sub(r'(const scramble = .*?return )s\.slice\(0, 3\) \+ "," \+ s\.slice\(3\) \+ ".*?";', r'\1"$" + s.slice(0, 3) + "." + s.slice(3);', s, count=1)
    s = re.sub(r'textContent: "\?[^"]*€"', 'textContent: "$?"', s, count=1)
    s = re.sub(r'textContent: "221,20[^"]*€"', 'textContent: "$221.20"', s, count=1)
    s = s.replace('"\\u2212\\u202f" + fr(D.v)', '"\\u2212" + fr(D.v)')
    assert "€" not in s, s[s.index("€") - 80:s.index("€") + 10]
    return s


def run(cmd, cwd=None):
    return subprocess.run(cmd, cwd=cwd, shell=True, capture_output=True, text=True).stdout


def project(dest, html, reels=False):
    if dest.exists(): shutil.rmtree(dest)
    shutil.copytree(SRC, dest, ignore=shutil.ignore_patterns("renders", ".hyperframes", "node_modules", "index.html"))
    for c in CLIPS:
        src = REC / f"{c}.mp4"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-an", "-r", "30", "-vf", "scale=800:-2", "-c:v", "libx264",
                        "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(dest / "assets" / "rec" / f"{c}.mp4")], check=True)
    if reels:
        sys.path.insert(0, str(HERE)); import build
        for a, b in build.REELS:
            assert a in html, a[:60]
            html = html.replace(a, b)
        html = html.replace('data-composition-id="annonce20reels"', 'data-composition-id="annonce20enreels"')
    else:
        html = html.replace('data-composition-id="annonce20"', 'data-composition-id="annonce20en"')
    (dest / "index.html").write_text(html)


if __name__ == "__main__":
    html = localize((SRC / "index.html").read_text())
    for d, name, reels in ((V, "16x9", False), (R, "9x16", True)):
        project(d, html, reels)
        print(name, run("npx --yes hyperframes@0.8.157 check 2>&1 | grep -E 'error\\(s\\)' | tail -1", d).strip())
        if "render" in sys.argv:
            print("  ", run("npx --yes hyperframes@0.8.157 render --workers 1 2>&1 | tr '\\r' '\\n' | grep -E '✗|MB|renders/' | tail -2", d).strip().replace("\n", " | "))
            mp4s = sorted((d / "renders").glob("*.mp4"), key=os.path.getmtime)
            if mp4s:
                out = HERE / f"annonce-2.0-en-{name}.mp4"
                subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(mp4s[-1]), "-c:v", "libx264", "-preset", "slow", "-b:v", "1900k", "-maxrate", "2400k",
                                "-bufsize", "4000k", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", str(out)], check=True)
                shutil.rmtree(d / "renders"); print("   ->", out.name)
