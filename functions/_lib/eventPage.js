// Shared rendering logic for the three Cloudflare Pages Functions that all
// end up showing the same event landing page with server-rendered Open
// Graph / Twitter Card tags:
//   functions/event/[id].js  - direct event links, optionally with ?t=<token>
//   functions/e/[code].js    - short links, resolved via resolve_event_code
//   functions/i/[token].js   - invite links, resolved via get_invite_preview
//
// Why this exists at all: link-preview crawlers (WhatsApp, iMessage,
// Facebook/Slack) don't run JavaScript and require an HTTP 200. The static
// event/index.html sets its og:/twitter: tags client-side after a Supabase
// fetch, so a crawler only ever saw the placeholder - and on GitHub Pages
// the per-event URL fell through to 404.html, served with an HTTP 404 that
// crawlers refuse to build a card for at all. Running this at the edge
// means the tags are already correct in the first response, with a 200
// status, before any browser or bot JS runs.
//
// Security: every helper here only ever talks to Supabase with the same
// publishable (anon) key event/index.html already ships client-side, or
// with the two RPCs the app team exposed specifically for this (also
// anon-callable, SECURITY DEFINER on their side). Never swap in a
// service-role or sb_secret_ key: doing so would make private event or
// invite details fetchable by anyone who guesses an id/code/token, which
// is a privacy breach, not a bug fix. Any failure to resolve (private
// event, deleted event, malformed id, expired/unknown code or token,
// Supabase unreachable) must fall back to the generic static card and
// still return HTTP 200 - never an error page, never partial/leaked data.

export const DEFAULT_SUPABASE_URL = "https://ftmwhexhxdskasskzglp.supabase.co";
// Publishable (client-safe) key - the same one shipped in event/index.html
// and the app; row-level security still applies server-side in Supabase.
export const DEFAULT_SUPABASE_KEY = "sb_publishable_ESy4TzFh9kWTef57Bfoufg_D3ZSvKEv";

const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

// SUPABASE_URL / SUPABASE_KEY can be overridden via Pages environment
// variables (e.g. in .dev.vars for local `wrangler pages dev` testing);
// production uses the defaults above unless the dashboard sets them.
function supabaseConfig(env) {
  return {
    url: (env && env.SUPABASE_URL) || DEFAULT_SUPABASE_URL,
    key: (env && env.SUPABASE_KEY) || DEFAULT_SUPABASE_KEY,
  };
}

export async function fetchEventById(env, id) {
  if (!id || !UUID_RE.test(id)) return null;
  const { url, key } = supabaseConfig(env);
  const reqUrl =
    url +
    "/rest/v1/events?id=eq." +
    encodeURIComponent(id) +
    "&select=title,image_url,cover_url_app,cover_url_original,date_start&limit=1";
  try {
    const res = await fetch(reqUrl, {
      headers: { apikey: key, Authorization: "Bearer " + key },
    });
    if (!res.ok) return null;
    const rows = await res.json();
    return (rows && rows[0]) || null;
  } catch (e) {
    return null;
  }
}

// Calls a Supabase RPC (Postgres function) with a JSON body, e.g.
// supabaseRpc(env, "resolve_event_code", { _code: code }). Returns the
// parsed JSON result, or null on any failure (bad code/token, network
// error, non-2xx response) - callers treat null exactly like "not found".
export async function supabaseRpc(env, name, body) {
  const { url, key } = supabaseConfig(env);
  try {
    const res = await fetch(url + "/rest/v1/rpc/" + name, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: "Bearer " + key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

function fmtDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("en-GB", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (e) {
    return "";
  }
}

class SetContent {
  constructor(content) {
    this.content = content;
  }
  element(el) {
    el.setAttribute("content", this.content);
  }
}

class SetText {
  // Note: the field is NOT called "text" - HTMLRewriter treats an
  // ElementContentHandlers object's own "text" key as a text-node handler
  // slot, and throws if it exists but isn't a function. A same-named
  // instance property here shadows that slot with a string and breaks
  // every handler passed to HTMLRewriter, not just this one.
  constructor(newText) {
    this.newText = newText;
  }
  element(el) {
    el.setInnerContent(this.newText);
  }
}

class SetSmartBanner {
  constructor(appArgumentUrl) {
    this.appArgumentUrl = appArgumentUrl;
  }
  element(el) {
    const base = (el.getAttribute("content") || "app-id=6463236759").split(",")[0];
    el.setAttribute("content", base + ", app-argument=" + this.appArgumentUrl);
  }
}

// Renders the shared event landing page (event/index.html) for the given
// request, with its meta tags rewritten from `ev` (an object with
// title/date_start/image_url, and optionally cover_url_app/
// cover_url_original - or null/undefined if nothing could be resolved, in
// which case the generic placeholder card is shown). `ev` may come either
// from a direct table row (functions/event/[id].js, functions/e/[code].js)
// or from a preview RPC's leaner shape (functions/i/[token].js) - both are
// handled the same way here.
export async function renderEventPage(context, ev) {
  const { request, env, waitUntil } = context;
  const requestUrl = new URL(request.url);

  const cache = caches.default;
  const cacheKey = new Request(requestUrl.toString(), request);
  const cachedResponse = await cache.match(cacheKey);
  if (cachedResponse) return cachedResponse;

  // Fetch our existing static event landing page as the template - this
  // keeps the client-side script (fetch, RSVP-deep-link wiring, invite
  // button handling, etc) completely untouched; we only rewrite the meta
  // tags in the HTML the crawler reads before any JS runs.
  //
  // Deliberately fetch the clean URL ("/event/"), not the literal
  // "/event/index.html" path: Pages' static asset handling redirects
  // .html-suffixed requests to their clean-URL form (a 3xx, whose `.ok` is
  // false), and fetching the literal path here would make that redirect
  // response fall straight into the "asset missing" branch below instead
  // of the actual page content.
  const assetUrl = new URL("/event/", requestUrl.origin);
  const assetResponse = await env.ASSETS.fetch(new Request(assetUrl.toString(), request));
  if (!assetResponse.ok) {
    // Should never happen (the static page always ships in the build), but
    // never surface an error page for a link someone is trying to share.
    return assetResponse;
  }

  const title = ev && ev.title ? ev.title : "An event on Pinfo";
  const cover =
    (ev && (ev.cover_url_app || ev.image_url || ev.cover_url_original)) ||
    "https://pinfoapp.com/assets/pinfo-bb.png";
  const description =
    ev && ev.date_start
      ? "On Pinfo - " + fmtDate(ev.date_start)
      : "Discover events near you on Pinfo.";
  const pageTitle = ev && ev.title ? title + " - Pinfo" : "Pinfo - Event";
  const ogUrl = requestUrl.toString();

  const rewriter = new HTMLRewriter()
    .on("title", new SetText(pageTitle))
    .on("#og-url", new SetContent(ogUrl))
    .on("#og-title", new SetContent(title))
    .on("#og-description", new SetContent(description))
    .on("#og-image", new SetContent(cover))
    .on("#twitter-title", new SetContent(title))
    .on("#twitter-description", new SetContent(description))
    .on("#twitter-image", new SetContent(cover))
    .on("#smart-banner", new SetSmartBanner(ogUrl));

  const transformed = rewriter.transform(assetResponse);

  const response = new Response(transformed.body, {
    status: 200,
    headers: transformed.headers,
  });
  response.headers.set("Content-Type", "text/html; charset=utf-8");
  response.headers.set("Cache-Control", "public, max-age=300");

  waitUntil(cache.put(cacheKey, response.clone()));

  return response;
}
