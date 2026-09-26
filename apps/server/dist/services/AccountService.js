"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountNotFoundError = exports.AccountValidationError = exports.LocalAccountService = void 0;
const node_crypto_1 = require("node:crypto");
const shared_1 = require("@starfall/shared");
class LocalAccountService {
    constructor(persistence) {
        this.persistence = persistence;
    }
    async resolveAccount(credential) {
        const parsedCredential = parseCredential(credential);
        if (parsedCredential) {
            const stored = await this.persistence.getAccount(parsedCredential.accountId);
            if (stored &&
                credentialsMatch(stored.credentialHash, parsedCredential.secret)) {
                return { account: toProfile(stored), credential: null };
            }
        }
        const now = new Date().toISOString();
        const accountId = (0, node_crypto_1.randomUUID)();
        const secret = (0, node_crypto_1.randomBytes)(32).toString("base64url");
        const newAccount = {
            id: accountId,
            credentialHash: hashCredentialSecret(secret),
            displayName: "New Player",
            preferences: { ...shared_1.DEFAULT_ACCOUNT_PREFERENCES },
            progression: {},
            statistics: {},
            cosmetics: {},
            createdAt: now,
            updatedAt: now,
        };
        await this.persistence.saveAccount(newAccount);
        return {
            account: toProfile(newAccount),
            credential: `${accountId}.${secret}`,
        };
    }
    async updateProfile(accountId, update) {
        const validation = (0, shared_1.validateAccountProfileUpdate)(update);
        if (!validation.ok) {
            throw new AccountValidationError(validation.message);
        }
        const existing = await this.persistence.getAccount(accountId);
        if (!existing) {
            throw new AccountNotFoundError();
        }
        const preferences = {
            ...existing.preferences,
            ...validation.value.preferences,
        };
        const updated = {
            ...existing,
            displayName: validation.value.displayName ?? existing.displayName,
            preferences,
            updatedAt: new Date().toISOString(),
        };
        await this.persistence.saveAccount(updated);
        return toProfile(updated);
    }
}
exports.LocalAccountService = LocalAccountService;
class AccountValidationError extends Error {
}
exports.AccountValidationError = AccountValidationError;
class AccountNotFoundError extends Error {
}
exports.AccountNotFoundError = AccountNotFoundError;
function parseCredential(credential) {
    if (!credential)
        return null;
    const [accountId, secret, ...rest] = credential.split(".");
    if (!accountId ||
        !secret ||
        rest.length > 0 ||
        !/^[0-9a-f-]{36}$/i.test(accountId) ||
        secret.length < 32) {
        return null;
    }
    return { accountId, secret };
}
function hashCredentialSecret(secret) {
    return (0, node_crypto_1.createHash)("sha256").update(secret).digest("base64url");
}
function credentialsMatch(expectedHash, secret) {
    const expected = Buffer.from(expectedHash);
    const actual = Buffer.from(hashCredentialSecret(secret));
    return expected.length === actual.length && (0, node_crypto_1.timingSafeEqual)(expected, actual);
}
function toProfile(account) {
    return {
        id: account.id,
        displayName: account.displayName,
        preferences: { ...account.preferences },
    };
}
