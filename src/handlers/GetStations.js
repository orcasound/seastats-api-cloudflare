import { responses } from "../util/responses";
import Data from "../util/data";
import Auth from "../util/auth";

async function GetStations(request, env) {
  // Return a list of stations
  const data = new Data(request, env);
  const auth = new Auth(request, env);
  const bypassCache = (await auth.isUser()).valid;
  return responses.success(undefined, {
    cacheHit: !bypassCache,
    data: await data.getStationsArray({ bypassCache }),
  });
}

export default GetStations;
