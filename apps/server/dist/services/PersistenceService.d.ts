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
/**
 * A durable local-development persistence adapter. It is intentionally limited
 * to one server process; production storage can replace this through the
 * PersistenceService interface without changing game rules or room logic.
 */
export declare class JsonFilePersistenceService implements PersistenceService {
    private readonly filePath;
    private writeQueue;
    constructor(filePath: string);
    getAccount(accountId: string): Promise<PersistedAccount | null>;
    saveAccount(account: PersistedAccount): Promise<void>;
    private readStore;
    private writeStore;
}
//# sourceMappingURL=PersistenceService.d.ts.map