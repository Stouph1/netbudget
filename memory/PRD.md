# Reste à Vivre — PRD

## Vision
Application mobile Expo (React Native) en français permettant de calculer son **reste à vivre mensuel** et de visualiser son **budget mois par mois sur 12 mois**, avec un niveau de détail à la Finary.

## Langue / Thème
- Français (FR)
- Thème sombre élégant (Jewel & Luxury). Gradient de fond du camembert change en fonction de la ville.

## Fonctionnalités
1. **Revenus annuels bruts** : salaire de base + variable (primes), avec toggle Cadre (75%) / Non-cadre (78%). Calcul auto du net mensuel.
2. **Localisation** : sélection parmi ~35 villes françaises avec indice coût de la vie + bouton **info** expliquant l'indice (basé sur loyers, alimentation, transport, services — synthèse INSEE / comparateurs publics). L'indice est **informatif** ; les dépenses saisies par l'utilisateur restent la base du calcul.
3. **Logement** : loyer mensuel (charges comprises).
4. **Prêts bancaires** : ajout/édition/suppression. Mensualité auto = `P × r / (1 − (1+r)^(−n))`.
5. **Dépenses mensuelles détaillées (Finary-like)** :
   - Alimentation, Transport, Loisirs, Santé, Abonnements, Énergie & Eau, Autres — chacune avec une couleur distincte.
6. **Projection Budget mois par mois (12 mois)** :
   - 12 cartes horizontales + tableau 12 lignes + totaux annuels.
   - Variable versé mensualisé OU en un mois précis.
7. **Camembert de répartition (en fin de page)** :
   - Fond en gradient selon le thème régional de la ville.
   - Couleurs distinctes par catégorie (bleu loyer, rouge prêts, vert alimentation, etc.).
   - Légende avec valeur €.
8. **Défauts à 0** : tous les champs monétaires démarrent à "0" et se vident au focus pour saisie fluide.
9. **Modals custom** de confirmation (reset + suppression prêt) fiables sur web et natif.

## Stack
- Expo SDK 54, expo-router
- react-native-svg (camembert)
- expo-linear-gradient (hero par ville)
- @expo/vector-icons
- FastAPI backend (non utilisé par le MVP, reste disponible)

## Hors MVP (à venir)
- Persistance locale (AsyncStorage)
- Multi-profils / sauvegarde cloud
- Calcul d'impôt sur le revenu détaillé
- Import fiche de paie
- Export PDF du budget annuel
- Alertes seuil de reste à vivre
