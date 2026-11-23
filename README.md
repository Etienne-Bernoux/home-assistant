# Home Assistant

Configuration de la maison de Nyons, sur un Raspberry Pi 4 sous Home Assistant OS avec un disque USB. Elle couvre notamment le solaire Enphase, la batterie virtuelle MyLight150 et le suivi électrique de l’annexe.

| Chemin | Contenu |
|---|---|
| [config/configuration.yaml](config/configuration.yaml) | Chargement des packages et des tableaux de bord |
| [config/packages/](config/packages/) | Capteurs, helpers, automatisations et scripts. Voir le [catalogue généré](docs/automations.md). |
| [config/custom_templates/](config/custom_templates/) | Macros Jinja et exemple de catalogue tarifaire MyLight |
| [config/dashboards/](config/dashboards/) | Maison, Maison famille, Musique, Annexe et Rentabilité |
| [config/www/](config/www/) | Plans et carte de températures |
| [scripts/](scripts/) | Déploiement, import du stock MyLight et rattrapage des statistiques |
| [tests/](tests/) | Scénarios Cucumber, utilitaires et générateur du catalogue |

## Installer

1. Déclarer l’hôte SSH `ha` vers le module Terminal & SSH du Pi.
2. Installer MyLight Systems (`acesyde/hassio_mylight_integration`) et ApexCharts Card (`RomRider/apexcharts-card`) depuis le Marketplace de Home Assistant. Redémarrer après l’installation de l’intégration.
3. Prendre [mylight.example.jinja](config/custom_templates/mylight.example.jinja) comme modèle et placer le catalogue réel dans `/config/custom_templates/mylight.jinja` sur le Pi.
4. Configurer Workday dans l’interface pour la France, du lundi au vendredi hors jours fériés, avec l’entité `binary_sensor.workday_sensor_fr` utilisée par le [chauffage du bureau](config/packages/temperature.yaml).
5. Après l’installation du package météo, régler les seuils dans l’onglet Températures. Les valeurs initiales utilisées à Nyons sont 28 °C pour la chaleur, 1 °C pour le gel et 0,5 mm pour la pluie.

## Déployer

Depuis un arbre Git propre, lancer `./scripts/deploy.sh`. Le script actualise `origin/main`, vérifie que `HEAD` figure dans son historique et copie sur le Pi les fichiers du commit. `./scripts/deploy.sh --branch` autorise explicitement un déploiement de test. Hors LAN, passer les options SSH indiquées dans `LOCAL.md` via `HA_SSH_OPTS`.

Avant la copie, le script compare `configuration.yaml`, `packages/`, `custom_templates/`, `dashboards/` et `www/` au commit indiqué dans `/config/.deployed-commit` et refuse les écarts. Au premier déploiement, le périmètre géré doit correspondre à `origin/main` ou être vide. `custom_templates/mylight.jinja` et `www/community/` restent gérés sur le Pi.

La version précédente est conservée dans `/config/.deploy-previous`. Le script la restaure si `ha core check` échoue et enregistre le nouveau SHA après validation. Recharger selon le changement via `automation.reload`, `template.reload` et `homeassistant.reload_custom_templates`. Une modification de `configuration.yaml` ou l’ajout d’un package demande un redémarrage.

## Tester

```bash
npm ci --prefix tests
npm test --prefix tests -- --tags "not @jinja and not @nyons"
```

Avec Docker, Node.js, npm, jq, curl et OpenSSL, lancer `bash tests/support/run-with-home-assistant.sh`. Comme [GitHub Actions](.github/workflows/tests.yml), ce script lance un Home Assistant isolé pour exécuter les scénarios hors ligne et les scénarios `@jinja` à partir du dépôt.

Après une mise à jour du Core sur le Pi, reporter dans `tests/support/home-assistant-version` la version renvoyée par `GET /api/config`. Le conteneur de CI lit ce fichier, et un scénario `@nyons` signale la version à y inscrire si elle diffère de celle du Pi.

Les scénarios `@nyons` vérifient aussi le calendrier et les données Énergie du Pi. Pour exécuter toute la suite depuis un poste qui peut le joindre, utiliser son URL et le jeton du trousseau macOS.

```bash
HA_URL=http://192.168.1.250 HA_TOKEN="$(security find-generic-password -s ha-nyons -w)" npm test --prefix tests
```

Décrire dans [tests/features/](tests/features/) des résultats observables et réutiliser les templates du dépôt dans les étapes. Après un changement d’alias, d’identifiant ou de package, régénérer le [catalogue](docs/automations.md) avec `node tests/generate-automation-catalog.mjs`.

## Rattraper une panne

Attendre au moins trois heures après la dernière heure à corriger. Lancer [rebuild-energy-gap.mjs](scripts/rebuild-energy-gap.mjs) à blanc, puis retirer `--dry-run` pour appliquer la correction. Relancer à blanc pour vérifier que le script ne propose plus de reprise.

```bash
HA_URL=http://192.168.1.250 HA_TOKEN="$(security find-generic-password -s ha-nyons -w)" \
  SHELLY_ANNEX_URL=http://adresse-du-shelly node scripts/rebuild-energy-gap.mjs \
  --from=2026-11-18T07:00:00Z --to=2026-11-20T06:00:00Z --dry-run
```

Les bornes sont la première et la dernière heure UTC erronées. Renseigner `SHELLY_ANNEX_URL` pour reprendre l’annexe à partir de la mémoire du Shelly EM. Les données MyLight utilisent les identifiants du trousseau macOS (`mylight`).

Si le script annonce une correction de Rentabilité, l’appliquer une seule fois aux trois compteurs de `sensor.rentabilite_mylight_compteurs`.

Dans [mylight_profitability.yaml](config/packages/mylight_profitability.yaml), appliquer les montants sous condition d’un attribut drapeau absent, poser le drapeau à `true`, déployer puis recharger les templates. Vérifier les montants, retirer le correctif temporaire et redéployer.

## Règles

- **MyLight**. Laisser les logs de l’intégration hors du niveau `debug`, qui journalise le mot de passe. Éviter son export CSV dans `/config/www/`, accessible sans authentification. Lire le changelog avant chaque mise à jour du Marketplace, puis redémarrer.
- **Rentabilité**. Ajouter les changements de tarifs et de forfaits à `mylight.jinja` avec leur date d’effet. Chaque automne, actualiser `reference_year` et recalculer `reference_kwh` sur la même période à partir des statistiques de `sensor.annexe_energie`, puis recharger les templates.
- **Contrôle de l’annexe**. Le dernier relevé de facturation date du 22 novembre 2026 à 19 h 20, au tarif de 0,254 €/kWh.
  Depuis ce relevé, le coût et la majoration reposent sur le Shelly EM. Pour contrôler la mesure, comparer l’écart du
  sous-compteur depuis 20 676,5 kWh à celui de `sensor.annexe_energie` depuis 69,918 kWh.
- **Shelly**. Régler `initial_state: on` sur les relais et détacher le bouton des six Plug M. Sur le 1PM de la pompe, détacher l’entrée et garder le seuil de courant de 16 A.
- **Tableau Énergie**. Utiliser MyLight pour les achats, la réinjection et la batterie virtuelle. En direct, le réseau affiche la puissance facturée et la batterie virtuelle affiche la puissance de charge ou de décharge MyLight. La puissance nette de l’Envoy indique l’échange physique avec le réseau, avec une valeur négative en export. Utiliser la pince CT de l’Envoy pour la production solaire. Les statistiques antérieures au décrochage du compteur le 20 novembre 2026 ont été reprises dans la série CT.

## Ce qui reste hors du dépôt

- Accès et secrets locaux dans `LOCAL.md`, `secrets.yaml` et `custom_templates/mylight.jinja`.
- Extensions du Marketplace dans `custom_components/` et `www/community/`.
- Intégrations et réglages de l’interface dans `.storage/`. Cela comprend Workday, le tableau Énergie, les sauvegardes, les pièces, les entités renommées et les réglages de l’Envoy et des Shelly. Configurer la prise du frigo comme scanner Bluetooth actif et la production Enphase en kWh. Les sauvegardes quotidiennes chiffrées couvrent ces réglages sur le Pi et sur Google Drive.
- Ressource Lovelace `/local/plan-heatmap.js?v=N` déclarée dans l’interface. Incrémenter `N` après un changement de [plan-heatmap.js](config/www/plan-heatmap.js).
