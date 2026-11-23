# language: fr
@nyons
Fonctionnalité: Version de Home Assistant Core

  Scénario: La version épinglée pour la CI correspond à celle du Pi
    Quand Home Assistant indique sa version de Core
    Alors cette version correspond à celle du conteneur de CI
