#!/bin/bash
# Base provisioning for the therapistools LXC (CT 138, Debian 12): static site host
# behind a Cloudflare Tunnel. Same as the operator's other static site hosts.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y ca-certificates curl gnupg apt-transport-https \
    debian-keyring debian-archive-keyring rsync ufw git

# --- Caddy (cloudsmith apt repo) ---
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    > /etc/apt/sources.list.d/caddy-stable.list

# --- cloudflared (cloudflare apt repo) ---
mkdir -p --mode=0755 /usr/share/keyrings
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg \
    > /usr/share/keyrings/cloudflare-main.gpg
echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared bookworm main" \
    > /etc/apt/sources.list.d/cloudflared.list

apt-get update
apt-get install -y caddy cloudflared

# --- deploy user + release directories (rsync target for the deploy workflow) ---
id -u deploy >/dev/null 2>&1 || useradd --create-home --shell /bin/bash deploy
install -d -m 0700 -o deploy -g deploy /home/deploy/.ssh
install -d -o deploy -g root /var/www /var/www/releases

# --- sshd: key-only ---
cat > /etc/ssh/sshd_config.d/99-hardening.conf <<'SSHD'
# Key-only. The deploy user is the only intended login (rsync from the CI
# runner); root keeps prohibit-password for pct exec fallback from the host.
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
DisableForwarding yes
MaxAuthTries 3
LoginGraceTime 20
SSHD
systemctl restart ssh

echo "=== BASE_SETUP_DONE ==="
caddy version | head -1
cloudflared --version
rsync --version | head -1
