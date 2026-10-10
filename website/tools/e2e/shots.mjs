// Captures de contrôle visuel : une par section de l'accueil, après défilement
// (les sections apparaissent au défilement : une capture pleine page les
// montrerait vides).
import puppeteer from "puppeteer-core";
const BASE = process.argv[2] || "http://localhost:4321";
const OUT = process.argv[3] || "/tmp";
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ["--no-sandbox"] });
const SECTIONS = ["#screens", "#highlights", "#features", "#whatsnew"];
try {
  for (const [name, vp] of [["desktop", { width: 1280, height: 900 }], ["mobile", { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true }]]) {
    const page = await browser.newPage();
    await page.setViewport(vp);
    await page.goto(BASE + "/", { waitUntil: "networkidle0" });
    await page.screenshot({ path: `${OUT}/site-${name}-hero.png` });
    for (const sel of SECTIONS) {
      const el = await page.$(sel); if (!el) continue;
      await page.evaluate(async (s) => { const e = document.querySelector(s); const top = e.getBoundingClientRect().top + window.scrollY; for (let y = window.scrollY; y < top + e.offsetHeight; y += 500) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 150)); } window.scrollTo(0, top - 20); }, sel);
      await new Promise(r => setTimeout(r, 1200));
      await el.screenshot({ path: `${OUT}/site-${name}-${sel.slice(1)}.png` });
    }
    console.log(name, "ok");
  }
} finally { await browser.close(); }
