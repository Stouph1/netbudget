// Les continents du globe, en points.
//
// Source : Natural Earth (domaine public), via le paquet world-atlas, à
// 1:110 m. On ne dessine pas les polygones : on échantillonne une grille de
// latitudes et longitudes et on garde les points qui tombent sur la terre.
// C'est le rendu « globe en pointillés » : lisible, léger, et sans aucune
// géométrie à découper sur la face visible de la sphère.
//
// Sortie : public/land.json, un tableau plat [lat×10, lon×10, lat×10, …].
//
//   node scripts/make-land-dots.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { feature } from "topojson-client";

const topo = JSON.parse(readFileSync(new URL("../node_modules/world-atlas/land-110m.json", import.meta.url)));
const land = feature(topo, topo.objects.land);
const polys = [];
for (const f of land.features) {
  const g = f.geometry;
  const list = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
  for (const poly of list) polys.push(poly); // [outer, ...holes]
}
function inRing(ring, x, y) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function onLand(lon, lat) {
  for (const poly of polys) {
    if (!inRing(poly[0], lon, lat)) continue;
    let hole = false;
    for (let k = 1; k < poly.length; k++) if (inRing(poly[k], lon, lat)) { hole = true; break; }
    if (!hole) return true;
  }
  return false;
}
const STEP = 1.5;
const out = [];
for (let lat = -85; lat <= 85; lat += STEP) {
  // Plus on monte en latitude, plus les méridiens se resserrent : on espace
  // les colonnes pour garder une densité visuelle constante.
  const step = STEP / Math.max(0.3, Math.cos((lat * Math.PI) / 180));
  for (let lon = -180; lon < 180; lon += step) {
    if (onLand(lon, lat)) out.push(Math.round(lat * 10), Math.round(lon * 10));
  }
}
writeFileSync(new URL("../public/land.json", import.meta.url), JSON.stringify(out));
console.log(`${out.length / 2} points de terre écrits dans public/land.json`);
