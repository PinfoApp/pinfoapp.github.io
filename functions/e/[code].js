// Short links: /e/<code>. <code> is 8 characters from the alphabet
// 23456789abcdefghjkmnpqrstuvwxyz (Crockford-style base32, no 0/1/i/l/o to
// avoid visual ambiguity). Resolved to an event uuid via the Supabase RPC
// resolve_event_code, then rendered exactly like /event/<uuid> - see
// functions/_lib/eventPage.js for the shared rendering logic and the
// security notes that apply to this whole family of routes.
//
// A short code is not an invite: resolve_event_code either returns the
// event's uuid or null, and from there this behaves identically to a
// direct /event/<uuid> visit, including the same row-level-security
// behavior for private events (a code for a private event you can't see
// resolves to a uuid whose row still won't come back from the table
// query - the generic card, not an error).

import { supabaseRpc, fetchEventById, renderEventPage } from "../_lib/eventPage.js";

const CODE_RE = /^[23456789abcdefghjkmnpqrstuvwxyz]{8}$/;

export async function onRequest(context) {
  const { request, params, env } = context;

  if (request.method !== "GET" && request.method !== "HEAD") {
    return env.ASSETS.fetch(request);
  }

  let ev = null;
  if (CODE_RE.test(params.code)) {
    const id = await supabaseRpc(env, "resolve_event_code", { _code: params.code });
    if (typeof id === "string" && id) {
      ev = await fetchEventById(env, id);
    }
  }

  return renderEventPage(context, ev);
}
