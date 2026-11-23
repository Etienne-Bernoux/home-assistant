# language: fr
Fonctionnalité: Régulation du chauffage du bureau

  @jinja
  Plan du scénario: Le radiateur suit le calendrier, les seuils et la fraîcheur de la mesure
    Quand le bureau est évalué à "<heure>" avec calendrier "<ouvré>", radiateur "<relais>" et mesure "<température>" âgée de <âge> secondes
    Alors la commande du radiateur est "<commande>"

    Exemples:
      | heure | ouvré       | relais      | température | âge | commande        |
      | 07:59 | on          | off         | 15          | 10  | aucune          |
      | 08:00 | on          | off         | 15          | 10  | switch.turn_on  |
      | 09:00 | on          | off         | 18.9        | 10  | switch.turn_on  |
      | 09:00 | on          | off         | 19          | 10  | aucune          |
      | 12:00 | on          | on          | 19.4        | 10  | aucune          |
      | 12:00 | on          | on          | 19.5        | 10  | switch.turn_off |
      | 17:59 | on          | off         | 15          | 10  | switch.turn_on  |
      | 18:00 | on          | on          | 15          | 10  | switch.turn_off |
      | 10:00 | off         | off         | 15          | 10  | aucune          |
      | 10:00 | unavailable | off         | 12.4        | 10  | switch.turn_on  |
      | 03:00 | on          | off         | 12.4        | 10  | switch.turn_on  |
      | 03:00 | on          | off         | 12.5        | 10  | aucune          |
      | 10:00 | off         | on          | 12.9        | 10  | aucune          |
      | 10:00 | off         | on          | 13          | 10  | switch.turn_off |
      | 10:00 | on          | off         | 15          | 599 | switch.turn_on  |
      | 10:00 | on          | on          | 15          | 600 | switch.turn_off |
      | 10:00 | on          | off         | 15          | 600 | aucune          |
      | 10:00 | on          | on          | unavailable | 10  | switch.turn_off |
      | 10:00 | on          | off         | unknown     | 10  | aucune          |
      | 10:00 | on          | off         | -41         | 10  | aucune          |
      | 10:00 | on          | on          | 60          | 10  | switch.turn_off |
      | 10:00 | on          | on          | 15          | -1  | switch.turn_off |
      | 10:00 | on          | unavailable | 15          | 10  | aucune          |

  @nyons
  Plan du scénario: Le calendrier français exclut les jours fériés et le week-end
    Quand Workday évalue le "<date>"
    Alors le calendrier indique "<type de jour>"

    Exemples:
      | date       | type de jour |
      | 2026-12-24 | ouvré        |
      | 2026-12-25 | non ouvré    |
      | 2026-12-26 | non ouvré    |
