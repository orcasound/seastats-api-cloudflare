import { Router } from "itty-router";
import { responses, withPublicAccess } from "../util/responses";
import DeleteDataPoints from "../handlers/DeleteDataPoints";
import DeleteOrganization from "../handlers/DeleteOrganization";
import DeleteStation from "../handlers/DeleteStation";
import DeleteUser from "../handlers/DeleteUser";
import GetDataPoints from "../handlers/GetDataPoints";
import GetOrganization from "../handlers/GetOrganization";
import GetOrganizations from "../handlers/GetOrganizations";
import GetStation from "../handlers/GetStation";
import GetStations from "../handlers/GetStations";
import GetSummary from "../handlers/GetSummary";
import GetUsers from "../handlers/GetUsers";
import PutDataPoints from "../handlers/PutDataPoints";
import PutOrganization from "../handlers/PutOrganization";
import PutStation from "../handlers/PutStation";
import PutUser from "../handlers/PutUser";
import PutStationUpload from "../handlers/PutStationUpload";
import PutOrganizationUpload from "../handlers/PutOrganizationUpload";
import GetStationUpload from "../handlers/GetStationUpload";
import DeleteStationUpload from "../handlers/DeleteStationUpload";
import GetStationUploads from "../handlers/GetStationUploads";
import GetRebuildOrganization from "../handlers/GetRebuildOrganization";
import GetRebuildStation from "../handlers/GetRebuildStation";
import GetFrontEnd from "../handlers/GetFrontEnd";
import GetOrganizationUpload from "../handlers/GetOrganizationUpload";
import GetOrganizationUploads from "../handlers/GetOrganizationUploads";
import DeleteOrganizationUpload from "../handlers/DeleteOrganizationUpload";
import { apiPath } from "./helpers";
import GetRebuildAll from "../handlers/GetRebuildAll";

const apiRouter = Router();

async function handleOptions(request) {
  if (
    request.headers.get("Origin") !== null &&
    request.headers.get("Access-Control-Request-Method") !== null &&
    request.headers.get("Access-Control-Request-Headers") !== null
  ) {
    // Handle CORS preflight requests.
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
        "Access-Control-Max-Age": "86400",
        "Access-Control-Allow-Headers": request.headers.get(
          "Access-Control-Request-Headers"
        ),
      },
    });
  } else {
    // Handle standard OPTIONS request.
    return new Response(null, {
      headers: {
        Allow: "GET, HEAD, POST, OPTIONS",
      },
    });
  }
}

apiRouter
  .options("*", handleOptions)
  .put(`/${apiPath}/organization/:organizationKey`, PutOrganization)
  .delete(`/${apiPath}/organization/:organizationKey`, DeleteOrganization)
  .get(
    `/${apiPath}/organization/:organizationKey`,
    withPublicAccess(GetOrganization)
  )
  .get(`/${apiPath}/organizations`, withPublicAccess(GetOrganizations))
  .put(`/${apiPath}/user/:organizationKey/:userKey`, PutUser)
  .delete(`/${apiPath}/user/:organizationKey/:userKey`, DeleteUser)
  .get(`/${apiPath}/users`, GetUsers)
  .put(`/${apiPath}/station/:organizationKey/:stationKey`, PutStation)
  .delete(`/${apiPath}/station/:organizationKey/:stationKey`, DeleteStation)
  .get(
    `/${apiPath}/station/:organizationKey/:stationKey`,
    withPublicAccess(GetStation)
  )
  .get(`/${apiPath}/stations`, GetStations)
  .put(
    `/${apiPath}/station-upload/:organizationKey/:stationKey/:uploadTypeKey/:filePath+`,
    PutStationUpload
  )
  .delete(
    `/${apiPath}/station-upload/:organizationKey/:stationKey/:uploadTypeKey/:filePath+`,
    DeleteStationUpload
  )
  .get(
    `/${apiPath}/station-upload/:organizationKey/:stationKey/:uploadTypeKey/:filePath+`,
    withPublicAccess(GetStationUpload)
  )
  .get(
    `/${apiPath}/station-uploads/:organizationKey/:stationKey`,
    withPublicAccess(GetStationUploads)
  )
  .put(
    `/${apiPath}/organization-upload/:organizationKey/:filePath+`,
    PutOrganizationUpload
  )
  .delete(
    `/${apiPath}/organization-upload/:organizationKey/:filePath+`,
    DeleteOrganizationUpload
  )
  .get(
    `/${apiPath}/organization-upload/:organizationKey/:filePath+`,
    withPublicAccess(GetOrganizationUpload)
  )
  .get(
    `/${apiPath}/organization-uploads/:organizationKey/:pathPrefix+`,
    withPublicAccess(GetOrganizationUploads)
  )
  // Combining optional (?) and greedy (+) modifier doesn't seem to be supported by itty-router
  .get(
    `/${apiPath}/organization-uploads/:organizationKey`,
    GetOrganizationUploads
  )
  .put(`/${apiPath}/data/:organizationKey/:stationKey`, PutDataPoints)
  .delete(`/${apiPath}/data/:organizationKey/:stationKey`, DeleteDataPoints)
  .get(
    `/${apiPath}/data/:organizationKey/:stationKey`,
    withPublicAccess(GetDataPoints)
  )
  .get(`/${apiPath}/summary`, withPublicAccess(GetSummary))
  .get(
    `/${apiPath}/rebuild-organization/:organizationKey`,
    GetRebuildOrganization
  )
  .get(
    `/${apiPath}/rebuild-station/:organizationKey/:stationKey`,
    GetRebuildStation
  )
  .get(`/${apiPath}/rebuild-all`, GetRebuildAll)
  .get("/dashboard.js", withPublicAccess(GetFrontEnd))
  .all("*", () => responses.notFound());

export default apiRouter;
