import puppeteer from "puppeteer-core";
const BASE = process.argv[2], OUT = process.argv[3];
const browser = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 900 });
  for (const [path, name] of [["/en", "en-home"], ["/en/whats-new", "en-v2"]]) {
    await page.goto(BASE + path, { waitUntil: "networkidle0" });
    const sel = path === "/en" ? "#screens" : "#highlights";
    await page.evaluate(async (s) => { const e = document.querySelector(s); const top = e.getBoundingClientRect().top + window.scrollY; for (let y = window.scrollY; y < top + e.offsetHeight; y += 500) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 150)); } window.scrollTo(0, top - 20); }, sel);
    await new Promise(r => setTimeout(r, 1200)); await (await page.$(sel)).screenshot({ path: `${OUT}/site-${name}.png` });
  }
  console.log("ok");
} finally { await browser.close(); }
