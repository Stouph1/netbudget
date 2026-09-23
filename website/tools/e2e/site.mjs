// Parcours de bout en bout du site, dans un vrai navigateur (Chrome installé).
//
//   npm run build && npx astro preview --port 4321 &
//   npm run e2e                       # ou : node tools/e2e/site.mjs https://www.netbudget.app
//
// Vingt vérifications : titres, lien d'évitement, vidéo et son bouton, barre
// mobile (visible après défilement, inerte sinon), FAQ, menus Légal et Langue
// (exclusion mutuelle, Échap), bascule de langue et hreflang, alternatives
// des captures, images WebP dimensionnées, page 404, ordre de tabulation,
// absence d'erreur console. Sort en code 1 dès qu'une vérification échoue.
import puppeteer from "puppeteer-core";
const BASE = process.argv[2] || "http://localhost:4321";
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ["--no-sandbox"] });
const results = []; const ok = (n, c, extra="") => results.push([c ? "OK " : "KO ", n, extra]);
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors = []; page.on("pageerror", e => errors.push(String(e))); page.on("console", m => { if (m.type()==="error" && !m.text().includes("404")) errors.push(m.text()); });
  page.on("requestfailed", r => { if (!r.url().includes("/_vercel/insights/")) errors.push("REQ FAIL " + r.url()); });
  // 1. accueil FR
  await page.goto(BASE + "/", { waitUntil: "networkidle0" });
  ok("accueil charge", (await page.title()).includes("NETbudget"));
  ok("un seul H1", (await page.$$("h1")).length === 1);
  ok("un seul lien d'evitement", (await page.$$('a[href="#main"]')).length === 1);
  // video : lecture puis pause
  const playing = await page.$eval("#hero-spot-video", v => !v.paused);
  await page.click("#hero-spot-toggle"); await new Promise(r=>setTimeout(r,300));
  const paused = await page.$eval("#hero-spot-video", v => v.paused);
  const label = await page.$eval("#hero-spot-toggle", b => b.getAttribute("aria-label"));
  ok("video : lecture auto puis pause au bouton", playing && paused, `label apres pause="${label}"`);
  // sticky CTA : inert en haut, visible apres defilement
  ok("barre mobile inerte au depart", await page.$eval("#sticky-cta", b => b.inert === true && b.getAttribute("aria-hidden")==="true"));
  await page.evaluate(() => window.scrollTo(0, window.innerHeight * 1.5)); await new Promise(r=>setTimeout(r,500));
  ok("barre mobile visible apres defilement", await page.$eval("#sticky-cta", b => b.inert === false && b.getAttribute("aria-hidden")==="false"));
  await page.evaluate(() => window.scrollTo(0, 0)); await new Promise(r=>setTimeout(r,500));
  ok("barre mobile se retire en haut", await page.$eval("#sticky-cta", b => b.inert === true));
  // FAQ accueil : ouverture d'une question
  await page.evaluate(() => document.querySelector("#faq details summary").scrollIntoView());
  await page.click("#faq details summary"); await new Promise(r=>setTimeout(r,200));
  ok("FAQ : une question s'ouvre", await page.$eval("#faq details", d => d.open));
  // menus : legal puis langue, exclusion mutuelle, fermeture Echap
  const menus = await page.$$("[data-nav-menu] summary");
  await menus[0].click(); await new Promise(r=>setTimeout(r,150));
  await menus[1].click(); await new Promise(r=>setTimeout(r,150));
  const states = await page.$$eval("[data-nav-menu]", ds => ds.map(d => d.open));
  ok("menus : ouvrir la langue ferme Legal", states[0]===false && states[1]===true, JSON.stringify(states));
  await page.keyboard.press("Escape"); await new Promise(r=>setTimeout(r,150));
  ok("menus : Echap ferme tout", (await page.$$eval("[data-nav-menu]", ds => ds.every(d => !d.open))));
  // liens du menu legal
  const legal = await page.$$eval("[data-nav-menu] a", as => as.map(a => a.getAttribute("href")));
  ok("menu Legal : confidentialite + CGU + contact", legal.includes("/privacy") && legal.includes("/terms") && legal.some(h=>h.startsWith("mailto:")), legal.join(" "));
  // bascule de langue
  await page.goto(BASE + "/en", { waitUntil: "networkidle0" });
  ok("page EN en anglais", (await page.$eval("html", h => h.lang)) === "en");
  const hl = await page.$$eval('link[rel="alternate"]', ls => ls.map(l => l.getAttribute("hreflang")+"="+l.getAttribute("href")));
  ok("hreflang EN pointe sur /en", hl.some(x => x.startsWith("en=") && x.endsWith("/en")), hl.join(" "));
  await page.goto(BASE + "/en/faq", { waitUntil: "networkidle0" });
  ok("FAQ EN : un H1", (await page.$$("h1")).length === 1);
  const hl2 = await page.$$eval('link[rel="alternate"]', ls => ls.map(l => l.getAttribute("hreflang")+"="+l.getAttribute("href")));
  ok("hreflang /en/faq -> /faq et /en/faq", hl2.some(x=>x.endsWith("fr=https://netbudget.app/faq")||x.endsWith("/faq")) && hl2.some(x=>x.startsWith("en=")&&x.endsWith("/en/faq")), hl2.join(" "));
  ok("alt des captures traduit", (await page.goto(BASE+"/en",{waitUntil:"networkidle0"}), await page.$$eval("#screens img", is => is.every(i => !/Onglet/.test(i.alt) && i.alt.length>0))));
  // images servies : webp present, dimensions
  await page.evaluate(() => document.querySelector("#screens").scrollIntoView()); await new Promise(r=>setTimeout(r,1200));
  ok("captures en WebP avec dimensions", await page.$$eval("#screens img", is => is.every(i => i.currentSrc.endsWith(".webp") && i.getAttribute("width")==="720")), await page.$$eval("#screens img", is => is.map(i=>i.currentSrc.split("/").pop()).join(",")));
  // 404
  const r404 = await page.goto(BASE + "/nimporte-quoi", { waitUntil: "networkidle0" });
  ok("404 rend la page d'erreur", r404.status()===404 && (await page.title()).length>0, `status ${r404.status()}`);
  // clavier : tab depuis le haut atteint le lien d'evitement puis le logo
  await page.goto(BASE + "/", { waitUntil: "networkidle0" });
  await page.keyboard.press("Tab");
  ok("premier Tab = lien d'evitement", await page.evaluate(() => document.activeElement?.getAttribute("href")==="#main"));
  ok("aucune erreur console / requete en echec", errors.length===0, errors.slice(0,3).join(" | "));
} finally { await browser.close(); }
for (const [s,n,e] of results) console.log(s, n, e ? "   ["+e.slice(0,140)+"]" : "");
const ko = results.filter(r=>r[0]==="KO ").length; console.log(`\n${results.length-ko}/${results.length} verifications passees`); process.exit(ko?1:0);
