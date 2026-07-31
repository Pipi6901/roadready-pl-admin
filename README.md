# RoadReady Admin

Content admin for [RoadReady](../roadready) — invite-only, Firestore-backed. Implements
`roadready/docs/00-decisions.md` ADR-003/004/015 (read ADR-015 first — two pieces of this
are built but not deployed yet, blocked on the Firebase Blaze plan).

## Setup

```bash
npm install
```

You need `serviceAccountKey.json` in the repo root (never committed — see `.gitignore`) to
run the scripts in `scripts/`. Get it from Firebase Console → Project settings → Service
accounts → Generate new private key, for the `roadready-80e53` project.

## Running locally

```bash
npm run dev
```

Opens at http://localhost:3000. Sign in with an account that has a role in the `adminUsers`
Firestore collection (see "Inviting people" below).

## Data model

Firestore, matching `roadready/docs/02-architecture.md` §2:

```
countries/{code}
  testsets/draft
    topics/{topicId}
      questions/{questionId}
locales/{code}
adminUsers/{uid}          -- { email, role: 'content_editor' | 'admin' }
```

RoadReady the mobile app is UK-only (ADR-013), so the admin's collection/content screens are
hardcoded to `countries/GB` (`src/lib/content.ts`'s `PRIMARY_COUNTRY_CODE`) rather than
offering a country picker. The Firestore schema itself still supports more countries if that
ever changes.

## Re-seeding from the mobile app's demo bundle

If `roadready/src/data/demo-bundle.ts` changes and you want the admin's Firestore to match:

```bash
cd ../roadready && npx tsx scripts/export-content-json.ts   # writes roadready/content.json
cd ../roadready-admin && node scripts/seed.js                # upserts it into Firestore
```

`seed.js` is `{ merge: true }` — safe to re-run, won't clobber content already edited in the
admin.

## Inviting people (once Cloud Functions are deployed — see ADR-015)

Sign in as an `admin`, go to **Users**, enter an email + role. This calls the `inviteUser`
Cloud Function, which creates the Firebase Auth account and emails a "set your password" link
(Firebase's built-in template — no SendGrid or other email service involved).

**Until Cloud Functions are deployed**, the only way to add someone is the one-off script that
created the first account:

```bash
node scripts/create-first-admin.js someone@example.com "some-temp-password"
```
(despite the name, this works for any account — it just always grants `admin`; edit the
script if you need a `content_editor`.) Tell them the password directly; there's no
`inviteUser` function running yet to email it.

## Publishing (once Cloud Functions are deployed — see ADR-015)

The **Publish** button on the Topics page calls `publishTestSet`, which validates the draft
test-set, reassembles it into the same `content.json` shape
`roadready/src/data/remoteContent.ts` already fetches, and deploys it to the
`roadready-80e53` Hosting site — the mobile app picks it up on next launch, no app rebuild.

**Until Cloud Functions are deployed**, publishing still works the old manual way from the
`roadready` repo:

```bash
npx tsx scripts/export-content-json.ts
firebase deploy --only hosting --project roadready-80e53
```
(run from `roadready/firebase-hosting/`) — this bypasses the admin's Firestore data
entirely and re-exports straight from `demo-bundle.ts`, so it won't reflect anything edited
in the admin UI yet.

## Deploying Cloud Functions (once Blaze is approved)

```bash
firebase deploy --only functions --project roadready-80e53
```

Also needs, one-time:
- `firebase functions:secrets:set FIREBASE_WEB_API_KEY` (value: the `apiKey` in `.env.local`)
  — used by `inviteUser` to send the invite email via the Identity Toolkit REST API.
- The Cloud Functions runtime service account needs the **Firebase Hosting Admin** IAM role
  (Console → IAM) — `publishTestSet` deploys to Hosting via its REST API directly, without
  the `firebase` CLI.

## What's deferred (see ADR-015 for the full reasoning)

- **Media library** — not built. Needs Firebase Storage, which (since Feb 2026) also
  requires Blaze. `Media` is modeled in `src/lib/types.ts` for when this lands.
- **Translation workflow** — the `translations/{locale}` schema slot exists; there's no
  machine-translation/glossary/review pipeline yet (that's a vendor/process decision, not
  just code).
- **Public hosting for this admin app itself** — works locally; a public URL needs either
  Blaze (Firebase Hosting + SSR via Cloud Functions) or a Vercel account (free, no card,
  supports Next.js dynamic routes natively — the more likely pick once decided).
