import { responses } from "../util/responses";
import Data from "../util/data";
import { withRequestValidation } from "../validation/requestValidation";

async function DeleteOrganization(request, env) {
  const organizationKey = request.params.organizationKey;

  // Delete all stations owned by this org
  const data = new Data(request, env);
  const result = await data.deleteOrganization(organizationKey);

  return responses.success(
    `All data associated with ${organizationKey} was deleted`,
    {
      data: result,
    }
  );
}

export default withRequestValidation(
  ["validOrganizationKeyParam", "isAdmin"],
  DeleteOrganization
);
