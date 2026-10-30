---
title: Piloter la musique d'un Echo depuis HA, avec send_text_command pour lancer et le media_player pour le reste
category: integration
date: 2026-10-26
tags: [alexa_devices, echo, media_player, send_text_command, amazon-music, audible]
project: home-assistant
---

# Piloter la musique d'un Echo depuis HA

`alexa_devices` ne sait pas choisir quoi jouer : `media_player.play_media` ne connaît pas le catalogue Amazon Music ni Audible. Une demande se lance avec `alexa_devices.send_text_command`. Il prend le `device_id` de l'Echo (`{{ device_id('media_player.echo_bureau') }}`) et la phrase qu'on dirait à voix haute. Le reste passe par le `media_player` natif : `volume_set`, `media_pause`, `media_play` et `media_stop`. Après `media_stop`, l'Echo passe à `paused`.

Pendant la lecture, le `media_player` remonte `playing` avec `media_title` et `media_artist`, en moins de 15 secondes. Une condition sur `playing` est donc utilisable. Seule exception : le premier essai du matin (`joue de la musique sur Amazon Music`) a bien joué, mais n'a laissé aucun `playing` dans l'historique. La cause n'est pas établie. Pour une automatisation, mieux vaut ne pas tenir cet état pour garanti.

Le groupe multi-pièces « Partout » de l'appli Alexa existe dans HA sous `media_player.partout` (modèle Speaker Group), avec son propre `device_id`.

## Phrases testées

Testées le 2026-10-26 sur l'Echo du bureau. Elles sont lancées par `script.musique_lancer` (`config/packages/music.yaml`), et le titre lu ensuite sur le `media_player` confirme la lecture.

| Phrase | Résultat |
|---|---|
| `joue du jazz sur Amazon Music` | Naima, John Coltrane |
| `joue France Inter` | France Inter |
| `lis mon livre audio sur Audible` | le livre en cours |
| `joue de la musique calme sur Amazon Music` | Indefinite, Edward Jamison |
| `joue de la musique de fête sur Amazon Music` | Billie Jean, Michael Jackson |
| `joue de la musique que je pourrais aimer sur Amazon Music` | Narco, Blasterjaxx |
| `joue Daft Punk` | One More Time, Daft Punk |
| `joue mon mix découverte sur Amazon Music`, `joue Mes Découvertes sur Amazon Music` | rien : la lecture précédente reste en pause |

Une phrase qu'Alexa ne comprend pas renvoie quand même HTTP 200. Le seul moyen de savoir si elle a marché est de lire le titre sur le `media_player`.
