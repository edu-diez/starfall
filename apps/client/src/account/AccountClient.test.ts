import { afterEach, describe, expect, it, vi } from "vitest";
import { AccountClient } from "./AccountClient";

const profile = {
  id: "account-1",
  displayName: "Nova",
  preferences: { soundEnabled: true },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AccountClient", () => {
  it("loads the profile with same-origin credentials", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ profile }), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(new AccountClient().loadProfile()).resolves.toEqual(profile);
    expect(fetchMock).toHaveBeenCalledWith("/api/account", {
      method: "GET",
      credentials: "same-origin",
      headers: undefined,
      body: undefined,
    });
  });

  it("reports server validation failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "Display name is invalid" }), {
          status: 400,
        }),
      ),
    );

    await expect(
      new AccountClient().updateProfile({ displayName: " " }),
    ).rejects.toThrow("Display name is invalid");
  });
});
