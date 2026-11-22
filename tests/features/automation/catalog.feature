# language: fr
Fonctionnalité: Catalogue des automatisations et scripts de Nyons

  Contexte:
    Étant donné les packages Home Assistant du dépôt

  Scénario: Chaque règle est identifiable
    Alors chaque automatisation et chaque script a un identifiant unique
    Et chaque automatisation et chaque script a un alias

  Scénario: Les actions appellent des scripts et des notifications connus
    Alors les actions qui appellent un script pointent vers un script déclaré
    Et les actions de notification pointent vers un service connu

  Scénario: Le catalogue publié correspond aux packages
    Alors la documentation du catalogue est à jour
