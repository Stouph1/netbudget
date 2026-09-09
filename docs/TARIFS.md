# Tarifs des abonnements — fiche de référence

Source de vérité : **App Store Connect**. Google Play doit refléter exactement
ces montants, sinon la même formule se vend à deux prix selon le téléphone.

Où les lire, tous les six d'un coup :
**RevenueCat → Products** (ils y ont été importés depuis Apple), ou
**App Store Connect → Abonnements → chaque produit → Tarification**.

## Grille

| Formule | Identifiant Apple | Forfait Google | Prix | Confirmé |
|---|---|---|---|---|
| Solo mensuel | `netbudget.solo.monthly` | `netbudget.solo` / `monthly` | | ☐ |
| Solo annuel | `netbudget.solo.yearly` | `netbudget.solo` / `yearly` | | ☐ |
| Duo mensuel | `netbudget.duo.monthly` | `netbudget.duo` / `monthly` | | ☐ |
| Duo annuel | `netbudget.duo.yearly` | `netbudget.duo` / `yearly` | | ☐ |
| Famille mensuel | `netbudget.family.monthly` | `netbudget.family` / `monthly` | | ☐ |
| Famille annuel | `netbudget.family.yearly` | `netbudget.family` / `yearly` | | ☐ |

## Ce que l'app affichait pendant le test du 9 septembre 2026

À CONFIRMER, ne pas recopier tel quel dans Play Console. Ces montants
viennent de captures d'écran d'un compte bac à sable en storefront
**américain** — ce ne sont pas les prix français.

| Formule | Affiché | Origine |
|---|---|---|
| Solo annuel | 34,99 $US | lu sur la carte |
| Duo mensuel | 6,99 $US | déduit de « tu économises 23,89 $ sur l'année » |
| Duo annuel | 59,99 $US | lu sur la carte |
| Famille annuel | 79,99 $US | lu sur la carte |
| Duo annuel | 64,99 € | feuille d'achat TestFlight, compte français |

Le même produit à 59,99 $ et 64,99 € confirme que la grille n'est pas une
simple conversion : chaque storefront a son propre montant. Sur Google, saisis
le prix de la zone euro et laisse la conversion automatique faire le reste,
puis vérifie les pays où tu vends le plus.

## Réglages de forfait de base — mêmes valeurs pour les six

| Champ | Valeur |
|---|---|
| Type | Renouvellement automatique |
| ID du forfait | `monthly` ou `yearly`, jamais autre chose |
| Délai de grâce | 7 jours |
| Blocage de compte | calculé automatiquement (53 jours) |
| Se réabonner | Autoriser |
| Tags | vide |

Le délai de grâce de 7 jours n'est pas cosmétique : le webhook traduit un
incident de paiement en statut `in_grace`, et `my_tier()` continue d'accorder
l'accès pendant ce temps. Le mettre à zéro couperait l'accès de quelqu'un dont
la carte a simplement expiré.

## Avant la mise en vente

- [ ] Les six prix Google correspondent aux six prix Apple
- [ ] Les six forfaits de base sont **activés** (la liste doit afficher 2 par abonnement)
- [ ] Les offres d'essai de 7 jours sont créées, côté Google aussi
