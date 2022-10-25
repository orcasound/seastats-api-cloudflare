import { responses } from "../util/responses";
import Data from "../util/data";
import { withRequestValidation } from "../validation/requestValidation";

async function GetStationUploads(request, env) {
  const { organizationKey, stationKey } = request.params;
  // uploadType is preferred, but support uploadTypeKey for legacy API
  const { uploadType, uploadTypeKey } = request.query;

  // Get a list of uploads
  const data = new Data(request, env);
  return responses.success(undefined, {
    data: await data.getUploadsForStation(
      organizationKey,
      stationKey,
      uploadType || uploadTypeKey
    ),
  });
}

export default withRequestValidation(
  ["validOrganizationKeyParam", "validStationKeyParam", "isUserOrPublic"],
  GetStationUploads
);
