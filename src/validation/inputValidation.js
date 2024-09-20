import { isValid } from "./typeValidation";

function isNotOneOf(value, types) {
  if (types.some((type) => isValid[type](value))) {
    return false;
  }
  return true;
}

function validTypesMessage(types) {
  const typeCount = types.length;
  if (typeCount === 1) {
    return `Must be of type ${types[0]}.`;
  }
  if (typeCount === 2) {
    return `Must be of type ${types[0]} or ${types[1]}.`;
  }
  return `Must be of type: ${types.join(", ")}.`;
}

const dataPointValidators = {
  callRate: [
    {
      field: "species",
      validTypes: ["nonEmptyString"],
    },
    {
      field: "callType",
      validTypes: ["nonEmptyString"],
    },
    {
      field: "date",
      validTypes: ["dateString"],
    },
    {
      field: "value",
      validTypes: ["null", "number"],
    },
  ],
  callEvent: [
    {
      field: "species",
      validTypes: ["nonEmptyString"],
    },
    {
      field: "callType",
      validTypes: ["nonEmptyString"],
    },
    {
      field: "startDateTime",
      validTypes: ["dateTimeString"],
    },
    {
      field: "endDateTime",
      validTypes: ["dateTimeString"],
    },
    {
      field: "callCount",
      validTypes: ["null", "number"],
    },
    {
      field: "audioUrl",
      validTypes: ["null", "emptyString", "urlString"],
      optional: true,
    },
  ],
  recordingCoverage: [
    {
      field: "date",
      validTypes: ["dateString"],
    },
    {
      field: "value",
      validTypes: ["null", "number"],
    },
  ],
  noise: [
    {
      field: "band",
      validTypes: ["nonEmptyString"],
    },
    {
      field: "date",
      validTypes: ["dateString"],
    },
    {
      field: "value",
      validTypes: ["null", "number"],
    },
  ],
  exceedance: [
    {
      field: "band",
      validTypes: ["nonEmptyString"],
    },
    {
      field: "threshold",
      validTypes: ["nonEmptyString"],
    },
    {
      field: "date",
      validTypes: ["dateString"],
    },
    {
      field: "value",
      validTypes: ["null", "number"],
    },
  ],
};

const knownDataPointTypes = Object.keys(dataPointValidators);

function isKnownDataPointType(dataPointType) {
  return knownDataPointTypes.includes(dataPointType);
}

function getError(dataPoint) {
  if (typeof dataPoint !== "object") {
    return {
      message: `Data point is not an object.`,
      type: "error",
    };
  }
  if (dataPoint.dataPointType === undefined) {
    return {
      message: `Property 'dataPointType' is missing.`,
      type: "error",
    };
  }
  if (!isKnownDataPointType(dataPoint.dataPointType)) {
    return {
      message: `Unknown 'dataPointType' value '${dataPoint.dataPointType}' encountered.`,
      type: "warning",
    };
  }
  for (const validator of dataPointValidators[dataPoint.dataPointType]) {
    const value = dataPoint[validator.field];
    if (value === undefined) {
      if (validator.optional) {
        continue;
      }
      return {
        message: `Property '${validator.field}' is missing. ${validTypesMessage(
          validator.validTypes
        )}`,
        type: "error",
      };
    }
    const invalid = isNotOneOf(value, validator.validTypes);
    if (invalid) {
      return {
        message: `Property '${
          validator.field
        }' is invalid or wrong type. ${validTypesMessage(
          validator.validTypes
        )}`,
        type: "error",
      };
    }
  }
  return false;
}

class Issues {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.notes = [];
    this.maxErrors = 10;
  }
  add(error, metadata) {
    if (!error) return;
    if (this[`${error.type}s`].length < this.maxErrors) {
      this[`${error.type}s`].push({
        message: error.message,
        ...metadata,
      });
    }
  }
}

export function validateDataPointsInput(dataPoints) {
  const issues = new Issues();
  if (!isValid.array(dataPoints)) {
    issues.add({
      type: "error",
      message: "Input is not an array.",
    });
    return issues;
  }
  for (const dataPoint of dataPoints) {
    issues.add(getError(dataPoint), { dataPoint });
  }
  return issues;
}

function validateInputObject(object, validators) {
  const issues = new Issues();
  if (!isValid.object(object)) {
    issues.add({
      type: "error",
      message: "Input is not an object.",
    });
    return issues;
  }
  for (const [field, validTypes] of Object.entries(validators)) {
    const value = object[field];
    if (value === undefined) {
      issues.add({
        type: validTypes.includes("undefined") ? "warning" : "error",
        message: `Property '${field}' is missing. ${validTypesMessage(
          validTypes
        )}`,
      });
      continue;
    }
    const invalid = isNotOneOf(value, validTypes);
    if (invalid) {
      issues.add({
        type: "error",
        message: `Property '${field}' is invalid or wrong type.  ${validTypesMessage(
          validTypes
        )}`,
      });
    }
  }
  const validatorKeys = Object.keys(validators);
  for (const field of Object.keys(object)) {
    if (!validatorKeys.includes(field)) {
      issues.add({
        type: "warning",
        message: `Unknown property '${field}' encountered.`,
      });
    }
  }
  return issues;
}

export function validateStationInput(station) {
  return validateInputObject(station, {
    name: ["undefined", "nonEmptyString"],
    latitude: ["undefined", "latitude"],
    longitude: ["undefined", "longitude"],
    timeZone: ["undefined", "timeZoneAreaAndLocation"],
    logoUrl: ["undefined", "null", "emptyString", "urlString"],
    audioVisualisation: [
      "undefined",
      "null",
      "emptyString",
      "string:spectrogram",
      "string:waveform",
    ],
    sidebarText: ["undefined", "null", "arrayOfLabelAndText"],
    metadata: ["undefined", "null", "object"],
  });
}

export function validateOrganizationInput(organization) {
  const issues = validateInputObject(organization, {
    name: ["undefined", "nonEmptyString"],
    password: ["undefined", "null", "nonEmptyString"],
    logoUrl: ["undefined", "null", "emptyString", "urlString"],
    metadata: ["undefined", "null", "object"],
  });
  if (organization.hasOwnProperty("public")) {
    issues.add({
      type: "warning",
      message: `Property 'public' can not be set explicitly, it is inferred from the presence of a password.`,
    });
  }
  return issues;
}
