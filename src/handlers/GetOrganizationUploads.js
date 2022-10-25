import { responses } from "../util/responses";
import Data from "../util/data";
import { withRequestValidation } from "../validation/requestValidation";

async function GetOrganizationUploads(request, env) {
  const { organizationKey, pathPrefix } = request.params;

  // Get a list of uploads
  const data = new Data(request, env);
  return responses.success(undefined, {
    data: await data.getUploadsForOrg(organizationKey, {
      pathPrefix,
    }),
  });
}

export default withRequestValidation(
  ["validOrganizationKeyParam", "isUserOrPublic"],
  GetOrganizationUploads
);
