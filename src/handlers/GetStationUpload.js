import { withRequestValidation } from "../validation/requestValidation";
import GetOrganizationUpload from "./GetOrganizationUpload";

async function GetStationUpload(request, env) {
  const { stationKey, uploadTypeKey, filePath } = request.params;

  request.params.filePath = `${stationKey}/${uploadTypeKey}/${filePath}`;
  return GetOrganizationUpload(request, env);
}

export default withRequestValidation(
  ["validStationKeyParam", "validUploadTypeKeyParam", "validFilePathParam"],
  GetStationUpload
);
