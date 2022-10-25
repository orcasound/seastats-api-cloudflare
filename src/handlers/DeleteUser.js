import { responses } from "../util/responses";
import Data from "../util/data";
import { withRequestValidation } from "../validation/requestValidation";

async function DeleteUser(request, env) {
  const { organizationKey, userKey } = request.params;

  // Delete the user
  const data = new Data(request, env);
  await data.deleteUser(organizationKey, userKey);

  // Respond
  return responses.success(`User '${userKey}' was deleted.`);
}

export default withRequestValidation(
  ["validOrganizationKeyParam", "validUserKeyParam", "isAdmin"],
  DeleteUser
);
