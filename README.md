# Home Assistant

Configuration versionnée d'un Home Assistant domestique (Raspberry Pi 4, Home Assistant OS, disque USB) : installation solaire Enphase, fournisseur MyLight150 avec batterie virtuelle MySmartBattery, contrat heures pleines / heures creuses. `config/` reflète `/config` sur le Pi pour ce qui est écrit en YAML ; le reste vit dans l'interface.

## Contenu

| Fichier | Rôle |
|---|---|
| `config/packages/energy_tariff.yaml` | Plages d'heures creuses et prix du kWh en vigueur |
| `config/packages/mylight_profitability.yaml` | Gain de la batterie virtuelle face à EDF Tarif Bleu, économie de l'installation, dates de retour sur investissement, état de charge de la batterie virtuelle, et puissances de la batterie virtuelle et du réseau facturé, qui partagent la puissance nette mesurée par l'Envoy selon le stock (affichés dans l'onglet Énergie), et les mêmes cumuls, dates et montants annuels avec l'annexe refacturée : sa majoration, écart entre le prix heures pleines qu'elle doit et le Tarif Bleu heures pleines, sur ses kWh relevés au sous-compteur puis mesurés par le Shelly |
| `config/packages/notifications.yaml` | Alertes push : sources de données muettes, sauvegarde manquante, redémarrage, sonnette, annexe au-dessus de son seuil réglable (18 A conseillé) pendant 15 minutes sur sa ligne de 20 A, prise du congélateur du cellier coupée ou muette, chauffe-eau pas chauffé la nuit ou à midi ou sans atteindre sa consigne depuis 7 jours (contrôle à 8 h), micro-onduleur sous la moitié de la production médiane du jour (contrôle 30 minutes avant le coucher du soleil), et annonce sur les Echo à 18 h 30 des Yoto des enfants sous 20 % et pas en charge |
| `config/packages/solar.yaml` | Ensoleillement reçu à la maison, cumulé heure par heure depuis le rayonnement Open-Meteo, comparé à la production dans l'onglet Solaire |
| `config/packages/water_heater.yaml` | Chauffe-eau en chauffe au-dessus de 100 W, d'après la puissance mesurée par MyLight, pour colorer son icône sur le plan du rez-de-chaussée, chauffe-eau pas chauffé si le relais MyLight ne s'est pas fermé entre minuit et 7 h 30 ou entre 7 h et 15 h 45, icône alors rouge, chauffe avancée à 1 h et 11 h 30 quand le ballon chauffait encore à la fin de la plage précédente (résistance à moitié hors service), et dernière fois à température : heure où le thermostat a coupé, relais fermé, après au moins 10 minutes de chauffe |
| `config/packages/annex.yaml` | Coût de l'annexe : chaque kWh mesuré par le Shelly EM de sa ligne compté au prix heures pleines en vigueur, ce prix exposé en capteur, seuil d'alerte de courant réglable, et coupure automatique de l'annexe au-delà d'une puissance réglable pendant 30 s, remise seule après 1, 1, 3, 5 et 10 minutes puis à la main, chaque coupure notifiée, comme une coupure manuelle ou une annexe sans courant pendant 2 minutes (disjoncteur, contacteur) |
| `config/dashboards/annexe.yaml` | Page Annexe, suivie comme une seconde maison : puissance, courant face à la ligne de 20 A, seuils d'alerte et de coupure, kWh et coût du jour, du mois et du mois précédent, par jour et par mois |
| `config/dashboards/rentabilite.yaml` | Page Rentabilité, onglets Avec l'annexe (installation entière) et Sans l'annexe (annexe refacturée), et onglet Solaire : production en barres et ensoleillement en courbe, chacun sur son axe, sur 30 jours et sur 12 mois face à l'année précédente, et production du jour de chacun des 16 micro-onduleurs (capteurs activés dans le registre) |
| `config/dashboards/maison.yaml` | Page Maison : un onglet par niveau, températures, présence, caméras, aspirateur, Yoto des enfants, chauffe-eau avec son relais MyLight, Raspberry Pi, alimentation et puissance de l'annexe (Shelly EM) puissance des prises du bureau et du cellier (Shelly Plug M) posés sur le plan |
| `config/dashboards/musique.yaml` | Page Musique : choix de la pièce, favoris Amazon Music, radio et Audible lancés sur les Echo, lecture en cours et volume des seules Echo qui jouent ou sont en pause, et onglet Yoto : lecture, batterie, charge, casque et réglages jour et nuit de chaque Yoto des enfants |
| `config/www/plan-etage.svg`, `config/www/plan-rdc.svg`, `config/www/plan-terrain.svg` | Plans vectoriels des deux niveaux et du terrain, une forme identifiée par pièce, servis sans authentification sous `/local/` |
| `config/www/plan-heatmap.js` | Élément `custom:plan-heatmap` de la page Maison : colore chaque pièce selon sa température (bleu à 16 °C, rouge à 25 °C) et ouvre le capteur au clic |
| `config/packages/temperature.yaml` | Température de la cuisine, moyenne de l'Echo et du thermomètre Govee (Bluetooth du Pi), température moyenne de la maison, affichée dans l'onglet Températures et en favori de l'accueil, et poêle à bois de la cuisine : allumé quand l'Echo de la cuisine gagne au moins 2 °C en une heure en dépassant celui du salon de 3 °C, par moins de 18 °C dehors, éteint quand l'écart retombe sous 3 °C ; sa part d'allumage par heure alimente le graphique de l'onglet Températures |
| `config/packages/music.yaml` | Lancement d'une demande Alexa (musique, radio, livre audio) sur l'Echo de la pièce choisie, utilisé par la page Musique |
| `config/packages/weather_advice.yaml` | Consignes météo vocales sur l'appareil choisi (Partout par défaut, un Echo ou le téléphone) : à 20 h volets, linge et gel selon la prévision Met.no, et en journée un rappel 2 h avant la pluie ; seuils réglables dans l'onglet Températures |
| `config/custom_templates/weather_advice.jinja` | Décision des consignes météo à partir de la prévision horaire, sans effet de bord |
| `config/custom_templates/mylight.example.jinja` | Catalogue daté des tarifs, forfaits, volumes de référence, investissements et relevés du sous-compteur de l'annexe, avec des valeurs fictives |
| `scripts/deploy.sh` | Déploiement sur le Pi avec retour arrière |
| `scripts/import-battery-history.mjs` | Import de l'historique horaire officiel du stock de la batterie virtuelle depuis l'API MyLight (`HA_URL`, `HA_TOKEN`, identifiants MyLight dans le trousseau macOS, entrée `mylight`) |
| `scripts/rebuild-energy-gap.mjs` | Rattrapage d'une panne de Home Assistant (`--from`, `--to` : première et dernière heure UTC fausses, `--dry-run`) : réécrit heure par heure les statistiques de la page Énergie et des compteurs de l'installation depuis la source la plus précise, flux MyLight et chauffe-eau depuis l'historique horaire MyLight, annexe et son coût depuis la mémoire minute du Shelly EM (`SHELLY_ANNEX_URL`, environ trois jours), production et prises depuis leurs relevés, trous répartis selon la courbe MyLight pour la production et à parts égales pour les prises, reporte l'écart sur les heures suivantes, et donne la correction à ajouter une fois aux cumuls de la page Rentabilité quand la panne a passé minuit (`HA_URL`, `HA_TOKEN`, identifiants MyLight dans le trousseau macOS, entrée `mylight`) |
| `scripts/import-radiation-history.mjs` | Import de l'historique horaire d'ensoleillement Open-Meteo depuis mars 2025, à lancer une seule fois, au moins 5 minutes après le premier démarrage du capteur, pour que la série se raccorde au cumul en cours (`HA_URL`, `HA_TOKEN`) |
| `scripts/test-weather-advice.mjs` | Tests de `weather_advice.jinja` sur le Pi avec des prévisions fabriquées (`HA_URL`, `HA_TOKEN`) |

## Installer

1. Copier `config/custom_templates/mylight.example.jinja` en `config/custom_templates/mylight.jinja` et y mettre ses propres valeurs. Le vrai catalogue reste hors git.
2. Installer l'intégration MyLight Systems par le Marketplace de Home Assistant (Paramètres > Marketplace, dépôt `acesyde/hassio_mylight_integration`, présent au catalogue), puis redémarrer. Elle n'est pas redistribuée ici.
3. Installer la carte ApexCharts Card par le Marketplace (dépôt `RomRider/apexcharts-card`), utilisée par l'onglet Solaire.
4. Déclarer un hôte SSH `ha` vers l'add-on Terminal & SSH du Pi.

## Déployer

```bash
./scripts/deploy.sh
```

Copie `configuration.yaml`, `packages/`, `custom_templates/`, `dashboards/` et `www/` sur le Pi (ils y sont remplacés en entier, sauf `www/community/`, réservé au Marketplace ; `custom_components/` n'est pas touché), puis lance `ha core check`. Hors du réseau local, `HA_SSH_OPTS` passe des options à `ssh` (par exemple l'adresse Tailscale du Pi, cf. `LOCAL.md`). La version précédente est gardée dans `/config/.deploy-previous` et remise en place automatiquement si le check échoue ; le script sort alors en erreur. Un nouveau package ou un changement de `configuration.yaml` demande ensuite un redémarrage de Home Assistant ; un changement de template ou d'automatisation se recharge sans redémarrage.

Après le premier redémarrage qui crée `weather_advice.yaml`, régler les trois seuils dans l'onglet Températures (28 °C, 1 °C, 0,5 mm) : sans valeur posée, ils partent du minimum de leur plage. Après une modification de `weather_advice.jinja`, recharger les templates personnalisés (`homeassistant.reload_custom_templates`) puis lancer les tests :

```bash
HA_URL=http://192.168.1.250 HA_TOKEN=… node scripts/test-weather-advice.mjs
```

## Rattraper une panne

Une fois Home Assistant revenu et au moins trois heures après la dernière heure fausse, lancer le rattrapage à blanc puis pour de bon, et le relancer à blanc pour vérifier qu'il ne reporte plus rien :

```bash
HA_URL=http://192.168.1.250 HA_TOKEN=… SHELLY_ANNEX_URL=http://<ip du Shelly de l'annexe> node scripts/rebuild-energy-gap.mjs --from=2026-11-18T07:00:00Z --to=2026-11-20T06:00:00Z --dry-run
```

S'il annonce une correction de la page Rentabilité, l'ajouter une seule fois aux trois attributs de `sensor.rentabilite_mylight_compteurs` : dans `mylight_profitability.yaml`, ajouter le montant à chaque formule sous la condition d'un attribut drapeau absent, poser cet attribut à `true`, déployer, recharger les templates, vérifier que le gain et l'économie ont bougé du montant annoncé, puis retirer le code et redéployer. La courbe de puissance en direct ne se rattrape pas.

## Ce qui n'est pas dans ce dépôt

Les intégrations (Enphase, MyLight, Ring, Google Drive, Tailscale), le contenu installé par le Marketplace (`custom_components/`, `www/community/`), les étages et les pièces, la ressource Lovelace `/local/plan-heatmap.js?v=N` (à incrémenter à chaque modification du fichier), les favoris de l'accueil, le tableau Énergie, les sauvegardes automatiques, les réglages du serveur HTTP l'unité d'affichage de la production de l'Envoy (kWh au lieu de MWh, pour l'onglet Solaire) et les identifiants lisibles des Shelly et du chauffe-eau (`annexe_*`, `prise_bureau_*`, `prise_cellier_*`, `chauffe_eau_*`, renommés dans le registre des entités : un appareil remplacé se renomme pareil, sans toucher aux fichiers) sont configurés dans l'interface et stockés dans `.storage/`. Les sauvegardes quotidiennes chiffrées, sur le Pi et sur Google Drive, les couvrent.

## Règles

- **MyLight** : ne jamais activer le niveau de log `debug` pour cette intégration, il écrit le mot de passe MyLight dans `home-assistant.log` ; ne pas utiliser son service d'export CSV, il dépose le fichier dans `/config/www/`, servi sans authentification. Ses mises à jour arrivent par le Marketplace (Paramètres > Mises à jour) : lire le changelog du dépôt amont avant d'installer, puis redémarrer.
- **Page Rentabilité** : à chaque changement de forfait MySmartBattery ou de prix, ajouter une ligne datée dans `mylight.jinja` (`ml_tariffs`, ou `msb_forfaits` avec la capacité du palier en `kwh`), sans toucher aux lignes passées, puis recharger les templates personnalisés. Mettre à jour `reference_year` chaque automne avec les volumes des 12 derniers mois. À chaque relevé du sous-compteur de l'annexe, ajouter dans `annex_billing` une ligne avec la date, l'index et le prix heures pleines facturé ; la mesure du Shelly repart alors de ce relevé. Recalculer `reference_kwh` (kWh de l'annexe sur l'année de référence) en même temps que `reference_year`.
- **Shelly** : l'état du relais au retour du courant se règle dans chaque Shelly (`Switch.SetConfig`, `initial_state`), pas dans Home Assistant. Il est sur `on` pour les trois (prise du cellier avec le congélateur, prise du bureau, annexe) ; un Shelly neuf arrive sur `off`.
- **Tableau Énergie** : achats et réinjection viennent de MyLight, la batterie virtuelle aussi (charge et décharge), le solaire de l'Envoy. L'historique antérieur à la mise en service est horaire : les totaux journaliers (Enphase pour le solaire, MyLight pour le reste) répartis heure par heure selon le profil horaire de l'API MyLight ; les heures absentes chez MyLight reportent leur énergie sur l'heure suivante.
