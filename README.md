# Home Assistant

Configuration versionnée d'un Home Assistant domestique (Raspberry Pi 4, Home Assistant OS, disque USB) : installation solaire Enphase, fournisseur MyLight150 avec batterie virtuelle MySmartBattery, contrat heures pleines / heures creuses. `config/` reflète `/config` sur le Pi pour ce qui est écrit en YAML ; le reste vit dans l'interface.

## Contenu

| Fichier | Rôle |
|---|---|
| `config/packages/energy_tariff.yaml` | Plages d'heures creuses et prix du kWh en vigueur |
| `config/packages/mylight_profitability.yaml` | Gain de la batterie virtuelle face à EDF Tarif Bleu, économie de l'installation, dates de retour sur investissement et état de charge de la batterie virtuelle (affiché dans l'onglet Énergie) |
| `config/packages/notifications.yaml` | Alertes push : sources de données muettes, sauvegarde manquante, redémarrage, sonnette, fenêtre de passage en MSB 100 |
| `config/dashboards/rentabilite.yaml` | Page Rentabilité |
| `config/custom_templates/mylight.example.jinja` | Catalogue daté des tarifs, forfaits, volumes de référence et investissements, avec des valeurs fictives |
| `scripts/deploy.sh` | Déploiement sur le Pi avec retour arrière |
| `scripts/import-battery-history.mjs` | Import de l'historique horaire officiel du stock de la batterie virtuelle depuis l'API MyLight (`HA_URL`, `HA_TOKEN`, identifiants MyLight dans le trousseau macOS, entrée `mylight`) |

## Installer

1. Copier `config/custom_templates/mylight.example.jinja` en `config/custom_templates/mylight.jinja` et y mettre ses propres valeurs. Le vrai catalogue reste hors git.
2. Installer l'intégration MyLight Systems dans `config/custom_components/mylight_systems` depuis le tag v0.10.0 du dépôt [acesyde/hassio_mylight_integration](https://github.com/acesyde/hassio_mylight_integration). Elle n'est pas redistribuée ici.
3. Déclarer un hôte SSH `ha` vers l'add-on Terminal & SSH du Pi.

## Déployer

```bash
./scripts/deploy.sh
```

Copie `configuration.yaml`, `packages/`, `custom_components/`, `custom_templates/` et `dashboards/` sur le Pi (ils y sont remplacés en entier), puis lance `ha core check`. La version précédente est gardée dans `/config/.deploy-previous` et remise en place automatiquement si le check échoue ; le script sort alors en erreur. Un nouveau package ou un changement de `configuration.yaml` demande ensuite un redémarrage de Home Assistant ; un changement de template ou d'automatisation se recharge sans redémarrage.

## Ce qui n'est pas dans ce dépôt

Les intégrations (Enphase, MyLight, Ring, Google Drive, Tailscale), le tableau Énergie, les sauvegardes automatiques et les réglages du serveur HTTP sont configurés dans l'interface et stockés dans `.storage/`. Les sauvegardes quotidiennes chiffrées, sur le Pi et sur Google Drive, les couvrent.

## Règles

- **MyLight** : ne jamais activer le niveau de log `debug` pour cette intégration, il écrit le mot de passe MyLight dans `home-assistant.log` ; ne pas utiliser son service d'export CSV, il dépose le fichier dans `/config/www/`, servi sans authentification. Mises à jour à suivre à la main sur les tags du dépôt amont.
- **Page Rentabilité** : à chaque changement de forfait MySmartBattery ou de prix, ajouter une ligne datée dans `mylight.jinja` (`ml_tariffs`, ou `msb_forfaits` avec la capacité du palier en `kwh`), sans toucher aux lignes passées, puis recharger les templates personnalisés. Mettre à jour `reference_year` chaque automne avec les volumes des 12 derniers mois.
- **Tableau Énergie** : achats et réinjection viennent de MyLight, la batterie virtuelle aussi (charge et décharge), le solaire de l'Envoy. L'historique antérieur à la mise en service a été importé depuis l'API MyLight au pas journalier.
