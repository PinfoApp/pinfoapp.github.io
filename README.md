# pinfoapp.github.io

Source for [pinfoapp.com](https://pinfoapp.com), Pinfo's marketing website, served via GitHub Pages.

## Structure

- `index.html` — landing page
- `privacy/index.html` — privacy policy, served at `/privacy`
- `tos/index.html` — terms of service, served at `/tos`
- `site-notice/index.html` — German Impressum (site notice), served at `/site-notice`
- `event/index.html` — generic event landing page, served at `/event`
- `404.html` — catch-all fallback that also handles per-event links (`/event/<uuid>`), since GitHub Pages has no server-side rewrites
- `style.css` — shared styles
- `lib/carousel.js` — testimonial carousel on the landing page
- `lib/qna.js` — FAQ accordion on the landing page
- `assets/` — images, icons, badges
- `CNAME` — custom domain (`pinfoapp.com`)
- `robots.txt` — allows all crawlers, points at `sitemap.xml`
- `sitemap.xml` — lists the site's static pages

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
- GitHub Pages serves the AASA file as `application/octet-stream`, not `application/json`. This is expected and does not need to change — iOS 9.3.1+ does not require the `application/json` content type.
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
