# language: fr
@nyons
Fonctionnalité: Horaires heures creuses

  Plan du scénario: Les heures creuses commencent à l’ouverture et finissent à la fermeture
    Quand Home Assistant évalue les heures creuses à "<heure>"
    Alors le tarif est "<tarif>"

    Exemples:
      | heure | tarif |
      | 01:59 | plein |
      | 02:00 | creux |
      | 06:59 | creux |
      | 07:00 | plein |
      | 12:29 | plein |
      | 12:30 | creux |
      | 15:29 | creux |
      | 15:30 | plein |
