import { isValid as isValidDate, parseISO } from "date-fns";

export const isValid = {
  string: (value) => {
    return typeof value === "string";
  },
  nonEmptyString: (value) => {
    return typeof value === "string" && value.length > 0;
  },
  emptyString: (value) => {
    return value === "";
  },
  urlString: (value) => {
    if (!isValid.string(value)) return false;
    try {
      new URL(value);
      return true;
    } catch (ex) {
      return false;
    }
  },
  boolean: (value) => {
    return typeof value === "boolean";
  },
  null: (value) => {
    return value === null;
  },
  dateString: (value) => {
    return `${value}`.length === 10 && isValidDate(parseISO(value));
  },
  dateTimeString: (value) => {
    return `${value}`.length > 22 && isValidDate(parseISO(value));
  },
  number: (value) => {
    return typeof value === "number" && isFinite(value);
  },
  object: (value) => {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  },
  array: (value) => {
    return Array.isArray(value);
  },
  arrayOfLabelAndText: (value) => {
    if (!isValid.array(value)) return false;
    for (const item of value) {
      if (!isValid.string(item.label) && isValid.string(item.text))
        return false;
    }
    return true;
  },
  timeZoneAreaAndLocation: (value) => {
    if (!value) return false;
    try {
      Intl.DateTimeFormat(undefined, { timeZone: value });
      return true;
    } catch (ex) {
      return false;
    }
  },
  key: (key) => {
    if (!key) return false;
    if (typeof key !== "string") return false;
    const regexp = /^[a-z0-9-]+$/;
    return regexp.test(key);
  },
  latitude: (value) => {
    return isValid.number(value) && Math.abs(value) <= 90;
  },
  longitude: (value) => {
    return isValid.number(value) && Math.abs(value) <= 180;
  },
  fileName: (value) => {
    if (!value) return false;
    if (typeof value !== "string") return false;
    // Don't allow spaces, require at least one period.
    const regexp = /^[a-zA-Z0-9_.-]+\.[a-zA-Z0-9_.-]+$/;
    return regexp.test(value);
  },
  directoryName: (value) => {
    if (!value) return false;
    if (typeof value !== "string") return false;
    // Directories must contain only letters, numbers, underscores and dashes.
    const regexp = /^[a-zA-Z0-9_-]+$/;
    return regexp.test(value);
  },
  undefined: (value) => {
    return value === undefined;
  },
  "string:spectrogram": (value) => {
    return value === "spectrogram";
  },
  "string:waveform": (value) => {
    return value === "waveform";
  },
};

export function errorIfNot(value, type) {
  if (!isValid[type](value)) {
    throw new Error(`Value is not of type ${type}.`);
  }
  return value;
}
