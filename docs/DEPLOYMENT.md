# Deployment: maintainer's notes

For an agent or person who has to change, fix or rebuild how Therapistools
is served and shipped. [INFRA.md](INFRA.md) is the inventory (what exists,
addresses, ids); this file is the reasoning, the runbooks and every lesson
from building it, so nobody has to rediscover them. [SECRETS.md](SECRETS.md)
covers the one secret.

Written 2026-10-26, the day the site moved to self-hosting. Keep it current
in the same change as anything that alters the deploy path.

## Contents

1. [The shape in one paragraph](#1-the-shape-in-one-paragraph)
2. [Decisions and why](#2-decisions-and-why)
3. [What you need to work on it](#3-what-you-need-to-work-on-it)
4. [Runbooks](#4-runbooks)
5. [Verifying a change](#5-verifying-a-change)
6. [Lessons from the build (symptom, cause, fix)](#6-lessons-from-the-build)
7. [Invariants: do not break these](#7-invariants-do-not-break-these)
8. [Open items and known warnings](#8-open-items-and-known-warnings)
9. [How it was built, in order](#9-how-it-was-built-in-order)

---

## 1. The shape in one paragraph

`npm run build` assembles one static site in `dist/` (home and privacy
pages, three apps under `/worksheets/`, `/scheduler/`, `/iep/`, shared brand
files). A push to `main` runs `.github/workflows/deploy.yml` on GitHub's
cloud runners: install, test, typecheck, build, then SSH through the site's
Cloudflare Tunnel (`ssh.therapistools.com`) to the homelab container CT 138,
rsync the build into a fresh release directory, and ask the host to publish
it. The host checks the release, swaps a symlink to it with one rename, and
keeps the last three. Caddy on the host serves the symlinked tree on `:80`;
`cloudflared` carries all traffic in from Cloudflare's edge, which ends TLS.
Nothing on the host listens to the network directly: the firewall only
accepts localhost, and both web traffic and deploys arrive through the
tunnel.

```
Visitor  -> Cloudflare edge (TLS) -> tunnel -> cloudflared (CT 138) -> Caddy :80 -> /var/www/therapistools -> releases/<id>
GitHub   -> cloudflared access ssh -> ssh.therapistools.com -> tunnel -> sshd :22 -> deploy gate -> rrsync | publish | live
```

## 2. Decisions and why

Each was made on 2026-10-26 by the site's operator unless noted. Do not
reverse one without asking.

| Decision | Why | Consequence for you |
|---|---|---|
| **Self-host on the homelab, not Vercel** | Same pattern as the operator's other sites; the site was never deployed to Vercel, so nothing had to be migrated or redirected | `vercel.json` is gone. Its headers and routing live in `infra/Caddyfile` |
| **No analytics at all** | Simplest privacy story. Vercel Web Analytics could not work off Vercel anyway | Removed from Worksheets and Scheduler (code, package, tests); privacy page rewritten. See rule 2 in [CLAUDE.md](../CLAUDE.md) |
| **`www.therapistools.com` is canonical** | Matches the operator's other sites | `SITE_ORIGIN`, canonicals, `og:url`, sitemap, `robots.txt`, `llms.txt` all use www. Caddy 301s the apex to www. The short address *printed on worksheets* deliberately stays `therapistools.com/worksheets` (`APP_URL_SHORT` in `apps/worksheets/src/lib/site.ts`) so print layouts did not change; the apex redirects |
| **Deploy from GitHub's cloud runners** | Operator call. The repo is private and has two people on it | No homelab runner. The cloud runner reaches the box through the tunnel with one SSH key secret. An earlier version of this setup used the operator's self-hosted runner (CT 119) over the LAN; it was replaced the same day and its key and firewall rule were removed |
| **One container per site** | The operator's convention: each site gets its own LXC on VLAN 6 | CT 138, 192.168.6.205 |
| **Static only: no API, no database, no polkit** | The site has no backend | Nothing to restart on deploy. The deploy user can swap a symlink and nothing else |
| **No Cloudflare cache purge on deploy** | Hashed assets are immutable and get new names; everything else is `no-cache` | No Cloudflare API token in CI at all |

## 3. What you need to work on it

- **Proxmox access:** the operator's agent environment has an SSH alias
  `proxmox` to the hypervisor. Everything on the box is done with
  `pct exec 138 -- ...` and files go in with `scp` to the host then
  `pct push 138 <src> <dst>`. There is no other way in as root: sshd on the
  box allows only the `deploy` user.
- **Cloudflare DNS:** the operator's agent environment holds a DNS-edit token
  that covers this zone (kept outside the repo; never copy it in). It can
  create and delete DNS records. It **cannot** read or change zone settings
  or Web Analytics (`Authentication error`, code 10000): those are dashboard
  jobs for the Cloudflare account owner.
- **GitHub:** a collaborator login with push access is enough for
  everything, including setting Actions secrets (`gh secret set`). It does
  not have admin, and does not need it. If its OAuth token lacks the
  `workflow` scope, pushes that touch `.github/workflows/` are refused over
  HTTPS; push over SSH instead (section 6).
- **Commit identity:** this repository's local git config (name
  "Therapistools"). A fresh clone has none; set it before committing. Never
  use a machine's global identity, and never put a person's name, username,
  email or home path in a commit or doc (rule 3).

## 4. Runbooks

### Ship a change

Commit and push to `main`. Watch it: `gh run list -L 1`, then
`gh run watch <id> --exit-status`. About a minute and a half end to end. A
red run before "Ship and publish the release" left the site untouched.

To redeploy without a code change: Actions > Deploy > Run workflow (or
`gh workflow run deploy.yml`).

### Roll back

```
ssh proxmox 'pct exec 138 -- ls -t /var/www/releases'
ssh proxmox 'pct exec 138 -- su deploy -c "ln -sfn /var/www/releases/<older> /var/www/therapistools.new && mv -T /var/www/therapistools.new /var/www/therapistools"'
```

Three releases are kept. The next push deploys over the rollback, so revert
the bad commit too.

### Deploy by hand (GitHub or the tunnel's SSH path is down)

Build locally (`npm run build`), then:

```
N=$(find dist -type f | wc -l); R=manual-$(date -u +%Y%m%d%H%M)
tar -C dist -czf /tmp/dist.tgz . && scp /tmp/dist.tgz proxmox:/tmp/
ssh proxmox "pct push 138 /tmp/dist.tgz /tmp/dist.tgz && rm /tmp/dist.tgz && pct exec 138 -- bash -c 'chown deploy /tmp/dist.tgz && cd /tmp && su deploy -c \"mkdir /var/www/releases/$R && tar -xzf /tmp/dist.tgz -C /var/www/releases/$R && therapistools-publish /var/www/releases/$R $N\"; rm -f /tmp/dist.tgz'"
```

Do not set `umask 077` in that shell (section 6). The first release on
2026-10-26 went out this way.

### Change routing, headers or caching

1. Edit `infra/Caddyfile`. If you add a redirect or an app fallback, add it
   to `scripts/site-routes.mjs` too (the local preview uses it), inside the
   `# route: begin/end` markers in the Caddyfile.
2. `npm test` (runs `scripts/check-caddy-routes.mjs`).
3. Apply by hand (the deploy does not touch the Caddyfile):

```
scp infra/Caddyfile proxmox:/tmp/Caddyfile
ssh proxmox 'pct push 138 /tmp/Caddyfile /root/Caddyfile --perms 644 && rm /tmp/Caddyfile && pct exec 138 -- bash -c "caddy validate --config /root/Caddyfile --adapter caddyfile && install -m 644 /root/Caddyfile /etc/caddy/Caddyfile && systemctl restart caddy && systemctl is-active caddy"'
```

Use `restart`, not `reload` (section 6). `caddy validate` first means a bad
file never replaces the running one.

### Change the publish script or the deploy gate

They run from root-owned copies in `/usr/local/bin`, not from the release,
so a deploy never updates them. Edit `infra/publish.sh` or
`infra/deploy-gate.sh`, run `npm test` (covers publish.sh), then:

```
scp infra/publish.sh infra/deploy-gate.sh proxmox:/tmp/
ssh proxmox 'pct push 138 /tmp/publish.sh /usr/local/bin/therapistools-publish --perms 755 && pct push 138 /tmp/deploy-gate.sh /usr/local/bin/therapistools-deploy-gate --perms 755 && rm /tmp/publish.sh /tmp/deploy-gate.sh'
```

Then run the Deploy workflow by hand to prove the path.

If you add a command to the gate, the workflow and this file change with it.
Keep every argument validated by a strict regex: the gate is the only thing
standing between the key and the box.

### Rotate the deploy key

[SECRETS.md](SECRETS.md). Generate the pair somewhere private, put the
public half in the box's `authorized_keys` (keep the options) and in
`PUBKEY` in `infra/therapistools-site.sh`, set the secret with
`gh secret set DEPLOY_SSH_KEY < key`, delete both local files (`shred -u`),
dispatch a deploy.

### Rebuild the box from nothing

[INFRA.md](INFRA.md) "Rebuild from scratch". The scripts are idempotent and
can be rerun on a live box (that is how the cloud-runner change was
applied). The site has no state, so a rebuild loses nothing.

## 5. Verifying a change

A deploy is done when all of these hold. The workflow checks the first
four; check the rest by hand after any infra change.

1. `ssh deploy-target live` (the workflow's own check) points at the new
   release id.
2. `/`, `/privacy/`, `/scheduler/`, `/iep/`, `/worksheets/`,
   `/worksheets/edit/trace-name` answer 200 on www.
3. `https://therapistools.com/iep/` answers `301` to
   `https://www.therapistools.com/iep/`.
4. The home page does not contain `cloudflareinsights`.
5. `http://www.therapistools.com/` answers 301 to https;
   `/worksheets/privacy` answers 308 to `/privacy/#worksheets`; `/nope`
   answers 404; an unknown `/worksheets/edit/x` serves the app shell (200).
6. Headers (`curl -sI`): every response has
   `Cache-Control: ...no-transform`, `Strict-Transport-Security`,
   `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and no
   `Set-Cookie`. `/scheduler/*` adds its `Content-Security-Policy`,
   `X-Frame-Options: DENY` and `Cross-Origin-Opener-Policy: same-origin`.
   Files under `/<app>/assets/` are `immutable`.
7. **A real browser** shows each tool with no console errors and no
   third-party requests except Google Fonts on Worksheets (disclosed on the
   privacy page). This is how the Cloudflare beacon was found; curl alone
   would not have shown the CSP errors. A minimal Playwright check:

```js
// node check.mjs  (Playwright from the environment's node_modules)
import { chromium } from "playwright";
const b = await chromium.launch();
for (const p of ["/", "/privacy/", "/scheduler/", "/iep/", "/worksheets/", "/worksheets/edit/trace-name"]) {
  const page = await b.newPage(), errs = [], hosts = new Set();
  page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  page.on("pageerror", (e) => errs.push(e.message));
  page.on("request", (r) => { const h = new URL(r.url()).host; if (h !== "www.therapistools.com") hosts.add(h); });
  const res = await page.goto("https://www.therapistools.com" + p, { waitUntil: "networkidle" });
  console.log(res.status(), p, [...hosts], errs);
  await page.close();
}
await b.close();
```

8. The gate still refuses what it should (only after changing the gate or
   `authorized_keys`), using the deploy key through the tunnel:
   `ssh deploy-target id` -> "command not allowed";
   `ssh deploy-target "publish ../../etc 1"` -> usage error;
   `ssh deploy-target "rsync --server --sender -logDtpre.iLsfxCIvu . bootstrap/index.html"`
   -> "reading from write-only server is not allowed".

## 6. Lessons from the build

Every one of these happened on 2026-10-26. Read the cause before
"simplifying" the mechanism that fixes it.

| Symptom | Cause | Fix now in place |
|---|---|---|
| Home, privacy and Worksheets pages loaded `static.cloudflareinsights.com/beacon.min.js`; Scheduler and IEP Writer logged CSP violations for it | A new Cloudflare zone has **Cloudflare Web Analytics on by default**, and the edge injects its beacon into every HTML response. The site promises no analytics | Caddy sends `Cache-Control: no-transform` on every response, which Cloudflare honours by not injecting. `npm test` fails if a Caddyfile `Cache-Control` line loses it; the deploy fails if the beacon appears. The dashboard switch is still to be turned off (section 8) |
| Bootstrap page returned 404 at `/`, then 403 for `/index.html` | The provisioning ran under `pct exec` from a shell that had set `umask 077` (to protect the tunnel certificate). The umask carries into `pct exec`, so the page was written mode 600 and Caddy (user `caddy`) could not read it. `try_files` treats an unreadable file as missing, hence the 404 | Fixed the mode. Never set a restrictive umask in a shell you then run provisioning from; protect secret files with explicit `--perms`/`chmod` instead. Noted in INFRA.md "Rebuild" |
| First hand publish printed only `find: Failed to restore initial working directory: /root: Permission denied` and did not swap | `su deploy` from `/root` kept the cwd. `find` could not return to it and exited non-zero; under `set -o pipefail` the `$(find ... \| wc -l)` assignment killed the script with no message | `publish.sh` does `cd /` after resolving its arguments; the gate also `cd /` before running it |
| `systemctl reload caddy` failed: "Job for caddy.service failed" | The Caddyfile sets `admin off`, and `reload` works by posting the new config to the admin endpoint | Always `systemctl restart caddy` (about a second). Kept `admin off`: nothing on the box needs the endpoint |
| Rerunning `therapistools-site.sh` could not find the tunnel | `cloudflared tunnel list` needs the account certificate (`cert.pem`), which the first run deletes on purpose | The script reads the tunnel id from the existing `/etc/cloudflared/config.yml` first and only lists or creates a tunnel when there is none |
| `git push` over HTTPS refused: "refusing to allow an OAuth App to create or update workflow ... without `workflow` scope" | The GitHub CLI's token lacked the `workflow` scope, and any push that adds or changes a file under `.github/workflows/` needs it | Push over SSH (`git push git@github.com:<owner>/<repo>.git main`) with an SSH key registered to an account with push access; SSH pushes are not scope-limited |
| Thought the repo was public and wrote a "require approval for fork pull requests" step | Misread an API result (a permissions column) | The repo is **private**. Check `gh api repos/<owner>/<repo> --jq .private` before reasoning about exposure |
| Thought a repo admin was needed to register a runner and set secrets | Runner registration does need admin. Secrets did not: a collaborator with push could read the Actions public key and `gh secret set` worked | Cloud runners need no registration, so no admin step remains. Try the API before assuming an owner task |
| Cloudflare showed the zone "pending" | The registrar's nameservers had not switched yet | Wait; it went "active" within minutes once the registrar change landed. Records can be added while pending |
| Zone came with registrar parking records (three apex A records, `*` and `www` CNAMEs to the registrar's parking host) | Cloudflare imports existing records when a zone is added | Deleted those five. Kept the registrar's MX pair and SPF TXT (they carry email forwarding, which is configured in the registrar account, not in DNS) and left two stale `_acme-challenge` TXT records (harmless) |
| A Vite-hashed asset like `index-CGfi-n2U.js` | Vite names files `<name>-<hash>.<ext>` under `<app>/assets/` | The immutable cache rule matches the directory (`^/(worksheets\|scheduler)/assets/`), not a hash pattern. The IEP Writer is one inlined HTML file, so it has no assets and is always `no-cache` |
| rsync `--link-dest` dropped | The deploy key is confined to `/var/www/releases` by `rrsync`; the live symlink `/var/www/therapistools` is outside it, so a link-dest there would be refused | Each release is a full copy (about 66 files, a few MB). Fine at this size |

Smaller facts worth knowing:

- Vercel's old `cleanUrls` behaviour is reproduced by
  `try_files {path} {path}/index.html {path}.html`, in the same order as
  `scripts/preview-site.mjs`. Worksheets pages are prerendered as
  `<path>/index.html`, so `/worksheets/edit/trace-name` is a real file.
- Vercel's `"permanent": true` redirect is a 308; the Caddyfile and the
  preview server both use 308 for `/worksheets/privacy`.
- `try_files {path}` does not match directories, so `/iep` (no slash) falls
  through to `{path}/index.html` and serves the IEP Writer directly, same as
  before.
- sshd sees tunnelled connections as coming from `127.0.0.1`, which is why
  the deploy key carries `from="127.0.0.1,::1"`: it cannot be used from the
  LAN even if copied.
- `cloudflared access ssh` needs no Cloudflare Access application for this
  to work; the SSH key is the authentication. (Do not add an Access app
  without checking what its login redirect exposes: on another of the
  operator's sites an Access challenge leaked the account's team domain.)
- The host key is pinned in the workflow (`HOST_KEY`). A rebuilt box has a
  new one; update the workflow or every deploy fails at the SSH step.
- Tunnel creation needs the account certificate. The operator's other site
  containers may still hold one at `/root/.cloudflared/cert.pem`; it was
  copied from one (via `pct pull` to the host, `pct push` to CT 138, then
  removed from the host) and the site script deleted it after creating the
  tunnel. The tunnel runs on its own credentials file afterwards.
- A container with no `nameserver` in its pct config inherits the
  hypervisor's resolv.conf (Tailscale). `pct create` sets
  `--nameserver 192.168.6.1` for that reason.

## 7. Invariants: do not break these

- **`no-transform` on every response.** Removing it brings the Cloudflare
  beacon back and breaks the privacy promise. Tested.
- **Caddyfile routes == `scripts/site-routes.mjs`.** Tested.
- **The IEP Writer keeps `connect-src 'none'`.** `publish.sh` refuses a
  release without it.
- **The deploy key does only what the gate allows**, only through the
  tunnel, and the scripts it runs are root-owned. Never give `deploy` a shell
  command, sudo, or write access outside `/var/www`.
- **The docroot is a symlink from release one**, and swaps are one
  `rename(2)` (`ln -sfn` to `.new`, then `mv -T`). No visitor ever sees a
  half-copied tree.
- **Checks before the swap.** A bad build must read as a failed deploy, never
  as a broken site.
- **Truth comes from the box.** The workflow reads the live release back
  with `live` instead of trusting step exit codes.
- **No analytics and no third-party scripts** outside the worksheet fonts.
  Any change here also updates `apps/home/privacy/index.html`.
- **No personal details** (names, usernames, emails, home paths) in this
  repo, its docs or commits, including in infra notes.

## 8. Open items and known warnings

- **Cloudflare Web Analytics is still switched on** for the zone. The
  server blocks it, so visitors are not affected, but the Cloudflare account
  owner should turn it off: dashboard > Analytics & Logs > Web Analytics >
  therapistools.com. The DNS token cannot.
- **GitHub runner image:** `ubuntu-latest` moves to Ubuntu 26 from
  2026-10-19 onward. The workflow uses only Node, rsync, curl and ssh, so it
  should not care; if a deploy breaks on a runner-image change, pin
  `runs-on: ubuntu-24.04` and investigate.
- **Action versions:** `actions/checkout` and `actions/setup-node` are on
  v5 (Node 24 runtime). The first deploy on v4 warned that Node 20 actions
  are deprecated.
- **Pinned `cloudflared` in CI:** `CLOUDFLARED_VERSION` in the workflow
  (2026.8.3). The box runs whatever the Cloudflare apt repo ships; bump the
  CI pin occasionally, to a release at least two weeks old.
- **Worksheets fonts** still load from Google Fonts (disclosed). Moving them
  to `shared/fonts` needs a print check of every template first.

## 9. How it was built, in order

For context when something looks odd. 2026-10-26:

1. Read the operator's other site repos for the house pattern: one LXC per
   site on VLAN 6, Caddy on `:80` behind a per-site Cloudflare Tunnel,
   symlink releases, records in `docs/INFRA.md`.
2. Asked the operator: GitHub home (kept where it is), analytics (none),
   canonical host (www), extras (retire Vercel only).
3. Created CT 138 (192.168.6.205; .198 to .204 were taken), ran
   `infra/therapistools-base.sh` (Caddy, cloudflared, deploy user, sshd).
4. Code: removed Vercel Analytics, rewrote the privacy page (no analytics;
   hosted on our server behind Cloudflare), switched every URL to www,
   deleted `vercel.json`, wrote `infra/Caddyfile` from its rules, added
   `scripts/check-caddy-routes.mjs` and `scripts/test-publish.sh` to
   `npm test`.
5. Copied the account certificate in, ran `infra/therapistools-site.sh`
   (tunnel `therapistools` created), fixed the umask-077 page mode.
6. DNS: the zone had just gone active; deleted the parking records, added
   apex and www CNAMEs to the tunnel.
7. Shipped the first release by hand (section 4) and hit the `find` cwd bug.
8. Browser check found the Cloudflare beacon; added `no-transform`, hit the
   `admin off` reload failure, restarted instead, re-checked clean.
9. First deploy path used the operator's self-hosted runner (CT 119) over
   the LAN. The operator then chose GitHub's cloud runners: added the
   `ssh.` tunnel hostname, the deploy gate with `rrsync`, root-owned
   publish script, `AllowUsers deploy`, `from=` localhost; removed the
   runner key and firewall rule; set `DEPLOY_SSH_KEY` with `gh secret set`
   and shredded the local copy.
10. HTTPS push refused for lacking `workflow` scope; pushed over SSH. Run
    40415608049 deployed in about 1.5 minutes, all checks green.
11. The site was never on Vercel, so no old addresses needed redirects.
