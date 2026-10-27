#!/bin/bash
# Site configuration for the therapistools LXC (CT 138): deploy key and its
# gate, publish script, sshd, ufw, bootstrap release, Caddy, and the
# Cloudflare Tunnel. Idempotent. Expects infra/Caddyfile, infra/publish.sh and
# infra/deploy-gate.sh pushed to /root/, and the first time the account
# certificate at /root/.cloudflared/cert.pem (docs/INFRA.md "Rebuild").
set -euo pipefail
# The public half of the DEPLOY_SSH_KEY repository secret (docs/SECRETS.md).
PUBKEY="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIHOJcksxaRW3HS4zrjpfuqNIEdqOJQq1PyYp2MpAavA4 therapistools-deploy-github-actions"
TUNNEL_NAME=therapistools

# --- publish script and deploy gate, root-owned so the deploy key cannot change them ---
for f in publish.sh deploy-gate.sh; do [ -s /root/$f ] || { echo "push infra/$f to /root/$f first"; exit 1; }; done
install -m 755 -o root -g root /root/publish.sh /usr/local/bin/therapistools-publish
install -m 755 -o root -g root /root/deploy-gate.sh /usr/local/bin/therapistools-deploy-gate

# --- deploy user: one key, only through the tunnel (cloudflared connects from
# localhost), no shell, no forwarding: the gate is the only thing it runs ---
echo "restrict,from=\"127.0.0.1,::1\",command=\"/usr/local/bin/therapistools-deploy-gate\" $PUBKEY" > /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys

# --- sshd: only the deploy user may log in (root uses pct exec from the host) ---
echo "AllowUsers deploy" > /etc/ssh/sshd_config.d/98-deploy-only.conf
sshd -t
systemctl restart ssh

# --- bootstrap release + docroot symlink (symlink from day one) ---
install -d -o deploy -g deploy /var/www/releases/bootstrap
[ -s /var/www/releases/bootstrap/index.html ] || \
  echo '<!doctype html><title>Therapistools</title><p>Therapistools is being published.</p>' > /var/www/releases/bootstrap/index.html
chown -R deploy:deploy /var/www/releases/bootstrap
[ -L /var/www/therapistools ] || ln -sfn /var/www/releases/bootstrap /var/www/therapistools
chown -h deploy:deploy /var/www/therapistools

# --- Caddy ---
[ -s /root/Caddyfile ] || { echo "push infra/Caddyfile to /root/Caddyfile first"; exit 1; }
caddy validate --config /root/Caddyfile --adapter caddyfile >/dev/null
install -m 644 /root/Caddyfile /etc/caddy/Caddyfile
systemctl enable --now caddy >/dev/null 2>&1 || true
systemctl restart caddy
sleep 1
echo "caddy: $(systemctl is-active caddy)"
echo "www   (expect 200): $(curl -s -o /dev/null -w '%{http_code}' -H 'Host: www.therapistools.com' http://127.0.0.1/)"
echo "apex  (expect 301): $(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' -H 'Host: therapistools.com' http://127.0.0.1/iep/)"

# --- ufw: everything arrives through the local cloudflared, deploys included ---
ufw --force reset >/dev/null
ufw default deny incoming >/dev/null
ufw default allow outgoing >/dev/null
ufw allow from 127.0.0.1 >/dev/null
ufw --force enable >/dev/null
ufw status numbered

# --- Cloudflare Tunnel ---
mkdir -p /etc/cloudflared
# A re-run reuses the tunnel in the existing config: listing tunnels needs the
# login certificate, which the first run deletes.
UUID=$(sed -n 's/^tunnel: //p' /etc/cloudflared/config.yml 2>/dev/null || true)
[ -n "$UUID" ] || UUID=$(cloudflared tunnel list -o json 2>/dev/null | python3 -c "import json,sys; ids=[t['id'] for t in json.load(sys.stdin) if t['name']=='$TUNNEL_NAME']; print(ids[0] if ids else '')" || true)
if [ -z "$UUID" ]; then
  cloudflared tunnel create $TUNNEL_NAME >/dev/null
  UUID=$(cloudflared tunnel list -o json | python3 -c "import json,sys; print([t['id'] for t in json.load(sys.stdin) if t['name']=='$TUNNEL_NAME'][0])")
fi
[ -s /root/.cloudflared/$UUID.json ] || { echo "no credentials for $UUID"; exit 1; }
chmod 400 /root/.cloudflared/$UUID.json
cat > /etc/cloudflared/config.yml <<CFG
tunnel: $UUID
credentials-file: /root/.cloudflared/$UUID.json

ingress:
  - hostname: therapistools.com
    service: http://localhost:80
  - hostname: www.therapistools.com
    service: http://localhost:80
  # Deploys from GitHub's cloud runners (cloudflared access ssh)
  - hostname: ssh.therapistools.com
    service: ssh://localhost:22
  # Keep the catch-all last
  - service: http_status:404
CFG
cloudflared tunnel ingress validate >/dev/null
systemctl is-enabled cloudflared >/dev/null 2>&1 || cloudflared service install >/dev/null 2>&1
systemctl enable --now cloudflared >/dev/null 2>&1
systemctl restart cloudflared
sleep 4
echo "cloudflared: $(systemctl is-active cloudflared)"
echo "TUNNEL_UUID=$UUID"
# The login certificate is only needed to create tunnels; the credentials file runs it.
rm -f /root/.cloudflared/cert.pem
echo "=== SITE_SETUP_DONE ==="
