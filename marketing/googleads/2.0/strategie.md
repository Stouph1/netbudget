# Google Ads, NETbudget 2.0 : plan de campagnes

État au 31 octobre 2026 : une campagne pour applications « App-1 », Android, 4 €/jour.
Du 14 au 31 octobre : 62 880 impressions, 2 938 clics, 49,61 €, **0 conversion**.

## 1. Avant tout : mesurer les installations

Sans conversion, Google ne sait pas qui installe et achète des clics au hasard. Un clic à 0,02 €
avec 4,7 % de taux de clic, c'est le profil des clics accidentels dans les jeux mobiles.

1. Outils > Comptes associés > Google Play : associer le compte développeur (approuver dans Play Console > Paramètres > Services liés).
2. Objectifs > Conversions > Nouvelle action > Application > Google Play > « Installations ». La définir comme objectif principal de la campagne.
3. Pas de Firebase : l'app ne contient aucun SDK de mesure (promesse de confidentialité). La mesure via Google Play suffit pour les installations Android.

## 2. Structure : peu de campagnes, assez de budget chacune

Une campagne pour applications a besoin de volume pour apprendre. Avec 4 €/jour, huit campagnes
à 0,50 € n'apprendraient jamais. On découpe par langue, pas par pays, et on commence par deux.

| Campagne | Appli | Langue | Pays | Budget |
|---|---|---|---|---|
| Android · FR | Google Play | français | France, Belgique, Suisse, Luxembourg, Canada, Maroc, Sénégal, Côte d'Ivoire, Tunisie | 3 €/jour |
| Android · EN | Google Play | anglais | Royaume-Uni, Irlande, États-Unis, Canada, Australie, Nouvelle-Zélande | 1 €/jour |
| Android · ES-PT-DE-IT | Google Play | une campagne par langue | pays de la langue | à ouvrir quand FR dépasse 30 installations/semaine |

Enchères : « Installations », sans coût par installation cible au départ. Après 2 semaines et au
moins 30 installations, fixer une cible à environ 1,2 fois le coût moyen constaté.

## 3. iPhone

Une campagne pour applications iOS ne peut pas mesurer les installations sans SDK dans l'app.
Pour les utilisateurs Apple : une campagne vidéo YouTube (Demand Gen) vers netbudget.app, la page
qui envoie chacun vers son store. Objectif clics, à lancer le 15 novembre, jour de la 2.0 sur iOS.

## 4. Éléments par groupe d'annonces

- Textes : `textes_langues.py` (5 titres, 5 descriptions par langue, limites vérifiées).
- Images : `images/` (français) et `images/<langue>/`, 15 par langue, écrans traduits.
- Vidéos : `videos/annonce-2.0-16x9.mp4` et `-9x16.mp4` (36 s, moins de 10 Mo), à publier sur
  YouTube en « non répertoriée », puis à ajouter en paysage et en portrait. Garder aussi `formules`.
  La version Vice reste pour les réseaux sociaux.

## 5. Calendrier

| Date | Action |
|---|---|
| Maintenant | conversions, campagnes FR et EN Android, vidéos |
| 14 novembre | relire les chiffres de la première semaine, couper ce qui ne convertit pas |
| 15 novembre | 2.0 sur iOS : campagne vidéo YouTube vers netbudget.app |
| 15-19 novembre | budget renforcé sur la vague de la sortie du jeu (version Vice sur les réseaux) |
