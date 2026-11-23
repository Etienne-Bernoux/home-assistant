# language: fr
@jinja
Fonctionnalité: Production de l’Envoy comparée à son CT

  Plan du scénario: Rechargement de l’intégration Enphase selon l’écart au CT
    Quand la production de l’Envoy vaut "<production>" et son CT "<ct>"
    Alors l’intégration Enphase est rechargée : <rechargée>

    Exemples:
      | cas                                   | production       | ct              | rechargée |
      | valeurs identiques                    | 18158.591 kWh    | 18.158591 MWh   | non       |
      | même index en Wh                      | 18158591 Wh      | 18.158591 MWh   | non       |
      | redémarrage du 20 novembre            | 12941.83 kWh     | 18.158591 MWh   | oui       |
      | écart juste au-dessus du seuil        | 18183.026 kWh    | 18.182 MWh      | oui       |
      | écart sous le seuil                   | 18183.026 kWh    | 18.1825 MWh     | non       |
      | production indisponible               | unavailable kWh  | 18.158591 MWh   | non       |
      | CT inconnu                            | 18158.591 kWh    | unknown MWh     | non       |
      | unité de puissance au lieu d’énergie  | 18158.591 kWh    | 18.158591 MW    | non       |
