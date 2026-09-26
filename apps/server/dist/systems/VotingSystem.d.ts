import { GameRoomState } from "../rooms/schema/GameRoomState";
import { PlayerRole } from "@starfall/shared";
import { Clock } from "./MeetingSystem";
import { RoleAssignmentSystem } from "./RoleAssignmentSystem";
export interface VoteResult {
    success: boolean;
    reason?: string;
}
export interface VoteResolution {
    totals: Map<string, number>;
    abstainVotes: number;
    ejectedSessionId: string | null;
    ejectedRole: PlayerRole | null;
    resultsEndTime: number;
}
/**
 * Owns server-authoritative voting. Individual selections never leave this
 * system until votes are resolved.
 */
export declare class VotingSystem {
    private readonly state;
    private readonly roles;
    private readonly votes;
    private readonly eligibleVoters;
    private clock;
    private votingDeadline;
    constructor(state: GameRoomState, roles: RoleAssignmentSystem, clock?: Clock);
    startVoting(): boolean;
    submitVote(voterSessionId: string, targetSessionId: string | null): VoteResult;
    update(): VoteResolution | null;
    finishResults(): boolean;
    getVotingDeadline(): number;
    getEligibleVoterIds(): string[];
    removePlayer(sessionId: string): void;
    reset(): void;
    setClock(clock: Clock): void;
    private haveAllEligibleVotersSubmitted;
    private resolveVotes;
    private clearPublicVotingState;
}
//# sourceMappingURL=VotingSystem.d.ts.map