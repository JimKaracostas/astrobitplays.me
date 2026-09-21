# astrobitplays.me 🎮

Gaming news, reviews, guides and videos for [astrobitplays.me](https://astrobitplays.me). React, TypeScript, Vite and Supabase. The site starts without sample articles or invented statistics.

Live Domain: [https://astrobitplays.me](https://astrobitplays.me)  
Repository: [https://github.com/JimKaracostas/astrobitplays.me](https://github.com/JimKaracostas/astrobitplays.me)

## Run

```sh
npm ci
npm run dev -- --host 127.0.0.1 --port 5173
```

Copy `.env.example` to `.env.local` and set the Supabase URL and public publishable key. The local environment is gitignored. See [Supabase setup](docs/SUPABASE-SETUP.md) for authentication, owner assignment and deployment configuration.

## Features

- Responsive editorial homepage using the supplied logo and a galaxy-only placeholder derived from its background.
- News, Reviews, Guides and Videos categories; full-text client search; article pages.
- Google and email-link sign-in, reader accounts and private bookmarks.
- One database-designated owner with a private publishing dashboard.
- Markdown editor and preview, covers, YouTube embeds, scores, featured posts, drafts and unpublishing.
- Recorded article-read totals and last-30-day counts. No simulated analytics.

## Checks

```sh
npm test
npm run lint
npm run build
```

Permission tests run in disposable in-memory PostgreSQL and never add test data to the real project. Node 22.18+ is recommended. The database migration must be applied separately in Supabase. Google OAuth and the first owner assignment require project-owner setup.

## Deployment

The existing GitHub Pages workflow deploys pushes to `main`. Set repository Actions variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` before deploying. The custom domain is preserved in `CNAME` and `public/CNAME`. Article links use query parameters so they can be opened directly on static hosting.

Articles are client rendered. Server-rendered article metadata and unique social preview images are not implemented. Read counts are deduplicated per browser session/day, not verified unique visitors. See the setup guide for these limits and email-delivery requirements.

## Assets

- `public/logo.png`: user's supplied original.
- `public/galaxy-placeholder.png`: generated from the logo background. Prompt: remove AB lettering, orbit and central emblem; fill naturally with the existing restrained black/navy galaxy and blue stars, with no text, planets or neon.

No deployment is performed automatically by local development commands.
