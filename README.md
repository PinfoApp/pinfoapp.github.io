# pinfoapp.github.io

Source for [pinfoapp.com](https://pinfoapp.com), Pinfo's marketing website, served via GitHub Pages.

## Structure

- `index.html` — landing page
- `privacy.html` — privacy policy
- `tos.html` — terms of service
- `style.css` — shared styles
- `lib/carousel.js` — testimonial carousel on the landing page
- `lib/qna.js` — FAQ accordion on the landing page
- `assets/` — images, icons, badges
- `CNAME` — custom domain (`pinfoapp.com`)
- `.htaccess` — legacy Apache rewrite rules (not processed by GitHub Pages; harmless if left in place)

## Apple Universal Links

Event links of the form `https://pinfoapp.com/event/<uuid>` are meant to open the Pinfo iOS app directly instead of Safari.

- `.well-known/apple-app-site-association` and `apple-app-site-association` (root copy, for pre-iOS 9.3.2 compatibility) declare the association with app ID `C2M4B3336A.Pinfo.PinfoApp` for the `/event/*` path.
- `.nojekyll` is required so GitHub Pages serves the `.well-known/` directory (Jekyll hides dot-directories by default).
- GitHub Pages serves the AASA file as `application/octet-stream`, not `application/json`. This is expected and does not need to change — iOS 9.3.1+ does not require the `application/json` content type.
- `404.html` acts as the event landing page: GitHub Pages has no server-side rewrites, so a request to `/event/<uuid>` falls through to `404.html`, which reads the event id from the path, fetches the event from Supabase for a rich preview (title/date/cover image), and offers to open the app (`pinfo://event/<uuid>`) or the App Store.

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
