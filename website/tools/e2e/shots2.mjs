import puppeteer from "puppeteer-core";
const BASE = process.argv[2] || "http://localhost:4321"; const OUT = process.argv[3] || "/tmp";
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 900 });
  await page.goto(BASE + "/", { waitUntil: "networkidle0" });
  for (const sel of ["#world", "#plans"]) { await page.evaluate((s) => document.querySelector(s).scrollIntoView(), sel); await new Promise(r => setTimeout(r, 1500)); await (await page.$(sel)).screenshot({ path: `${OUT}/site-${sel.slice(1)}.png` }); }
  await page.goto(BASE + "/nouveautes", { waitUntil: "networkidle0" }); await page.screenshot({ path: `${OUT}/site-v2-top.png` });
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
  await page.goto(BASE + "/", { waitUntil: "networkidle0" }); await page.screenshot({ path: `${OUT}/site-m-nav.png` });
  await page.evaluate(() => document.querySelector("#world").scrollIntoView()); await new Promise(r => setTimeout(r, 1500)); await (await page.$("#world")).screenshot({ path: `${OUT}/site-m-world.png` });
  await page.goto(BASE + "/en/whats-new", { waitUntil: "networkidle0" }); await page.screenshot({ path: `${OUT}/site-m-v2.png` });
  console.log("ok");
} finally { await browser.close(); }
