import {
  apiPath,
  dataPointFilter,
  getDataSummary,
  getKeyPart,
  keySeparator,
  makeKey,
  withId,
  withOutId,
  withoutUndefined,
} from "./helpers";
import { errorIfNot, isValid } from "../validation/typeValidation";
import {
  castDataPoint,
  castOrganization,
  castStation,
} from "../validation/cast";

export default class Data {
  constructor(request, env) {
    if (request === undefined) throw new Error("Request argument missing");
    this.request = request;
    if (env === undefined) throw new Error("Env argument missing");
    this.env = env;
  }

  uploadPath = "uploads/";

  async getFromSource(key, defaultValue = {}) {
    return this.env.SOURCE_DATA.get(`${key}.json`)
      .then(
        (r2Object) =>
          new Response(r2Object?.body || JSON.stringify(defaultValue))
      )
      .then((response) => response.json());
  }

  async writeToSource(key, data) {
    return this.env.SOURCE_DATA.put(`${key}.json`, JSON.stringify(data));
  }

  async deleteFromSource(key) {
    return this.env.SOURCE_DATA.delete(`${key}.json`);
  }

  async deleteFromCache(key) {
    return this.env.CACHED_DATA.delete(key);
  }

  async deleteAllFromCache(prefix) {
    if (!prefix) throw new Error("prefix argument missing");
    let cursor;
    while (cursor !== false) {
      const value = await this.env.CACHED_DATA.list({ cursor: cursor, prefix });
      cursor = value.cursor || false;
      const keys = value.keys;
      for (const key of keys) {
        await this.env.CACHED_DATA.delete(key.name);
      }
    }
  }

  async getObjectFromSource(key) {
    return errorIfNot(await this.getFromSource(key, {}), "object");
  }

  async writeObjectToSource(key, data) {
    errorIfNot(data, "object");
    return this.writeToSource(key, data);
  }

  async getObjectFromCache(key) {
    return errorIfNot(
      (await this.env.CACHED_DATA.get(key, { type: "json" })) || {},
      "object"
    );
  }

  async writeObjectToCache(key, data) {
    errorIfNot(data, "object");
    return this.env.CACHED_DATA.put(key, JSON.stringify(data));
  }

  async getArrayFromSource(key) {
    return errorIfNot(await this.getFromSource(key, []), "array");
  }

  async writeArrayToSource(key, data) {
    errorIfNot(data, "array");
    return this.writeToSource(key, data);
  }

  async getArrayFromCache(key) {
    return errorIfNot(
      (await this.env.CACHED_DATA.get(key, { type: "json" })) || [],
      "array"
    );
  }

  async writeArrayToCache(key, data) {
    errorIfNot(data, "array");
    return this.env.CACHED_DATA.put(key, JSON.stringify(data));
  }

  async putOrganization(organizationKey, organizationData) {
    const { name, password, logoUrl, metadata } = organizationData;
    // Create or update an org by key
    if (!isValid.key(organizationKey))
      throw new Error("key argument missing or invalid");
    // Get the existing organization data
    const storageKey = `organizations`;
    const organizations = await this.getObjectFromSource(storageKey);
    // Add the new data, overwriting if the organization exists
    // We don't replace the org wholesale, as additional properties may exist
    const newOrganizationProps = withoutUndefined({
      key: organizationKey,
      name,
      logoUrl,
      metadata,
    });
    const organization = {
      ...organizations[organizationKey],
      ...newOrganizationProps,
    };
    organizations[organizationKey] = castOrganization(organization);
    // Store the data in the source of truth
    await this.writeObjectToSource(storageKey, organizations);
    // Store the data in the cache
    await this.writeObjectToCache(storageKey, organizations);
    // Store the password separately (yes, this is low security, but enough for our needs)
    if (password !== undefined) {
      const passwordStorageKey = `organization-passwords`;
      const passwords = await this.getObjectFromSource(passwordStorageKey);
      if (!password) {
        delete passwords[organizationKey];
      } else {
        passwords[organizationKey] = password;
      }
      await this.writeObjectToSource(passwordStorageKey, passwords);
      await this.writeObjectToCache(passwordStorageKey, passwords);
    }
    return true;
  }

  async deleteOrganization(organizationKey) {
    if (!isValid.key(organizationKey))
      throw new Error("organizationKey argument missing or invalid");
    const stationsStorageKey = `stations/${organizationKey}`;
    const stations = await this.getObjectFromSource(stationsStorageKey);

    // Delete all uploads for this organization
    const uploads = await this.getUploadsForOrg(organizationKey);
    if (uploads.length) {
      await this.deleteUpload(
        organizationKey,
        // Remove org name from key
        uploads.map(({ key }) => key.split("/").slice(1).join("/"))
      );
    }

    // Delete all station data points for this organization
    for (const stationKey in stations) {
      await this.deleteDataPoints(organizationKey, stationKey);
    }
    // Delete the stations list for this organization
    await this.deleteFromSource(stationsStorageKey);
    await this.deleteFromCache(stationsStorageKey);
    // Delete the organization from the organizations object
    const storageKey = `organizations`;
    const organizations = await this.getObjectFromSource(storageKey);
    delete organizations[organizationKey];
    await this.writeObjectToSource(storageKey, organizations);
    await this.writeObjectToCache(storageKey, organizations);
    // Delete all users owned by this org
    const numDeletedUsers = await this.deleteUsersForOrg(organizationKey);
    // Return the number of stations and users deleted
    return {
      stations: Object.keys(stations).length,
      users: numDeletedUsers,
    };
  }

  async getOrganizations({ bypassCache = false } = {}) {
    const organizations = bypassCache
      ? await this.getObjectFromSource("organizations")
      : await this.getObjectFromCache("organizations");
    const organizationPasswords = bypassCache
      ? await this.getObjectFromSource("organization-passwords")
      : await this.getObjectFromCache("organization-passwords");
    for (const [organizationKey, organizationData] of Object.entries(
      organizations
    )) {
      organizations[organizationKey] = {
        ...organizationData,
        public: !organizationPasswords[organizationKey],
      };
    }
    return organizations;
  }

  async getOrganization(organizationKey, { bypassCache = false } = {}) {
    return (await this.getOrganizations({ bypassCache }))[organizationKey];
  }

  async checkOrganizationPassword(
    organizationKey,
    password,
    { bypassCache = false } = {}
  ) {
    if (!isValid.key(organizationKey))
      throw new Error("organizationKey argument missing or invalid");
    if (!password) throw new Error("password argument missing");
    const passwordStorageKey = `organization-passwords`;
    const passwords = bypassCache
      ? await this.getObjectFromSource(passwordStorageKey)
      : await this.getObjectFromCache(passwordStorageKey);
    return passwords[organizationKey] === password;
  }

  async putStation(organizationKey, stationKey, stationData) {
    const {
      name,
      latitude,
      longitude,
      timeZone,
      logoUrl,
      audioVisualisation,
      sidebarText,
      metadata,
    } = stationData;
    // Create or update a station by key
    if (!isValid.key(organizationKey))
      throw new Error("organizationKey argument missing or invalid");
    if (!isValid.key(stationKey))
      throw new Error("stationKey argument missing or invalid");
    // Get the existing stations data for this organization
    const storageKey = `stations/${organizationKey}`;
    const stations = await this.getObjectFromSource(storageKey);
    // Update the stations object
    const newStationProps = withoutUndefined({
      stationKey,
      organizationKey,
      name,
      latitude,
      longitude,
      timeZone,
      logoUrl,
      audioVisualisation,
      sidebarText,
      metadata,
    });
    const station = {
      ...stations[stationKey],
      ...newStationProps,
    };
    // These properties are required for frontend calculations
    if (!station.latitude) throw new Error("latitude argument missing");
    if (!station.longitude) throw new Error("longitude argument missing");
    if (!station.timeZone) throw new Error("timeZone argument missing");
    // Cast the data
    stations[stationKey] = castStation(station);
    // Store the data in the source of truth
    await this.writeObjectToSource(storageKey, stations);
    // Store the data in the cache
    await this.writeObjectToCache(storageKey, stations);
    return true;
  }

  async deleteStation(organizationKey, stationKey) {
    // Delete a specific station
    if (!isValid.key(organizationKey))
      throw new Error("organizationKey argument missing or invalid");
    if (!isValid.key(stationKey))
      throw new Error("stationKey argument missing or invalid");

    // Delete the station
    const storageKey = `stations/${organizationKey}`;
    const stations = await this.getObjectFromSource(storageKey);
    delete stations[stationKey];
    await this.writeObjectToSource(storageKey, stations);
    await this.writeObjectToCache(storageKey, stations);

    // Delete all uploads for this station
    const uploads = await this.getUploadsForStation(
      organizationKey,
      stationKey
    );
    if (uploads.length) {
      await this.deleteUpload(
        organizationKey,
        // Remove org name from key
        uploads.map(({ key }) => key.split("/").slice(1).join("/"))
      );
    }

    // Delete all associated data for this station
    const stationDataKey = `data-points/${makeKey([
      organizationKey,
      stationKey,
    ])}`;
    await this.deleteFromSource(stationDataKey);
    await this.deleteFromCache(stationDataKey);

    return true;
  }

  async updateStationDataSummary(organizationKey, stationKey) {
    // Update a specific station's metadata
    if (!isValid.key(organizationKey))
      throw new Error("organizationKey argument missing or invalid");
    if (!isValid.key(stationKey))
      throw new Error("stationKey argument missing or invalid");
    // Calculate the metadata
    const dataPoints = await this.getDataPoints(organizationKey, stationKey, {
      bypassCache: true,
    });
    const dataSummary = getDataSummary(dataPoints);
    // Get the number of uploads for each type
    const uploadSummary = Object.entries(
      (await this.getUploadsForStation(organizationKey, stationKey)).reduce(
        (summary, upload) => {
          const { key } = upload;
          const type = key.split("/").at(-2);
          if (!summary[type]) summary[type] = 0;
          summary[type]++;
          return summary;
        },
        {}
      )
    ).map(([uploadType, count]) => ({ uploadType, count }));
    // Work out the status by checking the latest two recordingCoverage datapoints
    const sortedPoints = dataPoints
      .filter((point) => point.dataPointType === "recordingCoverage")
      .sort((a, b) => (a.date > b.date ? -1 : 1));
    const online = !!(sortedPoints[0]?.value || sortedPoints[1]?.value);
    // Get the existing stations data for this organization
    const storageKey = `stations/${organizationKey}`;
    const stations = await this.getObjectFromSource(storageKey);
    // Update the stations object
    const station = {
      ...stations[stationKey],
      updated: new Date().toISOString(),
      online,
      dataSummary,
      uploadSummary,
    };
    stations[stationKey] = station;
    // Store the data in the source of truth
    await this.writeObjectToSource(storageKey, stations);
    // Store the data in the cache
    await this.writeObjectToCache(storageKey, stations);
    return true;
  }

  async getStationsArray({ bypassCache = false } = {}) {
    // Stations are usually stored in an object and keyed per organization, but we want an array for the frontend summary
    const organizations = await this.getOrganizations({ bypassCache });
    const stations = [];
    for (const organizationKey of Object.keys(organizations)) {
      const orgStations = Object.values(
        await this.getStationsForOrg(organizationKey, {
          bypassCache,
        })
      );
      if (orgStations.length) {
        stations.push(...orgStations);
      }
    }
    return stations;
  }

  async getStationsForOrg(organizationKey, { bypassCache = false } = {}) {
    if (!isValid.key(organizationKey))
      throw new Error("organizationKey argument missing or invalid");
    const storageKey = `stations/${organizationKey}`;
    const stations = bypassCache
      ? await this.getObjectFromSource(storageKey)
      : await this.getObjectFromCache(storageKey);
    const validStations = {};
    for (const [stationKey, stationData] of Object.entries(stations)) {
      // It's possible that data points have been uploaded before the station was created, in that case skip that station
      if (!stationData.stationKey) {
        continue;
      }
      validStations[stationKey] = stationData;
    }
    return validStations;
  }

  async getStation(organizationKey, stationKey, { bypassCache = false } = {}) {
    if (!isValid.key(organizationKey))
      throw new Error("organizationKey argument missing or invalid");
    if (!isValid.key(stationKey))
      throw new Error("stationKey argument missing or invalid");
    // Get the station
    const stations = await this.getStationsForOrg(organizationKey, {
      bypassCache,
    });
    return stations[stationKey];
  }

  async putUser(organizationKey, userKey, apiKey) {
    // Create or update a user (effectively this only stores an API key)
    if (!isValid.key(organizationKey))
      throw new Error("organizationKey argument missing or invalid");
    if (!isValid.key(userKey))
      throw new Error("userKey argument missing or invalid");
    if (`${apiKey}`.length < 16)
      throw new Error("apiKey argument missing or not long enough");
    // Get the existing user data
    const users = await this.getObjectFromSource("users");
    // Add or update the user
    users[makeKey([organizationKey, userKey])] = {
      apiKey,
    };
    await this.writeObjectToSource("users", users);
    return true;
  }

  async deleteUser(organizationKey, userKey) {
    if (!isValid.key(organizationKey))
      throw new Error("organizationKey argument missing or invalid");
    if (!isValid.key(userKey))
      throw new Error("userKey argument missing or invalid");
    // Get the existing user data
    const users = await this.getObjectFromSource("users");
    // Add or update the user
    delete users[makeKey([organizationKey, userKey])];
    await this.writeObjectToSource("users", users);
    return true;
  }

  async deleteUsersForOrg(organizationKey) {
    // Delete every user belonging to an organization
    if (!isValid.key(organizationKey))
      throw new Error("organizationKey argument missing or invalid");
    const users = await this.getObjectFromSource("users");
    const keysToDelete = Object.keys(users).filter((orgUserKey) =>
      orgUserKey.startsWith(`${organizationKey}${keySeparator}`)
    );
    keysToDelete.forEach((key) => delete users[key]);
    await this.writeObjectToSource("users", users);
    return keysToDelete.length;
  }

  async getUsersArray() {
    return Object.entries(await this.getObjectFromSource("users")).map(
      ([orgUserKey]) => ({
        organizationKey: getKeyPart(orgUserKey, 0),
        userKey: getKeyPart(orgUserKey, 1),
      })
    );
  }

  async getUser(apiKey) {
    if (apiKey === this.env.ADMIN_API_KEY) {
      return {
        organizationKey: "",
        name: "Admin",
        admin: true,
      };
    }
    return Object.entries(await this.getObjectFromSource("users"))
      .filter(([, { apiKey: userApiKey }]) => apiKey === userApiKey)
      .map(([orgUserKey]) => ({
        organizationKey: getKeyPart(orgUserKey, 0),
        userKey: getKeyPart(orgUserKey, 1),
        admin: false,
      }))?.[0];
  }

  async putDataPoints(organizationKey, stationKey, stationData) {
    // Create or update data for a specific station
    if (!isValid.key(organizationKey))
      throw new Error("organizationKey argument missing or invalid");
    if (!isValid.key(stationKey))
      throw new Error("stationKey argument missing or invalid");
    // Clean up input data
    const castStationData = stationData.map((dataPoint) =>
      castDataPoint(dataPoint)
    );
    // Get the existing station data
    const existingStationData = await this.getDataPoints(
      organizationKey,
      stationKey,
      {
        bypassCache: true,
      }
    );
    // Add the new data and remove any duplicates
    const toObject = (dataPoints) =>
      Object.fromEntries(
        dataPoints.map(withId).map((dataPoint) => [dataPoint.id, dataPoint])
      );
    const newStationData = Object.values({
      ...toObject(existingStationData),
      ...toObject(castStationData),
    }).map(withOutId);
    // Update the data stores
    await this.replaceDataPoints(organizationKey, stationKey, newStationData);
    return true;
  }

  async getDataPointChunkKeys(
    organizationKey,
    stationKey,
    { bypassCache = false } = {}
  ) {
    if (!isValid.key(organizationKey))
      throw new Error("organizationKey argument missing or invalid");
    if (!isValid.key(stationKey))
      throw new Error("stationKey argument missing or invalid");
    // Get a list of data point storage keys that exist for the station
    if (!bypassCache) {
      // Infer the chunk keys by looking at the station data summary
      const station = await this.getStation(organizationKey, stationKey, {
        bypassCache,
      });
      if (!station) return [];
      const { dataSummary = [] } = station;
      const keys = [];
      dataSummary.forEach(({ dataPointType, minDate, maxDate }) => {
        // Make an array with a year for each year in the range
        const minYear = parseInt(minDate.split("-")[0]);
        const maxYear = parseInt(maxDate.split("-")[0]);
        const years = Array.from(
          { length: maxYear - minYear + 1 },
          (_, i) => minYear + i
        );
        // Make a key for each year
        years.forEach((year) => {
          keys.push(
            `data-points/${makeKey([
              organizationKey,
              stationKey,
              dataPointType,
              `${year}`,
            ])}`
          );
        });
      });
      return keys;
    }
    const storageKeyPrefix = `data-points/${makeKey([
      organizationKey,
      stationKey,
    ])}`;
    const options = {
      prefix: storageKeyPrefix.replaceAll("//", "/"),
    };
    const listed = await this.env.SOURCE_DATA.list(options);

    let truncated = listed.truncated;
    let cursor = truncated ? listed.cursor : undefined;
    while (truncated) {
      const next = await this.env.SOURCE_DATA.list({
        ...options,
        cursor: cursor,
      });
      listed.objects.push(...next.objects);
      truncated = next.truncated;
      cursor = next.cursor;
    }
    // Return the key only
    return listed.objects.map(({ key }) => key.replace(/\.json$/, ""));
  }

  async replaceDataPoints(organizationKey, stationKey, stationData) {
    // Delete all existing data points for a station and replace with new data
    if (!isValid.key(organizationKey))
      throw new Error("organizationKey argument missing or invalid");
    if (!isValid.key(stationKey))
      throw new Error("stationKey argument missing or invalid");
    // Get a list of data point storage keys that exist for the station
    const origChunkKeys = await this.getDataPointChunkKeys(
      organizationKey,
      stationKey,
      { bypassCache: true }
    );
    const newChunkKeys = [];
    // Segment the data by dataPointType and year
    const data = {};
    stationData.forEach((dataPoint) => {
      const { dataPointType, date, startDateTime } = dataPoint;
      const year = `${date || startDateTime || ""}`.slice(0, 4);
      if (!year) throw new Error("Data point missing date or startDateTime");
      if (!data[dataPointType]) data[dataPointType] = {};
      if (!data[dataPointType][year]) data[dataPointType][year] = [];
      data[dataPointType][year].push(dataPoint);
    });
    // Store the data in the source of truth
    await Promise.all(
      Object.entries(data).map(([dataPointType, years]) =>
        Promise.all(
          Object.entries(years).map(async ([year, dataPoints]) => {
            const storageKey = `data-points/${makeKey([
              organizationKey,
              stationKey,
              dataPointType,
              year,
            ])}`;
            newChunkKeys.push(storageKey);
            const sorted = dataPoints.sort((a, b) => {
              const aDate = a.date || a.startDateTime;
              const bDate = b.date || b.startDateTime;
              return aDate < bDate ? -1 : aDate > bDate ? 1 : 0;
            });
            await this.writeArrayToSource(storageKey, sorted);
            await this.writeArrayToCache(storageKey, sorted);
          })
        )
      )
    );
    // Find the keys that need to be deleted
    const keysToDelete = origChunkKeys.filter(
      (key) => !newChunkKeys.includes(key)
    );
    // Delete from source and cache
    await Promise.all(
      keysToDelete.map((chunkKey) =>
        Promise.all([
          this.deleteFromSource(chunkKey),
          this.deleteFromCache(chunkKey),
        ])
      )
    );
    // Update the station data summary
    await this.updateStationDataSummary(organizationKey, stationKey);
    return true;
  }

  async deleteDataPoints(
    organizationKey,
    stationKey,
    {
      dataPointType = null,
      fromDate = null,
      toDate = null,
      species = null,
      callType = null,
      band = null,
      threshold = null,
    } = {}
  ) {
    if (!isValid.key(organizationKey))
      throw new Error("organizationKey argument missing or invalid");
    if (!isValid.key(stationKey))
      throw new Error("stationKey argument missing or invalid");
    // Get all the data points and filter out the ones we don't want to keep
    const stationData = await this.getDataPoints(organizationKey, stationKey, {
      bypassCache: true,
    });
    const filteredStationData = stationData.filter(
      dataPointFilter(
        {
          dataPointType,
          fromDate,
          toDate,
          species,
          callType,
          band,
          threshold,
        },
        true
      )
    );
    // Update the data stores
    await this.replaceDataPoints(
      organizationKey,
      stationKey,
      filteredStationData
    );
    return true;
  }

  async getDataPoints(
    organizationKey,
    stationKey,
    {
      bypassCache = false,
      dataPointType = null,
      fromDate = null,
      toDate = null,
      species = null,
      callType = null,
      band = null,
      threshold = null,
    } = {}
  ) {
    if (!isValid.key(organizationKey))
      throw new Error("organizationKey argument missing or invalid");
    if (!isValid.key(stationKey))
      throw new Error("stationKey argument missing or invalid");
    // Get all the chunk keys that are stored for the station
    const chunkKeys = await this.getDataPointChunkKeys(
      organizationKey,
      stationKey,
      { bypassCache }
    );
    // Filter the keys by the date range and dataPointType
    const filteredChunkKeys = chunkKeys.filter((chunkKey) => {
      const [keyDataPointType, year] = chunkKey.split(keySeparator).slice(-2);
      if (fromDate && year < fromDate.slice(0, 4)) return false;
      if (toDate && year > toDate.slice(0, 4)) return false;
      if (dataPointType && dataPointType !== keyDataPointType) return false;
      return true;
    });
    // Get the data from the source of truth
    const stationData = await Promise.all(
      filteredChunkKeys.map((chunkKey) =>
        bypassCache
          ? this.getArrayFromSource(chunkKey)
          : this.getArrayFromCache(chunkKey)
      )
    );
    // Filter the data by the date range
    const filteredStationData = stationData.flat().filter(
      dataPointFilter({
        dataPointType,
        fromDate,
        toDate,
        species,
        callType,
        band,
        threshold,
      })
    );
    return filteredStationData;
  }

  async getSummary({ bypassCache = false } = {}) {
    // Return all of the organizations and stations, with metadata
    return {
      organizations: await this.getOrganizations({ bypassCache }),
      stations: await this.getStationsArray({ bypassCache }),
    };
  }

  async putUpload(organizationKey, pathAndFilename, upload) {
    // Create or replace an upload
    if (!isValid.key(organizationKey))
      throw new Error("organizationKey argument missing or invalid");
    const storageKey =
      `${this.uploadPath}${organizationKey}/${pathAndFilename}`.replaceAll(
        "//",
        "/"
      );
    await this.env.SOURCE_DATA.put(storageKey, upload);
    return true;
  }

  async putStationUpload(
    organizationKey,
    stationKey,
    uploadTypeKey,
    filePath,
    upload
  ) {
    await this.putUpload(
      organizationKey,
      `${stationKey}/${uploadTypeKey}/${filePath}`,
      upload
    );
    await this.updateStationDataSummary(organizationKey, stationKey);
    return true;
  }

  async deleteUpload(organizationKey, pathAndFilename) {
    // Delete an upload/s
    if (!isValid.key(organizationKey))
      throw new Error("organizationKey argument missing or invalid");

    // If pathAndFilename is not an array, wrap it in an array
    if (!Array.isArray(pathAndFilename)) {
      pathAndFilename = [pathAndFilename];
    }

    pathAndFilename.map((path) => {
      if (!isValid.nonEmptyString(path))
        throw new Error("pathAndFilename argument missing or invalid");
    });

    // Convert to an array if not already
    const storageKeys = [pathAndFilename]
      .flat()
      .map((path) =>
        `${this.uploadPath}${organizationKey}/${path}`.replaceAll("//", "/")
      );
    await this.env.SOURCE_DATA.delete(storageKeys);
    return true;
  }

  async getUpload(organizationKey, pathAndFilename) {
    // Get an upload
    if (!isValid.key(organizationKey))
      throw new Error("organizationKey argument missing or invalid");
    if (!isValid.nonEmptyString(pathAndFilename))
      throw new Error("pathAndFilename argument missing or invalid");
    // Legacy support - if pathAndFilename starts with 'uploads/' then remove it
    if (pathAndFilename.startsWith("uploads/")) {
      pathAndFilename = pathAndFilename.slice(8);
    }
    const storageKey =
      `${this.uploadPath}${organizationKey}/${pathAndFilename}`.replaceAll(
        "//",
        "/"
      );
    return await this.env.SOURCE_DATA.get(storageKey);
  }

  async getUploadsForOrg(organizationKey, { pathPrefix = "" } = {}) {
    // List all uploads for an organization
    if (!isValid.key(organizationKey))
      throw new Error("organizationKey argument missing or invalid");
    const storageKeyPrefix = `${organizationKey}/${pathPrefix}`;
    const uploads = await this.getUploads(storageKeyPrefix);
    const apiUrl = new URL(this.request.url).origin;
    return uploads.map((upload) => ({
      ...upload,
      url: `${apiUrl}/${apiPath}/organization-upload/${upload.key}`,
    }));
  }

  async getUploadsForStation(organizationKey, stationKey, uploadTypeKey = "") {
    return this.getUploadsForOrg(organizationKey, {
      pathPrefix: uploadTypeKey
        ? `${stationKey}/${uploadTypeKey}/`
        : `${stationKey}/`,
    });
  }

  async getUploads(pathPrefix = "") {
    // List all uploads for a given prefix
    const storageKeyPrefix = pathPrefix
      ? `${this.uploadPath}${pathPrefix}`
      : `${this.uploadPath}`;
    const options = {
      prefix: storageKeyPrefix.replaceAll("//", "/"),
    };
    const listed = await this.env.SOURCE_DATA.list(options);

    let truncated = listed.truncated;
    let cursor = truncated ? listed.cursor : undefined;
    while (truncated) {
      const next = await this.env.SOURCE_DATA.list({
        ...options,
        cursor: cursor,
      });
      listed.objects.push(...next.objects);
      truncated = next.truncated;
      cursor = next.cursor;
    }
    // We don't need most of the metadata
    return listed.objects.map(({ key, uploaded }) => ({
      key: key.slice(this.uploadPath.length),
      uploaded,
    }));
  }

  async rebuildOrganization(organizationKey) {
    // Note: it will be necessary to call rebuildStation for each station after this. It is not done here because it leads to hitting resource limits.
    if (!isValid.key(organizationKey))
      throw new Error("organizationKey argument missing or invalid");
    // Clear out the cache for this organization
    await this.deleteAllFromCache(
      `data-points/${makeKey([organizationKey])}${keySeparator}`
    );
    await this.deleteFromCache(`stations/${makeKey([organizationKey])}`);
    // Passwords are stored separately, we will pass in to ensure the password is re-cached
    const organizationPasswords = await this.getObjectFromSource(
      "organization-passwords"
    );
    const organizations = await this.getOrganizations({ bypassCache: true });
    const organization = organizations[organizationKey];
    if (!organization) throw new Error("organization does not exist");
    // Re-save this organization to trigger casting
    await this.putOrganization(organizationKey, {
      ...organization,
      password: organizationPasswords[organizationKey],
    });
    return true;
  }

  async rebuildStation(organizationKey, stationKey) {
    // Re-save this station to trigger casting
    const station = await this.getStation(organizationKey, stationKey, {
      bypassCache: true,
    });
    await this.putStation(station.organizationKey, station.stationKey, station);
    // Re-save each data point to trigger casting
    const dataPoints = await this.getDataPoints(
      station.organizationKey,
      station.stationKey,
      { bypassCache: true }
    );
    // We shouldn't need to delete first since the data used for matching isn't changing
    await this.putDataPoints(
      station.organizationKey,
      station.stationKey,
      dataPoints
    );
    return true;
  }

  async rebuildAll() {
    const result = {
      organizations: {},
    };

    // Use sub-requests to workaround API limits
    const requestOptions = {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.env.ADMIN_API_KEY}`,
      },
    };

    // Fetch requires a host even though it won't be used
    const origin = new URL(this.request.url).origin;

    // Get all organizations
    const organizations = await this.getOrganizations({ bypassCache: true });
    const organizationKeys = Object.keys(organizations);
    for (const organizationKey of organizationKeys) {
      const response = await this.env.SELF.fetch(
        `${origin}/${apiPath}/rebuild-organization/${organizationKey}`,
        requestOptions
      );
      if (!response.ok) {
        throw new Error(
          `Failed to rebuild org data for ${organizationKey}: ${response.status} ${response.statusText}`
        );
      }
      const data = await response.json();
      result.organizations[organizationKey] = { msg: data.msg, stations: {} };
    }

    // Get all stations
    const stations = await this.getStationsArray({ bypassCache: true });
    for (const { organizationKey, stationKey } of stations) {
      const response = await this.env.SELF.fetch(
        `${origin}/${apiPath}/rebuild-station/${organizationKey}/${stationKey}`,
        requestOptions
      );
      if (!response.ok) {
        throw new Error(
          `Failed to rebuild station data for ${organizationKey}/${stationKey}: ${response.status}: ${response.statusText}`
        );
      }
      const data = await response.json();
      result.organizations[organizationKey].stations[stationKey] = {
        msg: data.msg,
      };
    }
    return result;
  }
}
