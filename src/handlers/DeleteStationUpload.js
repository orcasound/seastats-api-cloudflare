import { responses } from "../util/responses";
import Data from "../util/data";
import { withRequestValidation } from "../validation/requestValidation";

async function DeleteStationUpload(request, env) {
  const { organizationKey, stationKey, uploadTypeKey, filePath } =
    request.params;

  // Delete the upload
  const data = new Data(request, env);
  await data.deleteUpload(
    organizationKey,
    `${stationKey}/${uploadTypeKey}/${filePath}`
  );

  return responses.success(
    `Deleted upload for station '${stationKey}' under '${organizationKey}'`
  );
}

export default withRequestValidation(
  [
    "validOrganizationKeyParam",
    "validStationKeyParam",
    "validUploadTypeKeyParam",
    "validFilePathParam",
    "isOrganizationOwner",
  ],
  DeleteStationUpload
);
