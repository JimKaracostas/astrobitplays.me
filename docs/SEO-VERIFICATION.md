# SEO verification — 23 September 2026

Verified the deployed `https://astrobitplays.me` site after commit `3aab899`.

## Live HTTP checks

- `/sitemap.xml`: HTTP 200, `application/xml`. Contains eight URLs, including both published articles, populated News and Reviews categories, homepage, article directory and legal pages.
- `/robots.txt`: HTTP 200, references `https://astrobitplays.me/sitemap.xml`.
- `/stories/`: HTTP 200, article links exist in the original HTML.
- A deliberately nonexistent path: HTTP 404, original HTML contains `noindex, follow`.

## Live browser checks

- Homepage canonical URL resolves to the production domain and allows indexing.
- Review page has its own title, canonical URL and Article JSON-LD. Full article text loads after the summary-only feed request.
- At a 390px mobile viewport, the page has no horizontal overflow. Header, title, byline, actions and cover remain readable.
- No captured console errors or warnings during these checks.

## Previously completed implementation checks

The production build, lint and all 11 automated tests passed on 22 September. Local production-preview checks covered full-text search after payload reduction, `noindex` on search/dashboard pages, article metadata and the generated directory. No source changes have been made since that tested implementation; this follow-up records live verification.

## Remaining external step

The owner confirmed Search Console ownership. Submit `https://astrobitplays.me/sitemap.xml` in the verified property's Sitemaps screen, then use URL Inspection on a published article. Submission, Google indexing and rich-result eligibility have not been verified from Search Console.

The sitemap and directory refresh on deployments. Dashboard publishing alone does not regenerate them. Articles remain client-rendered; full details are in [Search and SEO](SEARCH-AND-SEO.md).
