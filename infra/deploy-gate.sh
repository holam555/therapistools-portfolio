#!/bin/bash
# Forced command for the deploy key on the Therapistools host. Installed as
# /usr/local/bin/therapistools-deploy-gate and named by `command=` in
# /home/deploy/.ssh/authorized_keys, so the key can do exactly three things
# and never open a shell:
#
#   rsync into /var/www/releases (write-only, through rrsync)
#   publish <run-id>-<attempt> <file-count>   runs the root-installed publish script
#   live                                      prints the release the site serves
#
# The deploy workflow runs on GitHub's cloud runners and reaches this box
# over SSH through the Cloudflare Tunnel (docs/INFRA.md "Deploys").
set -euo pipefail
cmd=${SSH_ORIGINAL_COMMAND:-}
case "$cmd" in
  "rsync --server "*)
    exec /usr/bin/rrsync -wo /var/www/releases ;;
  "publish "*)
    read -r _ release count extra <<<"$cmd"
    if [[ ! "$release" =~ ^[0-9]+-[0-9]+$ || ! "$count" =~ ^[0-9]+$ || -n "${extra:-}" ]]; then
      echo "deploy gate: usage: publish <run-id>-<attempt> <file-count>" >&2
      exit 2
    fi
    cd /
    exec /usr/local/bin/therapistools-publish "/var/www/releases/$release" "$count" ;;
  live)
    exec readlink /var/www/therapistools ;;
  *)
    echo "deploy gate: command not allowed" >&2
    exit 2 ;;
esac
