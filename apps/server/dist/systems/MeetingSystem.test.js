"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const GameRoomState_1 = require("../rooms/schema/GameRoomState");
const MeetingSystem_1 = require("./MeetingSystem");
const shared_1 = require("@starfall/shared");
/**
 * Deterministic clock for testing
 */
class TestClock {
    constructor(initialTime = 1000000) {
        this.time = initialTime;
    }
    now() {
        return this.time;
    }
    advance(ms) {
        this.time += ms;
    }
    setTime(time) {
        this.time = time;
    }
}
(0, vitest_1.describe)("MeetingSystem", () => {
    let state;
    let meetingSystem;
    let testClock;
    (0, vitest_1.beforeEach)(() => {
        state = new GameRoomState_1.GameRoomState();
        state.phase = shared_1.GamePhase.Playing;
        testClock = new TestClock();
        meetingSystem = new MeetingSystem_1.MeetingSystem(state, testClock);
    });
    const setupPlayers = (aliveIds, deadIds = []) => {
        aliveIds.forEach((id) => {
            const player = new GameRoomState_1.Player();
            player.sessionId = id;
            player.state = shared_1.PlayerState.Alive;
            player.x = 500;
            player.y = 500;
            state.players.set(id, player);
        });
        deadIds.forEach((id) => {
            const player = new GameRoomState_1.Player();
            player.sessionId = id;
            player.state = shared_1.PlayerState.Dead;
            player.x = 500;
            player.y = 500;
            state.players.set(id, player);
        });
    };
    (0, vitest_1.it)("allows living player to call meeting during playing phase", () => {
        setupPlayers(["player1", "player2", "player3", "player4"]);
        const result = meetingSystem.callMeeting("player1");
        (0, vitest_1.expect)(result.success).toBe(true);
        (0, vitest_1.expect)(state.phase).toBe(shared_1.GamePhase.Meeting);
        (0, vitest_1.expect)(meetingSystem.getMeetingInitiator()).toBe("player1");
        (0, vitest_1.expect)(state.meetingEndTime).toBe(testClock.now() + shared_1.GAME_CONFIG.DISCUSSION_TIME * 1000);
    });
    (0, vitest_1.it)("rejects meeting call when not in playing phase", () => {
        state.phase = shared_1.GamePhase.Lobby;
        setupPlayers(["player1"]);
        const result = meetingSystem.callMeeting("player1");
        (0, vitest_1.expect)(result.success).toBe(false);
        (0, vitest_1.expect)(result.reason).toBe("Meeting can only be called during playing phase");
        (0, vitest_1.expect)(state.phase).toBe(shared_1.GamePhase.Lobby);
    });
    (0, vitest_1.it)("rejects meeting call from non-existent player", () => {
        setupPlayers(["player1"]);
        const result = meetingSystem.callMeeting("non-existent");
        (0, vitest_1.expect)(result.success).toBe(false);
        (0, vitest_1.expect)(result.reason).toBe("Caller not found");
    });
    (0, vitest_1.it)("rejects meeting call from dead player", () => {
        setupPlayers(["player1"], ["player2"]);
        const result = meetingSystem.callMeeting("player2");
        (0, vitest_1.expect)(result.success).toBe(false);
        (0, vitest_1.expect)(result.reason).toBe("Only living players can call meetings");
    });
    (0, vitest_1.it)("rejects second meeting call from same player", () => {
        setupPlayers(["player1", "player2", "player3", "player4"]);
        // First meeting succeeds
        const result1 = meetingSystem.callMeeting("player1");
        (0, vitest_1.expect)(result1.success).toBe(true);
        // Reset phase to playing for second attempt
        state.phase = shared_1.GamePhase.Playing;
        // Second meeting from same player fails
        const result2 = meetingSystem.callMeeting("player1");
        (0, vitest_1.expect)(result2.success).toBe(false);
        (0, vitest_1.expect)(result2.reason).toBe("No emergency meetings remaining");
    });
    (0, vitest_1.it)("rejects meeting call when meeting already in progress", () => {
        setupPlayers(["player1", "player2", "player3", "player4"]);
        // First meeting succeeds
        meetingSystem.callMeeting("player1");
        // Second meeting from different player fails
        const result = meetingSystem.callMeeting("player2");
        (0, vitest_1.expect)(result.success).toBe(false);
        (0, vitest_1.expect)(result.reason).toBe("A meeting is already in progress");
    });
    (0, vitest_1.it)("teleports all living players to meeting room", () => {
        setupPlayers(["player1", "player2", "player3", "player4"]);
        meetingSystem.callMeeting("player1");
        // Check all living players were teleported to meeting room positions
        state.players.forEach((player) => {
            if (player.state === shared_1.PlayerState.Alive) {
                // Meeting room is at y=900-1050, x=800-1120
                (0, vitest_1.expect)(player.y).toBeGreaterThanOrEqual(900);
                (0, vitest_1.expect)(player.y).toBeLessThanOrEqual(1050);
                (0, vitest_1.expect)(player.x).toBeGreaterThanOrEqual(800);
                (0, vitest_1.expect)(player.x).toBeLessThanOrEqual(1120);
            }
        });
    });
    (0, vitest_1.it)("does not teleport dead players", () => {
        setupPlayers(["player1", "player2"], ["player3", "player4"]);
        const deadPlayer1 = state.players.get("player3");
        const deadPlayer2 = state.players.get("player4");
        const originalX1 = deadPlayer1.x;
        const originalY1 = deadPlayer1.y;
        const originalX2 = deadPlayer2.x;
        const originalY2 = deadPlayer2.y;
        meetingSystem.callMeeting("player1");
        // Dead players should not have moved
        (0, vitest_1.expect)(deadPlayer1.x).toBe(originalX1);
        (0, vitest_1.expect)(deadPlayer1.y).toBe(originalY1);
        (0, vitest_1.expect)(deadPlayer2.x).toBe(originalX2);
        (0, vitest_1.expect)(deadPlayer2.y).toBe(originalY2);
    });
    (0, vitest_1.it)("tracks meetings used per player", () => {
        setupPlayers(["player1", "player2", "player3", "player4"]);
        (0, vitest_1.expect)(meetingSystem.getMeetingsRemaining("player1")).toBe(1);
        (0, vitest_1.expect)(meetingSystem.getMeetingsRemaining("player2")).toBe(1);
        meetingSystem.callMeeting("player1");
        (0, vitest_1.expect)(meetingSystem.getMeetingsRemaining("player1")).toBe(0);
        (0, vitest_1.expect)(meetingSystem.getMeetingsRemaining("player2")).toBe(1);
    });
    (0, vitest_1.it)("canCallMeeting returns correct status", () => {
        setupPlayers(["player1", "player2"], ["player3"]);
        (0, vitest_1.expect)(meetingSystem.canCallMeeting("player1")).toBe(true);
        (0, vitest_1.expect)(meetingSystem.canCallMeeting("player2")).toBe(true);
        (0, vitest_1.expect)(meetingSystem.canCallMeeting("player3")).toBe(false); // dead
        (0, vitest_1.expect)(meetingSystem.canCallMeeting("non-existent")).toBe(false);
        meetingSystem.callMeeting("player1");
        (0, vitest_1.expect)(meetingSystem.canCallMeeting("player1")).toBe(false); // used meeting
    });
    (0, vitest_1.it)("update returns true when discussion time expires", () => {
        setupPlayers(["player1", "player2", "player3", "player4"]);
        meetingSystem.callMeeting("player1");
        (0, vitest_1.expect)(state.phase).toBe(shared_1.GamePhase.Meeting);
        // Advance time before discussion ends
        testClock.advance(shared_1.GAME_CONFIG.DISCUSSION_TIME * 1000 - 1000);
        let result = meetingSystem.update();
        (0, vitest_1.expect)(result).toBe(false);
        (0, vitest_1.expect)(state.phase).toBe(shared_1.GamePhase.Meeting);
        // Advance time past discussion end
        testClock.advance(2000);
        result = meetingSystem.update();
        (0, vitest_1.expect)(result).toBe(true);
    });
    (0, vitest_1.it)("update returns false when not in meeting phase", () => {
        setupPlayers(["player1"]);
        state.phase = shared_1.GamePhase.Playing;
        const result = meetingSystem.update();
        (0, vitest_1.expect)(result).toBe(false);
    });
    (0, vitest_1.it)("getMeetingState returns correct state for player", () => {
        setupPlayers(["player1", "player2", "player3", "player4"]);
        // Before meeting
        let meetingState = meetingSystem.getMeetingState("player1");
        (0, vitest_1.expect)(meetingState.phase).toBeNull();
        (0, vitest_1.expect)(meetingState.initiatorSessionId).toBeNull();
        (0, vitest_1.expect)(meetingState.discussionEndTime).toBeNull();
        (0, vitest_1.expect)(meetingState.meetingsRemaining).toBe(1);
        // During meeting
        meetingSystem.callMeeting("player1");
        meetingState = meetingSystem.getMeetingState("player1");
        (0, vitest_1.expect)(meetingState.phase).toBe("discussion");
        (0, vitest_1.expect)(meetingState.initiatorSessionId).toBe("player1");
        (0, vitest_1.expect)(meetingState.discussionEndTime).toBe(testClock.now() + shared_1.GAME_CONFIG.DISCUSSION_TIME * 1000);
        (0, vitest_1.expect)(meetingState.meetingsRemaining).toBe(0);
        // Other player sees 1 remaining
        meetingState = meetingSystem.getMeetingState("player2");
        (0, vitest_1.expect)(meetingState.meetingsRemaining).toBe(1);
    });
    (0, vitest_1.it)("reset clears all meeting state", () => {
        setupPlayers(["player1", "player2", "player3", "player4"]);
        meetingSystem.callMeeting("player1");
        (0, vitest_1.expect)(state.phase).toBe(shared_1.GamePhase.Meeting);
        meetingSystem.reset();
        (0, vitest_1.expect)(meetingSystem.getMeetingInitiator()).toBeNull();
        (0, vitest_1.expect)(meetingSystem.getDiscussionEndTime()).toBe(0);
        (0, vitest_1.expect)(meetingSystem.getMeetingsRemaining("player1")).toBe(1);
    });
    (0, vitest_1.it)("meeting initiator is tracked correctly", () => {
        setupPlayers(["player1", "player2", "player3", "player4"]);
        (0, vitest_1.expect)(meetingSystem.getMeetingInitiator()).toBeNull();
        meetingSystem.callMeeting("player1");
        (0, vitest_1.expect)(meetingSystem.getMeetingInitiator()).toBe("player1");
        meetingSystem.reset();
        (0, vitest_1.expect)(meetingSystem.getMeetingInitiator()).toBeNull();
    });
});
