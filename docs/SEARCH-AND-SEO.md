# Search and indexing

## What the production build creates

- `/sitemap.xml`: homepage, article directory, legal pages, populated categories and published articles. Drafts, future publication dates, saved articles, dashboard and search queries are excluded. Modification dates come from article records, not the build clock.
- `/robots.txt`: permits crawling and points to the sitemap. Private pages use `noindex` after rendering; database authorization still protects private data.
- `/stories/`: a plain HTML directory of published stories, with ordinary crawlable links and no JavaScript dependency.
- `/404.html`: the GitHub Pages error document, marked `noindex`.

The browser sets a unique title, description, canonical URL and Article/NewsArticle JSON-LD for each published article. Canonical URLs retain the existing `/?article=slug` format and omit tracking parameters. Search, saved/account pages and missing articles use `noindex`. Legal pages have canonical URLs in their original HTML.

Article markup uses real publication/update timestamps and AstroBitPlays as the organizational author. Review scores are not presented as aggregated user ratings. No invented content or statistics are added.

## Google Search Console

The owner confirmed the domain is already verified. The deployed sitemap and robots file were checked successfully on 23 September 2026; see [live verification](SEO-VERIFICATION.md). To submit the sitemap:

1. Open the verified `astrobitplays.me` property and its **Sitemaps** page.
2. Submit `https://astrobitplays.me/sitemap.xml` (or `sitemap.xml` if the property UI already supplies the origin).
3. Use **URL inspection → Test live URL** on the homepage and one published article. Check the rendered HTML for the headline, description, canonical URL and article JSON-LD.
4. Request indexing for a representative article. Check the Page indexing report later; a successful sitemap submission does not guarantee indexing or ranking.

Use Google's [Rich Results Test](https://search.google.com/test/rich-results) to inspect a live article's structured data. Eligibility is not a promise that Google will display a rich result.

## Keeping the sitemap current

`npm run build` fetches public article metadata anonymously and generates the sitemap and HTML directory. The existing GitHub Pages workflow runs this command on deployment. Database errors stop the build rather than publish a silently incomplete sitemap.

Publishing, editing and unpublishing in the dashboard change the live database immediately. **The static sitemap and directory refresh on the next deployment.** Run the existing **Deploy AstroBitPlays to GitHub Pages** workflow from GitHub Actions after changing published content if no code deployment is already planned. No scheduled rebuild or database webhook has been configured.

Use `npm run preview -- --host 127.0.0.1 --port 4173` after building to inspect the generated files. They are generated in `dist`, not served by Vite's development server.

## Performance changes

Homepage and category requests omit article bodies. Reading a story fetches its full body; searching still includes full text. Lead/article covers load eagerly with high priority; card images load lazily. Cover dimensions reserve layout space. Loading the homepage uses an empty visual placeholder instead of downloading the 2.25 MB galaxy image before replacing it. The header and favicon use the existing 417 kB JPEG logo instead of the 1.89 MB PNG.

## Current hosting limits

Articles remain client-rendered. Google can process JavaScript, but other crawlers may not; social bots can still see the generic metadata in the original HTML. Per-article HTML and reliable article-specific social cards require prerendering or server rendering, with a publishing-to-build update mechanism. The HTML directory improves discovery but does not replace article prerendering. No ranking or indexing result has been verified in Search Console during implementation.

References: [Google sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), [Article structured data](https://developers.google.com/search/docs/appearance/structured-data/article).
