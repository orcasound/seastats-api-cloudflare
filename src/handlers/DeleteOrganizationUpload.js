import { responses } from "../util/responses";
import Data from "../util/data";
import { withRequestValidation } from "../validation/requestValidation";

async function DeleteOrganizationUpload(request, env) {
  const { organizationKey, filePath } = request.params;

  // Delete the upload
  const data = new Data(request, env);
  await data.deleteUpload(organizationKey, filePath);

  return responses.success(`Deleted upload for '${organizationKey}'`);
}

export default withRequestValidation(
  ["validOrganizationKeyParam", "validFilePathParam", "isOrganizationOwner"],
  DeleteOrganizationUpload
);
