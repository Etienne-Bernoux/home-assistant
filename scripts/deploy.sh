#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../config"

read -r -a ssh_opts <<< "${HA_SSH_OPTS:-}"

COPYFILE_DISABLE=1 tar --exclude .claude -cf - configuration.yaml packages custom_templates dashboards www | ssh ${ssh_opts[@]+"${ssh_opts[@]}"} ha '
set -eu
cd /config
set -- configuration.yaml packages custom_templates dashboards
rm -rf .deploy-previous
mkdir .deploy-previous
for item in "$@" www; do
  if [ -e "$item" ]; then cp -a "$item" .deploy-previous/; fi
done
for item in "$@"; do rm -rf "$item"; done
if [ -d www ]; then find www -mindepth 1 -maxdepth 1 ! -name community -exec rm -rf {} +; fi
tar -xf -
if ! ha core check; then
  for item in "$@" www; do rm -rf "$item"; done
  cp -a .deploy-previous/. .
  echo "ha core check failed: previous configuration restored" >&2
  exit 1
fi
'
