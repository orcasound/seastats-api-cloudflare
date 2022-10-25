const headers = {
  "Content-type": "application/json",
};

const cacheMinutes = 5;

const defaultNotes = [
  `Data is served from a cache when requested without an API key. If you don't see the latest data when viewing the dashboard, wait 60 seconds and try again. Requests may also be cached by your browser for up to ${cacheMinutes} minutes.`,
];

export const responses = {
  notFound: function (msg = "Not found", { notes = [] } = {}) {
    return new Response(
      JSON.stringify({
        success: false,
        msg,
        errors: [msg],
        notes: [...notes, ...defaultNotes],
        data: {},
      }),
      {
        status: 404,
        headers,
      }
    );
  },
  badRequest: function (
    msg = "Bad request",
    { errors = [], warnings = [], notes = [] } = {}
  ) {
    return new Response(
      JSON.stringify({
        success: false,
        msg,
        errors: errors.length ? errors : [msg],
        warnings,
        notes: [...notes, ...defaultNotes],
        data: {},
      }),
      {
        status: 400,
        headers,
      }
    );
  },
  serverError: function (msg = "Internal server error", { notes = [] } = {}) {
    return new Response(
      JSON.stringify({
        success: false,
        msg,
        errors: [msg],
        notes: [...notes, ...defaultNotes],
        data: {},
      }),
      {
        status: 500,
        headers,
      }
    );
  },
  success: function (
    msg = "Operation was successful",
    { data = {}, warnings = [], notes = [], cacheHit = false } = {}
  ) {
    return new Response(
      JSON.stringify({
        success: true,
        msg,
        warnings,
        notes: [...notes, ...defaultNotes],
        cacheHit,
        data,
      }),
      {
        status: 200,
        headers,
      }
    );
  },
};

export function withPublicAccess(handler) {
  return async function (request, env) {
    const response = await handler(request, env);
    response.headers.set("Access-Control-Allow-Origin", "*");
    // We can't really do this, because if a caching proxy (like Cloudflare) is used, it could break the cache bypass mechanism
    // response.headers.set("Cache-Control", `max-age=${60 * cacheMinutes}`);
    return response;
  };
}
