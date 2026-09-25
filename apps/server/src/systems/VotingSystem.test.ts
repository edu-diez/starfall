import { beforeEach, describe, expect, it } from "vitest";
import { GameRoomState, Player } from "../rooms/schema/GameRoomState";
import { VotingSystem } from "./VotingSystem";
import { RoleAssignmentSystem, RandomSource } from "./RoleAssignmentSystem";
import { GamePhase, PlayerRole, PlayerState, GAME_CONFIG } from "@starfall/shared";
import { Clock } from "./MeetingSystem";

class TestClock implements Clock {
  constructor(private time = 1_000_000) {}
  now(): number { return this.time; }
  advance(milliseconds: number): void { this.time += milliseconds; }
}

class TestRandomSource implements RandomSource {
  random(): number { return 0; }
  shuffle<T>(items: T[]): T[] { return [...items]; }
}

describe("VotingSystem", () => {
  let state: GameRoomState;
  let roles: RoleAssignmentSystem;
  let voting: VotingSystem;
  let clock: TestClock;

  beforeEach(() => {
    state = new GameRoomState();
    state.phase = GamePhase.Meeting;
    clock = new TestClock();
    roles = new RoleAssignmentSystem(state, new TestRandomSource());
    voting = new VotingSystem(state, roles, clock);
    ["killer", "crew-1", "crew-2", "crew-3"].forEach((sessionId) => {
      const player = new Player();
      player.sessionId = sessionId;
      player.state = PlayerState.Alive;
      state.players.set(sessionId, player);
    });
    roles.assignRoles();
    roles["roleMap"].set("killer", PlayerRole.Killer);
    ["crew-1", "crew-2", "crew-3"].forEach((sessionId) =>
      roles["roleMap"].set(sessionId, PlayerRole.Crewmate),
    );
    state.phase = GamePhase.Voting;
    voting.startVoting();
  });

  it("accepts living voters and keeps individual choices private", () => {
    expect(voting.submitVote("crew-1", "killer")).toEqual({ success: true });
    expect(state.voteSubmitted.get("crew-1")).toBe(true);
    expect(state.voteTotals.size).toBe(0);
    expect(state.ejectedPlayerId).toBeNull();
  });

  it("allows replacement votes and retains only the latest choice", () => {
    voting.submitVote("crew-1", "killer");
    voting.submitVote("crew-1", "crew-2");
    voting.submitVote("killer", "crew-2");
    voting.submitVote("crew-2", "crew-2");
    voting.submitVote("crew-3", null);

    const resolution = voting.update();
    expect(resolution?.totals.get("killer")).toBeUndefined();
    expect(resolution?.totals.get("crew-2")).toBe(3);
    expect(resolution?.ejectedSessionId).toBe("crew-2");
  });

  it("rejects eliminated voters and invalid candidates", () => {
    state.players.get("crew-1")!.state = PlayerState.Dead;
    expect(voting.submitVote("crew-1", "killer").reason).toBe("Only eligible living players can vote");
    expect(voting.submitVote("killer", "unknown").reason).toBe("Vote target must be a living player");
  });

  it("counts abstentions and gives no ejection on a tie", () => {
    voting.submitVote("killer", "crew-1");
    voting.submitVote("crew-1", "killer");
    voting.submitVote("crew-2", null);
    voting.submitVote("crew-3", null);

    const resolution = voting.update();
    expect(resolution?.abstainVotes).toBe(2);
    expect(resolution?.ejectedSessionId).toBeNull();
    expect(state.phase).toBe(GamePhase.Voting);
  });

  it("ejects the uniquely highest candidate and reveals only their role", () => {
    voting.submitVote("killer", "crew-1");
    voting.submitVote("crew-1", "killer");
    voting.submitVote("crew-2", "killer");
    voting.submitVote("crew-3", "killer");

    const resolution = voting.update();
    expect(resolution?.ejectedSessionId).toBe("killer");
    expect(resolution?.ejectedRole).toBe(PlayerRole.Killer);
    expect(state.players.get("killer")?.state).toBe(PlayerState.Ejected);
    expect(state.voteResultsEndTime).toBe(clock.now() + GAME_CONFIG.VOTE_RESULTS_TIME * 1000);
  });

  it("resolves at the authoritative deadline without every vote", () => {
    voting.submitVote("crew-1", "killer");
    clock.advance(GAME_CONFIG.VOTING_TIME * 1000);

    expect(voting.update()?.ejectedSessionId).toBe("killer");
  });
});
