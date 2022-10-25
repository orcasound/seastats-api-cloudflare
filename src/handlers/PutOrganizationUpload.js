import { responses } from "../util/responses";
import Data from "../util/data";
import { withRequestValidation } from "../validation/requestValidation";

async function PutOrganizationUpload(request, env) {
  const { organizationKey, filePath } = request.params;

  // Store the upload
  const data = new Data(request, env);
  await data.putUpload(organizationKey, filePath, request.body);

  return responses.success(`Saved upload for '${organizationKey}'`);
}

export default withRequestValidation(
  ["validOrganizationKeyParam", "validFilePathParam", "isOrganizationOwner"],
  PutOrganizationUpload
);
