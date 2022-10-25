import { responses } from "../util/responses";
import Data from "../util/data";
import { withRequestValidation } from "../validation/requestValidation";

async function DeleteDataPoints(request, env) {
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

  // Delete the station data
  const data = new Data(request, env);
  await data.deleteDataPoints(organizationKey, stationKey, {
    dataPointType,
    fromDate,
    toDate,
    species,
    callType,
    band,
    threshold,
  });

  // Respond
  return responses.success(
    `${
      dataPointType || fromDate || toDate ? "Selected" : "All"
    } data points in station '${stationKey}' were deleted.`
  );
}

export default withRequestValidation(
  ["validOrganizationKeyParam", "validStationKeyParam", "isOrganizationOwner"],
  DeleteDataPoints
);
