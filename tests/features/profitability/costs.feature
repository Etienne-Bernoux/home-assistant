# language: fr
@jinja
Fonctionnalité: Coûts d’énergie utilisés pour la rentabilité MyLight

  Plan du scénario: Évaluer les trois coûts cumulés à partir des index en Wh
    Quand le compteur de rentabilité traite "<situation>"
    Alors les coûts MyLight, EDF avec panneaux et sans panneaux valent <mylight>, <edf> et <sans> euros

    Exemples:
      | situation                    | mylight | edf    | sans   |
      | consommation en heures pleines | 0.379  | 0.5141 | 0.8354 |
      | consommation en heures creuses | 0.279  | 0.3814 | 0.6197 |
      | révision légère à la baisse    | 0      | 0      | 0      |
      | remise à zéro du compteur      | 0.1916 | 0.2999 | 0.407  |
      | changement de jour              | 0.1916 | 0.2999 | 0.407  |
      | compteurs indisponibles         | 0      | 0      | 0      |

  Scénario: À minuit, MyLight renvoie encore le dernier index de la veille
    Quand le compteur de rentabilité traite "index de la veille encore présent à minuit"
    Alors les coûts MyLight, EDF avec panneaux et sans panneaux valent 0, 0 et 0 euros


  Scénario: Le premier relevé du jour est compté après le relevé tardif de la veille
    Quand le compteur de rentabilité traite "premier index du jour après le relevé tardif"
    Alors les coûts MyLight, EDF avec panneaux et sans panneaux valent 0.1916, 0.2999 et 0.407 euros
