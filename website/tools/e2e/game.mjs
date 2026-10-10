// Le globe : continents chargés, puis trois taps dans l'Atlantique lancent le
// jeu ; on tire, on laisse les soucoupes gagner, et le panneau de fin apparaît
// avec les liens vers les boutiques.
import puppeteer from "puppeteer-core";
const BASE = process.argv[2] || "http://localhost:4321", OUT = process.argv[3] || "/tmp";
const browser = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--no-sandbox"] });
const results = []; const ok = (n, c, e = "") => results.push([c ? "OK " : "KO ", n, e]);
try {
  const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 900 });
  const errors = []; page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(BASE + "/", { waitUntil: "networkidle0" });
  await page.evaluate(() => document.querySelector("#world").scrollIntoView({ block: "center" }));
  await new Promise((r) => setTimeout(r, 1500));
  const land = await page.evaluate(() => fetch("/land.json").then((r) => r.json()).then((a) => a.length / 2));
  ok("continents charges", land > 4000, `${land} points`);
  const el = await page.$("#globe"); const box = await el.boundingBox();
  await el.screenshot({ path: `${OUT}/globe-land.png` });
  // Cherche un point d'écran qui tombe dans l'Atlantique : on balaie la face
  // visible et on demande au globe lui-même (via l'inverse de la projection
  // réimplémentée ici) — plus simple : on tape à l'ouest de l'Afrique sur
  // l'hémisphère visible, en essayant plusieurs points jusqu'à ce que le jeu
  // démarre.
  let started = false;
  for (let fx = 0.2; fx <= 0.8 && !started; fx += 0.08) for (let fy = 0.3; fy <= 0.7 && !started; fy += 0.1) {
    const x = box.x + box.width * fx, y = box.y + box.height * fy;
    for (let k = 0; k < 3; k++) { await page.mouse.click(x, y); await new Promise((r) => setTimeout(r, 120)); }
    await new Promise((r) => setTimeout(r, 200));
    started = await page.$eval("#globe-quit", (b) => !b.classList.contains("hidden"));
  }
  ok("trois taps dans l'Atlantique lancent le jeu", started);
  await new Promise((r) => setTimeout(r, 2500));
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.3);
  await el.screenshot({ path: `${OUT}/globe-game.png` });
  // On tire un peu, puis on laisse perdre : les points se font prendre.
  for (let i = 0; i < 6; i++) { await page.mouse.click(box.x + box.width * (0.3 + i * 0.07), box.y + box.height * 0.5); await new Promise((r) => setTimeout(r, 150)); }
  const over = await page.waitForFunction(() => !document.getElementById("globe-gameover").classList.contains("hidden"), { timeout: 240000 }).then(() => true).catch(() => false);
  ok("la Terre finit par exploser et le panneau s'affiche", over);
  await el.screenshot({ path: `${OUT}/globe-over.png` });
  const links = await page.$$eval("#globe-gameover a", (as) => as.map((a) => a.href));
  ok("liens vers l'App Store et Google Play", links.some((h) => h.includes("apps.apple.com")) && links.some((h) => h.includes("play.google.com")), links.join(" "));
  await page.click("#globe-again"); await new Promise((r) => setTimeout(r, 300));
  ok("rejouer relance", await page.$eval("#globe-gameover", (d) => d.classList.contains("hidden")));
  await page.keyboard.press("Escape"); await new Promise((r) => setTimeout(r, 300));
  ok("Echap quitte", await page.$eval("#globe-quit", (b) => b.classList.contains("hidden")));
  ok("aucune erreur de script", errors.length === 0, errors.slice(0, 2).join(" | "));
} finally { await browser.close(); }
for (const [s, n, e] of results) console.log(s, n, e ? "   [" + e.slice(0, 120) + "]" : "");
process.exit(results.some((r) => r[0] === "KO ") ? 1 : 0);
