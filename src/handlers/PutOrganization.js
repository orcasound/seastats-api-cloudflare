import { responses } from "../util/responses";
import Data from "../util/data";
import { withRequestValidation } from "../validation/requestValidation";
import { validateOrganizationInput } from "../validation/inputValidation";

async function PutOrganization(request, env) {
  const organizationKey = request.params.organizationKey;

  // Parse and validate JSON
  const organizationData = await request.json();
  const validationResult = validateOrganizationInput(organizationData);
  if (validationResult.errors.length > 0) {
    return responses.badRequest(
      `Errors were encountered and the request was not processed. See the 'errors' property of this response for details.`,
      validationResult
    );
  }

  // Store the data
  const data = new Data(request, env);
  await data.putOrganization(organizationKey, organizationData);

  return responses.success(
    `Saved organization '${organizationKey}'`,
    validationResult
  );
}

export default withRequestValidation(
  ["isJsonBody", "validOrganizationKeyParam", "isAdmin"],
  PutOrganization
);
