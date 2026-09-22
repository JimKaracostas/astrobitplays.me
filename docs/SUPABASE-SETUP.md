# AstroBitPlays Supabase setup

Project: `yodtnppcsmyeymbnmvsu` · Site: https://astrobitplays.me

## Database

Run `supabase/migrations/202609210001_publication.sql` once in the project's SQL Editor. It creates posts, bookmarks, a covers bucket, a private owner record and article-view statistics. It inserts no articles, accounts or statistics. The user confirmed this migration has been applied.

## Authentication

In Authentication → URL Configuration:

- Site URL: `https://astrobitplays.me`
- Redirect URLs: `https://astrobitplays.me/**` and `http://127.0.0.1:5173/**`
- If using localhost instead, also add `http://localhost:5173/**`.

Email signup must be enabled for reader accounts. Email links use Supabase's default magic-link template. Production delivery to arbitrary readers requires a custom SMTP provider; the default email service restricts recipients and rates. Google sign-in is independent of email delivery.

For Google, enable the provider in Supabase and configure a Web application OAuth client in Google Cloud. Use the actual Client ID ending in `.apps.googleusercontent.com`, not the site name, and keep the Client secret in Supabase only. Authorized redirect URI in Google Cloud:

`https://yodtnppcsmyeymbnmvsu.supabase.co/auth/v1/callback`

Authorized JavaScript origins: `https://astrobitplays.me` and `http://127.0.0.1:5173`. Configure Google's audience/consent settings for your readers. Google's callback is different from the site redirect URLs above.

## Owner account

1. Open the site and choose Sign in → Continue with Google (or create an email account).
2. In Supabase Authentication → Users, find your account and copy its UUID.
3. Replace the placeholder in `supabase/assign-owner.sql` and run it in the SQL Editor.
4. Reload the site. Your header gains a Dashboard link. You can also open `/?page=studio`.

Owner authority comes from a private database row, not an email comparison, browser setting, user metadata, or a first-user rule. There can be only one owner row and no client can modify it. A registered reader cannot access drafts, write posts, upload covers or read analytics even with direct API calls.

## Local and deployed configuration

The local `.env.local` contains the project URL and public publishable key provided by the user; it is gitignored. Never put a secret/service-role key in a VITE variable.

Set these GitHub repository Actions variables before deployment:

- `VITE_SUPABASE_URL`: `https://yodtnppcsmyeymbnmvsu.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY`: the project's public publishable key

The existing deployment workflow passes those variables to Vite. The client also has this site's public project URL and publishable key as defaults; environment variables override them. Database policies enforce access. No secret/service-role key belongs in the browser bundle.

## Publishing and statistics

The editor supports Markdown, preview, cover and inline image uploads up to 5 MB, categories, review scores, YouTube embeds, drafts, publishing, editing and unpublishing. Covers are public: do not upload confidential images, including for drafts. Unused uploads remain in the bucket for manual cleanup. New posts without an uploaded cover use `public/galaxy-placeholder.png`.

Unsaved edits are backed up in session storage, scoped to the signed-in account and article. The backup survives reloads in that tab; use Save draft to persist it to Supabase. Download draft exports the title, summary and body as Markdown. Ctrl/Cmd+S submits the current editor form; if its status is Published, that saves publicly. Saving an existing article checks its original `updated_at` so another tab's newer save cannot be overwritten silently. If a conflict occurs, download the draft before discarding it and reopening the latest post.

The dashboard supports title/category search, status filters and sorting by update time, title or recorded reads.

Article reads are recorded events, deduplicated by browser session, article and UTC day. Owner reads are excluded. No IP addresses or emails are stored in view events. Counts are approximate; browser storage blocking can undercount, and a determined caller can manufacture session identifiers. They are not audited unique visitor analytics. Dashboard totals and the last 30 days use these stored events.

This Vite app uses query-string article URLs so direct links work with GitHub Pages. Articles are client rendered; per-article social previews and crawler-friendly server rendering would require a subsequent hosting/rendering change.

## Verification

`npm test` runs the migration in disposable in-memory PostgreSQL with isolated test users. It checks RLS, owner-only publishing, hidden drafts, isolated bookmarks, storage access, deduplicated analytics, unpublishing and conflicting saves. It also checks draft recovery, image insertion, Markdown rendering, recognized video hosts and content validation. It never writes test content to Supabase. `npm run build` checks TypeScript and builds the site; `npm run lint` checks source code.

Official references: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Google sign-in](https://supabase.com/docs/guides/auth/social-login/auth-google), [email authentication](https://supabase.com/docs/guides/auth/auth-email-passwordless), [SMTP](https://supabase.com/docs/guides/auth/auth-smtp).
