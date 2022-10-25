import { responses } from "../util/responses";
import Data from "../util/data";
import { withRequestValidation } from "../validation/requestValidation";

async function DeleteStation(request, env) {
  const { organizationKey, stationKey } = request.params;

  // Delete the station data
  const data = new Data(request, env);
  await data.deleteStation(organizationKey, stationKey);

  // Respond
  return responses.success(`Station '${stationKey}' was deleted.`);
}

export default withRequestValidation(
  ["validOrganizationKeyParam", "validStationKeyParam", "isOrganizationOwner"],
  DeleteStation
);
