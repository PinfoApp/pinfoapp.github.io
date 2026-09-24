# pinfoapp.github.io

Source for [pinfoapp.com](https://pinfoapp.com), Pinfo's marketing website, served via GitHub Pages.

## Structure

- `index.html` — landing page
- `privacy/index.html` — privacy policy, served at `/privacy`
- `tos/index.html` — terms of service, served at `/tos`
- `site-notice/index.html` — German Impressum (site notice), served at `/site-notice`
- `event/index.html` — event landing page, served at `/event`
- `404.html` — catch-all fallback that also handles per-event links
  (`/event/<uuid>`) on GitHub Pages, since GitHub Pages has no server-side
  rewrites. **Kept byte-identical to `event/index.html` on purpose** — see
  "Two hosting setups" below. If you edit one, copy it over the other:
  `cp event/index.html 404.html`.
- `functions/event/[id].js` — Cloudflare Pages Function that does the same
  job as `404.html`/`event/index.html` server-side (see below). Only takes
  effect once this repo is actually deployed on Cloudflare Pages.
- `_headers`, `_routes.json` — Cloudflare Pages config (ignored by GitHub
  Pages). See "Two hosting setups".
- `style.css` — shared styles
- `lib/carousel.js` — testimonial carousel on the landing page
- `lib/qna.js` — FAQ accordion on the landing page
- `assets/` — images, icons, badges
- `CNAME` — custom domain (`pinfoapp.com`)
- `robots.txt` — allows all crawlers, points at `sitemap.xml`
- `sitemap.xml` — lists the site's static pages

## Two hosting setups (current state)

This repo currently supports **two ways of being hosted**, and only one is
actually live:

1. **GitHub Pages (live now).** DNS points here. No server-side code — everything
   is static. `/event/<uuid>` has no matching file, so it falls through to
   `404.html`, served with an HTTP 404 status. Buttons/tags are filled in by
   client-side JS after a Supabase fetch, so link-preview crawlers (which
   don't run JS and mostly require a 200) never see the real event title,
   image, or the magic-invite buttons — the crawler only sees the generic
   placeholder card. This is a real, known limitation of static hosting, not
   a bug to chase further here.
2. **Cloudflare Pages (code-ready, not deployed).** `functions/event/[id].js`
   server-renders the real `og:`/`twitter:` tags and returns HTTP 200 for
   `/event/<uuid>`, which is what actually makes link previews work in
   WhatsApp/iMessage/Slack. This requires the account owner to (a) create a
   Cloudflare Pages project connected to this GitHub repo, and (b) move
   `pinfoapp.com`'s nameservers to Cloudflare and add it as the project's
   custom domain. Neither step can be done from a coding session — both need
   the Cloudflare dashboard and the domain registrar. Until that happens,
   this repo keeps working exactly as it does today on GitHub Pages; none of
   the Cloudflare-only files (`functions/`, `_headers`, `_routes.json`) do
   anything on GitHub Pages, they're just inert.

**Because of this, `event/index.html` and `404.html` must stay identical.**
`event/index.html` is what Cloudflare's Function fetches as its template and
what serves the exact `/event` URL on GitHub Pages; `404.html` is what
actually serves `/event/<uuid>` on GitHub Pages today. Any change to the
event page's markup or script (new buttons, copy changes, meta tags) needs
to go into both files, or the two hosting setups will silently drift and
whichever one is live at the time won't have the fix. Once the Cloudflare
cutover happens, `404.html`'s only remaining job is the true 404 case
(non-event unmatched paths), and it could reasonably be trimmed back down
at that point.

## Magic invite links

Event links can carry an invite token: `https://pinfoapp.com/event/<event_id>?t=<token>`.
Opening the link never validates or consumes the token on the website - that
happens only inside the app via an authenticated call, so that a chat app's
link-preview bot (which fetches the URL to build its card) can't burn the
invite before the person taps it. `event/index.html`/`404.html`:

- Render the event exactly as any other event link when `?t=` is absent — no
  buttons, unchanged from before this feature.
- When `?t=` is present, show two buttons: "Get Pinfo" (App Store) and
  "I have Pinfo - open my invite" (`pinfo://event/<event_id>?t=<token>`, the
  app's custom scheme — required because a `pinfoapp.com` link tapped from a
  page already on `pinfoapp.com` stays in Safari; Universal Links only fire
  coming from another app).
- Read the token once client-side purely to build that link; it is never
  sent to Supabase or logged anywhere by this site.

## SEO / link previews

- `index.html`'s `<head>` carries a meta description, canonical URL, Open Graph
  and Twitter Card tags, and `SoftwareApplication` JSON-LD, so links shared in
  WhatsApp/iMessage/Slack render a title, description, and image instead of a
  bare URL.
- Do not add `aggregateRating` to the JSON-LD until there is a real App Store
  rating to show — fabricated review markup risks a search-quality penalty.
- Copy for the `<title>`/`<h1>`/meta description should track the App Store
  listing's positioning (discovery/nightlife, not "event planning" — see the
  iOS repo's ASO playbook) so the site and the App Store target the same terms.

## Apple Universal Links

Event links of the form `https://pinfoapp.com/event/<uuid>` are meant to open the Pinfo iOS app directly instead of Safari.

- `.well-known/apple-app-site-association` and `apple-app-site-association` (root copy, for pre-iOS 9.3.2 compatibility) declare the association with app ID `C2M4B3336A.Pinfo.PinfoApp` for the `/event/*` path.
- `.nojekyll` is required so GitHub Pages serves the `.well-known/` directory (Jekyll hides dot-directories by default).
- GitHub Pages serves the AASA file as `application/octet-stream`, not `application/json`. This is expected and does not need to change — iOS 9.3.1+ does not require the `application/json` content type. `_headers` forces `application/json` for both AASA paths on Cloudflare Pages instead, once/if that's live — see "Two hosting setups".
- GitHub Pages has no server-side wildcard routing, so `/event/<uuid>` cannot resolve to a static per-path file. `event/index.html` serves the exact `/event` URL; individual event links (`/event/<uuid>`) fall through to `404.html`, which reads the event id from the path, fetches the event from Supabase for a rich preview (title/date/cover image), and offers to open the app (`pinfo://event/<uuid>`) or the App Store. GitHub Pages returns these with an HTTP 404 status even though the page renders correctly — some link-preview crawlers may reject that status, which is a known limitation of this hosting setup, not a bug in the page itself.

### Verifying the AASA file is live

```
curl -I https://pinfoapp.com/.well-known/apple-app-site-association
```

Should return `200` with a `Content-Type` of `application/octet-stream`.

## GitHub Pages / DNS setup

- Repo Settings → Pages → custom domain: `pinfoapp.com` (apex)
- DNS: four `A` records for `pinfoapp.com` pointing to
  `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
- "Enforce HTTPS" enabled in Pages settings

## Cutting over to Cloudflare Pages (owner-only steps)

The code side of this migration is done and merged (`functions/event/[id].js`,
`_headers`, `_routes.json`). What's left needs the Cloudflare account and the
domain registrar, which no coding session can do:

1. In the Cloudflare dashboard, create a Pages project connected to this
   GitHub repo (`PinfoApp/pinfoapp.github.io`), branch `master`. Build
   command: none (static site). Build output directory: `/` (repo root —
   Cloudflare auto-detects `functions/`).
2. Move `pinfoapp.com`'s nameservers to Cloudflare, then add `pinfoapp.com`
   as the Pages project's custom domain (the Cloudflare dashboard walks
   through both together).
3. Once live, re-verify:
   - `curl -I https://pinfoapp.com/event/<a real public event uuid>` → `200`
     (not `404`), and `curl -s` on the same URL shows the real event title
     and image in the raw `og:` tags.
   - A private/unknown event UUID still returns `200` with the generic card
     and no leaked details.
   - Both AASA paths still return the correct JSON with
     `Content-Type: application/json`.
   - Run the event URL through Facebook's Sharing Debugger, then paste it
     into a real WhatsApp chat (WhatsApp caches previews aggressively — use
     a fresh URL or force a re-scrape, or a stale cached result will look
     like a failure).
   - Homepage and legal pages still render normally.
4. GitHub Pages can stay wired up as a fallback until step 3 passes — DNS is
   the only actual cutover switch.
5. Also worth a one-time manual check that was never independently verified
   from a coding session (no network egress to `apps.apple.com` from any
   sandbox used so far): confirm `https://apps.apple.com/app/id6463236759`
   still resolves to the real Pinfo App Store listing. It's referenced
   throughout this repo (`event/index.html`, `404.html`, `index.html`,
   the Cloudflare Function's fallback card) as the canonical download link.
