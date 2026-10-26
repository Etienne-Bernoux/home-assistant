---
title: Un Echo joue de la musique lancée par HA, mais son media_player reste idle
category: integration
date: 2026-10-26
tags: [alexa_devices, echo, media_player, send_text_command, amazon-music, audible]
project: home-assistant
---

# Un Echo joue de la musique lancée par HA, mais son `media_player` reste `idle`

## Symptôme

`alexa_devices.send_text_command` sur l'Echo du bureau, avec `text_command: "joue de la musique sur Amazon Music"`, répond HTTP 200 et la musique joue dans la pièce. Pendant toute la lecture, `media_player.echo_bureau` reste `idle`, sans `media_title`, `media_artist` ni `source`. L'historique des quatre `media_player` Echo sur 30 jours est vide.

## Conséquence

Une automatisation peut lancer ou arrêter la lecture d'un Echo, mais elle ne peut pas savoir s'il est en train de jouer. Un déclencheur ou une condition sur l'état `playing` d'un Echo ne se déclenche jamais. Une règle du type « baisser la musique quand on sonne » doit agir sans lire cet état.

## Usage qui marche

- Lancer, arrêter ou mettre en pause : `alexa_devices.send_text_command`, avec le `device_id` de l'Echo (`{{ device_id('media_player.echo_bureau') }}`) et la phrase qu'on dirait à voix haute (« stop », « pause »).
- Parler : `notify.<echo>_annoncer` (avec carillon) ou `notify.<echo>_parler`, qui existent pour les quatre Echo.

Testé le 2026-10-26 sur l'Echo du bureau, avec Amazon Music (« joue de la musique sur Amazon Music ») et Audible (« lis mon livre audio sur Audible ») : les deux ont joué, et le `media_player` est resté `idle` dans les deux cas.
