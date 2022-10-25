import { Toucan } from "toucan-js";
import { responses } from "./util/responses";
import apiRouter from "./util/routes";

/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npx wrangler dev src/index.js` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npx wrangler publish src/index.js --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export default {
  async fetch(request, env, context) {
    const sentry = env.SENTRY_DSN
      ? new Toucan({
          dsn: env.SENTRY_DSN,
          context,
          request,
          environment: env.ENVIRONMENT,
        })
      : null;
    return apiRouter.handle(request, env).catch((error) => {
      if (env.ENVIRONMENT === "dev") {
        // We want the full stack trace in wrangler dev
        throw error;
      } else if (sentry) {
        sentry.captureException(error);
      } else {
        console.error(error);
      }
      // This will return a nice error response to the user, at the cost of an error not appearing in CloudFlare logs.
      return responses.serverError(
        `An error was encountered: ${error.message}`
      );
    });
  },
};
