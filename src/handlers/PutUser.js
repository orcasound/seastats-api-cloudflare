import { responses } from "../util/responses";
import { generateApiKey } from "../util/helpers";
import Data from "../util/data";
import { withRequestValidation } from "../validation/requestValidation";

async function PutUser(request, env) {
  const { organizationKey, userKey } = request.params;
  // Create or update the user with a new API key
  const data = new Data(request, env);
  const newApiKey = generateApiKey();
  await data.putUser(organizationKey, userKey, newApiKey);

  // Return the API key in the response
  return responses.success(`Created or updated user ${userKey}`, {
    data: {
      apiKey: newApiKey,
    },
  });
}

export default withRequestValidation(
  ["validOrganizationKeyParam", "validUserKeyParam", "isAdmin"],
  PutUser
);
