export class AccountClient {
    async loadProfile() {
        return this.request("/api/account", "GET");
    }
    async updateProfile(update) {
        return this.request("/api/account", "PATCH", update);
    }
    async request(url, method, body) {
        const response = await fetch(url, {
            method,
            credentials: "same-origin",
            headers: body ? { "content-type": "application/json" } : undefined,
            body: body ? JSON.stringify(body) : undefined,
        });
        const payload = (await response.json());
        if (!response.ok || !payload.profile) {
            throw new Error(payload.message ?? "Unable to load account profile");
        }
        return payload.profile;
    }
}
