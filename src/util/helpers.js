import { formatISO } from "date-fns";

export const keySeparator = "_";

export function makeKey(parts = []) {
  function sanitiseKeyPart(part) {
    return part.replaceAll(keySeparator, "-");
  }
  return parts.map(sanitiseKeyPart).join(keySeparator);
}

export function getKeyPart(key, index) {
  return key.split(keySeparator)[index];
}

export function generateApiKey() {
  return [0, 0, 0].map(() => crypto.randomUUID()).join("-");
}

export function withId(dataPoint) {
  // Determine a reasonably unique ID for the data point that does not include the value
  // This is used to allow partial data updates while preventing duplicate data points from being stored
  const {
    id: existingId,
    value,
    endDateTime,
    callCount,
    ...candidates
  } = dataPoint;
  // Special case for timestamps to account for mixed formats
  ["startDateTime"].forEach((key) => {
    if (candidates[key]) {
      // Strip out non-numeric characters
      candidates[key] = candidates[key].replace(/\D/g, "");
    }
  });

  const id = Object.entries(candidates)
    .map(([property, value]) => `${property}:${value}`)
    .sort()
    .join("_");
  return {
    ...dataPoint,
    id,
  };
}

export function withOutId(dataPoint) {
  return { ...dataPoint, id: undefined };
}

export function getDataSummary(dataPoints) {
  const dataPointTypes = getDataPointTypes(dataPoints);
  return dataPointTypes.map((dataPointType) => {
    const dataPointsOfType = dataPoints.filter(
      (dp) => dp.dataPointType === dataPointType
    );
    const { minDate, maxDate } = getDateRange(dataPointsOfType);
    return {
      dataPointType,
      count: dataPointsOfType.length,
      minDate,
      maxDate,
    };
  });
}

export function getDataPointTypes(dataPoints) {
  return [...new Set(dataPoints.map((dp) => dp.dataPointType))];
}

export function getDateRange(dataPoints) {
  const dates = dataPoints.map(
    (dp) => new Date(dp.date || `${dp.startDateTime}`.slice(0, 10))
  );
  // Format YYYY-MM-DD
  const minDate = Math.min(...dates);
  const maxDate = Math.max(...dates);
  return {
    minDate: formatISO(new Date(minDate), { representation: "date" }),
    maxDate: formatISO(new Date(maxDate), { representation: "date" }),
  };
}

// Include data points that match the filter, or exclude them if invert is true
export function dataPointFilter(
  {
    dataPointType = null,
    fromDate = null,
    toDate = null,
    species = null,
    callType = null,
    band = null,
    threshold = null,
  } = {},
  invert = false
) {
  return (dataPoint) => {
    if (dataPointType && dataPointType !== dataPoint.dataPointType) {
      return invert;
    }
    if (species && species !== dataPoint.species) {
      return invert;
    }
    if (callType && callType !== dataPoint.callType) {
      return invert;
    }
    if (band && band !== dataPoint.band) {
      return invert;
    }
    if (threshold && threshold !== dataPoint.threshold) {
      return invert;
    }
    if (
      fromDate &&
      (dataPoint.date || dataPoint.startDateTime?.slice(0, 10) || "0") <
        fromDate
    ) {
      return invert;
    }
    if (
      toDate &&
      (dataPoint.date || dataPoint.startDateTime?.slice(0, 10) || "X") > toDate
    ) {
      return invert;
    }
    return !invert;
  };
}

export const apiPath = "api/v1";

export function withoutUndefined(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined)
  );
}
