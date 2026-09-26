"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = require("node:fs/promises");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const vitest_1 = require("vitest");
const AccountService_1 = require("./AccountService");
const PersistenceService_1 = require("./PersistenceService");
const temporaryDirectories = [];
async function createServiceAsync() {
    const directory = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "starfall-account-test-"));
    temporaryDirectories.push(directory);
    return new AccountService_1.LocalAccountService(new PersistenceService_1.JsonFilePersistenceService((0, node_path_1.join)(directory, "accounts.json")));
}
(0, vitest_1.afterEach)(async () => {
    await Promise.all(temporaryDirectories
        .splice(0)
        .map((directory) => (0, promises_1.rm)(directory, { recursive: true, force: true })));
});
(0, vitest_1.describe)("LocalAccountService", () => {
    (0, vitest_1.it)("creates an identity and resolves the same profile from its credential", async () => {
        const service = await createServiceAsync();
        const created = await service.resolveAccount(undefined);
        (0, vitest_1.expect)(created.credential).toBeTruthy();
        const resolved = await service.resolveAccount(created.credential ?? undefined);
        (0, vitest_1.expect)(resolved.credential).toBeNull();
        (0, vitest_1.expect)(resolved.account).toEqual(created.account);
    });
    (0, vitest_1.it)("persists display-name and preference updates", async () => {
        const service = await createServiceAsync();
        const created = await service.resolveAccount(undefined);
        const updated = await service.updateProfile(created.account.id, {
            displayName: "Nova Pilot",
            preferences: { soundEnabled: false },
        });
        (0, vitest_1.expect)(updated).toMatchObject({
            id: created.account.id,
            displayName: "Nova Pilot",
            preferences: { soundEnabled: false },
        });
        (0, vitest_1.expect)((await service.resolveAccount(created.credential ?? undefined)).account).toEqual(updated);
    });
    (0, vitest_1.it)("rejects invalid display names", async () => {
        const service = await createServiceAsync();
        const created = await service.resolveAccount(undefined);
        await (0, vitest_1.expect)(service.updateProfile(created.account.id, { displayName: "   " })).rejects.toBeInstanceOf(AccountService_1.AccountValidationError);
        await (0, vitest_1.expect)(service.updateProfile(created.account.id, {
            displayName: "x".repeat(25),
        })).rejects.toBeInstanceOf(AccountService_1.AccountValidationError);
    });
    (0, vitest_1.it)("does not allow a profile update for another account", async () => {
        const service = await createServiceAsync();
        await (0, vitest_1.expect)(service.updateProfile("missing-account", { displayName: "Nova" })).rejects.toBeInstanceOf(AccountService_1.AccountNotFoundError);
    });
});
