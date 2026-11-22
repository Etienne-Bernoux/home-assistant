# language: fr
Fonctionnalité: Catalogue des automatisations et scripts de Nyons

  Contexte:
    Étant donné les packages Home Assistant du dépôt

  Scénario: Les automatisations sont classées par domaine
    Alors chaque automatisation est rangée et déclare les déclencheurs et actions suivants
      | package        | id                               | déclencheurs         | actions                                                                       |
      | annex          | annex_overload_cut               | numeric_state        | counter.increment, notify.mobile_app_pixel_6, switch.turn_off, switch.turn_on |
      | annex          | annex_power_lost                 | numeric_state, state | notify.mobile_app_pixel_6                                                     |
      | annex          | annex_overload_cut_reset         | state                | counter.reset                                                                 |
      | annex          | annex_line_overload              | numeric_state        | notify.mobile_app_pixel_6                                                     |
      | devices        | alexa_temperatures_reload        | template             | homeassistant.reload_config_entry, notify.mobile_app_pixel_6                  |
      | devices        | cellar_plug_off                  | state                | notify.mobile_app_pixel_6                                                     |
      | devices        | kitchen_fridge_plug_off          | state                | notify.mobile_app_pixel_6                                                     |
      | devices        | pump_plug_off                    | state                | notify.mobile_app_pixel_6, switch.turn_on                                     |
      | devices        | yoto_charge_reminder             | time                 | notify.send_message                                                           |
      | doorbell       | doorbell_announce                | state                | notify.mobile_app_pixel_6                                                     |
      | doorbell       | doorbell_history_fallback        | state                | notify.mobile_app_pixel_6                                                     |
      | infrastructure | alert_data_source_offline        | state                | notify.mobile_app_pixel_6                                                     |
      | infrastructure | alert_backup_failed              | state, time          | notify.mobile_app_pixel_6                                                     |
      | infrastructure | notify_home_assistant_started    | homeassistant        | notify.mobile_app_pixel_6                                                     |
      | solar          | solar_inverter_underperforming   | sun                  | notify.mobile_app_pixel_6                                                     |
      | solar          | solar_production_diverged        | numeric_state        | homeassistant.reload_config_entry, notify.mobile_app_pixel_6                  |
      | temperature    | office_heating_schedule          | homeassistant, state, time_pattern | switch.turn_off, switch.turn_on                                |
      | water_heater   | water_heater_preheat             | time                 | switch.turn_on                                                                |
      | water_heater   | water_heater_missed_heating      | state                | notify.mobile_app_pixel_6                                                     |
      | water_heater   | water_heater_not_full_for_a_week | time                 | notify.mobile_app_pixel_6                                                     |
      | weather_advice | weather_advice_evening           | time                 | script.meteo_annoncer, weather.get_forecasts                                  |
      | weather_advice | weather_advice_rain              | time_pattern         | input_datetime.set_datetime, script.meteo_annoncer, weather.get_forecasts     |

  Scénario: Les scripts sont classés par domaine
    Alors chaque script est rangé et appelle les actions suivantes
      | package        | id             | actions                         |
      | music          | musique_lancer | alexa_devices.send_text_command |
      | weather_advice | meteo_annoncer | notify.send_message             |
    Et les actions qui appellent un script pointent vers un script déclaré
