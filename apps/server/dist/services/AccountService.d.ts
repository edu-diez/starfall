import { type AccountProfile } from "@starfall/shared";
import { type PersistenceService } from "./PersistenceService";
export interface ResolvedAccount {
    account: AccountProfile;
    credential: string | null;
}
export interface AccountService {
    resolveAccount(credential: string | undefined): Promise<ResolvedAccount>;
    getProfile(accountId: string): Promise<AccountProfile>;
    updateProfile(accountId: string, update: unknown): Promise<AccountProfile>;
}
export declare class LocalAccountService implements AccountService {
    private readonly persistence;
    constructor(persistence: PersistenceService);
    resolveAccount(credential: string | undefined): Promise<ResolvedAccount>;
    getProfile(accountId: string): Promise<AccountProfile>;
    updateProfile(accountId: string, update: unknown): Promise<AccountProfile>;
}
export declare class AccountValidationError extends Error {
}
export declare class AccountNotFoundError extends Error {
}
//# sourceMappingURL=AccountService.d.ts.map