# Annonce 2.0, version Vice (hommage)

Reprend la grammaire des deux bandes-annonces officielles du jeu, sans aucun de leurs éléments :
pas de logo, de police, de musique, de personnage ni de nom du jeu. Le lien se fait par la date :
le jeu sort le 19 novembre 2026, NETbudget 2.0 le 15, quatre jours avant.

Le gabarit `video/template.html` est écrit en mesures (B = une mesure du morceau). Chaque coupe tombe
sur un temps, quel que soit le tempo. Durée : environ 47 à 48 s.

| Temps | Plan |
|---|---|
| 0 → 3,6 s | carton noir parodique « Peut contenir des fins de mois difficiles » |
| 3,6 → 8 s | plan large à l'heure dorée, « NETBUDGET PRÉSENTE » en capitales espacées |
| 8 s, 3 B | le groove entre : vidéo verticale en direct (vrai enregistrement de l'appli) |
| + 3 B | flash info, bandeau rouge et défilant |
| + 6 B | la jaquette se construit, une case par demi-mesure, puis tient |
| + 3 B | emblème « 2.0 » et « netbudget » posé sur la mosaïque |
| + 3 B | néon « 2.0 » qui se dessine, clignote puis se remplit, date |
| + 2 B | carton final |

## Musiques

Trois versions sont rendues pour choisir à l'oreille (`annonce-2.0-vice-<musique>-16x9.mp4` et `-9x16.mp4`).
Toutes viennent de Mixkit, licence commerciale sans attribution.

| Variante | Morceau | Style | Entrée du groove dans le morceau |
|---|---|---|---|
| `lust` | Lust (Michael Ramir C.) | disco-funk sensuel, esprit 80s | 15,36 s |
| `better-times` | Better Times are Coming | synthwave | 38,13 s |
| `funkee-monkeee` | Funkee Monkeee (Michael Ramir C.) | funk | 8,01 s |

Rendre une variante : `python3 build.py render lust` (ou `render lust 9x16`). `video/index.html` contient la variante par défaut.

## Illustrations

`assets/art/flamant.png` a été générée avec Buzzy (gpt-image-2, 1k, 1:1). Les autres générations ont
échoué (crédits Buzzy probablement épuisés). Pour enrichir la mosaïque, générer ces images une par une
(les envois simultanés échouent), les déposer dans `assets/art/` et remplacer des cases d'appli :

Préfixe commun : « Video game cover key art illustration, painterly cel-shaded digital painting with bold
linework, saturated pastel Miami palette (hot pink, violet, peach orange, teal). … Original characters,
no text, no logos. »

- `aerien.png` (16:9, photo) : vue aérienne d'une ville côtière à l'heure dorée, hôtels art déco, chaussée bordée de palmiers.
- `femme.png` (3:4) : jeune femme sur un toit au coucher du soleil, téléphone à l'écran vert, sourire fier.
- `couple.png` (4:3) : couple en cabriolet blanc sur une route côtière, la passagère montre son téléphone.
- `courses.png` (3:4) : homme qui sort d'une épicerie aux néons roses, sacs de courses, regarde son téléphone.
- `famille.png` (4:3) : famille qui charge les valises pour les vacances devant une maison rose.
- `scooter.png` (4:3) : jeune homme en scooter vert menthe le long de la plage, téléphone au guidon.
