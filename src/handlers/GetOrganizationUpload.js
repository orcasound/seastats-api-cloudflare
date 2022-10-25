import { responses } from "../util/responses";
import Data from "../util/data";
import { withRequestValidation } from "../validation/requestValidation";

async function GetOrganizationUpload(request, env) {
  const { organizationKey, filePath } = request.params;
  const { download } = request.query;

  // Get the upload
  const data = new Data(request, env);
  const object = await data.getUpload(organizationKey, filePath);

  // Prepare the response from R2 object
  if (object === null) {
    return responses.notFound();
  }
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  const cacheMinutes = 60 * 24; // 1 day
  headers.set("Cache-Control", `max-age=${60 * cacheMinutes}`);
  if (download) {
    headers.set("Content-Disposition", `attachment`);
  }
  return new Response(object.body, {
    headers,
  });
}

export default withRequestValidation(
  ["validOrganizationKeyParam", "validFilePathParam"],
  GetOrganizationUpload
);
