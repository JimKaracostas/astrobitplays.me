# Cover delivery and reading lists

Reviewed October 2, 2026 against the live site and the production build at `http://127.0.0.1:4173/`.

## Journey and health

1. **Open a story — improved.** The current cover was a 3,339 × 1,878 JPEG weighing 1,236,328 bytes. The build now produces proportional WebP candidates and the browser chooses a size for the screen. The existing layout and editorial images are preserved.
2. **Save for later — improved.** Previously, Save article opened a sign-in dialog. Readers can now save on their device immediately; sign-in and importing those saves into an account are explicit choices.
3. **Manage the reading list — improved.** Saved articles survive reloads, can be removed from the list, and offer Undo. Category filters, counts, sorting, and a clear filtered empty state work on desktop and phones. Failed account loading offers Retry.
4. **Watch a video — improved.** Video cards no longer create YouTube frames or request poster images on page load. A descriptive Play button loads one player after the reader asks, transfers keyboard focus into it, and offers a Close control that unloads the player and returns focus. A direct YouTube link remains available at every stage.

## Evidence

| Cover candidate | Bytes | Reduction from original |
| --- | ---: | ---: |
| 320 px | 10,720 | 99.1% |
| 640 px | 29,562 | 97.6% |
| 960 px | 56,220 | 95.5% |
| 1,280 px | 88,110 | 92.9% |
| 1,920 px | 174,102 | 85.9% |

These are file-size reductions for the current cover, not measured changes in loading time or Core Web Vitals. Browser inspection confirmed local generated candidates: 1,280 px for the desktop article, 640 px for a 390 px reading-list view, and 320 px for the homepage at 320 px. No horizontal overflow was observed at either phone width; no application warning or error was captured during the local flow.

![Before: saving required sign-in](04-reading-list-before.png)

![After: reading list on this device](04-reading-list-after.png)

![After: reading list on a phone](04-reading-list-mobile-after.png)

![After: responsive homepage cover at 320 px](05-responsive-covers-mobile-after.png)

![Before: YouTube player loaded automatically](06-video-before.png)

![After: video loads only on request](06-video-desktop-after.png)

![After: video card on a narrow phone](06-video-mobile-after.png)

## Verification and limits

- All 29 tests, lint, and the full production build pass. Tests cover malformed storage, persistence failure, duplicate saves, import eligibility, account isolation, responsive rendering, image host restrictions, proportional conversion, and small images that must not be enlarged.
- Browser checks covered guest save, reload, remove, Undo, category filtering, optional sign-in, and 390 px / 320 px layouts. Account import was checked through helper and database policy tests; it was not exercised against a live signed-in account.
- Video cards were checked before activation, after keyboard activation, and after Close. Before activation there were zero YouTube frames and zero YouTube thumbnail images. Enter loaded one player and focused the frame; Close removed it and returned focus. At 390 px the stage measures 339 × 191 px, at 320 px it measures 269 × 151 px; neither page scrolls horizontally. These DOM checks verify requests initiated by embed elements, not every browser background request.
- Covers are processed only from the configured public Supabase cover bucket and the current external provider. Downloads have redirect, time, byte, MIME, and decoded-pixel limits. Unsupported or failed conversions retain the original image with a placeholder fallback.
- Device storage can be blocked or cleared by the reader's browser. The UI reports when a save only lasts for the current visit. Account import preserves device saves on failure and ignores existing account duplicates.
- The earlier owner-only post-deletion database migration still needs to be applied to the live Supabase project; this pass does not apply it.

Next candidates: an accessible consent-based video preview to reduce article loading work, and related-story recommendations once there is enough published material to make them useful.
