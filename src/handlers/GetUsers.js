import Data from "../util/data";
import { withRequestValidation } from "../validation/requestValidation";
import { responses } from "../util/responses";

async function GetUsers(request, env) {
  // List all users in the system
  const data = new Data(request, env);
  return responses.success(undefined, {
    data: await data.getUsersArray(),
    notes: ["API keys are not included in this response."],
  });
}

export default withRequestValidation(["isAdmin"], GetUsers);
