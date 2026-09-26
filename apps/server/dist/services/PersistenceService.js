"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonFilePersistenceService = void 0;
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const EMPTY_STORE = {
    schemaVersion: 1,
    accounts: {},
};
/**
 * A durable local-development persistence adapter. It is intentionally limited
 * to one server process; production storage can replace this through the
 * PersistenceService interface without changing game rules or room logic.
 */
class JsonFilePersistenceService {
    filePath;
    writeQueue = Promise.resolve();
    constructor(filePath) {
        this.filePath = filePath;
    }
    async getAccount(accountId) {
        const store = await this.readStore();
        return store.accounts[accountId] ?? null;
    }
    async saveAccount(account) {
        this.writeQueue = this.writeQueue.then(async () => {
            const store = await this.readStore();
            store.accounts[account.id] = account;
            await this.writeStore(store);
        });
        return this.writeQueue;
    }
    async readStore() {
        try {
            const contents = await (0, promises_1.readFile)(this.filePath, "utf8");
            const parsed = JSON.parse(contents);
            if (!isAccountStoreFile(parsed)) {
                throw new Error("Account store has an unsupported schema");
            }
            return parsed;
        }
        catch (error) {
            if (isMissingFileError(error)) {
                return structuredClone(EMPTY_STORE);
            }
            throw error;
        }
    }
    async writeStore(store) {
        await (0, promises_1.mkdir)((0, node_path_1.dirname)(this.filePath), { recursive: true });
        const temporaryPath = `${this.filePath}.tmp`;
        await (0, promises_1.writeFile)(temporaryPath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
        await (0, promises_1.rename)(temporaryPath, this.filePath);
    }
}
exports.JsonFilePersistenceService = JsonFilePersistenceService;
function isMissingFileError(error) {
    return (typeof error === "object" &&
        error !== null &&
        error.code === "ENOENT");
}
function isAccountStoreFile(value) {
    if (!value || typeof value !== "object")
        return false;
    const store = value;
    return (store.schemaVersion === 1 &&
        typeof store.accounts === "object" &&
        store.accounts !== null);
}
