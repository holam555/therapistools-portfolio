# Infrastructure: the www.therapistools.com host

The site is self-hosted on a homelab Proxmox server, the same pattern as the
operator's other static sites. Built 2026-10-26. Everything below was applied
by hand from the operator's `proxmox` SSH alias with `pct exec`; the scripts
in `infra/` are the ones that ran. This file is the inventory; the reasons,
runbooks and every lesson from building it are in
[DEPLOYMENT.md](DEPLOYMENT.md). Read that before changing the deploy path.

## Inventory

| Item | Value |
|---|---|
| Proxmox CT | 138 `therapistools`, Debian 12 (`debian-12-standard_12.12-1`), unprivileged, nesting, 2 cores, 2 GB RAM, 2 GB swap, 8 GB on local-zfs, onboot |
| Network | VLAN 6 (`tag=6` on `vmbr0`), static 192.168.6.205/24, gateway and nameserver 192.168.6.1 |
| Web server | Caddy 2.11, `:80` only, `admin off`. Config `infra/Caddyfile`, live at `/etc/caddy/Caddyfile` |
| Tunnel | cloudflared, tunnel `therapistools`, id `eb639cae-e16b-46d8-a0ac-f31a8fbcd1e2`, credentials `/root/.cloudflared/<id>.json` (mode 400), config `/etc/cloudflared/config.yml` (written by `infra/therapistools-site.sh`) |
| DNS (Cloudflare zone therapistools.com) | apex, `www` and `ssh` CNAME to `<tunnel id>.cfargotunnel.com`, proxied. `www` is canonical; Caddy sends the apex there with a 301. The registrar's parking records were deleted; its MX and SPF records (email forwarding) were kept |
| Docroot | `/var/www/therapistools`, a symlink to `/var/www/releases/<run id>-<attempt>`. Last three releases kept |
| Deploy user | `deploy`, one key (`DEPLOY_SSH_KEY`, docs/SECRETS.md) with `restrict`, `from="127.0.0.1,::1"` (only through the tunnel) and `command=` the deploy gate. No shell, no sudo, no polkit |
| ufw | default deny incoming, allow from 127.0.0.1. Everything, deploys included, arrives through the local cloudflared |
| sshd | `/etc/ssh/sshd_config.d/99-hardening.conf`: key-only, root prohibit-password, forwarding off. `98-deploy-only.conf`: `AllowUsers deploy` (root uses `pct exec` from the host) |
| Deploy scripts | `/usr/local/bin/therapistools-deploy-gate` (`infra/deploy-gate.sh`) and `/usr/local/bin/therapistools-publish` (`infra/publish.sh`), root-owned so the deploy key can run them but never change them |
| CI | GitHub's cloud runners (`ubuntu-latest`). No homelab runner is involved |
| Backups | the cluster-wide nightly vzdump covers every guest. The site has no state: any release can be rebuilt from git |
| Analytics | none, by decision (privacy page). Cloudflare Web Analytics must stay off, see below |

## Request flow

```
Visitor -> Cloudflare edge (TLS) -> tunnel -> cloudflared on CT 138 -> Caddy :80
  therapistools.com/*      301 to https://www.therapistools.com, path kept
  http://www...            301 to https (Caddy reads X-Forwarded-Proto)
  /worksheets/privacy      308 to /privacy/#worksheets
  /worksheets/*, /scheduler/*   file, <path>/index.html, <path>.html, else the app shell
  everything else          file, <path>/index.html, <path>.html, else 404

Deploy -> cloudflared access ssh -> ssh.therapistools.com -> tunnel -> sshd :22 -> deploy gate
```

Production routing lives in `infra/Caddyfile`, local routing in
`scripts/site-routes.mjs` (used by `npm run preview`).
`scripts/check-caddy-routes.mjs`, part of `npm test`, fails when the two
disagree.

## Deploys

A push to `main` runs `.github/workflows/deploy.yml` on GitHub's cloud
runners: install, test, typecheck, build. It then connects to
`ssh.therapistools.com` through the tunnel (`cloudflared access ssh`, host
key pinned in the workflow) with the `DEPLOY_SSH_KEY` secret, rsyncs `dist/`
to `/var/www/releases/<run id>-<attempt>/` and asks the host to publish it.
The workflow then reads the live release back from the host and checks the
public pages.

The key reaches the box only through the tunnel and can do three things,
all enforced by the forced command `therapistools-deploy-gate`:

| Command | Does |
|---|---|
| rsync (write-only, through `rrsync`) | uploads into `/var/www/releases/`, nothing outside it, no reads |
| `publish <run id>-<attempt> <file count>` | runs `therapistools-publish` on that release |
| `live` | prints the release the site serves |

`therapistools-publish` checks the release (entry points present, IEP Writer
CSP intact, every built file arrived), swaps the symlink with one rename and
prunes to three releases. A failure before the swap leaves the live site on
the previous release. `scripts/test-publish.sh` (part of `npm test`)
exercises it in a scratch tree. The worst a leaked key can do is publish a
release that passes those checks; rotate it as in docs/SECRETS.md.

Changing `infra/publish.sh` or `infra/deploy-gate.sh` takes a hand install,
like the Caddyfile:

```
scp infra/publish.sh infra/deploy-gate.sh proxmox:/tmp/
ssh proxmox 'pct push 138 /tmp/publish.sh /usr/local/bin/therapistools-publish --perms 755 && pct push 138 /tmp/deploy-gate.sh /usr/local/bin/therapistools-deploy-gate --perms 755'
```

**Rolling back:** on the box, `ls -t /var/www/releases` and
`ln -sfn /var/www/releases/<older> /var/www/therapistools.new && mv -T /var/www/therapistools.new /var/www/therapistools`.

**Deploying by hand** (GitHub down): build locally, copy `dist/` into a new
directory under `/var/www/releases/` on the box (owned by `deploy`), then
`pct exec 138 -- su deploy -c 'cd / && therapistools-publish /var/www/releases/<dir> <file count>'`. Full command: [DEPLOYMENT.md](DEPLOYMENT.md) section 4.

## Caching and Cloudflare

Caddy sets `Cache-Control`: Vite's hashed files under `/<app>/assets/` are
immutable for a year, everything else is `no-cache` so a deploy shows on the
next page load. No cache purge is needed after a deploy.

Every response also carries `no-transform`. **This is load-bearing.** A new
Cloudflare zone turns on Cloudflare Web Analytics, which injects a beacon
script into every HTML page; that broke the site's no-analytics promise on
the first day (the Scheduler and IEP Writer CSPs blocked it, the other pages
loaded it). Cloudflare does not inject into `no-transform` responses, and
`npm test` fails if a `Cache-Control` line in the Caddyfile loses it. The
dashboard switch should be off as well: **still open**, the Cloudflare
account owner turns it off under Analytics & Logs > Web Analytics >
therapistools.com (the DNS token cannot). The deploy workflow fails if the
beacon ever appears in the home page.

## Changing the Caddyfile

Edit `infra/Caddyfile`, run `npm test`, then apply it by hand:

```
scp infra/Caddyfile proxmox:/tmp/Caddyfile
ssh proxmox 'pct push 138 /tmp/Caddyfile /root/Caddyfile --perms 644 && pct exec 138 -- bash -c "caddy validate --config /root/Caddyfile --adapter caddyfile && install -m 644 /root/Caddyfile /etc/caddy/Caddyfile && systemctl restart caddy"'
```

`systemctl reload caddy` does not work here: reload goes through Caddy's
admin endpoint, which is off. Restart takes about a second.

## Rebuild from scratch

1. `pct create 138 local:vztmpl/debian-12-standard_12.12-1_amd64.tar.zst --hostname therapistools --ostype debian --cores 2 --memory 2048 --swap 2048 --rootfs local-zfs:8 --unprivileged 1 --features nesting=1 --net0 name=eth0,bridge=vmbr0,firewall=1,gw=192.168.6.1,ip=192.168.6.205/24,tag=6,type=veth --nameserver 192.168.6.1 --onboot 1`, then `pct start 138`.
2. `pct push 138 infra/therapistools-base.sh /root/therapistools-base.sh && pct exec 138 -- bash /root/therapistools-base.sh`
3. Push `infra/Caddyfile`, `infra/publish.sh` and `infra/deploy-gate.sh` to `/root/`. Put the Cloudflare account certificate at `/root/.cloudflared/cert.pem` (mode 600, copied from another site container that still has one, or `cloudflared tunnel login`), then push and run `infra/therapistools-site.sh`. It installs the deploy scripts and key, sshd, Caddy, ufw, creates or reuses the tunnel, starts it and deletes the certificate. Run it from a shell with the default umask: a `umask 077` carried into `pct exec` makes the bootstrap page unreadable to Caddy.
4. If the tunnel id changed, point the apex, `www` and `ssh` CNAMEs at the new one. If the host key changed, update `HOST_KEY` in the deploy workflow.
5. Run the deploy workflow (Actions, Deploy, Run workflow).

## Gotchas

- A container with no `nameserver` in its pct config inherits the host's
  resolv.conf, which points at Tailscale. Always set it.
- Deploys come in through the tunnel, so they work from anywhere and need
  no firewall rule; sshd sees them as coming from localhost.
- Running the publish script with a working directory the `deploy` user
  cannot read (for example `su deploy` from `/root`) used to make it exit
  silently; it now changes to `/` first.
