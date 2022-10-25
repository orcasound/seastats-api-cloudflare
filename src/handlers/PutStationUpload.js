import { responses } from "../util/responses";
import Data from "../util/data";
import { withRequestValidation } from "../validation/requestValidation";

async function PutStationUpload(request, env) {
  const { organizationKey, stationKey, uploadTypeKey, filePath } =
    request.params;

  // Store the upload
  const data = new Data(request, env);
  await data.putStationUpload(
    organizationKey,
    stationKey,
    uploadTypeKey,
    filePath,
    request.body
  );

  return responses.success(
    `Saved upload for station '${stationKey}' under '${organizationKey}'`
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
  PutStationUpload
);
