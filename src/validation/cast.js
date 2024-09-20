import { isValid, parseISO } from "date-fns";

export function toString(value, nullable) {
  if (value === null && nullable) {
    return null;
  }
  return `${value ?? ""}`;
}
export function toDateTimeString(value, nullable) {
  const valueString = toString(value, nullable);
  if (!valueString) {
    return valueString;
  }
  // Add T and Z if missing
  return valueString.replace(
    /^(\d{4}-\d{2}-\d{2}) ([\d:.]*)$/,
    (match, date, time) => `${date}T${time}Z`
  );
}

export function toInt(value, nullable) {
  if (value === null && nullable) {
    return null;
  }
  return parseInt(value, 10) || 0;
}

export function toFloat(value, nullable) {
  if (value === null && nullable) {
    return null;
  }
  return parseFloat(value) || 0;
}

export function toObject(value, nullable) {
  if (value === null && nullable) {
    return null;
  }
  if (typeof value === "object" && !Array.isArray(value) && value !== null) {
    return value;
  }
  return {};
}

export function toArray(value, nullable, mapFunction) {
  if (value === null && nullable) {
    return null;
  }
  if (Array.isArray(value)) {
    return value.map(mapFunction);
  }
  return [];
}

export function toBoolean(value, nullable) {
  if (value === null && nullable) {
    return null;
  }
  return !!value;
}

export function castDataSummary(object) {
  return {
    dataPointType: toString(object.dataPointType),
    count: toInt(object.count),
    minDate: toString(object.minDate),
    maxDate: toString(object.maxDate),
  };
}

export function castUploadSummary(object) {
  return {
    uploadType: toString(object.uploadType),
    count: toInt(object.count),
  };
}

export function castSidebarText(object) {
  return {
    label: toString(object.label),
    text: toString(object.text),
  };
}

export function castStation(object) {
  return {
    stationKey: toString(object.stationKey),
    organizationKey: toString(object.organizationKey),
    name: toString(object.name),
    latitude: toFloat(object.latitude),
    longitude: toFloat(object.longitude),
    timeZone: toString(object.timeZone),
    updated: toString(object.updated),
    online: toBoolean(object.online),
    logoUrl: toString(object.logoUrl),
    audioVisualisation: toString(object.audioVisualisation),
    metadata: toObject(object.metadata),
    dataSummary: toArray(object.dataSummary, false, castDataSummary),
    uploadSummary: toArray(object.uploadSummary, false, castUploadSummary),
    sidebarText: toArray(object.sidebarText, false, castSidebarText),
  };
}

export function castOrganization(object) {
  return {
    key: toString(object.key),
    name: toString(object.name),
    public: toBoolean(object.public),
    logoUrl: toString(object.logoUrl),
    metadata: toObject(object.metadata),
  };
}

export function castCallEvent(object) {
  return {
    dataPointType: toString(object.dataPointType),
    species: toString(object.species),
    callType: toString(object.callType),
    startDateTime: toDateTimeString(object.startDateTime),
    endDateTime: toDateTimeString(object.endDateTime),
    callCount: toInt(object.callCount),
    audioUrl: toString(object.audioUrl),
  };
}

export function castCallRate(object) {
  return {
    dataPointType: toString(object.dataPointType),
    date: toString(object.date),
    value: toFloat(object.value, true),
    species: toString(object.species),
    callType: toString(object.callType),
  };
}

export function castExceedance(object) {
  return {
    dataPointType: toString(object.dataPointType),
    date: toString(object.date),
    value: toFloat(object.value, true),
    threshold: toString(object.threshold),
    band: toString(object.band),
  };
}

export function castNoise(object) {
  return {
    dataPointType: toString(object.dataPointType),
    date: toString(object.date),
    value: toFloat(object.value, true),
    band: toString(object.band),
  };
}

export function castRecordingCoverage(object) {
  return {
    dataPointType: toString(object.dataPointType),
    date: toString(object.date),
    value: toFloat(object.value, true),
  };
}

export function castDataPoint(object) {
  switch (object?.dataPointType) {
    case "callEvent":
      return castCallEvent(object);
    case "callRate":
      return castCallRate(object);
    case "exceedance":
      return castExceedance(object);
    case "noise":
      return castNoise(object);
    case "recordingCoverage":
      return castRecordingCoverage(object);
    default:
      return object;
  }
}
