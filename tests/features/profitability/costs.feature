# language: fr
@nyons
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
