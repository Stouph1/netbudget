# Playable HTML5 · Google Ads (campagne pour applications)

Deux ZIP, un par taille, générés par `playable.py` :

- `netbudget-playable-320x480.zip` (portrait, le plus diffusé)
- `netbudget-playable-480x320.zip` (paysage)

Démo « reste à vivre » : net fixe de 2 100 €, quatre curseurs (loyer, courses,
sorties, abonnements), le reste se recalcule en direct, bouton « Vois le tien
dans NETbudget » qui appelle `ExitApi.exit()` (ouvre la fiche du store).

## Mise en ligne

1. Google Ads → campagne pour applications → Ressources → « HTML5 » → importer le ZIP.
2. Avant l'import, vérifier chaque ZIP avec le validateur de Google :
   https://h5validator.appspot.com/adwords/asset (déposer le ZIP, cocher « Google Ads »).
3. Les deux tailles peuvent être ajoutées à la même campagne.

## Règles respectées

index.html à la racine, meta `ad.size`, logo embarqué en base64, aucun
chargement externe hormis `exitapi.js`, pas de son, pas de stockage, ZIP de
moins de 5 Mo. Aucun emoji, aucun concurrent cité, aucun chiffre sur l'app.
