# astrobitplays.me 🎮

Gaming news and reviews for [astrobitplays.me](https://astrobitplays.me).

Live Domain: [https://astrobitplays.me](https://astrobitplays.me)

## Features

- Responsive editorial homepage using the supplied logo and a galaxy-only placeholder derived from its background.
- News and Reviews categories, full-text search, and readable article URLs.
- Google and email-link sign-in, reader accounts and private bookmarks.
- One database-designated owner with a private publishing dashboard.
- Markdown editor and preview, covers, YouTube embeds, scores, featured posts, drafts and unpublishing.
- Recorded article-read totals and last-30-day counts. No simulated analytics.
- Account-scoped draft recovery, Markdown downloads and protection against conflicting edits from another tab.
- Dashboard search, status filters and sorting by title, update time or reads.
- Multiple homepage top stories, pinned placement and section ordering.
- Scheduled publishing, saved revisions with draft restoration, and a reusable media library.
- Review verdicts, platforms, developer, release date, pros and cons.
- Prerendered articles with social cards, sitemap and automatic content refresh.
- Logo favicons and mobile home-screen icons.

## Development

Run `npm ci`, then `npm run dev`. Public Supabase connection defaults are in `src/lib/supabase.ts`; an optional ignored `.env.local` can override `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Never place service-role keys in frontend configuration.

Run `npm run lint`, `npm test` and `npm run build` before deployment. The build reads only published, due content from Supabase; tests use a disposable local database. Use `npm run preview` to check generated HTML.

See [publishing and SEO](docs/SEARCH-AND-SEO.md) and [Supabase setup](docs/SUPABASE-SETUP.md). The editorial migration is `supabase/migrations/202609230001_editorial_upgrade.sql`.
