# language: fr
@nyons
Fonctionnalité: Mesures du tableau Énergie de Nyons

  Scénario: La production solaire reste continue après le redémarrage du 20 novembre 2026
    Quand je consulte la production solaire du 20 novembre 2026
    Alors la production horaire correspond aux relevés suivants en heure de Paris
      | heure | kWh   | cumul kWh |
      | 15:00 | 0.379 | 17992.791 |
      | 16:00 | 0.160 | 17992.951 |
      | 17:00 | 0     | 17992.951 |
      | 18:00 | 0     | 17992.951 |

  Scénario: Le direct montre les échanges physiques avec le réseau
    Quand je consulte les sources du tableau Énergie
    Alors le direct utilise la pince solaire et la puissance nette de l'Envoy
    Et le bilan de la batterie virtuelle utilise les compteurs MyLight
