---
title: Élément Lovelace personnalisé invisible quand il est chargé par extra_module_url
category: frontend
date: 2026-10-23
tags: [lovelace, custom-element, picture-elements, extra_module_url, scoped-custom-element-registry, mobile]
project: home-assistant
---

# Élément Lovelace personnalisé invisible quand il est chargé par `extra_module_url`

## Symptôme

La carte `picture-elements` de la page Maison s'affiche deux secondes puis passe en « Erreur de configuration », sur l'application mobile mais pas sur le navigateur du Mac. Les deux secondes sont le délai `TIMEOUT` de `_customCreate` dans `create-element-base.ts` : le frontend attend que l'élément `custom:plan-heatmap` soit défini, puis abandonne. Une erreur levée par l'élément lui-même s'afficherait immédiatement.

## Cause

Le frontend remplace `window.customElements` par le polyfill « scoped custom element registry » au démarrage. `frontend: extra_module_url` importe le module en parallèle de ce démarrage. Si le module s'exécute avant l'installation du polyfill, `customElements.define` écrit dans le registre natif, que le frontend ne consulte plus : l'import réussit, `customElements.get('plan-heatmap')` reste `undefined`. Sur un appareil lent, l'ordre bascule, d'où un bug propre au mobile.

Preuve, dans une session connectée en Chrome piloté : l'import de démarrage répond `import ok`, l'élément n'est pas défini ; un import du même fichier sous une autre URL, une fois l'interface démarrée, le définit (`fresh import true`).

## Correction

Charger le module comme ressource Lovelace (`lovelace/resources/create`, type `module`) : le frontend charge les ressources après son démarrage. La ressource vit dans `.storage/lovelace_resources`, hors dépôt ; son URL porte `?v=N`, à incrémenter à chaque modification de `config/www/plan-heatmap.js` pour passer le cache de 31 jours de `/local/`.

Ne pas revenir à `extra_module_url` pour un élément utilisé dans un tableau de bord.
