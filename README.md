# astrobitplays.me 🎮

Gaming news and reviews for [astrobitplays.me](https://astrobitplays.me).

Live Domain: [https://astrobitplays.me](https://astrobitplays.me)

## Features

- Responsive editorial homepage using the supplied logo and a galaxy-only placeholder derived from its background.
- News and Reviews categories, full-text search, and readable article URLs.
- Device reading lists without sign-in, remove/undo controls, and optional import into private account bookmarks.
- Google and email-link sign-in and reader accounts.
- Ranked, accent-insensitive search with category filters, sorting and useful empty states. The optional indexed-search migration avoids downloading full article text for search.
- Article section navigation, reading progress, remembered text size and print layouts.
- YouTube players load only on play, with keyboard controls, a close button and direct video links.
- One database-designated owner with a private publishing dashboard.
- Markdown editor and preview, covers, YouTube embeds, scores, featured posts, drafts, unpublishing and owner-only post deletion.
- Recorded article-read totals and last-30-day counts. No simulated analytics.
- Account-scoped draft recovery, Markdown downloads and protection against conflicting edits from another tab.
- Dashboard search, status filters and sorting by title, update time or reads.
- Multiple homepage top stories, pinned placement and section ordering.
- Scheduled publishing, saved revisions with draft restoration, and a reusable media library.
- Review verdicts, platforms, developer, release date, pros and cons.
- Prerendered articles with social cards, sitemap and automatic content refresh.
- RSS feed with the latest 50 published stories, available at `/feed.xml`.
- Logo favicons and mobile home-screen icons.
- Responsive WebP covers sized for cards, phones and high-density screens, with original-image fallbacks.

## Development

Run `npm ci`, then `npm run dev`. Public Supabase connection defaults are in `src/lib/supabase.ts`; an optional ignored `.env.local` can override `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Never place service-role keys in frontend configuration.

Run `npm run lint`, `npm test` and `npm run build` before deployment. The build reads only published, due content from Supabase; tests use a disposable local database. Use `npm run preview` to check generated HTML.

The build prepares cover variants at 320–1920px before bundling. It currently processes public covers from the configured Supabase project and the site's current GameSpot image provider; other hosts continue to use their original image. Downloads, redirects, bytes and decoded pixels are bounded. Failed conversions retain the original-image fallback. Generated media and its manifest are ignored by Git and included in the deployment artifact. Run `npm run build:images` before a local development preview when you want generated covers; the normal production build runs this automatically.

See [publishing and SEO](docs/SEARCH-AND-SEO.md) and [Supabase setup](docs/SUPABASE-SETUP.md). The editorial migration is `supabase/migrations/202609230001_editorial_upgrade.sql`.
