import puppeteer from "puppeteer-core";
const BASE = process.argv[2], OUT = process.argv[3];
const browser = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  for (const [path, tag] of [["/", "home"], ["/nouveautes", "v2"]]) {
    await page.goto(BASE + path, { waitUntil: "networkidle0" });
    const info = await page.evaluate(() => {
      const wide = [];
      for (const el of document.querySelectorAll("body *")) { const b = el.getBoundingClientRect(); if (b.right > 395 && b.width > 390 && !/absolute|fixed/.test(getComputedStyle(el).position)) wide.push([el.tagName, el.id, String(el.className).slice(0, 60), Math.round(b.width)]); }
      return { sw: document.documentElement.scrollWidth, wide: wide.slice(0, 8) };
    });
    console.log(tag, JSON.stringify(info));
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 100)); } });
    const secs = await page.$$eval("main > section, main > div, main > header, main > nav", (els) => els.map((e, i) => e.id || e.tagName.toLowerCase() + i));
    let i = 0;
    for (const sel of await page.$$("main > section, main > div, main > header, main > nav")) {
      const b = await sel.boundingBox(); if (!b || b.height < 40) { i++; continue; }
      await page.evaluate((el) => el.scrollIntoView(), sel); await new Promise(r => setTimeout(r, 700));
      await sel.screenshot({ path: `${OUT}/m-${tag}-${String(i).padStart(2, "0")}-${secs[i]}.png` }).catch(() => {});
      i++;
    }
  }
} finally { await browser.close(); }
