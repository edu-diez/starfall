import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import {
  type AccountProfile,
  type AccountPreferences,
  DEFAULT_ACCOUNT_PREFERENCES,
  validateAccountProfileUpdate,
} from "@starfall/shared";
import {
  type PersistedAccount,
  type PersistenceService,
} from "./PersistenceService";

export interface ResolvedAccount {
  account: AccountProfile;
  credential: string | null;
}

export interface AccountService {
  resolveAccount(credential: string | undefined): Promise<ResolvedAccount>;
  updateProfile(accountId: string, update: unknown): Promise<AccountProfile>;
}

export class LocalAccountService implements AccountService {
  constructor(private readonly persistence: PersistenceService) {}

  async resolveAccount(
    credential: string | undefined,
  ): Promise<ResolvedAccount> {
    const parsedCredential = parseCredential(credential);
    if (parsedCredential) {
      const stored = await this.persistence.getAccount(
        parsedCredential.accountId,
      );
      if (
        stored &&
        credentialsMatch(stored.credentialHash, parsedCredential.secret)
      ) {
        return { account: toProfile(stored), credential: null };
      }
    }

    const now = new Date().toISOString();
    const accountId = randomUUID();
    const secret = randomBytes(32).toString("base64url");
    const newAccount: PersistedAccount = {
      id: accountId,
      credentialHash: hashCredentialSecret(secret),
      displayName: "New Player",
      preferences: { ...DEFAULT_ACCOUNT_PREFERENCES },
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

  async updateProfile(
    accountId: string,
    update: unknown,
  ): Promise<AccountProfile> {
    const validation = validateAccountProfileUpdate(update);
    if (!validation.ok) {
      throw new AccountValidationError(validation.message);
    }

    const existing = await this.persistence.getAccount(accountId);
    if (!existing) {
      throw new AccountNotFoundError();
    }

    const preferences: AccountPreferences = {
      ...existing.preferences,
      ...validation.value.preferences,
    };
    const updated: PersistedAccount = {
      ...existing,
      displayName: validation.value.displayName ?? existing.displayName,
      preferences,
      updatedAt: new Date().toISOString(),
    };
    await this.persistence.saveAccount(updated);
    return toProfile(updated);
  }
}

export class AccountValidationError extends Error {}
export class AccountNotFoundError extends Error {}

function parseCredential(
  credential: string | undefined,
): { accountId: string; secret: string } | null {
  if (!credential) return null;
  const [accountId, secret, ...rest] = credential.split(".");
  if (
    !accountId ||
    !secret ||
    rest.length > 0 ||
    !/^[0-9a-f-]{36}$/i.test(accountId) ||
    secret.length < 32
  ) {
    return null;
  }
  return { accountId, secret };
}

function hashCredentialSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("base64url");
}

function credentialsMatch(expectedHash: string, secret: string): boolean {
  const expected = Buffer.from(expectedHash);
  const actual = Buffer.from(hashCredentialSecret(secret));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function toProfile(account: PersistedAccount): AccountProfile {
  return {
    id: account.id,
    displayName: account.displayName,
    preferences: { ...account.preferences },
  };
}
