# The two Tally forms

Build these at tally.so, then paste each form's share URL into the two
constants at the top of `src/components/FloatingLinks.tsx`:

```ts
const FEEDBACK_URL = 'https://tally.so/r/xxxxxx';
const UPDATES_URL  = 'https://tally.so/r/yyyyyy';
```

Both open in a new tab, so no other change is needed. (If you would rather
embed a form inside the app as a popup, tell me first: the site's security
policy blocks embedded frames until `frame-src https://tally.so` is added.)

---

## Form 1 - Give feedback

**Form title**

```
Therapist Scheduler - feedback
```

**Description (the text under the title)**

```
Tell me what is broken, confusing, or missing. I read every response.

Please do not include any student information - no names, no student IDs,
no screenshots containing them. Describe the problem in general terms
instead ("a student with two sessions on Monday").
```

That warning matters. A feedback box is exactly where someone pastes a
screenshot of a real schedule, and you do not want student names sitting in
your form account.

### Questions

| # | Type | Question | Required | Options / notes |
|---|------|----------|----------|-----------------|
| 1 | Multiple choice | What is this about? | Yes | `Something is broken` · `Something is confusing` · `I want a new feature` · `Just saying hello` |
| 2 | Long answer | What would you like? | Yes | Placeholder: `What were you trying to do, and what happened instead?` |
| 3 | Short answer | Where did it happen? | No | Placeholder: `e.g. Auto-Plan, importing a schedule, the Gap Board` |
| 4 | Email | Your email, if you would like a reply | No | Description: `Only used to answer you about this message. Nothing else, ever.` |
| 5 | Multiple choice | Can I email you when this is fixed or added? | No | `Yes please` · `No thanks` |

Keep questions 3 to 5 optional. Every extra required field costs you
responses, and question 2 alone is the useful part.

### Thank-you screen

```
Thank you - this genuinely helps.

If you left an email I will reply when I have something useful to say.
```

---

## Form 2 - Get updates

One question. Resist adding more; every field here costs subscribers.

**Form title**

```
Therapist Scheduler - updates
```

**Description**

```
New features, fixes, and improvements. A short email now and then, never more
than about once a month, and never anything else. Unsubscribe any time by
replying "stop".
```

### Questions

| # | Type | Question | Required | Options / notes |
|---|------|----------|----------|-----------------|
| 1 | Email | Your email | Yes | Description: `Used only to send updates about this app. Not shared, not sold.` |
| 2 | Multiple choice | What is your role? | No | `School OT` · `SLP` · `Physical therapist` · `Special ed teacher` · `Other therapist or specialist` · `Something else` |

Question 2 is optional but worth keeping: knowing whether Reddit sends you
OTs or SLPs tells you which features to build next.

### Thank-you screen

```
You are on the list. You will hear from me when there is something worth
your time.
```

---

## Tally settings worth turning on

- **Email notifications to yourself** so feedback reaches you without
  logging in. Tally: form settings, then notifications.
- **A hidden field named `source`** on both forms. Then link to the form as
  `https://tally.so/r/xxxxxx?source=reddit` from a Reddit post and
  `?source=app` from the buttons in the app, and each response records where
  it came from. Tally: insert a Hidden field block, name it `source`.
- **Partial submissions off**, so half-typed feedback is not stored.

## One thing to keep honest

The privacy page says the app itself collects nothing, which stays true:
these forms are separate pages, opened only if someone chooses to. But once
you are collecting email addresses, the privacy page needs to say so - it
now has a short "If you contact me" section covering exactly this. If you
change what you use the emails for, update that section to match.
