// Audit de bout en bout : par page et par taille d'écran, erreurs console,
// requêtes en échec, liens internes cassés, méta, titres, images sans alt,
// cibles tactiles trop petites, débordement horizontal, poids transféré,
// et contrôle d'accessibilité axe-core.
import puppeteer from "puppeteer-core";
import fs from "node:fs";
const BASE = "http://localhost:4329";
const PAGES = ["/", "/en/", "/faq/", "/en/faq/", "/nouveautes/", "/en/whats-new/", "/privacy/", "/en/privacy/", "/terms/", "/en/terms/", "/merci/", "/en/thank-you/", "/confirmation/", "/rejoindre/", "/404"];
const axe = fs.readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const browser = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"] });
const report = [];
const seenLinks = new Set();
try {
  for (const path of PAGES) {
    for (const [vpName, vp] of [["desktop", { width: 1280, height: 900 }], ["mobile", { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }]]) {
      const page = await browser.newPage(); await page.setViewport(vp);
      const console_ = [], failed = []; let bytes = 0; const heavy = [];
      page.on("console", m => { if (["error", "warning"].includes(m.type())) console_.push(m.type() + ": " + m.text().slice(0, 160)); });
      page.on("pageerror", e => console_.push("pageerror: " + String(e).slice(0, 160)));
      page.on("requestfailed", r => failed.push(r.url().replace(BASE, "")));
      page.on("response", async r => { const u = r.url(); if (!u.startsWith(BASE)) { if (!u.startsWith("data:")) failed.push("EXTERNAL " + u); return; } if (r.status() >= 400) failed.push(r.status() + " " + u.replace(BASE, "")); try { const h = r.headers(); const l = +(h["content-length"] || 0); bytes += l; if (l > 300000) heavy.push(u.replace(BASE, "") + " " + Math.round(l / 1024) + "k"); } catch {} });
      const resp = await page.goto(BASE + path, { waitUntil: "networkidle0", timeout: 60000 });
      await new Promise(r => setTimeout(r, 800));
      const info = await page.evaluate(() => {
        const q = s => [...document.querySelectorAll(s)];
        const meta = n => document.querySelector(`meta[name="${n}"]`)?.content || document.querySelector(`meta[property="${n}"]`)?.content || null;
        const h1 = q("h1").map(h => h.textContent.trim().slice(0, 60));
        const imgsNoAlt = q("img:not([alt])").map(i => i.getAttribute("src"));
        const emptyAlt = q('img[alt=""]').length;
        const links = q("a[href]").map(a => a.getAttribute("href"));
        const small = q("a, button, [role=button]").filter(el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && (r.height < 40 || r.width < 40); }).map(el => (el.tagName + " " + (el.getAttribute("aria-label") || el.textContent.trim().slice(0, 30)) + " " + Math.round(el.getBoundingClientRect().width) + "x" + Math.round(el.getBoundingClientRect().height)));
        const overflow = document.documentElement.scrollWidth - window.innerWidth;
        const headings = q("h1,h2,h3,h4").map(h => +h.tagName[1]);
        let skips = 0; for (let i = 1; i < headings.length; i++) if (headings[i] > headings[i - 1] + 1) skips++;
        const lang = document.documentElement.lang;
        const hreflang = q('link[rel="alternate"][hreflang]').map(l => l.hreflang + ":" + l.getAttribute("href"));
        const canonical = document.querySelector('link[rel="canonical"]')?.href || null;
        const title = document.title;
        const targetsBlankNoRel = q('a[target="_blank"]').filter(a => !/noopener/.test(a.rel)).length;
        const videos = q("video").map(v => ({ src: (v.currentSrc || v.src).split("/").pop(), paused: v.paused, muted: v.muted, autoplay: v.autoplay, preload: v.preload }));
        const buttonsNoName = q("button").filter(b => !b.textContent.trim() && !b.getAttribute("aria-label") && !b.getAttribute("title")).length;
        return { title, lang, desc: meta("description"), og: !!meta("og:image"), canonical, hreflang, h1, imgsNoAlt, emptyAlt, links, small, overflow, skips, targetsBlankNoRel, videos, buttonsNoName };
      });
      await page.addScriptTag({ content: axe });
      const a11y = await page.evaluate(async () => { const r = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "best-practice"] } }); return r.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, sample: v.nodes[0]?.target?.[0]?.slice(0, 80), help: v.help.slice(0, 90) })); });
      for (const l of info.links) if (l && !l.startsWith("#") && !/^(mailto|tel|https?):/.test(l)) seenLinks.add(l.split("#")[0]);
      report.push({ path, vp: vpName, status: resp?.status(), kb: Math.round(bytes / 1024), heavy, console: console_, failed: failed.filter((v, i, a) => a.indexOf(v) === i), ...info, a11y });
      await page.close();
    }
  }
  // Liens internes : chaque cible doit répondre.
  const broken = [];
  for (const l of [...seenLinks]) { const u = BASE + (l.startsWith("/") ? l : "/" + l); const r = await fetch(u, { redirect: "manual" }); if (r.status >= 400) broken.push(l + " -> " + r.status); }
  fs.writeFileSync(process.argv[2], JSON.stringify({ broken, report }, null, 1));
  console.log("pages:", report.length, "broken links:", broken.length);
} finally { await browser.close(); }
