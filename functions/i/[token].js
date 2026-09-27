// Invite links: /i/<token>. New tokens are 10 characters from the alphabet
// 23456789abcdefghjkmnpqrstuvwxyz; older invite links use a 24-character
// URL-safe token (letters, digits, "-", "_") - both are accepted.
// Resolved via the Supabase RPC get_invite_preview, then rendered as the
// same invite page /event/<event_id>?t=<token> already shows - see
// functions/_lib/eventPage.js for the shared rendering logic and the
// security notes that apply to this whole family of routes.
//
// Deliberately does NOT do a second fetchEventById() lookup after
// resolving the token: get_invite_preview is a dedicated RPC that returns
// exactly the fields the page needs (title, date_start, image_url) for
// events an anonymous visitor could not otherwise see via the normal
// row-level-security-gated table query - that is the whole reason it
// exists. A second lookup would silently show nothing for a private event
// invite, defeating the feature.

import { supabaseRpc, renderEventPage } from "../_lib/eventPage.js";

const NEW_TOKEN_RE = /^[23456789abcdefghjkmnpqrstuvwxyz]{10}$/;
const LEGACY_TOKEN_RE = /^[A-Za-z0-9_-]{24}$/;

export async function onRequest(context) {
  const { request, params, env } = context;

  if (request.method !== "GET" && request.method !== "HEAD") {
    return env.ASSETS.fetch(request);
  }

  let ev = null;
  const token = params.token;
  if (NEW_TOKEN_RE.test(token) || LEGACY_TOKEN_RE.test(token)) {
    const preview = await supabaseRpc(env, "get_invite_preview", { _token: token });
    if (preview && preview.event_id) {
      ev = {
        title: preview.title,
        date_start: preview.date_start,
        image_url: preview.image_url,
      };
    }
  }

  return renderEventPage(context, ev);
}
