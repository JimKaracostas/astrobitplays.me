# astrobitplays.me 🎮

Gaming news, reviews, guides and videos for [astrobitplays.me](https://astrobitplays.me)

Live Domain: [https://astrobitplays.me](https://astrobitplays.me)

## Features

- Responsive editorial homepage using the supplied logo and a galaxy-only placeholder derived from its background.
- News, Reviews, Guides and Videos categories; full-text client search; article pages.
- Google and email-link sign-in, reader accounts and private bookmarks.
- One database-designated owner with a private publishing dashboard.
- Markdown editor and preview, covers, YouTube embeds, scores, featured posts, drafts and unpublishing.
- Recorded article-read totals and last-30-day counts. No simulated analytics.
- Account-scoped draft recovery, Markdown downloads and protection against conflicting edits from another tab.
- Dashboard search, status filters and sorting by title, update time or reads.

## Development

Run `npm install`, then `npm run dev -- --host 127.0.0.1 --port 5173`.
Run `npm test`, `npm run lint` and `npm run build` to verify changes.
Tests use a disposable local database and do not create content in Supabase.

See [Supabase setup](docs/SUPABASE-SETUP.md) for authentication, owner access and deployment configuration.

The production build generates a sitemap, robots file and HTML article directory from published posts. See [Search and SEO](docs/SEARCH-AND-SEO.md) for Search Console submission, sitemap refreshes and hosting limitations.
