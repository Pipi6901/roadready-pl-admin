# RoadReady Admin (PL)

Content admin for [RoadReady PL](../roadready-pl) — invite-only, Firestore-backed. Implements
`roadready/docs/00-decisions.md` ADR-003/004/015. Live at **https://roadready-pl-admin.web.app**
on Firebase project `roadready-pl` (Blaze). Cloud Functions and this Hosting site are deployed;
the mobile app reads the published bank from https://roadready-pl.web.app/content.json.

First admin: `node scripts/invite-first-admin.js <email>` prints a set-your-password link —
no password ever passes through chat or email. Needs Authentication (Email/Password) enabled
in the Firebase console first.

## Setup

```bash
npm install
```

You need `serviceAccountKey.json` in the repo root (never committed — see `.gitignore`) to
run the scripts in `scripts/`. Get it from Firebase Console → Project settings → Service
accounts → Generate new private key, for the `roadready-pl` project.

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

## Seeding the official catalogue

The bank is the Ministry of Infrastructure's published catalogue (3,518 questions), turned
into `content.json` by the mobile repo and loaded into Firestore here:

```bash
cd ../roadready-pl && python scripts/import_katalog.py "path/to/KATALOG_dla_kandydatów_na_kierowców_MMYYYY.xlsx"
cd ../roadready-admin-pl && node scripts/seed.js            # default: ../roadready-pl/content/katalog/content.json
```

`seed.js` upserts questions with `{ merge: true }`, deletes questions the file no longer has,
rewrites the per-topic translation documents whole, and leaves a question's `mediaId` alone
unless the file names one — so re-running after a catalogue update keeps attached media.
Pass another `content.json` path as the first argument to seed something else (e.g. the
110-question demo bank from `npx tsx scripts/export-content-json.ts`).

## Importing the catalogue's media

Pictures and clips come as a separate archive on the same gov.pl page. Unpack it anywhere
and run:

```bash
node scripts/import-media.js "D:/path/to/unpacked" --dry-run   # report what matches
node scripts/import-media.js "D:/path/to/unpacked"             # upload + attach
```

The script matches files to questions by the catalogue's file name (`sourceMedia`), uploads
each needed file once to `media/{mediaId}/{filename}`, writes the `media/{mediaId}` document
(licence `gov-pl`) and sets `mediaId` on every question that names the file. Clips are WMV
and need `ffmpeg` on PATH (or `FFMPEG=…`) to be transcoded to MP4; without it they are
skipped and counted, and the run can simply be repeated later — everything is idempotent.
`--limit N` and `--only jpg|wmv` narrow a run. Publish afterwards.

## Inviting people

Sign in as an `admin`, go to **Users**, enter an email + role. This calls the `inviteUser`
Cloud Function, which creates the Firebase Auth account and emails a "set your password" link
(Firebase's built-in template — no SendGrid or other email service involved). Note: the
default Firebase template names the sender/subject after the project ID
(`roadready-pl`) and can land in spam on first send — customize it in Firebase Console →
Authentication → Templates if that matters, and tell the first invitee to check spam.

## Media library

**Media** in the nav: upload images/video (50 MB cap, `image/*` or `video/*`), tag with a
licence (`gov-pl` for the ministry's files, `own`, or the British `DVSA` / `OGL-v3`), pick from the library on a question's edit form. Delete
is blocked (both in the UI and in `firestore.rules`) while a question still references the
file — detach it from every question first.

## Publishing

The **Publish** button on the Topics page (admin role only) calls `publishTestSet`, which
validates the draft test-set, reassembles it into the same `content.json` shape
`roadready/src/data/remoteContent.ts` already fetches, and deploys it to the
`roadready-pl` Hosting site — the mobile app picks it up on next launch, no app rebuild.

## Deploying changes

```bash
firebase deploy --only firestore:rules,storage,functions,hosting --project roadready-pl
```

One-time setup this needed (done for `roadready-pl` except where noted, listed for reference / a
future project):
- Firebase Storage "Get Started" clicked once in Console → Storage (separate from the Blaze
  upgrade itself — a manual bucket-provisioning step every project needs regardless of plan).
- `functions/.env` with `WEB_API_KEY` (the same `apiKey` as `.env.local`'s
  `NEXT_PUBLIC_FIREBASE_API_KEY`) — used by `inviteUser` to send the invite email via the
  Identity Toolkit REST API. (Named `WEB_API_KEY`, not `FIREBASE_WEB_API_KEY` — Cloud
  Functions reserves the `FIREBASE_` env var prefix.)
- No IAM step here, unlike the British project: `functions/index.js` runs both functions as
  the Firebase Admin SDK service account (`setGlobalOptions({ serviceAccount })`), which
  already has Hosting deploy rights — `publishTestSet` deploys to Hosting via its REST API
  directly, without the `firebase` CLI. Deploying needs a project owner's CLI login (actAs).
- `firebase hosting:sites:create roadready-admin` + `firebase experiments:enable
  webframeworks` — this app's own Hosting site, deployed via Firebase's Next.js SSR
  integration (a `ssrroadreadyadmin` Cloud Function, separate from `inviteUser`/`publishTestSet`).

## What's deferred (see ADR-015 for the full reasoning)

- **Translation workflow** — the `translations/{locale}` schema slot exists; there's no
  machine-translation/glossary/review pipeline yet (that's a vendor/process decision, not
  just code).
- **Multiple countries in the admin UI** — only `countries/GB` ships, matching ADR-013
  (RoadReady the mobile app is UK-only per build). The Firestore schema still supports more
  countries if that changes.
