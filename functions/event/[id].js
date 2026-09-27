// Direct event links: /event/<uuid>, optionally with ?t=<token> (magic
// invite links). See functions/_lib/eventPage.js for the shared rendering
// logic and the security notes that apply to this whole family of routes.

import { fetchEventById, renderEventPage } from "../_lib/eventPage.js";

export async function onRequest(context) {
  const { request, params, env } = context;

  // Anything other than GET/HEAD (crawlers and browsers only ever use
  // these) is passed straight through to static asset handling untouched.
  if (request.method !== "GET" && request.method !== "HEAD") {
    return env.ASSETS.fetch(request);
  }

  const ev = await fetchEventById(env, params.id);
  return renderEventPage(context, ev);
}
