# My Day

Personal CRM for ContactOut accounts and ROE tracking. Each rep signs in with their @contactout.io Google account and gets a private pipeline; teammates pass accounts through shared handoffs.

## How it's built

| Part | What it does |
|---|---|
| `index.html` | The app (built from `src/` by `./build.sh`) |
| `web.js` | Google sign-in, saving to Supabase, live updates, calls to the server routes |
| `api/` | Server routes on Vercel: Gmail and Calendar (read-only), Metabase (fixed queries only), call summaries |
| `supabase/schema.sql` | Database tables and privacy rules |
| `claude.html` | The same app for the Claude artifact version |

Keys never reach the browser. Row level security makes each pipeline visible only to its owner, and a handoff only to its sender and receiver. My Day never drafts or sends email.

## Setup (one time)

### 1. Supabase (database + sign-in)
1. Vercel → this project → **Storage** (or Marketplace) → **Supabase** → Create. This adds `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` to the project.
2. Supabase dashboard → **SQL Editor** → New query → paste `supabase/schema.sql` → **Run**.
3. Supabase → **Authentication → URL Configuration**: set **Site URL** to the app's address (e.g. `https://my-day.vercel.app`) and add the same address under **Redirect URLs**.

### 2. Google (needs a ContactOut Google Workspace admin)
1. [Google Cloud Console](https://console.cloud.google.com) → create a project under the ContactOut organization.
2. **APIs & Services → Library**: enable **Gmail API** and **Google Calendar API**.
3. **OAuth consent screen**: User type **Internal** (no Google review needed). Add scopes `gmail.readonly` and `calendar.readonly`.
4. **Credentials → Create credentials → OAuth client ID** → Web application.
   Authorized redirect URI: `https://<your-project>.supabase.co/auth/v1/callback`
5. Copy the Client ID and Client secret:
   - Supabase → **Authentication → Providers → Google** → turn on, paste both.
   - Vercel → **Settings → Environment Variables** → add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

### 3. Metabase
1. Metabase admin → **Settings → Authentication → API keys** → create a key in a group that can query the ContactOut database.
2. Vercel env vars: `METABASE_URL` = `https://metabase.contactout.net`, `METABASE_API_KEY` = the key. (`METABASE_DB_ID` defaults to 4.)

### 4. Call summaries (optional)
Vercel env var `ANTHROPIC_API_KEY`. Optional `ANTHROPIC_MODEL` (default `claude-haiku-5-5`).

### 5. Redeploy and move your data
1. Vercel → Deployments → Redeploy (env vars apply on the next deploy).
2. In the Claude version: **Settings → Download backup (JSON)**. In the web version: sign in → **Settings → Restore from backup**.

Until step 1 is done the site still works, saving in the browser only, with a banner saying setup isn't finished.

## Changing the app
Edit files in `src/`, run `./build.sh`, commit. Vercel deploys on every push to `main`.
