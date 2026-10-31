# Annonce 2.0, version Vice (hommage)

Reprend la grammaire des deux bandes-annonces officielles du jeu, sans aucun de leurs éléments :
pas de logo, de police, de musique, de personnage ni de nom du jeu. Le lien se fait par la date :
le jeu sort le 19 novembre 2026, NETbudget 2.0 le 15, quatre jours avant.

| Temps | Plan |
|---|---|
| 0 → 3,6 s | carton noir parodique « Peut contenir des fins de mois difficiles » |
| 3,6 → 8,1 s | plan large à l'heure dorée, « NETBUDGET PRÉSENTE » en capitales espacées |
| 8,1 → 12,1 s | vidéo verticale en direct (vrai enregistrement de l'appli) |
| 12,1 → 16,1 s | flash info, bandeau rouge et défilant |
| 16,1 → 26,1 s | la jaquette se construit case par case, une case par temps |
| 26,1 → 30,1 s | emblème « 2.0 » et « netbudget » posé sur la mosaïque |
| 30,1 → 34,1 s | néon « 2.0 » qui se dessine puis se remplit, date |
| 34,1 → 38 s | carton final |

- `video/index.html` : composition 16:9 (38 s). `build.py` dérive le format Reels et rend les deux (`python3 build.py render`).
- Musique : « Life is a Dream » (Michael Ramir C., Mixkit, licence commerciale sans attribution), 120 BPM, le groove entre à 8,1 s.
- Police des titres : Rubik (licence libre OFL).

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
