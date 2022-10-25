import Data from "../util/data";
import { withRequestValidation } from "../validation/requestValidation";
import { responses } from "../util/responses";

async function GetRebuildOrganization(request, env) {
  const { organizationKey } = request.params;

  const data = new Data(request, env);
  return responses.success(undefined, {
    data: await data.rebuildOrganization(organizationKey),
  });
}

export default withRequestValidation(
  ["validOrganizationKeyParam", "isAdmin"],
  GetRebuildOrganization
);
