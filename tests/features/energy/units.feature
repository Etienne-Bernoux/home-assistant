# language: fr
Fonctionnalité: Conversion des index d’énergie lors d’un rattrapage

  Plan du scénario: Un même index produit la même énergie dans les unités prises en charge
    Quand le rattrapage convertit <index> "<unité>"
    Alors il obtient 18158591 Wh

    Exemples:
      | index    | unité |
      | 18158591 | Wh    |
      | 18158.591| kWh   |
      | 18.158591| MWh   |

  Scénario: Une puissance ne peut pas être utilisée comme index d’énergie
    Quand le rattrapage convertit 13 "MW"
    Alors l’unité est refusée
