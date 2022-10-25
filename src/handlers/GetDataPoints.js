import Auth from "../util/auth";
import Data from "../util/data";
import { responses } from "../util/responses";
import { withRequestValidation } from "../validation/requestValidation";

async function GetDataPoints(request, env) {
  const { organizationKey, stationKey } = request.params;
  const {
    dataPointType,
    fromDate,
    toDate,
    species,
    callType,
    band,
    threshold,
  } = request.query;

  // Return data for this station (even if there are no data points)
  const data = new Data(request, env);
  const auth = new Auth(request, env);
  const bypassCache = (await auth.isUser()).valid;
  return responses.success(undefined, {
    cacheHit: !bypassCache,
    data: await data.getDataPoints(organizationKey, stationKey, {
      bypassCache,
      dataPointType,
      fromDate,
      toDate,
      species,
      callType,
      band,
      threshold,
    }),
  });
}

export default withRequestValidation(
  [
    "validOrganizationKeyParam",
    "validStationKeyParam",
    "dateRangeOptional",
    "isUserOrPublic",
  ],
  GetDataPoints
);
