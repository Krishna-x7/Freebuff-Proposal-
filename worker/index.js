/* Freebuff Sites entrypoint.

   The page is fully prebuilt — one HTML file, one stylesheet, one script, the
   SVG drawings and the two mp3s — so there is nothing to render on the server.
   Every request goes straight to the assets binding, which already answers
   with the right content type, ETag and conditional-request support. */

export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  }
};
