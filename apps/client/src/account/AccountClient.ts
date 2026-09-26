import type { AccountProfile, AccountProfileUpdate } from "@starfall/shared";

interface AccountResponse {
  profile?: AccountProfile;
  message?: string;
}

export class AccountClient {
  async loadProfile(): Promise<AccountProfile> {
    return this.request("/api/account", "GET");
  }

  async updateProfile(update: AccountProfileUpdate): Promise<AccountProfile> {
    return this.request("/api/account", "PATCH", update);
  }

  private async request(
    url: string,
    method: "GET" | "PATCH",
    body?: AccountProfileUpdate,
  ): Promise<AccountProfile> {
    const response = await fetch(url, {
      method,
      credentials: "same-origin",
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload = (await response.json()) as AccountResponse;
    if (!response.ok || !payload.profile) {
      throw new Error(payload.message ?? "Unable to load account profile");
    }
    return payload.profile;
  }
}
