import { responses } from "../util/responses";
import Data from "../util/data";
import { validateStationInput } from "../validation/inputValidation";
import { withRequestValidation } from "../validation/requestValidation";

async function PutStation(request, env) {
  const { organizationKey, stationKey } = request.params;

  // Parse and validate JSON
  const stationData = await request.json();
  const validationResult = validateStationInput(stationData);
  if (validationResult.errors.length > 0) {
    return responses.badRequest(
      `Errors were encountered and the request was not processed. See the 'errors' property of this response for details.`,
      validationResult
    );
  }

  // Store the data
  const data = new Data(request, env);
  await data.putStation(organizationKey, stationKey, stationData);

  return responses.success(
    `Saved station '${stationKey}' under '${organizationKey}'`,
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
  PutStation
);
