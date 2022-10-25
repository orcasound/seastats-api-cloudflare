import Auth from "../util/auth";
import Data from "../util/data";
import { responses } from "../util/responses";

async function GetSummary(request, env) {
  // Return a summery of the organizations and stations available
  const data = new Data(request, env);
  const auth = new Auth(request, env);
  const bypassCache = (await auth.isUser()).valid;
  return responses.success(undefined, {
    cacheHit: !bypassCache,
    data: await data.getSummary({
      bypassCache,
    }),
  });
}

export default GetSummary;
