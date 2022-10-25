import Auth from "../util/auth";
import Data from "../util/data";
import { responses } from "../util/responses";
import { withRequestValidation } from "../validation/requestValidation";

async function GetStation(request, env) {
  const { organizationKey, stationKey } = request.params;

  // Return this station
  const data = new Data(request, env);
  const auth = new Auth(request, env);
  const bypassCache = (await auth.isUser()).valid;
  const result = await data.getStation(organizationKey, stationKey, {
    bypassCache,
  });
  return result
    ? responses.success(undefined, {
        cacheHit: !bypassCache,
        data: result,
      })
    : responses.notFound(
        `Station '${stationKey}' not found under '${organizationKey}'`
      );
}

export default withRequestValidation(
  ["validOrganizationKeyParam", "validStationKeyParam"],
  GetStation
);
