# language: fr
Fonctionnalité: Couverture des relevés d'énergie

  Plan du scénario: Une journée complète suit l'heure de Paris
    Quand je consulte le bilan le "<instant>"
    Alors le bilan présente sept jours terminés dont le dernier compte <heures> heures

    Exemples:
      | instant              | heures |
      | 2026-11-23T00:01:00Z | 24     |
      | 2026-03-30T05:00:00Z | 23     |
      | 2026-10-26T05:00:00Z | 25     |

  Scénario: Les zéros mesurés se distinguent des heures absentes
    Quand un compteur enregistre zéro puis 2,5 kWh durant une journée de quatre créneaux
    Alors le bilan indique 2,5 kWh et deux créneaux renseignés

  Scénario: Une interruption de mesure sépare deux décrochages
    Quand les index divergent puis la mesure disparaît et revient en écart
    Alors le bilan sépare les durées observées et leurs écarts maximaux
