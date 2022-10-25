import Auth from "../util/auth";
import { isValid } from "./typeValidation";
import { responses } from "../util/responses";

function getContentTypeError(request, expectedType) {
  const { headers } = request;
  const contentType = headers.get("content-type") || "";

  if (!contentType.includes("json")) {
    return `Content type must be '${expectedType}'`;
  }
}

function getKeyError(request, key, label) {
  if (!request.params[key]) {
    return `${label} key is missing from URI`;
  }
  if (!isValid.key(request.params[key])) {
    return `${label} key must contain only lowercase letters, numbers, and hyphens.`;
  }
}

export function withRequestValidation(validatorsToRun, handler) {
  return async (request, env) => {
    const auth = new Auth(request, env);

    const validators = {
      isJsonBody: () => getContentTypeError(request, "application/json"),
      validOrganizationKeyParam: () =>
        getKeyError(request, "organizationKey", "Organization"),
      validStationKeyParam: () => getKeyError(request, "stationKey", "Station"),
      validUserKeyParam: () => getKeyError(request, "userKey", "User"),
      validUploadTypeKeyParam: () =>
        getKeyError(request, "uploadTypeKey", "Upload Type"),
      validFileNameParam: () => {
        const { fileName } = request.params;
        if (!fileName) {
          return `File name is missing from URI`;
        }
        // Check for valid filename characters
        if (!isValid.fileName(fileName)) {
          return `File name must include an extension, and can only contain letters, numbers, underscores, dashes, and periods. Value was '${fileName}'`;
        }
      },
      validFilePathParam: () => {
        const { filePath } = request.params;
        if (!filePath) {
          return `File path is missing from URI`;
        }
        const pathParts = filePath.split("/");
        const fileName = pathParts.pop();
        // Check that directory names are valid
        for (const part of pathParts) {
          if (!isValid.directoryName(part)) {
            return `Directory names must contain only letters, numbers, underscores and dashes. Value was '${part}'`;
          }
        }
        // Check for valid filename characters
        if (!isValid.fileName(fileName)) {
          return `File name must include an extension, and can only contain letters, numbers, underscores, dashes, and periods. Value was '${fileName}'`;
        }
      },
      isAdmin: async () => {
        const result = await auth.isAdmin();
        return result.valid ? null : result.msg;
      },
      isOrganizationOwner: async () => {
        const result = await auth.isOwner(request.params.organizationKey);
        return result.valid ? null : result.msg;
      },
      isUserOrPublic: async () => {
        const { organizationKey } = request.params;
        const result = await auth.isUserOrPublic(organizationKey);
        return result.valid ? null : result.msg;
      },
      dateRangeOptional: () => {
        const { fromDate, toDate } = request.query;
        const msg = (param) =>
          `Optional query parameter '${param}' must be a valid YYYY-MM-DD date string.`;
        if (fromDate && !isValid.dateString(fromDate)) {
          return msg("fromDate");
        }
        if (toDate && !isValid.dateString(toDate)) {
          return msg("toDate");
        }
      },
    };

    for (const validator of validatorsToRun) {
      const error = await validators[validator]();
      if (error) {
        return responses.badRequest(error);
      }
    }

    return handler(request, env);
  };
}
