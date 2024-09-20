# SeaStats Dashboard API: CloudFlare Workers Implementation

This is a CloudFlare Workers implementation of the API required by the [SeaStats Dashboard](https://github.com/orcasound/seastats-dashboard). In addition to the endpoints required by the dashboard for retrieving data, this implementation includes endpoints for uploading and managing data.

## Acknowledgments

This project is funded by [NCCS](https://bcwhales.org/) (BC Whales) and [Orcasound](https://www.orcasound.net/), and developed by [Soundspace Analytics](https://soundspaceanalytics.ca/).

## Technical overview

### Technology stack

The technology stack for this project was chosen for its low cost, minimal maintenance requirements, and high performance.

The technology stack is based in javascript and includes:

- [CloudFlare Workers](https://developers.cloudflare.com/workers/) platform
- [CloudFlare KV](https://developers.cloudflare.com/kv/) key-value data storage
- [CloudFlare R2](https://developers.cloudflare.com/r2/) raw data storage
- [Cloudflare Wrangler](https://developers.cloudflare.com/workers/wrangler/) command-line interface
- [Node.js](https://nodejs.org/)

### Architecture

The source of truth for this API is JSON files stored in R2. R2 storage is relatively slow to read from, so KV storage is used as a caching layer.

We couldn't use KV as the sole storage solution due to its 'eventually consistent' nature, which means that when you read from it you may be viewing stale data.

API requests that include an API key will always bypass the cache to ensure the most up-to-date data is returned.

Uploaded files such as images and audio are currently not cached in KV.

### Known issues and limitations

- When reading from KV (without an API key), the data may be up to 60 seconds old due to caching.
- Our data writing process involves reading, updating, and then saving JSON files, which means that parallel API calls that write to the same file could result in data loss. In general, data from different organisations will be in different JSON files, so writing to different organisations at the same time should be safe - but updating multiple stations within the same organisation in parallel may be problematic.
- When this API implementation was initially planned it was going to be very simple, and storing data in static JSON files was a good fit for the initial needs. Additionally, a suitable serverless database product wasn't available at the time. The complexity of this API has grown a lot since then, and we have tacked on a lot of features that would be better served by a more traditional database.
- Currently when filtering with fromDate and toDate for data points that have a `startDateTime` property, we do not correct for the station's timezone. That means the client may receive additional data points and/or be missing data points within +/- 24 hours from the requested range.

## Getting started

The following guide will help you set up two API instances on your own Cloudflare account. One will be for development purposes (a sandbox for testing) and the other will be for production.

You will need:

- a [Cloudflare](https://www.cloudflare.com/) account
- [Node.js](https://nodejs.org/) installed on your computer

You can also optionally obtain:

- a custom domain name for the API to be served from
- a [Sentry](https://sentry.io/) account for error tracking.

To better understand the Cloudflare Workers platform, you may want to follow the [Getting Started guide](https://developers.cloudflare.com/workers/get-started/guide/).

**Note:** We'll use the `seastats-api-` namespace/prefix for the rest of this guide. Replace this with your own namespace if you prefer.

### 1. Set up Cloudflare KV and R2 storage

Open your [Cloudflare dashboard](https://dash.cloudflare.com/) and:

1. Upgrade to a paid ($5/mo) Workers plan to enable the use of R2 storage and higher resource limits.
   - An upgrade link can be found in the sidebar of the _'Workers & Pages > Overview'_ page.
   - Note: Cloudflare Workers is very cost-effective but make sure you understand the [pricing model](https://developers.cloudflare.com/workers/platform/pricing/) and set up [billing notifications](https://developers.cloudflare.com/notifications/notification-available/#billing) to avoid unexpected charges.
1. [Manually create KV namespaces](https://developers.cloudflare.com/kv/get-started/#create-a-kv-namespace-via-the-dashboard) named
   - seastats-api-dev
   - seastats-api-prod
1. [Manually create R2 buckets](https://developers.cloudflare.com/r2/get-started/#2-create-a-bucket) named
   - seastats-api-dev
   - seastats-api-prod

### 2. Set up local environment and deploy workers

1. Clone this repository to your local machine.
   - If you're new to git, you can [learn about it here](https://docs.github.com/en/get-started), or [download the project files](https://docs.github.com/en/get-started/start-your-journey/downloading-files-from-github) instead of cloning the repository.
2. Duplicate the `wrangler.toml.example` file found in the root of this project as `wrangler.toml`, and fill in the necessary details:
   - Enter your Cloudflare account ID. This can be found in the sidebar of the _'Workers & Pages > Overview'_ page in your Cloudflare dashboard.
   - Enter your KV namespace IDs. These can be found in the Cloudflare dashboard under the _'Workers & Pages > KV'_ page. Hovering over an ID should show a button to copy it.
   - Update the R2 bucket names if you chose different ones.
   - If you want to use the `/dashboard.js` endpoint, enter `CLIENT_URL` values.
3. Open a terminal window and:
   - `cd` to the root of this project. Run `npx wrangler login` to authenticate with your Cloudflare account.
   - Run `npx wrangler publish` and `npx wrangler publish --env production` to push a development and production worker to your Cloudflare account.
   - Record the URLs provided by Cloudflare for each worker – these will be the endpoints for your API. (You can also find these URLs in your Cloudflare dashboard.)
   - Now that your workers are deployed, uncomment the `services` sections in the `wrangler.toml` file (remove the `#` characters at the start of the lines) then run `npx wrangler publish` and `npx wrangler publish --env production` again. This allows the worker to call itself.
4. Add an `ADMIN_API_KEY` [environment variable](https://developers.cloudflare.com/workers/configuration/secrets/) to each worker. This api key will be used for admin functions such as creating new users.
   - Run `npx wrangler secret put ADMIN_API_KEY` to enter a value for the development worker.
   - When prompted, enter a long, randomly generated string. You can use a [guid generator](https://www.guidgenerator.com/) to create a suitable value.
   - Run `npx wrangler secret put ADMIN_API_KEY --env production` and enter a value for the production worker. Make sure to use a different value from the development worker.

### 3. You're ready to go!

You should now be able to access your API at the URLs provided by Cloudflare. See the [API documentation](#api-documentation) for more information on how to use the API, or read the [Local development](#local-development) section if you wish to modify the API code. To easily test the API, see the [Testing with Insomnia](#testing-with-insomnia) section, which includes an Insomnia collection you can import.

## Local development

- You can use the [`wrangler dev`](https://developers.cloudflare.com/workers/wrangler/commands/#dev) command to run a local development server that will proxy requests to your Cloudflare workers. This is useful for testing changes before deploying them.
  - Before running this command for the first time, create a `.dev.vars` file in the root of the project with the following content, substituting in your own value between the quotes. This sets the api key for the local development server made available by the `wrangler dev` command. This can be any value but should be different from the production and development API keys.
    ```
    ADMIN_API_KEY="<some-random-value>"
    ```
- Run `npx wrangler publish` to publish your local code to the development worker
- Run `npx wrangler publish --env production` to publish your local code to the production worker

### Troubleshooting:

- See https://developers.cloudflare.com/workers/observability/

## API documentation

### Users and authentication

When sending requests to the API, you can optionally include an API key as a Bearer Token in the `Authorization` header. An API key is required for all endpoints that modify data, and will also have the effect of bypassing the cache when included on public endpoints.

There are two types of API keys, which we conceptualize as users.

#### Admin User

- Only one per API installation.
- Can perform administrative tasks, such as creating new users.
- Identified by `ADMIN_API_KEY` environment variable.

#### Organisation users

- Can be created via the `PUT /user` endpoint.
- Can only edit the data of their organisation.
- Each organisation can have many users. A unique user should be created for each device that needs to access your API.
- When you create a user, you'll receive an API token in response. You can invalidate the current API key and get a new one by sending another PUT request to the /user endpoint with the user's name.

Security note: organisation user API keys are stored in plain text in a JSON file, but these files are "encrypted at rest".

### Time zones

Each station has a `timeZone` property that should be set to a [TZ Database Name](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones). This allows for localised display of data such as sunrise/sunset times, and for time-based data points to be correctly aligned with the station's local time zone when filtering.

All timestamps must be in UTC ISO 8601 format, for example `2021-01-01T12:00:00.000Z`.

#### API responses

Check the response status header for the HTTP status code. A 200 status code indicates success, while a 4xx or 5xx status code indicates an error.

Usually, the API will respond with a JSON object that includes some or all of the following properties:

- `success`: A boolean indicating whether the operation was successful.
- `msg`: A string with a message describing the result of the operation.
- `warnings`: An array of strings with any warnings that occurred during the operation. This may contain hints on fields which were not filled out.
- `errors`: An array of strings with any errors that occurred during the operation. This may contain validation errors.
- `data`: An object containing the data returned by the operation.
- `cacheHit`: A boolean indicating whether the response was served from the cache.

### API endpoints

#### Organizations

##### PUT `/organization/{ORGANIZATION_KEY}`

Create or update an organization.

- Admin API key required.
- `ORGANIZATION_KEY` should be a unique string that represents the organization. It can only include letters, numbers and hyphens.
- Omitting a property will cause the existing value (if any) to be retained.
- To 'delete' the value of a property, set the value to null.

JSON payload structure:

| Key      | Type           | Description                                                                                                |
| -------- | -------------- | ---------------------------------------------------------------------------------------------------------- |
| name     | string         | (optional when updating) The name of the organization                                                      |
| logoUrl  | null or string | (optional) URL to an image to use as the logo for this organization                                        |
| metadata | null or object | (optional) Any additional data you want to store                                                           |
| password | null or string | (optional) Set a password to limit access to this organization's data. Set to null to remove the password. |

Example JSON payload:

```json
{
  "name": "Test Org",
  "logoUrl": null,
  "metadata": {
    "test": 1234,
    "foo": "bar"
  },
  "password": null
}
```

##### DELETE `/organization/{ORGANIZATION_KEY}`

Delete an organization, along with all of it's associated data (users, stations, uploads, data points).

- Admin API key required

##### GET `/organization/{ORGANIZATION_KEY}`

- See the [client documentation](https://github.com/orcasound/seastats-dashboard?tab=readme-ov-file#get-organizationorganization_key) for details.

##### GET `/organizations`

Retrieve a list of organizations and their properties. All properties set on each organization will be shown except for `password`, instead a `public` property will be included and set to `false` if the organization has a password.

Example response:

```json
{
  "success": true,
  "msg": "Operation was successful",
  "warnings": [],
  "cacheHit": true,
  "data": {
    "test-org": {
      "key": "test-org",
      "name": "Test Org",
      "logoUrl": null,
      "metadata": {
        "test": 1234,
        "foo": "bar"
      },
      "public": true
    },
    "private-org": {
      "key": "private-org",
      "name": "Test Private Org",
      "logoUrl": "https://example.com/logo.png",
      "metadata": null,
      "public": false
    }
  }
}
```

##### PUT `/organization-upload/{ORGANIZATION_KEY}/{FILE_PATH}`

Upload a file for a particular organization.

- API key required.
- `FILE_PATH` is a filename that can optionally included `/` characters to denote a directory structure. Example: `audio/orca-sample.mp4`
- Set the body of the request to the contents of the file being uploaded.
- The `Content-Type` header should be set to the type of file being uploaded, for example `image/png` for a PNG image, or `audio/mp4` for an AAC audio file with a .mp4 file extension.

##### DELETE `/organization-upload/{ORGANIZATION_KEY}/{FILE_PATH}`

Delete an existing organization upload.

- API key required.

##### GET `/organization-upload/{ORGANIZATION_KEY}/{FILE_PATH}`

Retrieve an organization upload (acts as a direct link to download the file).

##### GET `/organization-uploads/{ORGANIZATION_KEY}`

Retrieve a list of organization uploads.

- Optionally append a path prefix to filter results.`/organization-uploads/{ORGANIZATION_KEY}/{PATH_PREFIX}`

Example response:

```json
{
  "success": true,
  "msg": "Operation was successful",
  "warnings": [],
  "cacheHit": true,
  "data": [
    {
      "key": "test-org/test-station-01/audio/orca-audio-sample.mp4",
      "uploaded": "2024-05-30T20:38:56.093Z",
      "url": "https://example.com/api/v1/organization-upload/test-org/test-station-01/audio/orca-audio-sample.mp4"
    }
  ]
}
```

#### Users

##### PUT `/user/{ORGANIZATION_KEY}/{USER_KEY}`

Create a new user, or cycle the API key of an existing user.

- Admin API key required
- User API key will be returned in the response

Example response:

```json
{
  "success": true,
  "msg": "Operation was successful",
  "warnings": [],
  "cacheHit": false,
  "data": {
    "apiKey": "ccd72640-782c-4ff9-af09-8f342c9994d5-e8ca8396-18bd-4f4a-b003-cbe94b9b90a4-dd7fe9e4-0aaa-45fb-a31d-afe9a2a8a42d"
  }
}
```

##### DELETE `/user/{ORGANIZATION_KEY}/{USER_KEY}`

Delete a user.

- Admin API key required

##### GET `/users`

Retrieve a list of users and the organization they are associated with. Does not include API keys.

- Admin API key required

Example response:

```json
{
  "success": true,
  "msg": "Operation was successful",
  "warnings": [],
  "cacheHit": true,
  "data": [
    {
      "organizationKey": "test-org",
      "userKey": "erics-mac-mini"
    },
    {
      "organizationKey": "test-org",
      "userKey": "jon-bon-jovial"
    }
  ]
}
```

#### Stations

##### PUT `/station/{ORGANIZATION_KEY}/{STATION_KEY}`

- API key required.
- `STATION_KEY` should be a unique string that represents the station. It can only include letters, numbers and hyphens.
- Omitting a property will cause the existing value (if any) to be retained.
- To 'delete' the value of a property, set the value to null.

JSON payload structure:

| Key                | Type             | Description                                                                                                                                                                                                   |
| ------------------ | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| name               | string           | (optional when updating) The name of the station                                                                                                                                                              |
| latitude           | number           | (optional when updating) The latitude of the station                                                                                                                                                          |
| longitude          | number           | (optional when updating) The longitude of the station                                                                                                                                                         |
| timeZone           | string           | (optional when updating) The timezone of the station. Use a [TZ Database Name](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones) such as 'America/Vancouver' for lunar/daylight calculations etc. |
| logoUrl            | null or string   | (optional) URL to an image to use as the logo for this station                                                                                                                                                |
| audioVisualisation | string           | (optional) The type of audio visualisation to use for this station. Can be 'spectrogram' or 'waveform'                                                                                                        |
| sidebarText        | array of objects | (optional) An array of objects with `label` and `text` properties to display in the sidebar of the dashboard                                                                                                  |
| metadata           | null or object   | (optional) Any additional data you want to store                                                                                                                                                              |

Example JSON payload:

```json
{
  "name": "Test Station 01",
  "latitude": 50.600408,
  "longitude": -126.70807,
  "timeZone": "America/Vancouver",
  "logoUrl": null,
  "audioVisualisation": "spectrogram",
  "sidebarText": [
    {
      "label": "Region",
      "text": "Blackfish Sound"
    },
    {
      "label": "Species",
      "text": "Humpback, Orca"
    }
  ],
  "metadata": {
    "anything": 10,
    "you": false,
    "like": [
      "can",
      "be saved",
      {
        "in": "metadata"
      }
    ]
  }
}
```

##### DELETE `/station/{ORGANIZATION_KEY}/{STATION_KEY}`

Delete a station and all associated data points and file uploads.

- API key required.

##### GET `/station/{ORGANIZATION_KEY}/{STATION_KEY}`

Retrieve a station and its properties.

- See the [client documentation](https://github.com/orcasound/seastats-dashboard?tab=readme-ov-file#get-stationorganization_keystation_key) for details.

##### GET `/stations`

Retrieve a list of stations and their properties. Includes the same data as the ``/station/{ORGANIZATION_KEY}/{STATION_KEY}` endpoint but for all stations.

##### PUT `/station-upload/{ORGANIZATION_KEY}/{STATION_KEY}/{UPLOAD_TYPE_KEY}/{FILE_PATH}`

Upload a file for a particular station.

- API key required.
- `UPLOAD_TYPE_KEY` is a unique string that represents the type of upload. It can only include letters, numbers and hyphens.
- `FILE_PATH` is a filename that can optionally include `/` characters to denote a directory structure. Example: `audio/orca-sample.mp4`
- Set the body of the request to the contents of the file being uploaded.
- The `Content-Type` header should be set to the type of file being uploaded, for example `image/png` for a PNG image, or `audio/mp4` for an AAC audio file with a .mp4 file extension.

##### DELETE `/station-upload/{ORGANIZATION_KEY}/{STATION_KEY}/{UPLOAD_TYPE_KEY}/{FILE_PATH}`

Delete an existing station upload.

- API key required.

##### GET `/station-upload/{ORGANIZATION_KEY}/{STATION_KEY}/{UPLOAD_TYPE_KEY}/{FILE_PATH}`

Retrieve a station upload (acts as a direct link to download the file).

##### GET `/station-uploads/{ORGANIZATION_KEY}/{STATION_KEY}`

Retrieve a list of station uploads.

- See the [client documentation](https://github.com/orcasound/seastats-dashboard?tab=readme-ov-file#get-station-uploadsorganization_keystation_key) for details.

##### PUT `/data/{ORGANIZATION_KEY}/{STATION_KEY}`

Create or replace data points for a particular station.

- API key required.
- See the [client documentation](https://github.com/orcasound/seastats-dashboard?tab=readme-ov-file#get-dataorganization_keystation_key) for details on types and shapes of permitted data points.
- For data point types that have a `date` property, uploading a data point with the same date as an existing data point will overwrite the existing data point.
- For data point types that have a `startDateTime` property, uploading a data point with the same `startDateTime` as an existing data point will overwrite the existing data point.
- To determine whether a data point already exists, a key is constructed from the `dataPointType` and `date` or `startDateTime` properties. If a data point with the same key already exists, it will be overwritten. Some data point types may use additional identifier properties in the key, for example the 'exceedance' data point type uses the 'band' and 'threshold' properties in the key, and 'callEvent' data points use the 'species' and 'callType' properties in the key.

Example JSON payload:

```json
[
  {
    "dataPointType": "recordingCoverage",
    "date": "2021-01-03",
    "value": 0.16527777777777777
  },
  {
    "dataPointType": "recordingCoverage",
    "date": "2021-01-04",
    "value": null
  }
]
```

##### DELETE `/data/{ORGANIZATION_KEY}/{STATION_KEY}`

Delete all data points for a particular station that match the query parameters.

- API key required.
- Caution: if no query parameters are provided, all data points for the station will be deleted.
- See the [client documentation](https://github.com/orcasound/seastats-dashboard?tab=readme-ov-file#get-dataorganization_keystation_key) for the query parameters that can be used as filters.

##### GET `/data/{ORGANIZATION_KEY}/{STATION_KEY}`

Retrieve data points for a particular station.

- See the [client documentation](https://github.com/orcasound/seastats-dashboard?tab=readme-ov-file#get-dataorganization_keystation_key) for details.

#### Other

##### GET `/summary`

Retrieve a summary of the data stored in the API. This essentially combines the output of the `/organizations` and `/stations` endpoints.

##### GET `/dashboard.js`

This endpoint is intended to be used in a script tag, and will take care of loading the SeaStats client javascript bundle and css in to the page so that a dashboard can be rendered. See the [client documentation](https://github.com/orcasound/seastats-dashboard?tab=readme-ov-file#embedding) for details.

Usage: `<script src="https://example.com/api/v1/dashboard.js"></script>`

##### GET `/rebuild-organization/{ORGANIZATION_KEY}`

Sanitise the data structure of a particular organization and rebuild the cache.

- Admin API key required

##### GET `/rebuild-station/{ORGANIZATION_KEY}/{STATION_KEY}`

Sanitise the data structure of a particular station and all of it's data points, and rebuild the cache.

- Admin API key required

##### GET `/rebuild-all`

Sanitise data and rebuild the cache for all known orgs and stations.

- Admin API key required

### Testing with Insomnia

[Insomnia](https://insomnia.rest/) tool for testing APIs. Subscriptions are available but the core features can be used for free. To get started, follow these steps:

- [Download and install Insomnia](https://insomnia.rest/download)
- [Import the Insomnia collection](https://docs.insomnia.rest/insomnia/import-export-data) found in the `insomnia` directory of this project, and open it.
- Insomnia allows you to [create environments for holding variables](https://docs.insomnia.rest/insomnia/environment-variables). We suggest creating a separate environment for each station, so that you can re-use the same requests. A 'Test Station 01' environment is included in the collection. Edit it so that the `ADMIN_API_KEY` and `HOST` variables match your own setup.
- You can now use the requests in the collection to interact with your API. The requests are organised into folders that correspond to the API endpoints. Open the _Admin > PUT Organization_ endpoint and click the 'Send' button to create a new organization. This will create a new organization with the key `test-org`, since that is the value of the `ORGANIZATION_KEY` variable in the selected environment. The `JSON` tab of the UI shows you the JSON payload that was sent to the API.
- Use the _User > PUT Station_ endpoint to create a new station. This will create a station with the key `test-station-01` under the `test-org` organization.
- We now have an organization and a station, but no data points. Use the _User > PUT Data Points_ endpoint to upload some sample data points for the station. The `JSON` tab of the UI shows you the JSON payload that was sent to the API.
- Finally, try the _Public > GET Station_ and _Public > GET Data Points_ endpoints to retrieve the data you uploaded. The response will be shown in the `Preview` tab of the UI.

Note: if you are using a local API endpoint provided by `wrangler dev` you can use the API key found in the `.dev.vars` file for admin access.

## Troubleshooting

### Rebuilding the cache

In the event that the KV cache becomes corrupted or out of sync with the R2 storage (for example after restoring from a backup), you can rebuild the cache with the [`rebuild-all`](#get-rebuild-all) endpoint.

## R2 storage backup process

### Installation and configuration

1. [Create an API token](https://developers.cloudflare.com/r2/api/s3/tokens/) in CloudFlare for accessing your bucket/s

   - Make sure to copy the **S3 Access Key ID** and **Secret Access Key** on the confirmation screen as you will not be able to access them afterwards.
   - The default 'object read only' permission will be fine if you only want to back up your files. If you want to be able to restore backups with rclone you would need to enable write permissions. If you get a 403 permissions error while using rclone, you likely need to adjust your permissions.

2. Copy your [Cloudflare Account ID](https://developers.cloudflare.com/fundamentals/setup/find-account-and-zone-ids/) during the setup process
3. [Install rclone](https://rclone.org/install/).
4. [Configure rclone to access your R2 account](https://rclone.org/s3/#cloudflare-r2).

   - Enter a name such as `seastats-r2` when prompted

### Backup command

To download all data from your R2 storage to a local directory, use the command below. The first download may take some time depending on your internet speed and the data volume, but subsequent backups to the same directory should be much faster as only new or changed files would be downloaded.

Note that the sync command will **delete** files in the destination directory that are not present in the source directory. It's recommended to use the `--dry-run` flag first to preview what files would be affected. After you've checked the result, you can run the command again without that flag to actually sync the files.

```
rclone sync --dry-run seastats-r2:seastats-api-prod {YOUR_LOCAL_BACKUP_DIRECTORY}
```

Rclone can sync to a variety of destinations, including other cloud storage providers, so you can use it to back up your data to multiple locations.

## Roadmap (ideas for future development)

- Make use of [Cloudflare D1](https://developers.cloudflare.com/d1/) and an ORM such as [Drizzle](https://orm.drizzle.team/)
  - Improve data access performance
  - Simplify code
  - Remove/reduce need for validation/casting/rebuilding JSON data
- Use a validation library such as JOI instead of custom code
- Provide resampled versions of images suitable for user's screen
- Make use of Cloudflare's cache API to set a TTL on requests that don't include an API key
  - This should allow near-instantaneous subsequent JSON responses and faster image and audio loading
- Better password-protection solution for organisation data
  - This currently is only a rudimentary implementation and potentially insecure.
