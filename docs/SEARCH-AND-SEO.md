# Publishing, search and SEO

The site publishes News and Reviews only. The homepage displays up to five actual articles, ordered by pinned placement, featured status, position and publication date. No sample stories or placeholder statistics are created.

## Publishing tools

The owner dashboard supports:
- Drafts, immediate publishing and scheduled publication. The editor shows dates in your local time; Supabase stores UTC. Future posts remain hidden from readers until their publication time.
- Revision history and restore-as-draft, with conflict protection. Restoring unpublishes the current version until you publish the restored draft.
- A library of uploaded cover and inline images.
- Review details: game, platforms, developer, release date, verdict, pros and cons.
- Homepage top-story count and section ordering.

Apply both SQL migrations in chronological order on a new Supabase project. The editorial migration was confirmed applied to this project on 23 September 2026.

## Article pages and discovery

Articles use paths such as `/news/article-slug/` and `/reviews/article-slug/`. Existing query-string article links still open and update to the clean URL.

The production build fetches only published, due News and Reviews posts, then prerenders the homepage, category pages and full article bodies. Each article includes its own title, description, canonical URL, social-card metadata and Article or NewsArticle structured data in the original HTML. Review scores are editorial scores, never invented aggregate ratings.

`/sitemap.xml` and `/stories/` contain only public, due articles. Private account pages and search results are excluded from indexing. Unknown paths receive the Pages 404 shell.

## Automatic refresh

The GitHub Pages workflow checks published content every 15 minutes and rebuilds only when content or homepage settings changed. Pushes to main and manual workflow runs always build. This starts after the workflow change reaches the repository's default branch; GitHub Actions must remain enabled.

Readers fetch current content from Supabase when loading the app. Static HTML, social previews and the sitemap update after the next scheduled run and deployment. GitHub can delay scheduled runs. A new clean URL may initially receive the 404 shell until that deployment, and old static HTML can remain until a rebuild after unpublishing. For an urgent removal or immediate static update, run the deploy workflow manually.

The build fails on database errors instead of publishing an incomplete snapshot. Only the public Supabase key is used. No service-role key or GitHub personal token is needed.

## Verification

Run `npm run lint`, `npm test` and `npm run build`. Tests use an isolated PostgreSQL instance; they never insert content into the production database. Preview the generated pages with `npm run preview`; Vite development mode does not serve prerendered HTML.

The domain is already verified in Search Console. Submit `https://astrobitplays.me/sitemap.xml` and inspect a clean article URL after deployment. Indexing and ranking remain Google's decision.

## Icons and assets

The supplied logo is encoded as a 16/32/48-pixel favicon, a 32-pixel PNG, an Apple touch icon and 192/512-pixel home-screen icons. Regenerate them on Windows with `./scripts/build-icons.ps1`. The web manifest does not install a service worker or cache private account content.

## Google sign-in

Supabase's Google provider must contain the Web application OAuth client ID ending in `.apps.googleusercontent.com` and its matching secret. A domain name is not a client ID. Keep the secret in Supabase, never the frontend or repository.

The Google client's authorized redirect URI is:
`https://yodtnppcsmyeymbnmvsu.supabase.co/auth/v1/callback`

Google Cloud branding verification is separate from configuring this client. Start a new sign-in after changing the configuration.

References: [Supabase Google authentication](https://supabase.com/docs/guides/auth/social-login/auth-google), [Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), [GitHub scheduled workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).
