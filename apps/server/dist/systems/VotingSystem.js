"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VotingSystem = void 0;
const shared_1 = require("@starfall/shared");
const MeetingSystem_1 = require("./MeetingSystem");
/**
 * Owns server-authoritative voting. Individual selections never leave this
 * system until votes are resolved.
 */
class VotingSystem {
    state;
    roles;
    votes = new Map();
    eligibleVoters = new Set();
    clock;
    votingDeadline = 0;
    constructor(state, roles, clock = new MeetingSystem_1.DefaultClock()) {
        this.state = state;
        this.roles = roles;
        this.clock = clock;
    }
    startVoting() {
        if (this.state.phase !== shared_1.GamePhase.Voting) {
            return false;
        }
        this.clearPublicVotingState();
        this.votes.clear();
        this.eligibleVoters.clear();
        this.state.players.forEach((player, sessionId) => {
            if (player.state === shared_1.PlayerState.Alive) {
                this.eligibleVoters.add(sessionId);
            }
        });
        this.votingDeadline = this.clock.now() + shared_1.GAME_CONFIG.VOTING_TIME * 1000;
        this.state.voteDeadline = this.votingDeadline;
        return true;
    }
    submitVote(voterSessionId, targetSessionId) {
        if (this.state.phase !== shared_1.GamePhase.Voting) {
            return { success: false, reason: "Voting is not active" };
        }
        if (this.clock.now() >= this.votingDeadline) {
            return { success: false, reason: "Voting has ended" };
        }
        if (!this.eligibleVoters.has(voterSessionId)) {
            return { success: false, reason: "Only eligible living players can vote" };
        }
        const voter = this.state.players.get(voterSessionId);
        if (!voter || voter.state !== shared_1.PlayerState.Alive) {
            return { success: false, reason: "Only eligible living players can vote" };
        }
        if (targetSessionId !== null) {
            const candidate = this.state.players.get(targetSessionId);
            if (!candidate || candidate.state !== shared_1.PlayerState.Alive) {
                return { success: false, reason: "Vote target must be a living player" };
            }
        }
        this.votes.set(voterSessionId, targetSessionId);
        this.state.voteSubmitted.set(voterSessionId, true);
        return { success: true };
    }
    update() {
        if (this.state.phase !== shared_1.GamePhase.Voting) {
            return null;
        }
        if (this.clock.now() < this.votingDeadline && !this.haveAllEligibleVotersSubmitted()) {
            return null;
        }
        return this.resolveVotes();
    }
    finishResults() {
        if (this.state.phase !== shared_1.GamePhase.ResolvingVote || this.clock.now() < this.state.voteResultsEndTime) {
            return false;
        }
        this.state.voteResultsEndTime = 0;
        return true;
    }
    getVotingDeadline() {
        return this.votingDeadline;
    }
    getEligibleVoterIds() {
        return [...this.eligibleVoters];
    }
    removePlayer(sessionId) {
        this.eligibleVoters.delete(sessionId);
        this.votes.delete(sessionId);
        this.state.voteSubmitted.delete(sessionId);
    }
    reset() {
        this.votes.clear();
        this.eligibleVoters.clear();
        this.votingDeadline = 0;
        this.clearPublicVotingState();
    }
    setClock(clock) {
        this.clock = clock;
    }
    haveAllEligibleVotersSubmitted() {
        return [...this.eligibleVoters].every((sessionId) => this.votes.has(sessionId));
    }
    resolveVotes() {
        const totals = new Map();
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
        const ejectedSessionId = highestCandidateVotes > abstainVotes && highestCandidates.length === 1
            ? (highestCandidates[0] ?? null)
            : null;
        const ejectedPlayer = ejectedSessionId ? this.state.players.get(ejectedSessionId) : undefined;
        const ejectedRole = ejectedSessionId ? this.roles.getRole(ejectedSessionId) ?? null : null;
        if (ejectedPlayer) {
            ejectedPlayer.state = shared_1.PlayerState.Ejected;
        }
        this.state.voteTotals.clear();
        totals.forEach((count, sessionId) => this.state.voteTotals.set(sessionId, count));
        this.state.abstainVotes = abstainVotes;
        this.state.ejectedPlayerId = ejectedSessionId;
        this.state.ejectedPlayerRole = ejectedRole;
        this.state.voteDeadline = 0;
        this.state.voteResultsEndTime = this.clock.now() + shared_1.GAME_CONFIG.VOTE_RESULTS_TIME * 1000;
        return {
            totals,
            abstainVotes,
            ejectedSessionId,
            ejectedRole,
            resultsEndTime: this.state.voteResultsEndTime,
        };
    }
    clearPublicVotingState() {
        this.state.voteDeadline = 0;
        this.state.voteResultsEndTime = 0;
        this.state.voteSubmitted.clear();
        this.state.voteTotals.clear();
        this.state.abstainVotes = 0;
        this.state.ejectedPlayerId = null;
        this.state.ejectedPlayerRole = null;
    }
}
exports.VotingSystem = VotingSystem;
