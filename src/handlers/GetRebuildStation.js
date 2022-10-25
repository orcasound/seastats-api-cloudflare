import Data from "../util/data";
import { withRequestValidation } from "../validation/requestValidation";
import { responses } from "../util/responses";

async function GetRebuildStation(request, env) {
  const { organizationKey, stationKey } = request.params;

  const data = new Data(request, env);
  return responses.success(undefined, {
    data: await data.rebuildStation(organizationKey, stationKey),
  });
}

export default withRequestValidation(
  ["validOrganizationKeyParam", "validStationKeyParam", "isAdmin"],
  GetRebuildStation
);
