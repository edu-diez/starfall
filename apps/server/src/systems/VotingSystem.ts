import { GameRoomState } from "../rooms/schema/GameRoomState";
import {
  GAME_CONFIG,
  GamePhase,
  PlayerRole,
  PlayerState,
} from "@starfall/shared";
import { Clock, DefaultClock } from "./MeetingSystem";
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
export class VotingSystem {
  private readonly votes = new Map<string, string | null>();
  private readonly eligibleVoters = new Set<string>();
  private clock: Clock;
  private votingDeadline = 0;

  constructor(
    private readonly state: GameRoomState,
    private readonly roles: RoleAssignmentSystem,
    clock: Clock = new DefaultClock(),
  ) {
    this.clock = clock;
  }

  startVoting(): boolean {
    if (this.state.phase !== GamePhase.Voting) {
      return false;
    }

    this.clearPublicVotingState();
    this.votes.clear();
    this.eligibleVoters.clear();
    this.state.players.forEach((player, sessionId) => {
      if (player.state === PlayerState.Alive) {
        this.eligibleVoters.add(sessionId);
      }
    });

    this.votingDeadline = this.clock.now() + GAME_CONFIG.VOTING_TIME * 1000;
    this.state.voteDeadline = this.votingDeadline;
    return true;
  }

  submitVote(voterSessionId: string, targetSessionId: string | null): VoteResult {
    if (this.state.phase !== GamePhase.Voting) {
      return { success: false, reason: "Voting is not active" };
    }
    if (this.clock.now() >= this.votingDeadline) {
      return { success: false, reason: "Voting has ended" };
    }
    if (!this.eligibleVoters.has(voterSessionId)) {
      return { success: false, reason: "Only eligible living players can vote" };
    }

    const voter = this.state.players.get(voterSessionId);
    if (!voter || voter.state !== PlayerState.Alive) {
      return { success: false, reason: "Only eligible living players can vote" };
    }

    if (targetSessionId !== null) {
      const candidate = this.state.players.get(targetSessionId);
      if (!candidate || candidate.state !== PlayerState.Alive) {
        return { success: false, reason: "Vote target must be a living player" };
      }
    }

    this.votes.set(voterSessionId, targetSessionId);
    this.state.voteSubmitted.set(voterSessionId, true);
    return { success: true };
  }

  update(): VoteResolution | null {
    if (this.state.phase !== GamePhase.Voting) {
      return null;
    }

    if (this.clock.now() < this.votingDeadline && !this.haveAllEligibleVotersSubmitted()) {
      return null;
    }

    return this.resolveVotes();
  }

  finishResults(): boolean {
    if (this.state.phase !== GamePhase.ResolvingVote || this.clock.now() < this.state.voteResultsEndTime) {
      return false;
    }

    this.state.voteResultsEndTime = 0;
    return true;
  }

  getVotingDeadline(): number {
    return this.votingDeadline;
  }

  getEligibleVoterIds(): string[] {
    return [...this.eligibleVoters];
  }

  removePlayer(sessionId: string): void {
    this.eligibleVoters.delete(sessionId);
    this.votes.delete(sessionId);
    this.state.voteSubmitted.delete(sessionId);
  }

  reset(): void {
    this.votes.clear();
    this.eligibleVoters.clear();
    this.votingDeadline = 0;
    this.clearPublicVotingState();
  }

  setClock(clock: Clock): void {
    this.clock = clock;
  }

  private haveAllEligibleVotersSubmitted(): boolean {
    return [...this.eligibleVoters].every((sessionId) => this.votes.has(sessionId));
  }

  private resolveVotes(): VoteResolution {
    const totals = new Map<string, number>();
    let abstainVotes = 0;

    this.votes.forEach((targetSessionId) => {
      if (targetSessionId === null) {
        abstainVotes++;
        return;
      }
      totals.set(targetSessionId, (totals.get(targetSessionId) ?? 0) + 1);
    });

    const highestCandidateVotes = Math.max(0, ...totals.values());
    const highestCandidates = [...totals.entries()]
      .filter(([, votes]) => votes === highestCandidateVotes)
      .map(([sessionId]) => sessionId);
    const ejectedSessionId =
      highestCandidateVotes > abstainVotes && highestCandidates.length === 1
        ? (highestCandidates[0] ?? null)
        : null;
    const ejectedPlayer = ejectedSessionId ? this.state.players.get(ejectedSessionId) : undefined;
    const ejectedRole = ejectedSessionId ? this.roles.getRole(ejectedSessionId) ?? null : null;

    if (ejectedPlayer) {
      ejectedPlayer.state = PlayerState.Ejected;
    }

    this.state.voteTotals.clear();
    totals.forEach((count, sessionId) => this.state.voteTotals.set(sessionId, count));
    this.state.abstainVotes = abstainVotes;
    this.state.ejectedPlayerId = ejectedSessionId;
    this.state.ejectedPlayerRole = ejectedRole;
    this.state.voteDeadline = 0;
    this.state.voteResultsEndTime = this.clock.now() + GAME_CONFIG.VOTE_RESULTS_TIME * 1000;

    return {
      totals,
      abstainVotes,
      ejectedSessionId,
      ejectedRole,
      resultsEndTime: this.state.voteResultsEndTime,
    };
  }

  private clearPublicVotingState(): void {
    this.state.voteDeadline = 0;
    this.state.voteResultsEndTime = 0;
    this.state.voteSubmitted.clear();
    this.state.voteTotals.clear();
    this.state.abstainVotes = 0;
    this.state.ejectedPlayerId = null;
    this.state.ejectedPlayerRole = null;
  }
}
