"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const GameRoomState_1 = require("../rooms/schema/GameRoomState");
const VotingSystem_1 = require("./VotingSystem");
const RoleAssignmentSystem_1 = require("./RoleAssignmentSystem");
const shared_1 = require("@starfall/shared");
class TestClock {
    time;
    constructor(time = 1_000_000) {
        this.time = time;
    }
    now() { return this.time; }
    advance(milliseconds) { this.time += milliseconds; }
}
class TestRandomSource {
    random() { return 0; }
    shuffle(items) { return [...items]; }
}
(0, vitest_1.describe)("VotingSystem", () => {
    let state;
    let roles;
    let voting;
    let clock;
    (0, vitest_1.beforeEach)(() => {
        state = new GameRoomState_1.GameRoomState();
        state.phase = shared_1.GamePhase.Meeting;
        clock = new TestClock();
        roles = new RoleAssignmentSystem_1.RoleAssignmentSystem(state, new TestRandomSource());
        voting = new VotingSystem_1.VotingSystem(state, roles, clock);
        ["killer", "crew-1", "crew-2", "crew-3"].forEach((sessionId) => {
            const player = new GameRoomState_1.Player();
            player.sessionId = sessionId;
            player.state = shared_1.PlayerState.Alive;
            state.players.set(sessionId, player);
        });
        roles.assignRoles();
        roles["roleMap"].set("killer", shared_1.PlayerRole.Killer);
        ["crew-1", "crew-2", "crew-3"].forEach((sessionId) => roles["roleMap"].set(sessionId, shared_1.PlayerRole.Crewmate));
        state.phase = shared_1.GamePhase.Voting;
        voting.startVoting();
    });
    (0, vitest_1.it)("accepts living voters and keeps individual choices private", () => {
        (0, vitest_1.expect)(voting.submitVote("crew-1", "killer")).toEqual({ success: true });
        (0, vitest_1.expect)(state.voteSubmitted.get("crew-1")).toBe(true);
        (0, vitest_1.expect)(state.voteTotals.size).toBe(0);
        (0, vitest_1.expect)(state.ejectedPlayerId).toBeNull();
    });
    (0, vitest_1.it)("allows replacement votes and retains only the latest choice", () => {
        voting.submitVote("crew-1", "killer");
        voting.submitVote("crew-1", "crew-2");
        voting.submitVote("killer", "crew-2");
        voting.submitVote("crew-2", "crew-2");
        voting.submitVote("crew-3", null);
        const resolution = voting.update();
        (0, vitest_1.expect)(resolution?.totals.get("killer")).toBeUndefined();
        (0, vitest_1.expect)(resolution?.totals.get("crew-2")).toBe(3);
        (0, vitest_1.expect)(resolution?.ejectedSessionId).toBe("crew-2");
    });
    (0, vitest_1.it)("rejects eliminated voters and invalid candidates", () => {
        state.players.get("crew-1").state = shared_1.PlayerState.Dead;
        (0, vitest_1.expect)(voting.submitVote("crew-1", "killer").reason).toBe("Only eligible living players can vote");
        (0, vitest_1.expect)(voting.submitVote("killer", "unknown").reason).toBe("Vote target must be a living player");
    });
    (0, vitest_1.it)("counts abstentions and gives no ejection on a tie", () => {
        voting.submitVote("killer", "crew-1");
        voting.submitVote("crew-1", "killer");
        voting.submitVote("crew-2", null);
        voting.submitVote("crew-3", null);
        const resolution = voting.update();
        (0, vitest_1.expect)(resolution?.abstainVotes).toBe(2);
        (0, vitest_1.expect)(resolution?.ejectedSessionId).toBeNull();
        (0, vitest_1.expect)(state.phase).toBe(shared_1.GamePhase.Voting);
    });
    (0, vitest_1.it)("ejects the uniquely highest candidate and reveals only their role", () => {
        voting.submitVote("killer", "crew-1");
        voting.submitVote("crew-1", "killer");
        voting.submitVote("crew-2", "killer");
        voting.submitVote("crew-3", "killer");
        const resolution = voting.update();
        (0, vitest_1.expect)(resolution?.ejectedSessionId).toBe("killer");
        (0, vitest_1.expect)(resolution?.ejectedRole).toBe(shared_1.PlayerRole.Killer);
        (0, vitest_1.expect)(state.players.get("killer")?.state).toBe(shared_1.PlayerState.Ejected);
        (0, vitest_1.expect)(state.voteResultsEndTime).toBe(clock.now() + shared_1.GAME_CONFIG.VOTE_RESULTS_TIME * 1000);
    });
    (0, vitest_1.it)("resolves at the authoritative deadline without every vote", () => {
        voting.submitVote("crew-1", "killer");
        clock.advance(shared_1.GAME_CONFIG.VOTING_TIME * 1000);
        (0, vitest_1.expect)(voting.update()?.ejectedSessionId).toBe("killer");
    });
});
