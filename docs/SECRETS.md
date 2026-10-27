# Secrets

One secret, one place. Values never go in the repository.

| Secret | Where | Used by | If wrong or missing |
|---|---|---|---|
| `DEPLOY_SSH_KEY` | GitHub repository secret (Settings > Secrets and variables > Actions) | `.github/workflows/deploy.yml`, to reach the host through the tunnel | The deploy fails at "Set up SSH through the tunnel" and the live site stays on the previous release. Visible |

`DEPLOY_SSH_KEY` is the private half of an ed25519 key. Its public half is
`PUBKEY` in `infra/therapistools-site.sh` and the only line in
`/home/deploy/.ssh/authorized_keys` on the host, restricted to the deploy
gate (docs/INFRA.md "Deploys"). No other copy exists.

## Rotating the deploy key

1. Make a new pair: `ssh-keygen -t ed25519 -N "" -C therapistools-deploy-github-actions -f key`.
2. Put the new public key in `PUBKEY` in `infra/therapistools-site.sh`, and
   on the host replace the key in `/home/deploy/.ssh/authorized_keys`
   (keep the `restrict,from=...,command=...` options), or rerun the script.
3. Set the secret: `gh secret set DEPLOY_SSH_KEY < key` (or paste it in the
   GitHub settings page), then delete `key` and `key.pub`.
4. Run the Deploy workflow by hand (Actions > Deploy > Run workflow) to prove it.

The tunnel itself needs no secret in GitHub: its credentials file lives only
on the host (`/root/.cloudflared/<tunnel id>.json`).
