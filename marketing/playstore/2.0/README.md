# Google Play · fiche 2.0

- `fiche.py` : textes (nom, description courte, description complète, notes de version) dans `textes/<lang>.md` et image de présentation 1024 × 500 dans `images/`.
- `captures_play.py` : captures d'écran de la fiche dans `images/captures/<format>/<lang>/`, cinq par langue et par format, dans l'ordre de la fiche (reste à vivre, projet, Coach, espaces, dépenses). Formats : `telephone` 1080 × 1920, `tablette-7` 1242 × 2208, `tablette-10` 1440 × 2560, tous en 9:16.

## Où les mettre dans la Play Console

Accroître le nombre d'utilisateurs → Présence sur le Play Store → Fiche Play Store par défaut, puis la langue :

1. « Éléments pour téléphone » → Captures d'écran pour téléphone : les cinq images de `telephone/<lang>/` (de deux à huit, Google en veut au moins quatre en 1 080 px pour promouvoir l'app).
2. « Éléments pour tablette 7 pouces » : `tablette-7/<lang>/`.
3. « Éléments pour tablette 10 pouces » : `tablette-10/<lang>/`.
4. Image de présentation : `images/presentation-1024x500-<lang>.png`.

Les écrans viennent des simulateurs iPhone 17 et iPad Pro 13 avec le compte de test, chaque langue dans sa devise et sa ville (euro Paris, Madrid, Lisbonne, Berlin, Rome ; livre Londres ; yen Tokyo ; dirham Casablanca).
