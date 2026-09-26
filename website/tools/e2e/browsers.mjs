// Même parcours que site.mjs, joué dans quatre moteurs : Chromium (Chrome),
// Edge, Firefox et WebKit (le moteur de Safari). Playwright pilote les quatre
// avec la même API. Une fois : `npx playwright install firefox webkit` ;
// Chrome et Edge sont ceux installés sur la machine. Lancer :
// `npm run e2e:browsers -- http://localhost:4321` (ou l’URL de production).
import { chromium, firefox, webkit } from "playwright";
const BASE = process.argv[2] || "http://localhost:4321";
const targets = [
  ["Chrome", () => chromium.launch({ channel: "chrome" })],
  ["Edge", () => chromium.launch({ channel: "msedge" })],
  ["Firefox", () => firefox.launch()],
  ["WebKit", () => webkit.launch()],
];
let totalKo = 0;
for (const [name, launch] of targets) {
  const results = []; const ok = (n, c, extra = "") => results.push([c ? "OK " : "KO ", n, extra]);
  let browser;
  try { browser = await launch(); } catch (e) { console.log(`\n== ${name} : indisponible (${String(e).split("\n")[0].slice(0, 90)})`); continue; }
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: name !== "Firefox", hasTouch: name !== "Firefox" });
    const page = await ctx.newPage();
    const errors = []; page.on("pageerror", e => errors.push(String(e)));
    page.on("console", m => { if (m.type() === "error" && !m.text().includes("404")) errors.push(m.text()); });
    page.on("requestfailed", r => { if (!r.url().includes("/_vercel/insights/")) errors.push("REQ FAIL " + r.url()); });
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    ok("accueil charge", (await page.title()).includes("NETbudget"));
    ok("un seul H1", (await page.$$("h1")).length === 1);
    // avis mesure d'audience : apparait, refus memorise, script absent ensuite
    await page.waitForTimeout(1800);
    ok("avis audience visible apres 1,4 s", await page.$eval("#consent-notice", n => !n.hidden));
    await page.click('[data-consent="refused"]'); await page.waitForTimeout(400);
    ok("refus memorise", (await page.evaluate(() => localStorage.getItem("nb:consent"))) === "refused");
    await page.reload({ waitUntil: "networkidle" }); await page.waitForTimeout(1800);
    ok("apres refus : avis absent, script de mesure non charge", await page.evaluate(() => document.getElementById("consent-notice").hidden && !document.querySelector('script[src*="/_vercel/insights/"]')));
    await page.evaluate(() => localStorage.setItem("nb:consent", "ok")); await page.reload({ waitUntil: "networkidle" });
    ok("apres accord : script de mesure demande", await page.evaluate(() => !!document.querySelector('script[src*="/_vercel/insights/"]')));
    await page.evaluate(() => document.querySelector("footer").scrollIntoView()); await page.click("[data-consent-open]"); await page.waitForTimeout(400);
    ok("pied de page : revoir son choix rouvre l'avis", await page.$eval("#consent-notice", n => !n.hidden));
    await page.click('[data-consent="ok"]'); await page.waitForTimeout(400);
    // video
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    const playing = await page.$eval("#hero-spot-video", v => !v.paused);
    const pressed = await page.$eval("#hero-spot-toggle", b => b.getAttribute("aria-pressed") === "true");
    ok("video : le bouton reflete l'etat reel", playing === pressed, playing ? "lecture auto" : "lecture auto bloquee par le moteur, bouton en mode lancer");
    await page.click("#hero-spot-toggle"); await page.waitForTimeout(400);
    ok("video : un clic inverse l'etat", (await page.$eval("#hero-spot-video", v => v.paused)) === playing);
    // barre mobile
    await page.evaluate(() => window.scrollTo(0, window.innerHeight * 1.5)); await page.waitForTimeout(500);
    ok("barre mobile visible apres defilement", await page.$eval("#sticky-cta", b => b.getAttribute("aria-hidden") === "false"));
    // FAQ, menus
    await page.evaluate(() => document.querySelector("#faq details summary").scrollIntoView());
    await page.click("#faq details summary"); await page.waitForTimeout(200);
    ok("FAQ : une question s'ouvre", await page.$eval("#faq details", d => d.open));
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(300);
    const menus = await page.$$("[data-nav-menu] summary");
    await menus[0].click(); await page.waitForTimeout(150); await menus[1].click(); await page.waitForTimeout(150);
    ok("menus : exclusion mutuelle", JSON.stringify(await page.$$eval("[data-nav-menu]", ds => ds.map(d => d.open))) === "[false,true]");
    await page.keyboard.press("Escape"); await page.waitForTimeout(150);
    ok("menus : Echap ferme", await page.$$eval("[data-nav-menu]", ds => ds.every(d => !d.open)));
    // captures
    await page.evaluate(() => document.querySelector("#screens").scrollIntoView()); await page.waitForTimeout(1200);
    ok("captures WebP chargees", await page.$$eval("#screens img", is => is.every(i => i.currentSrc.endsWith(".webp") && i.naturalWidth > 0)));
    // EN + 404
    await page.goto(BASE + "/en/faq", { waitUntil: "networkidle" });
    ok("FAQ EN : H1 et hreflang", (await page.$$("h1")).length === 1 && (await page.$$eval('link[rel="alternate"]', ls => ls.some(l => l.href.endsWith("/en/faq")))));
    // page de retour des e-mails : langue, etat, lien vers l'app
    await page.goto(BASE + "/confirmation?type=recovery&lang=en&code=k1", { waitUntil: "networkidle" });
    ok("confirmation : EN + nouveau mot de passe + lien vers l'app", await page.evaluate(() => document.documentElement.lang === "en" && document.getElementById("confirm").dataset.state === "recovery" && [...document.querySelectorAll("[data-open-app]")].some(a => a.offsetParent && a.getAttribute("href") === "netbudget://reset-password?type=recovery&code=k1")));
    await page.goto(BASE + "/confirmation?lang=fr#error=access_denied&error_code=otp_expired", { waitUntil: "networkidle" });
    ok("confirmation : lien expire sans bouton d'ouverture", await page.evaluate(() => document.getElementById("confirm").dataset.state === "error" && ![...document.querySelectorAll("[data-open-app]")].some(a => a.offsetParent)));
    await page.goto(BASE + "/rejoindre?code=ABC_def-123&lang=en", { waitUntil: "networkidle" });
    ok("invitation : EN, code affiche, lien vers l'app", await page.evaluate(() => document.documentElement.lang === "en" && [...document.querySelectorAll("[data-code]")].some(e => e.offsetParent && e.textContent === "ABC_def-123") && [...document.querySelectorAll("[data-open-app]")].some(a => a.offsetParent && a.getAttribute("href") === "netbudget:///(premium)/workspaces?join=ABC_def-123")));
    await page.goto(BASE + "/rejoindre", { waitUntil: "networkidle" });
    ok("invitation : sans code, message explicite", await page.evaluate(() => document.getElementById("join").dataset.state === "missing"));
    const r = await page.goto(BASE + "/nimporte-quoi", { waitUntil: "networkidle" });
    ok("404", r.status() === 404);
    ok("aucune erreur console", errors.length === 0, errors.slice(0, 2).join(" | "));
  } catch (e) { results.push(["KO ", "exception", String(e).slice(0, 140)]); }
  finally { await browser.close(); }
  const ko = results.filter(r => r[0] === "KO ").length; totalKo += ko;
  console.log(`\n== ${name} : ${results.length - ko}/${results.length}`);
  for (const [s, n, e] of results) if (s === "KO " || e) console.log("  ", s, n, e ? "[" + e.slice(0, 120) + "]" : "");
}
process.exit(totalKo ? 1 : 0);
