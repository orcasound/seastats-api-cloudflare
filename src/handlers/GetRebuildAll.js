import Data from "../util/data";
import { withRequestValidation } from "../validation/requestValidation";
import { responses } from "../util/responses";

async function GetRebuildAll(request, env) {
  const data = new Data(request, env);
  return responses.success(undefined, {
    data: await data.rebuildAll(),
  });
}

export default withRequestValidation(["isAdmin"], GetRebuildAll);
