# IEP Writer accounts

The IEP Writer can sign a writer in so their **report template** follows them
to another browser or computer. That is the whole feature. The report being
written, filled blanks, ratings, recipes and the sentence library stay in the
browser, as they always did. Without signing in, nothing changes and the page
makes no network requests at all.

Decided with the owner on 2026-11-02. Why: the owner's own template holds their
district wording and should not ship to every visitor; an account count shows
how many people use the tool without any analytics; a third-party service is
less work than running an account server on the homelab box.

## How it works

| Piece | Where | What it does |
|---|---|---|
| Account server | A [Supabase](https://supabase.com) project (hosted, chosen 2026-11-02) | Sign-in with Google or an emailed code, and one table |
| Table `templates` | `apps/iep/supabase/migrations/20261102000000_templates.sql` | One row per writer, discipline and template kind. Row Level Security: a writer reads and writes only rows whose `user_id` is their own |
| Client | `apps/iep/src/account/` | `config.ts` reads the server address from the build; `client.ts` makes the supabase-js client (PKCE flow); `sync.ts` decides what moves and runs the privacy gate; `AccountProvider.tsx` holds the session and does the moving |
| UI | `apps/iep/src/ui/Account.tsx` | Header button, sign-in dialog, status, conflict notice, the Account card in Settings |
| Server address | `apps/iep/.env` | `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Both are public by design and are committed. Empty values switch accounts off |
| Build | `apps/iep/vite.config.ts` | The website page gets a CSP whose `connect-src` is exactly the Supabase origin. `vite build --mode offline` makes the downloadable file: empty address, supabase-js swapped for a stub, `connect-src 'none'` |
| Deploy gate | `infra/publish.sh` | Refuses a release whose IEP page may connect anywhere but one `*.supabase.co` origin, or whose offline file may connect at all |

**What syncs.** For OT, the edits laid over the built-in template
(`easyiep.template`). For every other discipline, the template pack
(`easyiep.pack.<discipline>`). `sync.ts` reads only those two stores; a test
fails if it ever names a draft, values, setup, recipe or library store.

**Which way it moves.** The browser keeps the copy both sides last agreed on
(`easyiep.account.synced.<user>.<discipline>.<kind>`). On sign-in, the side
that changed since then wins; when both changed, a notice asks the writer
which to keep. After that, a template saved in the browser goes up about a
second after the last edit.

**The privacy gate.** Before any upload, the template's text runs through the
same scanner as the Output tab. A full date, phone number, email address or
word on the writer's never-allow list holds the template back (the status
says so and lists them). Unknown capitalised words are shown but do not
block, because test and product names land there too.

**Counting users.** Supabase dashboard > Authentication > Users. Each row is
one account, with its last sign-in time. There is no other counter.

## Security choices, and why

- **PKCE flow.** The standard for code that runs in a browser: the sign-in
  redirect returns a one-time code that only the browser holding the
  verifier can exchange.
- **Publishable key only.** It identifies the app, not a person, and can do
  nothing Row Level Security does not allow. The secret key never leaves the
  Supabase dashboard and is not in this repository.
- **RLS on, forced, `anon` revoked.** Policies on every operation use
  `(select auth.uid()) = user_id`. The table's `user_id` defaults to
  `auth.uid()` so the client cannot write a row for someone else.
- **Email codes, not passwords.** Nothing to store or reset. Google sign-in
  goes through Google's own page.
- **One origin in the CSP.** The page can talk to its own Supabase project
  and nothing else; the deploy gate checks the pattern. The offline download
  keeps `connect-src 'none'` and bundles no network code.
- **Encryption.** TLS in transit; Supabase encrypts the database and its
  backups at rest (AES-256). Templates are not encrypted client-side: they
  are wording, not student data, and a lost passphrase would lose the
  template. Revisit if templates ever hold anything more sensitive.

## Setting it up (owner, once)

1. **Create the project** at supabase.com (any name, region near the users).
   Copy from Settings > API: the Project URL (`https://<ref>.supabase.co`)
   and the **publishable** key. Put them in `apps/iep/.env`.
2. **Run the migration.** SQL editor > paste
   `apps/iep/supabase/migrations/20261102000000_templates.sql` > Run. Safe to
   rerun.
3. **Google sign-in.** Authentication > Providers > Google > enable. It asks
   for a Client ID and Client Secret from a Google Cloud project: APIs &
   Services > Credentials > Create credentials > OAuth client ID > Web
   application; the authorised redirect URI is the one Supabase shows on the
   provider page (`https://<ref>.supabase.co/auth/v1/callback`). The secret
   stays in Supabase; never put it in this repository. The consent
   screen asks for a logo (`shared/logo-120.png`; `logo-512.png` for larger uses), the privacy policy
   (`https://www.therapistools.com/privacy/`) and the terms of use
   (`https://www.therapistools.com/terms/`, `apps/home/terms/`), so those
   pages must be live before Google verifies the app. The Supabase secret
   key is never needed by this repository or by anyone working on it.
4. **Email sender and templates.** Supabase only lets you edit the email
   templates once a custom SMTP sender is set, and its built-in sender allows
   about two emails an hour, so set one first: a Resend account (free tier),
   the domain verified with the DNS records Resend lists (added in Cloudflare;
   they sit on a subdomain and do not clash with the email-forwarding records),
   and a sending-only API key pasted into Supabase > Project Settings >
   Authentication > SMTP Settings (host `smtp.resend.com`, port 465, user
   `resend`, password the key, sender `noreply@therapistools.com`). The key
   is a secret and lives in Supabase only. Then Authentication > Email
   Templates: paste `apps/iep/supabase/email-templates/` (its README gives
   the subject lines). Every template carries `{{ .Token }}` because the app
   asks for the code; Confirm signup is the one a new address receives. Raise
   Authentication > Rate Limits > emails from 2 an hour to about 30.
5. **Redirect URLs.** Authentication > URL Configuration: Site URL
   `https://www.therapistools.com/iep/`; Redirect URLs add
   `https://www.therapistools.com/iep/`, `http://localhost:4300/iep/`
   (`npm run preview`) and `http://127.0.0.1:5173/` (the dev server).
6. **Update the deploy gate on the box.** `infra/publish.sh` changed; the
   copy on the host is applied by hand (docs/INFRA.md "Deploys"). Until it
   is, a deploy fails at "publish" and the live site stays as it was.
7. **Build and check.** `npm test && npm run build && npm run preview`, open
   `/iep/`, sign in, edit the template, open the same site in another
   browser and sign in: the template should follow.
8. **Free plan note.** A free project pauses after about a week without
   activity; sign-in then fails until it is restored from the dashboard. The
   built-in template keeps working without sign-in. The Pro plan does not
   pause.

## The owner's own template (done 2026-11-03)

Until 2026-11-03 the built-in OT wording followed the owner's reports. Release
`0d70dde` added `apps/iep/src/report/freeze.ts`: at start-up, a browser that
had used the tool before copied every built-in paragraph, label, sample,
title and dropdown list into its own template edits, once. The owner opened
the site in their usual browser while signed in, so the full wording went to
their account. The next release rewrote the built-in template as a generic
sample. Now: new visitors get the generic sample; the owner's wording exists
only in their browser, backup file and account, and "Reset to original" gives
the generic sample.

Second move, same day: the OT template is becoming a pack the writer owns,
like every other discipline, so the built-in OT template can take a different
shape. `apps/iep/src/report/adopt.ts` turns a browser's OT edits into its own
pack once (ids are kept, so filled blanks and ticks carry over); the account
then holds it as kind `pack`. The old `overrides` rows stay in the table
unused.

## Changing the privacy page

Any change here changes what leaves the device, so
`apps/home/privacy/index.html` must say so (rule 2 in CLAUDE.md).
