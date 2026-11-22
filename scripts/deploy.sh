#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

case "$#:${1:-}" in
  0:|1:--branch) ;;
  *) echo "Usage: $0 [--branch]" >&2; exit 2 ;;
esac

if [ -n "$(git status --porcelain --untracked-files=all)" ]; then
  echo "Deployment refused: the working tree has uncommitted changes." >&2
  exit 1
fi

branch=$(git branch --show-current)
git fetch origin main
target=$(git rev-parse HEAD)
main=$(git rev-parse --verify refs/remotes/origin/main)

if [ "${1:-}" = --branch ]; then
  echo "Test deployment (--branch): ${branch:-detached HEAD} at $target"
elif ! git merge-base --is-ancestor "$target" "$main"; then
  echo "Deployment refused: $target is not on origin/main. Use --branch for a test deployment." >&2
  exit 1
fi

read -r -a ssh_opts <<< "${HA_SSH_OPTS:-}"

remote() {
  ssh ${ssh_opts[@]+"${ssh_opts[@]}"} ha "$@"
}

marker=$(remote 'if [ -f /config/.deployed-commit ]; then cat /config/.deployed-commit; else echo missing; fi')
if [ "$marker" = missing ]; then
  baseline=$main
  echo "No deployment marker: using origin/main ($baseline) as the baseline."
elif [[ "$marker" =~ ^[0-9a-f]{40}$ ]] && git cat-file -e "$marker^{commit}"; then
  baseline=$marker
else
  echo "Deployment refused: the Pi deployment marker does not identify a local Git commit." >&2
  exit 1
fi

stage=$(mktemp -d)
trap 'rm -rf "$stage"' EXIT
managed=(configuration.yaml packages custom_templates dashboards www)
git archive --format=tar "$baseline:config" "${managed[@]}" > "$stage/base.tar"
git archive --format=tar "$target:config" "${managed[@]}" > "$stage/next.tar"

COPYFILE_DISABLE=1 tar -cf - -C "$stage" base.tar next.tar | remote "
set -- $marker $baseline $target
"'
set -eu
marker=$1
baseline=$2
target=$3

cd /config
exec 9>.deploy-lock
if ! flock -n 9; then
  echo "Deployment refused: another deployment is running." >&2
  exit 1
fi

current=missing
if [ -f .deployed-commit ]; then current=$(cat .deployed-commit); fi
if [ "$current" != "$marker" ]; then
  echo "Deployment refused: the Pi changed since its deployment marker was read." >&2
  exit 1
fi

stage=$(mktemp -d .deploy-staging.XXXXXX)
rollback=false

clear_configuration() {
  rm -rf configuration.yaml packages dashboards
  if [ -d custom_templates ]; then
    find custom_templates -mindepth 1 -maxdepth 1 ! -name mylight.jinja -exec rm -rf {} +
  fi
  if [ -d www ]; then
    find www -mindepth 1 -maxdepth 1 ! -name community -exec rm -rf {} +
  fi
}

install_configuration() {
  for item in configuration.yaml packages custom_templates dashboards www; do
    if [ -e "$1/$item" ]; then cp -a "$1/$item" . || return 1; fi
  done
}

finish() {
  status=$?
  if "$rollback"; then
    if (clear_configuration && install_configuration .deploy-previous); then
      echo "Deployment failed: previous configuration restored." >&2
    else
      echo "Deployment failed: restore /config/.deploy-previous manually." >&2
    fi
  fi
  rm -rf "$stage"
  exit "$status"
}

trap finish EXIT
trap "exit 1" HUP INT TERM

mkdir "$stage/base" "$stage/next" "$stage/previous"
tar -xf - -C "$stage"
tar -xf "$stage/base.tar" -C "$stage/base"
tar -xf "$stage/next.tar" -C "$stage/next"

inventory() {
  (
    cd "$1"
    for item in configuration.yaml packages custom_templates dashboards www; do
      if [ -e "$item" ] || [ -L "$item" ]; then
        find "$item" \( -path custom_templates/mylight.jinja -o -path www/community \) -prune -o \
          -type f -exec sha256sum {} + || exit 1
        find "$item" \( -path custom_templates/mylight.jinja -o -path www/community \) -prune -o \
          ! -type f ! -type d -print || exit 1
      fi
    done
  )
}

inventory "$stage/base" > "$stage/base.files"
inventory . > "$stage/live.files"
LC_ALL=C sort -o "$stage/base.files" "$stage/base.files"
LC_ALL=C sort -o "$stage/live.files" "$stage/live.files"

if [ "$marker" = missing ] && [ ! -s "$stage/live.files" ]; then
  echo "The managed configuration is empty. Initializing it from $target."
elif ! diff -u "$stage/base.files" "$stage/live.files"; then
  echo "Deployment refused: the Pi differs from baseline $baseline." >&2
  exit 1
fi

if [ -n "$(find "$stage/next" ! -type d ! -type f -print)" ]; then
  echo "Deployment refused: the target contains entries other than regular files or directories." >&2
  exit 1
fi

for protected in custom_templates/mylight.jinja www/community; do
  if [ -e "$stage/next/$protected" ] || [ -L "$stage/next/$protected" ]; then
    echo "Deployment refused: $protected is reserved for local files." >&2
    exit 1
  fi
done

for item in configuration.yaml packages custom_templates dashboards www; do
  if [ -e "$item" ]; then
    tar -cf "$stage/backup.tar" --exclude custom_templates/mylight.jinja --exclude www/community "$item"
    tar -xf "$stage/backup.tar" -C "$stage/previous"
  fi
done

rm -rf .deploy-previous
mv "$stage/previous" .deploy-previous
rollback=true
clear_configuration
install_configuration "$stage/next"
ha core check
printf "%s\n" "$target" > "$stage/deployed-commit"
mv "$stage/deployed-commit" .deployed-commit
rollback=false
echo "Deployed $target"
'
