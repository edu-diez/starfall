import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  AccountNotFoundError,
  AccountValidationError,
  LocalAccountService,
} from "./AccountService";
import { JsonFilePersistenceService } from "./PersistenceService";

const temporaryDirectories: string[] = [];

async function createServiceAsync(): Promise<LocalAccountService> {
  const directory = await mkdtemp(join(tmpdir(), "starfall-account-test-"));
  temporaryDirectories.push(directory);
  return new LocalAccountService(
    new JsonFilePersistenceService(join(directory, "accounts.json")),
  );
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("LocalAccountService", () => {
  it("creates an identity and resolves the same profile from its credential", async () => {
    const service = await createServiceAsync();

    const created = await service.resolveAccount(undefined);
    expect(created.credential).toBeTruthy();
    const resolved = await service.resolveAccount(
      created.credential ?? undefined,
    );

    expect(resolved.credential).toBeNull();
    expect(resolved.account).toEqual(created.account);
  });

  it("persists display-name and preference updates", async () => {
    const service = await createServiceAsync();
    const created = await service.resolveAccount(undefined);

    const updated = await service.updateProfile(created.account.id, {
      displayName: "Nova Pilot",
      preferences: { soundEnabled: false },
    });

    expect(updated).toMatchObject({
      id: created.account.id,
      displayName: "Nova Pilot",
      preferences: { soundEnabled: false },
    });
    expect(
      (await service.resolveAccount(created.credential ?? undefined)).account,
    ).toEqual(updated);
    await expect(service.getProfile(created.account.id)).resolves.toEqual(
      updated,
    );
  });

  it("rejects invalid display names", async () => {
    const service = await createServiceAsync();
    const created = await service.resolveAccount(undefined);

    await expect(
      service.updateProfile(created.account.id, { displayName: "   " }),
    ).rejects.toBeInstanceOf(AccountValidationError);
    await expect(
      service.updateProfile(created.account.id, {
        displayName: "x".repeat(25),
      }),
    ).rejects.toBeInstanceOf(AccountValidationError);
  });

  it("does not allow a profile update for another account", async () => {
    const service = await createServiceAsync();
    await expect(
      service.updateProfile("missing-account", { displayName: "Nova" }),
    ).rejects.toBeInstanceOf(AccountNotFoundError);
  });
});
