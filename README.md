# My Apple Collection

Une web app pour recenser tous les appareils Apple que vous avez possédés dans votre vie.

## Fonctionnalités

- **Collection** : vue en grille de tous vos appareils avec fiche détaillée
- **Timeline** : frise chronologique de vos appareils
- **Statistiques** : nombre d'appareils, dépenses, durée de possession, répartition par type
- **Multi-utilisateur** : gestion de comptes simple (pseudo + mot de passe, stocké localement)
- **Export/Import** : sauvegardez et restaurez vos données en JSON
- **100% client-side** : aucun serveur, fonctionne sur GitHub Pages

## Tech Stack

- **HTML/CSS/JS** vanilla
- **sql.js** (SQLite compilé en WebAssembly) pour la base de données côté navigateur
- Données persistées dans `localStorage`
- Design inspiré de l'univers Apple

## Utilisation

1. Ouvrir l'app dans un navigateur
2. Créer un compte (pseudo + mot de passe)
3. Ajouter vos appareils avec le bouton **+**
4. Naviguer entre les vues Collection, Timeline et Stats

## Déploiement

L'application est déployée automatiquement sur GitHub Pages via GitHub Actions à chaque push sur `main`.

## Données

Toutes les données sont stockées **localement dans votre navigateur** (localStorage). Pensez à utiliser la fonction Export pour sauvegarder vos données.
