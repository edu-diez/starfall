import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export interface PersistedAccount {
  id: string;
  credentialHash: string;
  displayName: string;
  preferences: {
    soundEnabled: boolean;
  };
  progression: Record<string, never>;
  statistics: Record<string, never>;
  cosmetics: Record<string, never>;
  createdAt: string;
  updatedAt: string;
}

export interface PersistenceService {
  getAccount(accountId: string): Promise<PersistedAccount | null>;
  saveAccount(account: PersistedAccount): Promise<void>;
}

interface AccountStoreFile {
  schemaVersion: 1;
  accounts: Record<string, PersistedAccount>;
}

const EMPTY_STORE: AccountStoreFile = {
  schemaVersion: 1,
  accounts: {},
};

/**
 * A durable local-development persistence adapter. It is intentionally limited
 * to one server process; production storage can replace this through the
 * PersistenceService interface without changing game rules or room logic.
 */
export class JsonFilePersistenceService implements PersistenceService {
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  async getAccount(accountId: string): Promise<PersistedAccount | null> {
    const store = await this.readStore();
    return store.accounts[accountId] ?? null;
  }

  async saveAccount(account: PersistedAccount): Promise<void> {
    this.writeQueue = this.writeQueue.then(async () => {
      const store = await this.readStore();
      store.accounts[account.id] = account;
      await this.writeStore(store);
    });

    return this.writeQueue;
  }

  private async readStore(): Promise<AccountStoreFile> {
    try {
      const contents = await readFile(this.filePath, "utf8");
      const parsed: unknown = JSON.parse(contents);
      if (!isAccountStoreFile(parsed)) {
        throw new Error("Account store has an unsupported schema");
      }
      return parsed;
    } catch (error: unknown) {
      if (isMissingFileError(error)) {
        return structuredClone(EMPTY_STORE);
      }
      throw error;
    }
  }

  private async writeStore(store: AccountStoreFile): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.tmp`;
    await writeFile(
      temporaryPath,
      `${JSON.stringify(store, null, 2)}\n`,
      "utf8",
    );
    await rename(temporaryPath, this.filePath);
  }
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}

function isAccountStoreFile(value: unknown): value is AccountStoreFile {
  if (!value || typeof value !== "object") return false;
  const store = value as Partial<AccountStoreFile>;
  return (
    store.schemaVersion === 1 &&
    typeof store.accounts === "object" &&
    store.accounts !== null
  );
}
