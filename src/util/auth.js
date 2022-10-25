import Data from "./data";

export default class Auth {
  constructor(request, env) {
    if (request === undefined) throw new Error("Request argument missing");
    if (env === undefined) throw new Error("Env argument missing");
    const authHeader = request.headers.get("authorization") || "";
    this.apiKey = authHeader.startsWith("Bearer ")
      ? authHeader.substring(7)
      : authHeader;
    this.data = new Data(request, env);
  }

  async getUser() {
    if (this.user === undefined) {
      this.user = await this.data.getUser(this.apiKey);
    }
    return this.user;
  }

  async isUser() {
    // Check that an API key was included in request
    if (!this.apiKey) {
      return {
        valid: false,
        msg: "API key missing from Authorization header",
      };
    }

    // Check that a user exists for this API key
    const user = await this.getUser();
    if (!user) {
      return {
        valid: false,
        msg: "API key is invalid",
      };
    }

    return {
      valid: true,
      msg: "",
    };
  }

  async isAdmin() {
    const isUserResult = await this.isUser();
    if (!isUserResult.valid) return isUserResult;
    const user = await this.getUser();

    // Validate that authenticated user is an admin
    if (!user.admin) {
      return {
        valid: false,
        msg: "API key represents a non-admin user",
      };
    }

    return {
      valid: true,
      msg: "",
    };
  }

  async isOwner(organizationKey) {
    if (!organizationKey) throw new Error("Organization key missing");

    const isUserResult = await this.isUser();
    if (!isUserResult.valid) return isUserResult;
    const user = await this.getUser();

    // Validate that authenticated user can edit this organization
    if (user.organizationKey !== organizationKey && !user.admin) {
      return {
        valid: false,
        msg: "API key represents a user that doesn't have access to this organization",
      };
    }

    return {
      valid: true,
      msg: "",
    };
  }

  async isUserOrPublic(organizationKey) {
    if (!organizationKey) throw new Error("Organization key missing");

    // If the organization is public, no auth is required
    const organization = await this.data.getOrganization(organizationKey);
    if (organization?.public) return { valid: true, msg: "" };

    // Check password if auth header is present
    if (this.apiKey) {
      // First check if it matches the organization password, then test if it's a valid API key.
      // Org password will be checked against cache, API key against source of truth.
      if (
        (await this.data.checkOrganizationPassword(
          organizationKey,
          this.apiKey
        )) ||
        (await this.isUser()).valid
      ) {
        return { valid: true, msg: "" };
      } else {
        return {
          valid: false,
          msg: "Org is not public and password or API key is invalid",
        };
      }
    }
    return {
      valid: false,
      msg: "Org is not public and no password or API key was given",
    };
  }
}
