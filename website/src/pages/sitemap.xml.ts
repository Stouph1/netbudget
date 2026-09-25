// Sitemap déduit des fichiers de pages, pas d'une liste tenue à la main.
//
// POURQUOI PAS @astrojs/sitemap : le site compte huit pages. L'intégration
// officielle ajoute une dépendance pour un fichier de trente lignes, et une
// liste écrite à la main devient fausse dès la page suivante. `import.meta.glob`
// résout les deux : on énumère les pages réelles au moment du build.
//
// Les pages exclues le sont pour une raison, pas par oubli — voir EXCLUDE.

import type { APIRoute } from "astro";

const SITE = "https://www.netbudget.app";

/**
 * Pages volontairement absentes du sitemap.
 *  - `404` : par définition, on ne veut pas qu'on y entre.
 *  - `sitemap` : ne s'indexe pas lui-même.
 *  - `confirmation` : page de retour des e-mails, sans intérêt hors de ce parcours.
 */
// Les chemins produits finissent par un slash (`/faq/`), d’où le `\/` dans
// l'alternative de fin — sans lui rien ne correspondait et tout passait.
const EXCLUDE = /(^|\/)(404|sitemap|confirmation)(\/|\.|$)/;

/** Priorité et fréquence selon la nature de la page, pas au hasard. */
function weight(path: string): { priority: string; changefreq: string } {
  if (path === "/") return { priority: "1.0", changefreq: "weekly" };
  if (path === "/en/") return { priority: "0.9", changefreq: "weekly" };
  if (path.includes("/faq")) return { priority: "0.8", changefreq: "monthly" };
  if (path.includes("/merci") || path.includes("/thank-you")) return { priority: "0.5", changefreq: "monthly" };
  // Mentions légales : utiles, rarement modifiées, jamais des pages d'entrée.
  return { priority: "0.4", changefreq: "yearly" };
}

/**
 * `./en/privacy.astro` → `/en/privacy/`
 *
 * `import.meta.glob` renvoie des clés RELATIVES commençant par `./`. Les
 * oublier laissait passer des URL en `https://netbudget.app/./faq/`, et surtout
 * empêchait les exclusions de correspondre — la 404
 * se retrouvait dans le sitemap.
 */
function toUrlPath(file: string): string {
  const rel = file
    .replace(/^\.\//, "")
    .replace(/^.*\/src\/pages\//, "")
    .replace(/\.(astro|md|mdx)$/, "");
  if (rel === "index") return "/";
  if (rel.endsWith("/index")) return `/${rel.slice(0, -"/index".length)}/`;
  return `/${rel}/`;
}

export const GET: APIRoute = () => {
  const files = Object.keys(
    import.meta.glob("./**/*.{astro,md,mdx}", { eager: false }),
  );

  const paths = [...new Set(files.map(toUrlPath))]
    .filter((p) => !EXCLUDE.test(p))
    .sort();

  // Date du build : plus honnête qu'une date figée dans le code, qui vieillit
  // sans que personne ne s'en aperçoive.
  const lastmod = new Date().toISOString().slice(0, 10);

  // Comme pour la canonique : `trailingSlash: false` côté hébergeur, donc on
  // déclare les URL réellement servies. Un sitemap plein de redirections fait
  // perdre du budget d'exploration.
  const serve = (p: string) => (p === "/" ? "/" : p.replace(/\/+$/, ""));

  // Chaque URL déclare sa jumelle dans l'autre langue : Google apprend ainsi
  // que /faq et /en/faq sont la même page en deux langues, et sert la bonne
  // selon la personne, au lieu de les voir comme deux pages concurrentes.
  const alternates = (p: string) => {
    const bare = p.replace(/^\/en(?=\/|$)/, "") || "/";
    const fr = `${SITE}${serve(bare)}`;
    const en = `${SITE}${serve(bare === "/" ? "/en/" : `/en${bare}`)}`;
    return `    <xhtml:link rel="alternate" hreflang="fr" href="${fr}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${en}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${fr}"/>`;
  };

  const urls = paths
    .map((p) => {
      const { priority, changefreq } = weight(p);
      return `  <url>
    <loc>${SITE}${serve(p)}</loc>
${alternates(p)}
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
