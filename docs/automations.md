# Automatisations et scripts de Nyons

Ce catalogue est généré à partir des packages Home Assistant. Pour le régénérer, lancer `node tests/generate-automation-catalog.mjs` depuis la racine du dépôt.

## Annexe

[Configuration annex.yaml](../config/packages/annex.yaml)

- Couper l'annexe au-delà de sa puissance de coupure (`annex_overload_cut`)
- Alerter si l'annexe est coupée hors coupure automatique (`annex_power_lost`)
- Remettre à zéro les coupures de l'annexe après 30 minutes sans coupure (`annex_overload_cut_reset`)
- Alerter si l'annexe tire près de la limite de sa ligne (`annex_line_overload`)
- Enregistrer le sous-compteur de l'annexe (`record_annex_meter`)

## Appareils

[Configuration devices.yaml](../config/packages/devices.yaml)

- Recharger l'intégration Alexa quand les températures des Echo tombent (`alexa_temperatures_reload`)
- Alerter si la prise du congélateur est coupée (`cellar_plug_off`)
- Alerter si la prise du frigo de la cuisine est coupée (`kitchen_fridge_plug_off`)
- Rallumer la prise de la pompe après une coupure de protection (`pump_plug_off`)
- Rappeler de recharger les Yoto avant la nuit (`yoto_charge_reminder`)

## Sonnette

[Configuration doorbell.yaml](../config/packages/doorbell.yaml)

- Prévenir le téléphone quand on sonne (`doorbell_announce`)
- Prévenir le téléphone d'un coup de sonnette vu dans l'historique Ring (`doorbell_history_fallback`)

## Infrastructure

[Configuration infrastructure.yaml](../config/packages/infrastructure.yaml)

- Alerter si l'Envoy ou MyLight ne répond plus (`alert_data_source_offline`)
- Alerter si une sauvegarde échoue ou manque (`alert_backup_failed`)
- Prévenir quand Home Assistant redémarre (`notify_home_assistant_started`)

## Musique

[Configuration music.yaml](../config/packages/music.yaml)

- Lancer une musique ou un livre sur un Echo (`musique_lancer`)

## Solaire

[Configuration solar.yaml](../config/packages/solar.yaml)

- Alerter si un micro-onduleur a produit moins de la moitié des autres (`solar_inverter_underperforming`)
- Recharger l'intégration Enphase quand sa production s'écarte du CT (`solar_production_diverged`)

## Températures et chauffage

[Configuration temperature.yaml](../config/packages/temperature.yaml)

- Réguler le chauffage du bureau (`office_heating_schedule`)

## Chauffe-eau

[Configuration water_heater.yaml](../config/packages/water_heater.yaml)

- Avancer d'une heure la chauffe si le ballon n'a pas fini la précédente (`water_heater_preheat`)
- Alerter si le chauffe-eau n'a pas chauffé pendant les heures creuses (`water_heater_missed_heating`)
- Alerter si le chauffe-eau n'a pas atteint sa consigne depuis 7 jours (`water_heater_not_full_for_a_week`)

## Météo

[Configuration weather_advice.yaml](../config/packages/weather_advice.yaml)

- Annoncer les consignes météo du soir (`weather_advice_evening`)
- Rappeler de rentrer le linge avant la pluie (`weather_advice_rain`)
- Annoncer une consigne météo (`meteo_annoncer`)
