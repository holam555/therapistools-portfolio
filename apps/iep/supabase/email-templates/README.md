# Sign-in email templates

Pasted by hand into the Supabase dashboard, Authentication > Email
Templates (docs/ACCOUNTS.md step 4). Editing them there needs custom SMTP
switched on first. The app signs people in with a code (`verifyOtp`), so
every template that can start a sign-in carries `{{ .Token }}`; the link
(`{{ .ConfirmationURL }}`) is kept for people who prefer it on the same device.

| Dashboard template | File | Subject line |
|---|---|---|
| Magic Link | `magic-link.html` | Your Therapistools sign-in code |
| Confirm signup | `confirm-signup.html` | Your Therapistools sign-in code |
| Change Email Address | `change-email.html` | Confirm your new email for Therapistools |
| Reset Password | `reset-password.html` | Therapistools accounts have no password |
| Password changed (notice) | `password-changed.html` | Your Therapistools password was changed |
| Email address changed (notice) | `email-changed.html` | Your Therapistools email address was changed |
| Sign-in method linked (notice) | `method-linked.html` | A sign-in method was added to your Therapistools account |
| Sign-in method removed (notice) | `method-removed.html` | A sign-in method was removed from your Therapistools account |

The app has no passwords, so the two password templates only ever answer
a request made outside the app; they say so. The notices (Authentication >
Emails > security notifications) are off by default: turn on email changed,
method linked and method removed; the password and verification-method
ones can stay off.

Supabase fills `{{ .Token }}`, `{{ .ConfirmationURL }}`, `{{ .Email }}`,
`{{ .NewEmail }}`, `{{ .OldEmail }}`, `{{ .Provider }}` and `{{ .SiteURL }}`. Plain HTML with inline styles, no
images and no scripts: mail clients strip both. Fictional content only; no
personal details of the author (CLAUDE.md rules 3 and 4).
