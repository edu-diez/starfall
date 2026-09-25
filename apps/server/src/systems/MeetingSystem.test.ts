import { describe, it, expect, beforeEach } from "vitest";
import { GameRoomState, Player } from "../rooms/schema/GameRoomState";
import { MeetingSystem, DefaultClock, Clock } from "./MeetingSystem";
import { PlayerState, GamePhase, GAME_CONFIG } from "@starfall/shared";

/**
 * Deterministic clock for testing
 */
class TestClock implements Clock {
  private time: number;

  constructor(initialTime: number = 1000000) {
    this.time = initialTime;
  }

  now(): number {
    return this.time;
  }

  advance(ms: number): void {
    this.time += ms;
  }

  setTime(time: number): void {
    this.time = time;
  }
}

describe("MeetingSystem", () => {
  let state: GameRoomState;
  let meetingSystem: MeetingSystem;
  let testClock: TestClock;

  beforeEach(() => {
    state = new GameRoomState();
    state.phase = GamePhase.Playing;
    testClock = new TestClock();
    meetingSystem = new MeetingSystem(state, testClock);
  });

  const setupPlayers = (aliveIds: string[], deadIds: string[] = []) => {
    aliveIds.forEach((id) => {
      const player = new Player();
      player.sessionId = id;
      player.state = PlayerState.Alive;
      player.x = 500;
      player.y = 500;
      state.players.set(id, player);
    });

    deadIds.forEach((id) => {
      const player = new Player();
      player.sessionId = id;
      player.state = PlayerState.Dead;
      player.x = 500;
      player.y = 500;
      state.players.set(id, player);
    });
  };

  it("allows living player to call meeting during playing phase", () => {
    setupPlayers(["player1", "player2", "player3", "player4"]);

    const result = meetingSystem.callMeeting("player1");

    expect(result.success).toBe(true);
    expect(state.phase).toBe(GamePhase.Meeting);
    expect(meetingSystem.getMeetingInitiator()).toBe("player1");
    expect(state.meetingEndTime).toBe(testClock.now() + GAME_CONFIG.DISCUSSION_TIME * 1000);
  });

  it("rejects meeting call when not in playing phase", () => {
    state.phase = GamePhase.Lobby;
    setupPlayers(["player1"]);

    const result = meetingSystem.callMeeting("player1");

    expect(result.success).toBe(false);
    expect(result.reason).toBe("Meeting can only be called during playing phase");
    expect(state.phase).toBe(GamePhase.Lobby);
  });

  it("rejects meeting call from non-existent player", () => {
    setupPlayers(["player1"]);

    const result = meetingSystem.callMeeting("non-existent");

    expect(result.success).toBe(false);
    expect(result.reason).toBe("Caller not found");
  });

  it("rejects meeting call from dead player", () => {
    setupPlayers(["player1"], ["player2"]);

    const result = meetingSystem.callMeeting("player2");

    expect(result.success).toBe(false);
    expect(result.reason).toBe("Only living players can call meetings");
  });

  it("rejects second meeting call from same player", () => {
    setupPlayers(["player1", "player2", "player3", "player4"]);

    // First meeting succeeds
    const result1 = meetingSystem.callMeeting("player1");
    expect(result1.success).toBe(true);

    // Reset phase to playing for second attempt
    state.phase = GamePhase.Playing;

    // Second meeting from same player fails
    const result2 = meetingSystem.callMeeting("player1");
    expect(result2.success).toBe(false);
    expect(result2.reason).toBe("No emergency meetings remaining");
  });

  it("rejects meeting call when meeting already in progress", () => {
    setupPlayers(["player1", "player2", "player3", "player4"]);

    // First meeting succeeds
    meetingSystem.callMeeting("player1");

    // Second meeting from different player fails
    const result = meetingSystem.callMeeting("player2");
    expect(result.success).toBe(false);
    expect(result.reason).toBe("A meeting is already in progress");
  });

  it("teleports all living players to meeting room", () => {
    setupPlayers(["player1", "player2", "player3", "player4"]);

    meetingSystem.callMeeting("player1");

    // Check all living players were teleported to meeting room positions
    state.players.forEach((player) => {
      if (player.state === PlayerState.Alive) {
        // Meeting room is at y=900-1050, x=800-1120
        expect(player.y).toBeGreaterThanOrEqual(900);
        expect(player.y).toBeLessThanOrEqual(1050);
        expect(player.x).toBeGreaterThanOrEqual(800);
        expect(player.x).toBeLessThanOrEqual(1120);
      }
    });
  });

  it("does not teleport dead players", () => {
    setupPlayers(["player1", "player2"], ["player3", "player4"]);

    const deadPlayer1 = state.players.get("player3")!;
    const deadPlayer2 = state.players.get("player4")!;
    const originalX1 = deadPlayer1.x;
    const originalY1 = deadPlayer1.y;
    const originalX2 = deadPlayer2.x;
    const originalY2 = deadPlayer2.y;

    meetingSystem.callMeeting("player1");

    // Dead players should not have moved
    expect(deadPlayer1.x).toBe(originalX1);
    expect(deadPlayer1.y).toBe(originalY1);
    expect(deadPlayer2.x).toBe(originalX2);
    expect(deadPlayer2.y).toBe(originalY2);
  });

  it("tracks meetings used per player", () => {
    setupPlayers(["player1", "player2", "player3", "player4"]);

    expect(meetingSystem.getMeetingsRemaining("player1")).toBe(1);
    expect(meetingSystem.getMeetingsRemaining("player2")).toBe(1);

    meetingSystem.callMeeting("player1");

    expect(meetingSystem.getMeetingsRemaining("player1")).toBe(0);
    expect(meetingSystem.getMeetingsRemaining("player2")).toBe(1);
  });

  it("canCallMeeting returns correct status", () => {
    setupPlayers(["player1", "player2"], ["player3"]);

    expect(meetingSystem.canCallMeeting("player1")).toBe(true);
    expect(meetingSystem.canCallMeeting("player2")).toBe(true);
    expect(meetingSystem.canCallMeeting("player3")).toBe(false); // dead
    expect(meetingSystem.canCallMeeting("non-existent")).toBe(false);

    meetingSystem.callMeeting("player1");
    expect(meetingSystem.canCallMeeting("player1")).toBe(false); // used meeting
  });

  it("update returns true when discussion time expires", () => {
    setupPlayers(["player1", "player2", "player3", "player4"]);

    meetingSystem.callMeeting("player1");
    expect(state.phase).toBe(GamePhase.Meeting);

    // Advance time before discussion ends
    testClock.advance(GAME_CONFIG.DISCUSSION_TIME * 1000 - 1000);
    let result = meetingSystem.update();
    expect(result).toBe(false);
    expect(state.phase).toBe(GamePhase.Meeting);

    // Advance time past discussion end
    testClock.advance(2000);
    result = meetingSystem.update();
    expect(result).toBe(true);
  });

  it("update returns false when not in meeting phase", () => {
    setupPlayers(["player1"]);
    state.phase = GamePhase.Playing;

    const result = meetingSystem.update();
    expect(result).toBe(false);
  });

  it("getMeetingState returns correct state for player", () => {
    setupPlayers(["player1", "player2", "player3", "player4"]);

    // Before meeting
    let meetingState = meetingSystem.getMeetingState("player1");
    expect(meetingState.phase).toBeNull();
    expect(meetingState.initiatorSessionId).toBeNull();
    expect(meetingState.discussionEndTime).toBeNull();
    expect(meetingState.meetingsRemaining).toBe(1);

    // During meeting
    meetingSystem.callMeeting("player1");
    meetingState = meetingSystem.getMeetingState("player1");
    expect(meetingState.phase).toBe("discussion");
    expect(meetingState.initiatorSessionId).toBe("player1");
    expect(meetingState.discussionEndTime).toBe(testClock.now() + GAME_CONFIG.DISCUSSION_TIME * 1000);
    expect(meetingState.meetingsRemaining).toBe(0);

    // Other player sees 1 remaining
    meetingState = meetingSystem.getMeetingState("player2");
    expect(meetingState.meetingsRemaining).toBe(1);
  });

  it("reset clears all meeting state", () => {
    setupPlayers(["player1", "player2", "player3", "player4"]);

    meetingSystem.callMeeting("player1");
    expect(state.phase).toBe(GamePhase.Meeting);

    meetingSystem.reset();

    expect(meetingSystem.getMeetingInitiator()).toBeNull();
    expect(meetingSystem.getDiscussionEndTime()).toBe(0);
    expect(meetingSystem.getMeetingsRemaining("player1")).toBe(1);
  });

  it("meeting initiator is tracked correctly", () => {
    setupPlayers(["player1", "player2", "player3", "player4"]);

    expect(meetingSystem.getMeetingInitiator()).toBeNull();

    meetingSystem.callMeeting("player1");
    expect(meetingSystem.getMeetingInitiator()).toBe("player1");

    meetingSystem.reset();
    expect(meetingSystem.getMeetingInitiator()).toBeNull();
  });
});