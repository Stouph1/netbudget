# NETbudget — Site

Site statique d'atterrissage pour l'application NETbudget. Construit avec
[Astro](https://astro.build) + [Tailwind CSS](https://tailwindcss.com).

## Lancer en local

```bash
cd website
npm install
npm run dev
```

Le site est disponible sur http://localhost:4321.

## Compiler pour la prod

```bash
npm run build
```

Le résultat est dans `dist/` — c'est un dossier de fichiers statiques que
tu peux déployer sur Vercel, Netlify, Cloudflare Pages, GitHub Pages, ou
n'importe quel hébergeur statique.

## Structure

```
website/
├── astro.config.mjs        # Config Astro + i18n (8 langues)
├── tailwind.config.mjs     # Tailwind, thème sombre + animations
├── public/                 # Statique servi tel quel
└── src/
    ├── i18n/
    │   ├── ui.ts           # Traductions (FR + EN complets, 6 autres en stub)
    │   └── utils.ts        # Helpers getLocaleFromUrl, t(), localizedPath
    ├── layouts/Layout.astro
    ├── components/
    │   ├── Nav.astro       # Barre de navigation sticky
    │   ├── Hero.astro      # Section d'accroche
    │   ├── AppMockup.astro # Maquette d'écran iPhone en SVG/HTML
    │   ├── Stats.astro     # Chiffres clés (8 langues, 558 villes…)
    │   ├── Features.astro  # Grille de 9 fonctionnalités
    │   ├── WhatsNew.astro  # Section nouveautés v1.6
    │   ├── Privacy.astro   # Promesse vie privée
    │   ├── FinalCTA.astro  # CTA final de bas de page
    │   ├── Footer.astro
    │   └── LegalPage.astro
    └── pages/
        ├── index.astro     # FR (langue par défaut, pas de préfixe URL)
        ├── privacy.astro
        ├── terms.astro
        ├── en/             # English (/en/, /en/privacy/, /en/terms/)
        ├── es/             # Stub - hérite des contenus EN tant que tu n'as pas traduit
        ├── pt/
        ├── de/
        ├── it/
        ├── ar/             # RTL automatique
        └── ja/
```

## Ajouter une traduction

Ouvre `src/i18n/ui.ts`. Le bloc `fr` et `en` sont complets. Pour les
6 autres langues, des objets stub héritent de `en` :

```ts
const es: Catalog = { ...en };
```

Remplace par des traductions ciblées :

```ts
const es: Catalog = {
  ...en,
  "hero.title": "¿Cuánto te queda realmente cada mes?",
  "hero.subtitle": "...",
  // etc.
};
```

Toute clé manquante retombe automatiquement sur EN puis FR.

## Déploiement recommandé : Vercel

1. Pousse `website/` sur GitHub (déjà inclus dans le repo principal).
2. Sur Vercel, importe le repo et indique le dossier `website/` comme root.
3. Build command : `npm run build` · Output : `dist/`.
4. Vercel détecte Astro automatiquement et configure tout.

Pour Cloudflare Pages, Netlify ou un VPS, même principe : `npm run build`
produit un dossier statique.
