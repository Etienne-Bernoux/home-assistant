#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../config"

COPYFILE_DISABLE=1 tar -cf - configuration.yaml packages custom_components custom_templates dashboards www | ssh ha '
set -eu
cd /config
set -- configuration.yaml packages custom_components custom_templates dashboards www
rm -rf .deploy-previous
mkdir .deploy-previous
for item in "$@"; do
  if [ -e "$item" ]; then cp -a "$item" .deploy-previous/; fi
done
for item in "$@"; do rm -rf "$item"; done
tar -xf -
if ! ha core check; then
  for item in "$@"; do rm -rf "$item"; done
  cp -a .deploy-previous/. .
  echo "ha core check failed: previous configuration restored" >&2
  exit 1
fi
'
