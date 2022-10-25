import { responses } from "../util/responses";
import Data from "../util/data";
import { validateDataPointsInput } from "../validation/inputValidation";
import { withRequestValidation } from "../validation/requestValidation";

async function PutDataPoints(request, env) {
  const { organizationKey, stationKey } = request.params;

  // Parse and validate JSON
  const stationDataPoints = await request.json();
  const validationResult = validateDataPointsInput(stationDataPoints);
  if (validationResult.errors.length > 0) {
    return responses.badRequest(
      `Errors were encountered and the request was not processed. See the 'errors' property of this response for details.`,
      validationResult
    );
  }

  // Store the data
  const data = new Data(request, env);
  await data.putDataPoints(organizationKey, stationKey, stationDataPoints);

  // Return the result with the validation result, as there may be warnings
  return responses.success(
    `Saved data for station '${stationKey}' under '${organizationKey}'`,
    validationResult
  );
}

export default withRequestValidation(
  [
    "isJsonBody",
    "validOrganizationKeyParam",
    "validStationKeyParam",
    "isOrganizationOwner",
  ],
  PutDataPoints
);
