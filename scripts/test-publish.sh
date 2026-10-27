#!/usr/bin/env bash
# Exercises infra/publish.sh in a scratch tree: a good release goes live, a
# broken one fails before the swap and leaves the live site alone, a short
# copy is refused, and pruning keeps three releases and never the live one.
# Run by `npm test`.
set -euo pipefail
here=$(cd "$(dirname "$0")/.." && pwd)
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
export RELEASES_DIR="$tmp/releases" LIVE_LINK="$tmp/live"
mkdir -p "$RELEASES_DIR"

make_release() { # <id>
  local d="$RELEASES_DIR/$1"
  mkdir -p "$d"/{privacy,shared,worksheets/assets,scheduler/assets,iep}
  for f in index.html privacy/index.html robots.txt llms.txt shared/brand.css shared/suite-bar.js \
           worksheets/index.html worksheets/sitemap.xml scheduler/index.html iep/therapistools-iep-writer.html \
           worksheets/assets/a.js scheduler/assets/b.js; do
    echo "$1" > "$d/$f"
  done
  echo "<meta http-equiv=\"Content-Security-Policy\" content=\"connect-src 'none'\">" > "$d/iep/index.html"
}
count() { find "$RELEASES_DIR/$1" -type f | wc -l; }
publish() { bash "$here/infra/publish.sh" "$@" >"$tmp/out" 2>&1; }
live() { basename "$(readlink -f "$LIVE_LINK")"; }
ok() { echo "ok - $*"; }
die() { echo "not ok - $*"; cat "$tmp/out"; exit 1; }

make_release r1
publish "$RELEASES_DIR/r1" "$(count r1)" || die "a good release publishes"
[ "$(live)" = r1 ] || die "live points at r1"
ok "good release goes live"

make_release r2
rm "$RELEASES_DIR/r2/iep/index.html"
if publish "$RELEASES_DIR/r2" 1; then die "a release missing the IEP Writer must fail"; fi
[ "$(live)" = r1 ] || die "a failed release must not move live"
ok "broken release fails and live stays put"

make_release r3
echo "no csp" > "$RELEASES_DIR/r3/iep/index.html"
if publish "$RELEASES_DIR/r3" "$(count r3)"; then die "an IEP Writer without its CSP must fail"; fi
ok "IEP Writer without connect-src 'none' is refused"

make_release r4
if publish "$RELEASES_DIR/r4" $(( $(count r4) + 1 )); then die "a short copy must fail"; fi
[ "$(live)" = r1 ] || die "a short copy must not move live"
ok "short copy is refused"

rm -rf "$RELEASES_DIR"/r2 "$RELEASES_DIR"/r3 "$RELEASES_DIR"/r4
for i in 5 6 7 8; do make_release "r$i"; sleep 0.01; done
touch -d '2000-01-01' "$RELEASES_DIR/r5"   # oldest on disk
publish "$RELEASES_DIR/r5" "$(count r5)" || die "r5 publishes"
touch -d '2000-01-01' "$RELEASES_DIR/r5"
[ -d "$RELEASES_DIR/r5" ] || die "prune must never remove the live release"
[ "$(find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d | wc -l)" -le 4 ] || die "prune keeps three plus live"
ok "prune keeps the live release even when it is the oldest"

if publish "$tmp/elsewhere" 1; then die "a path outside the releases dir must fail"; fi
mkdir -p "$tmp/elsewhere"
if publish "$tmp/elsewhere" 1; then die "a path outside the releases dir must fail"; fi
ok "refuses a release outside the releases dir"
echo "publish.sh: all checks passed"
