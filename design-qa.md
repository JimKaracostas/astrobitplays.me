# Verification — 22 September 2026

Preserved the existing editorial layout, logo, cyan accents and galaxy fallback. No articles or sample statistics were added. The existing published review was used only for read-only UI checks.

## Browser evidence

- Desktop: 1280px viewport, [homepage screenshot](docs/verified-home-desktop.png).
- Mobile: 390px viewport, [homepage screenshot](docs/verified-home-mobile.png).
- No horizontal page overflow on the homepage or article at the inspected sizes.
- Article cover loaded; Markdown headings, lists and scores rendered. Both YouTube iframe URLs used the recognized privacy-enhanced host. Playback was not tested.
- Mobile navigation opened and reached Guides; the empty category displayed its actual empty state.
- Search found the existing Wolverine review; an unmatched query showed the empty result message.
- Save article opened the sign-in dialog for a signed-out visitor. Signup password validation used the configured eight-character minimum.

## Automated checks

`npm test`: 7 tests passed. Includes actual migration execution in disposable PGlite, owner/reader authorization, bookmarks, storage policies, view deduplication, unpublishing, stale-save protection, backup parsing, image insertion and Markdown safety.

`npm run lint` and `npm run build`: passed. Homepage JavaScript reduced from approximately 618 kB to 462 kB before compression by deferring the Markdown renderer. Editor remains a separate lazy-loaded bundle.

## Remaining verification

The available browser session is signed out. Authenticated dashboard interaction, real upload and publishing have not been browser-tested in this pass. Database policies and editor helpers were tested locally without writing test data to Supabase. Google authentication configuration and email delivery were not changed. These changes have not been deployed.
