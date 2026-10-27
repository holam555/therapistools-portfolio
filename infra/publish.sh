#!/usr/bin/env bash
# Publishes one release on the Therapistools host (CT 138). Installed by
# root as /usr/local/bin/therapistools-publish (infra/therapistools-site.sh),
# so the deploy key can run it but never replace it. The deploy workflow
# rsyncs a built dist/ into /var/www/releases/<run>-<attempt>/ and then asks
# the deploy gate (infra/deploy-gate.sh) to run:
#
#   therapistools-publish <release-dir> <expected-file-count>
#
# It checks the release while nothing serves it, swaps the docroot symlink
# with one rename, and prunes old releases. Caddy resolves the symlink on
# every request, so a swap needs no reload. A bad build fails here and the
# live site stays on the previous release.
set -euo pipefail

LIVE_LINK=${LIVE_LINK-/var/www/therapistools}
RELEASES_DIR=${RELEASES_DIR-/var/www/releases}
KEEP=3

fail() { echo "publish: FAIL: $*" >&2; exit 1; }

RELEASE_DIR="${1:?usage: publish.sh <release-dir> <expected-file-count>}"
EXPECTED="${2:?usage: publish.sh <release-dir> <expected-file-count>}"
[ -d "$RELEASE_DIR" ] || fail "release dir missing: $RELEASE_DIR"
RELEASE_DIR=$(readlink -f "$RELEASE_DIR")
case "$RELEASE_DIR" in "$(readlink -f "$RELEASES_DIR")"/*) ;; *) fail "not under $RELEASES_DIR: $RELEASE_DIR" ;; esac
# A login shell can start in a directory the deploy user cannot read, which
# makes find exit non-zero and, under pipefail, the script die silently.
cd /

# Sanity checks while the release is unreachable. The same entry points
# scripts/build-site.mjs requires, each non-empty.
for f in index.html privacy/index.html robots.txt llms.txt shared/brand.css shared/suite-bar.js \
         worksheets/index.html worksheets/sitemap.xml scheduler/index.html iep/index.html iep/therapistools-iep-writer.html; do
  [ -s "$RELEASE_DIR/$f" ] || fail "missing or empty: $f"
done
compgen -G "$RELEASE_DIR/worksheets/assets/*.js" >/dev/null || fail "no worksheets assets"
compgen -G "$RELEASE_DIR/scheduler/assets/*.js" >/dev/null || fail "no scheduler assets"
grep -q "connect-src 'none'" "$RELEASE_DIR/iep/index.html" || fail "IEP Writer lost its no-network CSP"

# Every file the build produced arrived (rsync can stop short on a full disk).
actual=$(find "$RELEASE_DIR" -type f | wc -l)
[ "$actual" -ge "$EXPECTED" ] || fail "only $actual of $EXPECTED files arrived"

# The swap is one rename(2): no visitor sees a half-swapped tree.
ln -sfn "$RELEASE_DIR" "${LIVE_LINK}.new"
mv -T "${LIVE_LINK}.new" "$LIVE_LINK"
[ -s "$LIVE_LINK/index.html" ] || fail "post-swap: index.html unreadable through the symlink"
echo "publish: live -> $RELEASE_DIR ($actual files)"

# Keep the newest $KEEP releases and never the live one.
live_target=$(readlink -f "$LIVE_LINK")
shopt -s nullglob
releases=("$RELEASES_DIR"/*/)
shopt -u nullglob
if [ "${#releases[@]}" -gt "$KEEP" ]; then
  while IFS= read -r old; do
    old_real=$(readlink -f "$old")
    if [ "$old_real" != "$live_target" ]; then
      rm -rf -- "$old_real"
      echo "publish: pruned $old_real"
    fi
  done < <(ls -1dt -- "${releases[@]}" | tail -n +$((KEEP + 1)))
fi
echo "publish: OK"
