# Sirf Bhakti Songs — pipeline

A local web app (runs on your own PC, open in your browser at
`localhost:3000`) that takes a Suno-generated song through thumbnail
generation, review, and scheduled YouTube upload.

**Cost summary**: mostly free — Turso's free tier comfortably covers this
volume, and "✨ Enhance with AI" runs on your existing Claude subscription
(see "AI enhance setup" below) rather than paid API calls. What's left:
Suno itself (which you already have), two truly optional add-ons (Kits.ai,
Beeminder) you don't need to set up now, **and one open item**: when
Thumbnail mode is set to "AI-generated background," thumbnail generation
still calls Replicate (`black-forest-labs/flux-schnell`), which is paid
per call. Resolving that — switch the default mode, or replace it with a
free manual-upload flow — is still an open decision, not yet made.

---

## First-time setup (on your main PC)

1. **Install Node.js** if you don't have it: nodejs.org, get the LTS
   version. This is the only software prerequisite.

2. **Get the project files** — either unzip what I gave you, or (better,
   for the multi-PC reuse you asked about) push it to GitHub first:
   ```bash
   cd sirf-bhakti-pipeline
   git init
   git add .
   git commit -m "Initial pipeline"
   ```
   Then create an empty repo on github.com and run the two commands it
   shows you (`git remote add origin ...` and `git push -u origin main`).

3. **Install and set up in one command:**
   ```bash
   npm install
   npm run setup
   ```
   This creates your `.env` file, sets up the local database (a plain file,
   no server), and prints what to do next.

4. **Fill in `.env`** — open the file it just created. You only need to
   fill in the Google section (see step 5) — everything else can stay
   blank for now.

5. **Google OAuth (the one required account, free):**
   - Go to console.cloud.google.com, create a project
   - Search "YouTube Data API v3" and enable it
   - Go to Credentials → Create OAuth 2.0 Client ID → type "Web application"
   - Add `http://localhost:3000/api/youtube/callback` as an authorized
     redirect URI
   - Copy the Client ID and Client Secret into `.env`

6. **Start the app:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

7. **One-time YouTube authorization** — visit
   `http://localhost:3000/api/youtube/authorize`, approve access on your
   own channel, and it'll show you a refresh token. Copy it into `.env` as
   `YOUTUBE_REFRESH_TOKEN`, then restart `npm run dev`. You won't need to
   do this again.

8. **Add thumbnail backgrounds** — drop a few licensed images into
   `assets/thumbnail-templates/`, named by deity (`ganesh.png`,
   `durga.png`, etc.) plus a `default.png` fallback. This is only used
   when Thumbnail mode is set to "Local licensed template image."

9. **Seed the AI thumbnail prompt templates (one-time):**
   ```bash
   node prisma/seed-thumbnail-layouts.js
   ```
   This backfills three starter templates (Temple Glow, Iconographic
   Minimal, Nature Devotional) as editable rows. Safe to re-run — it skips
   any template name that already exists. Manage these anytime at
   `/settings/thumbnail-templates` (add, edit, deactivate/restore).

You're set up. Skip straight to "Using it" below.

---

## Setting up Turso (do this once, on your main PC, right after step 7 above)

Turso gives you one real, synced database that every PC reads and writes to
— no file-copying, ever. Follow these exactly, in order.

**A. Install the Turso CLI**

*Windows (PowerShell):*
```powershell
powershell -ExecutionPolicy Bypass -c "irm https://get.tur.so/install.ps1 | iex"
```
*Mac/Linux:*
```bash
curl -sSfL https://get.tur.so/install.sh | bash
```
Close and reopen your terminal after this so the `turso` command is
recognized.

**B. Create your free account**
```bash
turso auth signup
```
This opens your browser to sign up via GitHub. Approve it, then come back
to the terminal.

**C. Create your database**
```bash
turso db create sirf-bhakti-db
```
Wait for it to say the database was created.

**D. Get your connection details**
```bash
turso db show sirf-bhakti-db --url
```
Copy the output (starts with `libsql://...`) — this is your
`TURSO_DATABASE_URL`.
```bash
turso db tokens create sirf-bhakti-db
```
Copy this output too — this is your `TURSO_AUTH_TOKEN`.

**E. Paste both into `.env`**
Open `.env` and fill in:
```
TURSO_DATABASE_URL="libsql://the-url-you-copied"
TURSO_AUTH_TOKEN="the-token-you-copied"
```

**F. Push today's database structure to Turso**
You've already run `npm run setup`, which created a migration file on your
local machine. Now apply that same file to Turso — replace
`XXXXXXXXXXXX_init` with the actual folder name inside
`prisma/migrations/` (there's only one folder there right now, so just
copy its exact name):
```bash
turso db shell sirf-bhakti-db < prisma/migrations/XXXXXXXXXXXX_init/migration.sql
```

**G. Restart the app**
```bash
npm run dev
```
That's it — from now on, this PC reads and writes to Turso instead of the
local file. `dev.db` still exists locally but is no longer used once
`TURSO_DATABASE_URL` is set.

**On every other PC**, you do NOT repeat steps B-F — you only do this
once, ever, for your whole system. Just copy the same `TURSO_DATABASE_URL`
and `TURSO_AUTH_TOKEN` into that PC's `.env` file (step E only), same as
you'll do with the Google keys. See "Setting up on a second PC" below.

**If you ever change the database schema later** (add a field, etc.) and
generate a new migration, repeat step F with the new migration folder's
name — that's the one ongoing step Turso needs from you.

---

## Setting up on a second PC

```bash
git clone <your-repo-url>
cd sirf-bhakti-pipeline
npm install
npm run setup
```
Then open `.env` and fill in the exact same values as your main PC:
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN`
- `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`

Run `npm run dev`. You're now looking at the exact same songs, statuses,
and settings as your main PC — no file to copy, nothing to remember before
switching machines.

---

## Applying a schema change (after any future `git pull`)

Whenever a pull includes changes to `prisma/schema.prisma` (like the
ThumbnailLayout table added for the thumbnail template manager), do this
before running the app:

```bash
npx prisma generate
npx prisma migrate dev --name <short_description_of_the_change>
```

If that change also ships a seed script (check the PR/commit notes for
one, e.g. `prisma/seed-thumbnail-layouts.js`), run it once too — seed
scripts are always safe to re-run, they skip anything that already exists.

**If you're on Turso**, also repeat step F from "Setting up Turso" above
with the new migration folder's name, so the synced database picks up the
change — local-only `migrate dev` doesn't touch Turso by itself.

---

## Using it

1. **Settings → Accounts**: add at least one account (e.g. YouTube), then click its Connect button to run the one-time OAuth flow. Repeat for Reddit if you're using it — see "Setting up Reddit" below.
2. Click **"+ New Post"** — pick the account first; the rest of the wizard adapts to that platform (lyrics/style for YouTube, body/subreddit for Reddit).
3. For YouTube: generate the song in Suno, download it, upload it on the post's page, generate a thumbnail, fill metadata, approve, then publish.
4. For Reddit: review the content, approve, then publish — immediately, or pick a future time (see the scheduler note below).

The dashboard's home page (`/dashboard`) shows a weekly progress bar **per account** and every post's status. `/settings` holds Accounts and global preferences (branding, niche, pace). `/settings/thumbnail-templates` manages the reusable AI thumbnail prompt templates picked in step 3.

---

## Setting up Reddit

1. Go to reddit.com/prefs/apps, click "create another app", choose type **"script"**, and set the redirect URI to `http://localhost:3000/api/reddit/callback`.
2. Copy the client ID (under the app name) and secret into `.env`:
   ```
   REDDIT_CLIENT_ID="..."
   REDDIT_CLIENT_SECRET="..."
   REDDIT_REDIRECT_URI="http://localhost:3000/api/reddit/callback"
   ```
3. In Settings, add a Reddit account, then click its Connect button — same one-time flow as YouTube, and it'll tell you which `.env` key to paste the resulting token into.
4. **Important, real limitation**: Reddit's API has no native "publish later" — a post goes live the moment it's submitted. Scheduling a Reddit post for a future time means *this app* holds it and submits it when the time comes, which only happens if something is actually checking. Run this in a second terminal, alongside `npm run dev`:
   ```
   npm run scheduler
   ```
   It checks every 60 seconds for due posts. If your PC is off or this isn't running, scheduled Reddit posts simply won't fire until you start it again — nothing is lost, it just waits.
5. New Reddit API registrations can take **2-4 weeks for approval** per Reddit's current process — worth starting this well before you need it.

---

## AI enhance setup

The "✨ Enhance with AI" buttons run through the Claude Code CLI,
authenticated as your own Claude subscription — not a paid API key. One
time, on your main PC:

1. **Install the CLI:**
   ```bash
   npm install -g @anthropic-ai/claude-code
   ```
2. **Authenticate to your subscription (not an API key):**
   ```bash
   claude setup-token
   ```
   This opens your browser once to confirm your Claude Pro/Max login, then
   prints a long-lived token in the terminal.
3. **Paste that token into `.env`:**
   ```
   CLAUDE_CODE_OAUTH_TOKEN="the-token-you-copied"
   ```
4. **Verify it's actually hitting your subscription, not billing you:**
   ```bash
   claude auth status
   ```
   should report your Pro/Max plan. After your first few real Enhance
   clicks, check console.anthropic.com's usage dashboard shows $0 for
   this activity. Anthropic paused a change that would've moved this to
   paid billing (announced May 2026, paused June 15, 2026) — if they ever
   un-pause it, this is where you'd see it first.

**On your other PCs**: same token works everywhere — you're one person
authenticating from multiple machines you own, same as being logged into
claude.ai on your phone and laptop at once. Paste the same
`CLAUDE_CODE_OAUTH_TOKEN` value into each PC's `.env` (or, since it's just
another line in the file, it's already covered if you're using the
`.env`-symlink-to-a-synced-folder approach for keeping secrets identical
across machines).


- **Kits.ai** (voice polish) — only wire this up if Suno's raw vocals aren't
  good enough on their own.
- **Beeminder** (accountability/commitment device) — only set this up once
  you're comfortable with the manual flow and want pressure to hit a weekly
  target.
- **Replicate / self-hosted song generation** — only relevant if you later
  want to stop using Suno directly. Not needed now.

## Honest limitations
- I haven't run this end-to-end myself in this session — budget some
  debugging time the first time you run it, same as any new codebase.
- The Suno step is still manual clicking (yours or Claude in Chrome's) —
  there's no way around this without an official Suno API, which doesn't
  exist yet.
