import { responses } from "../util/responses";
import Data from "../util/data";
import { withRequestValidation } from "../validation/requestValidation";
import Auth from "../util/auth";

async function GetOrganization(request, env) {
  const { organizationKey } = request.params;

  // Return the organization data
  const data = new Data(request, env);
  const auth = new Auth(request, env);
  const bypassCache = (await auth.isUser()).valid;
  const result = await data.getOrganization(organizationKey, { bypassCache });
  return result
    ? responses.success(undefined, {
        cacheHit: !bypassCache,
        data: result,
      })
    : responses.notFound(`Organization '${organizationKey}' not found`);
}

export default withRequestValidation(
  ["validOrganizationKeyParam"],
  GetOrganization
);
