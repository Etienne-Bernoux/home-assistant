# language: fr
@jinja
Fonctionnalité: Protection électrique de l’annexe

  Plan du scénario: Délai de remise sous tension après surcharge
    Quand Home Assistant évalue la protection après la coupure numéro <coupure>
    Alors la remise sous tension est "<résultat>"

    Exemples:
      | coupure | résultat   |
      | 1       | 1 minute   |
      | 2       | 1 minute   |
      | 3       | 3 minutes  |
      | 4       | 5 minutes  |
      | 5       | 10 minutes |
      | 6       | manuelle   |
