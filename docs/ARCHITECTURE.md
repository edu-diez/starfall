# Architecture

## 1. Purpose

This document defines the technical boundaries and responsibility model for the game described in `GAME_SPEC.md`.

It explains where code and state belong. It does not redefine gameplay rules, prioritize milestones, or prescribe general coding style.

When documents appear to conflict, use this precedence:

1. `GAME_SPEC.md` defines product behavior and game rules.
2. `ARCHITECTURE.md` defines system boundaries and responsibility ownership.
3. `MILESTONES.md` defines implementation order and current scope.
4. `AGENTS.md` defines coding practices and instructions for coding agents.

If a real conflict remains, stop and resolve it in the relevant source document rather than silently choosing an interpretation.

---

## 2. Architectural Goals

The architecture must support:

- A server-authoritative real-time multiplayer simulation.
- Strict separation between server-side rules and client-side presentation.
- Private delivery of secret role information.
- Cross-platform desktop and mobile clients.
- Small, testable game-rule modules.
- Clear ownership of every piece of state.
- Incremental development through vertical-slice milestones.
- Future persistence, reconnection, scaling, and observability without requiring an early rewrite.

---

## 3. Core Principles

### 3.1 The server is authoritative

Clients send intentions, not outcomes.

Examples:

- A movement message says which direction the player wants to move. It does not submit a trusted position.
- A kill message identifies an intended target. It does not declare that the target died.
- A vote message submits a choice. It does not provide vote totals or an ejection result.
- A vent message requests entry, travel, or exit. It does not directly update player location.

The server validates and applies every gameplay outcome.

### 3.2 The client is responsible for presentation

The client owns:

- Canvas rendering.
- Animation.
- Camera behavior.
- Audio playback.
- Keyboard, mouse, and touch input collection.
- Local interface state.
- Visual interpolation and prediction, if introduced later.

The client must not own authoritative gameplay decisions.

### 3.3 Secret information is private by default

A player's role and role-specific private data must not be stored in globally synchronized room state.

Private data includes:

- Assigned role.
- Kill cooldown details that should only be shown to the Killer.
- Killer-only vent availability.
- Private validation errors or action feedback.

Private information is sent only to the entitled client through direct server-to-client messages or another explicitly private mechanism.

### 3.4 Networking is an adapter, not the game engine

Colyseus handles connections, rooms, messages, and state synchronization. Core game rules should remain usable and testable without starting a network server.

`GameRoom` translates network events into calls to game systems. It must not become the location for every rule.

### 3.5 One authoritative owner per rule

Each rule must have one canonical implementation.

Examples:

- Movement validation belongs to `MovementSystem`.
- Kill validation belongs to `KillSystem`.
- Vote counting belongs to `VotingSystem`.
- Win-condition evaluation belongs to `VictorySystem`.

Other modules may call these systems, but must not duplicate their logic.

### 3.6 Dependencies point inward

Presentation and networking may depend on core contracts and domain concepts. Core game rules must not depend on Canvas, browser APIs, database clients, or Colyseus client code.

---

## 4. High-Level System Model

```text
Desktop Input ─┐
               ├─> Client Input Controller ─> Network Client
Touch Input ───┘                              │
                                              │ WebSocket
                                              ▼
                                      Colyseus GameRoom
                                              │
                                      Message Validation
                                              │
                                              ▼
                                      Game Rule Systems
                                              │
                                  Authoritative State Mutation
                                              │
                         ┌────────────────────┴───────────────────┐
                         ▼                                        ▼
                Public State Sync                       Private Messages
                         │                                        │
                         └────────────────────┬───────────────────┘
                                              ▼
                                        Client Store
                                              │
                                  ┌───────────┴───────────┐
                                  ▼                       ▼
                               Renderer                   UI
```

---

## 5. State Ownership

The project distinguishes five kinds of state.

### 5.1 Public synchronized state

Public synchronized state is server-owned state that every connected client in the room is allowed to receive.

It may include:

- Match phase.
- Public timers.
- Player identifiers and display names.
- Player positions and facing direction.
- Player color.
- Alive or eliminated status.
- Connected or disconnected status when appropriate.
- Ready status during the lobby.
- Public meeting state.
- Whether eligible players have submitted votes, if this is part of the chosen design.
- Published vote results after resolution.
- Winner and public end reason after the match ends.

It must not include:

- Secret roles before the design explicitly reveals them.
- Private cooldown state.
- Hidden votes before results are published.
- Authentication tokens.
- Database credentials or internal account records.
- Data that would let one client infer another player's secret role.

### 5.2 Private authoritative match state

Private authoritative match state exists only on the server.

It includes:

- Role assignments.
- Kill cooldown deadlines.
- Meeting-use counters.
- Individual votes before publication.
- Vent occupancy and private traversal data where required.
- Input-rate tracking.
- Validation and anti-abuse metadata.
- Server-only lifecycle information.

This state should use normal TypeScript structures unless synchronization is deliberately required.

### 5.3 Persistent account state

Persistent account state is stored outside the active room by an account or persistence service.

It may include:

- Stable player ID.
- Display name.
- Preferences.
- Progression.
- Statistics.
- Cosmetic ownership or selections.

Active rooms should receive only the account data needed for the match. Rooms must not directly contain database access logic.

### 5.4 Client replicated state

The client keeps a read-oriented representation of synchronized server state for rendering and UI.

The client may also keep short-lived presentation copies for interpolation. These copies do not become authoritative.

### 5.5 Client-local presentation state

Client-local state includes:

- Currently pressed keys.
- Virtual joystick position.
- Selected UI panels.
- Camera position.
- Animation progress.
- Audio settings.
- Pending local input sequence numbers, if prediction is later implemented.

Client-local state is never treated as proof that a game action is valid.

---

## 6. Match Lifecycle

The server owns the match phase and all transitions.

Recommended authoritative phases:

```ts
type MatchPhase =
  | "lobby"
  | "assigningRoles"
  | "playing"
  | "discussion"
  | "voting"
  | "resolvingVote"
  | "ended";
```

Legal transitions:

```text
lobby -> assigningRoles
assigningRoles -> playing
playing -> discussion
discussion -> voting
voting -> resolvingVote
resolvingVote -> playing
resolvingVote -> ended
playing -> ended
ended -> lobby        optional rematch path
```

Every gameplay command must declare which phases permit it.

Examples:

- Movement is accepted only during `playing` unless a future spectator mode says otherwise.
- Killing is accepted only during `playing`.
- Calling a meeting is accepted only during `playing`.
- Voting is accepted only during `voting`.
- Changing color and ready status are accepted only during `lobby`.

The `MatchLifecycleSystem` is the canonical owner of phase transitions.

---

## 7. Server Architecture

### 7.1 `GameRoom`

`GameRoom` is the Colyseus adapter and room coordinator.

Responsibilities:

- Create the room and initial state.
- Accept and remove connections.
- Authenticate or associate players with identities.
- Register message handlers.
- Apply message-shape validation and rate limits.
- Route valid commands to the appropriate game system.
- Run the fixed-rate simulation loop.
- Publish synchronized state patches.
- Send private messages to individual clients.
- Coordinate system initialization and disposal.

It must not directly implement complex movement, kill, voting, vent, or victory rules.

### 7.2 State schema

The Colyseus schema represents only synchronized public game state.

Recommended schema concepts:

```text
GameState
├── phase
├── players: MapSchema<PublicPlayerState>
├── meeting: PublicMeetingState
├── winner
├── endReason
└── public timing fields
```

`PublicPlayerState` should contain only public fields, such as:

```text
id
accountId or safe public player identifier
displayName
x
y
facing
colorId
isAlive
isConnected
isReady
```

Do not add `role`, `isKiller`, private cooldowns, or unrevealed vote choices to this schema.

### 7.3 Runtime match context

Server-only data should be grouped into a runtime match context rather than scattered through `GameRoom` fields.

Example conceptual model:

```ts
interface MatchContext {
  roles: Map<string, PlayerRole>;
  killCooldownUntil: Map<string, number>;
  meetingsRemaining: Map<string, number>;
  votes: Map<string, string | null>;
  inputState: Map<string, PlayerInputState>;
  ventState: Map<string, VentRuntimeState>;
}
```

Exact names and fields may evolve, but the public/private boundary must remain intact.

### 7.4 Game systems

#### `MatchLifecycleSystem`

Owns:

- Match start validation.
- Phase transitions.
- Role-assignment transition coordination.
- Match reset and optional rematch flow.

#### `RoleAssignmentSystem`

Owns:

- Random selection of the Killer.
- Assignment of remaining players as Crewmates.
- Storage of roles in private server state.
- Private notification of each player's role.

It must never add private roles to public synchronized state.

#### `LobbySystem`

Owns:

- Ready-state rules.
- Minimum player checks.
- Lobby locking when the match starts.

#### `ColorSystem`

Owns:

- The 21-color catalog.
- Automatic initial color assignment.
- Uniqueness enforcement.
- Color changes during the lobby.
- Returning colors to the available pool when players leave.

#### `MovementSystem`

Owns:

- Normalizing directional input.
- Speed limits.
- Fixed-step movement integration.
- Collision and map-bound validation.
- Updating authoritative positions.
- Preventing movement during disallowed phases or states.

#### `KillSystem`

Owns:

- Killer-role validation.
- Attacker and target alive-state checks.
- Phase validation.
- Range checks.
- Cooldown checks and updates.
- Applying elimination.
- Triggering victory evaluation after a valid kill.

#### `MeetingSystem`

Owns:

- Emergency-meeting eligibility.
- Per-player meeting-use limits.
- Transitioning from play to discussion.
- Moving living players to the meeting area.
- Disabling incompatible actions.
- Discussion timing.
- Transitioning to voting.

#### `VotingSystem`

Owns:

- Voter eligibility.
- Candidate eligibility.
- Vote submission and replacement rules.
- Abstentions.
- Voting deadline.
- Vote counting.
- Tie handling.
- Ejection resolution.
- Safe publication of results.

#### `VentSystem`

Owns:

- Killer-role validation.
- Entry-range checks.
- Vent node connectivity.
- Entry, traversal, and exit rules.
- Authoritative position updates.
- Blocking incompatible actions while venting.
- Private `sessionId -> currentVentNodeId` occupancy state.

Vent occupancy is not public synchronized state. The owning Killer receives a private vent-state message; other clients receive no vent event or role-inferential field. Public position remains at the entry location until the authoritative exit position is applied. Map vent connections are bidirectional, and each node's map `radius` is the authoritative entry range.

#### `VictorySystem`

Owns all win-condition evaluation.

It is called after any event that could end the match, including:

- A kill.
- An ejection.
- A relevant player departure.
- Any future rule that changes living role counts.

It determines:

- Whether the match has ended.
- Which side won.
- The public end reason.

No other system independently calculates the winner.

### 7.5 Services

Services integrate with concerns outside the active simulation.

#### `AccountService`

Owns:

- Loading account identity.
- Creating or resolving device-linked accounts.
- Updating profile and progression data.

It must not decide match outcomes.

#### `PersistenceService`

Owns:

- Database reads and writes.
- Storage abstractions.
- Transaction boundaries where needed.

Game systems should depend on interfaces rather than a specific database implementation.

#### `Clock`

Provides server time to systems.

Using an injectable clock allows cooldowns and timers to be tested deterministically.

#### `RandomSource`

Provides randomness for role assignment and other random rules.

Using an injectable random source allows deterministic tests.

---

## 8. Client Architecture

### 8.1 `NetworkClient`

Responsibilities:

- Connect to the Colyseus server.
- Join or create a room.
- Send typed client intents.
- Receive synchronized public state.
- Receive private server messages.
- Report connection status to the client application.

It must not contain rendering logic.

### 8.2 `ClientStore`

Responsibilities:

- Hold the latest public replicated state needed by rendering and UI.
- Hold private messages concerning the local player.
- Expose read-oriented data to presentation code.
- Reset match-specific data when leaving a room.

It must not turn local guesses into authoritative state.

### 8.3 `InputController`

Responsibilities:

- Present one device-independent input interface.
- Combine keyboard, mouse, and touch sources.
- Produce normalized player intentions.
- Avoid sending input faster than the defined network rate.

Suggested abstraction:

```ts
interface PlayerIntent {
  moveX: number;
  moveY: number;
  killPressed: boolean;
  meetingPressed: boolean;
  interactPressed: boolean;
}
```

Exact network messages may be separated from this local interface.

### 8.4 Desktop input adapter

Owns:

- Keyboard movement.
- Mouse interaction where applicable.
- Desktop action bindings.

### 8.5 Touch input adapter

Owns:

- Virtual joystick.
- Touch action buttons.
- Dynamic sizing and positioning for the device viewport.
- Touch-safe interaction without requiring keyboard or mouse.

Desktop and touch adapters feed the same `InputController` contract.

### 8.6 Renderer

Responsibilities:

- Draw the map and players onto HTML5 Canvas.
- Draw visible world effects.
- Interpolate between server snapshots where appropriate.
- Render the same public appearance for Killer and Crewmates.

It must not read a remote player's private role or decide action validity.

### 8.7 UI layer

Responsibilities:

- Lobby and ready interface.
- Color selection.
- Role reveal for the local player.
- Kill, meeting, vote, and vent controls when appropriate.
- Meeting and voting screens.
- End-of-match results.
- Connection and error feedback.

The UI may hide or show controls based on known local state, but the server must still validate every request.

---

## 9. Shared Contracts

A shared package or directory may contain transport-safe TypeScript types used by both server and client.

It may contain:

- Message names.
- Message payload interfaces.
- Public enums.
- Public identifiers and constants.
- Validation schemas that are safe to share.

It must not contain:

- Server secrets.
- Database models.
- Private role maps.
- Server-only rule implementations.
- Code that exposes hidden information to the browser bundle.

Prefer separate request and response types instead of one loosely typed message object.

---

## 10. Network Message Design

### 10.1 General rules

Every client-to-server message must be checked for:

- Known message type.
- Valid payload shape.
- Finite numeric values.
- Allowed string lengths and identifiers.
- Correct match phase.
- Sender eligibility.
- Rate limits.
- Target existence and eligibility where applicable.

Malformed or unauthorized messages must not mutate game state.

### 10.2 Movement input

Movement messages represent directional intention, not position.

Recommended conceptual payload:

```ts
interface MoveInputMessage {
  sequence: number;
  x: number;
  y: number;
}
```

Requirements:

- `x` and `y` must be finite.
- Direction magnitude is clamped or normalized by the server.
- The server applies speed and elapsed simulation time.
- Sequence numbers may support prediction and reconciliation later.

### 10.3 Discrete actions

Kill, meeting, vote, color, ready, and vent messages are commands.

A command is only a request. Receiving the command does not imply success.

The server should send private rejection feedback when useful, without exposing sensitive information.

### 10.4 Message compatibility

Message names and payloads should be centralized in shared contracts.

A breaking network-contract change must update:

- Shared types.
- Server handler.
- Client sender or receiver.
- Tests.
- Relevant documentation.

---

## 11. Simulation Loop

The server runs gameplay simulation at a fixed rate independent of rendering.

Recommended initial target:

```text
20 simulation ticks per second
```

The exact value remains configurable.

The simulation loop should:

1. Read the latest validated input state.
2. Advance movement and time-based systems using a controlled delta.
3. Apply authoritative state changes.
4. Evaluate relevant lifecycle or victory transitions.
5. Allow Colyseus to publish state changes.

The client may render at 60 frames per second or the device-supported rate. Rendering frequency must not change game speed.

---

## 12. Timing

Gameplay cooldowns and deadlines are server-owned.

Use absolute server timestamps or authoritative remaining durations as appropriate.

Examples:

- Kill cooldown deadline.
- Discussion end time.
- Voting end time.
- Match-start countdown.

Client timers are visual estimates only. The server determines when an action becomes legal or a phase ends.

---

## 13. Validation and Security Boundaries

The server must reject actions when any required condition fails.

### Movement validation

Check:

- Player exists and is connected.
- Player is alive and allowed to move.
- Match phase permits movement.
- Input is finite and within accepted magnitude.
- Resulting movement respects speed, collisions, and map boundaries.

### Kill validation

Check:

- Sender is the Killer.
- Sender and target exist and are alive.
- Sender is not targeting themselves.
- Match phase permits killing.
- Sender is not venting or otherwise action-locked.
- Target is within authoritative kill range.
- Cooldown has expired.

### Meeting validation

Check:

- Sender exists and is alive.
- Match phase is `playing`.
- Sender has a meeting use remaining.
- No meeting is already active.
- Any required location or interaction condition is satisfied.

### Vote validation

Check:

- Sender is alive and eligible to vote.
- Match phase is `voting`.
- Target is an eligible living player, or the vote is an allowed abstention.
- Voting deadline has not passed.

### Vent validation

Check:

- Sender is the Killer.
- Sender is alive.
- Match phase is `playing`.
- Requested vent exists.
- Entry or exit position is valid.
- Requested traversal follows the vent graph.

### Color validation

Check:

- Match phase is `lobby`.
- Requested color exists.
- Requested color is not assigned to another player.

Authentication proves identity, not permission to perform a game action. Game systems still enforce gameplay authorization.

---

## 14. Player Departure and Reconnection

### Initial MVP behavior

Before full reconnection is implemented:

- Remove or mark a disconnected player according to the active milestone's documented behavior.
- Release their lobby color if the match has not started.
- Reevaluate victory conditions if a departure affects living role counts.
- Ensure stale input and private runtime state are cleaned up.

### Reconnection behavior

Reconnection uses the stable authenticated account association and Colyseus' original held session ID with a limited server-owned grace window. During the window, the public player entity remains synchronized with `isConnected = false`, while stale movement input and incompatible private action state are neutralized.

A reconnecting client receives:

- Current public room state.
- Its own private role and cooldown information.
- Current meeting or voting context where applicable.
- Its own private vent state, if applicable.

After the grace window expires, `GameRoom` removes the player and all private session state, then calls `VictorySystem` to evaluate any changed living-role counts. A separate fresh session for an account already represented in the room must not create or control a duplicate player.

It must not receive another player's private data.

---

## 15. Error Handling

Use explicit error categories where practical:

- Invalid message.
- Unauthorized action.
- Action unavailable in current phase.
- Invalid target.
- Cooldown active.
- Rate limit exceeded.
- Authentication failure.
- Internal server error.

Expected invalid player actions should not crash the room.

Server logs may contain technical details, but messages sent to clients must not expose secrets, tokens, stack traces, or another player's private state.

---

## 16. Testing Strategy

### 16.1 Unit tests

Test game systems without a running network server.

Required rule coverage includes:

- Unique color assignment and release.
- Role assignment counts and privacy boundaries.
- Movement clamping and phase restrictions.
- Kill range, cooldown, role, and alive-state validation.
- Emergency-meeting limits.
- Vote replacement, abstention, ties, and ejection.
- Vent eligibility and connectivity.
- Crewmate and Killer victory conditions.
- Legal and illegal lifecycle transitions.

### 16.2 Room integration tests

Test:

- Joining and leaving.
- Message routing.
- Public-state synchronization.
- Private role delivery.
- Rejection of malformed messages.
- Full match flow through Colyseus room boundaries.

### 16.3 Client tests

Test:

- Keyboard and touch adapters produce the same logical intentions.
- UI controls appear in the correct local context.
- Network messages are created with valid payloads.
- Renderer consumes state without mutating authoritative data.

### 16.4 End-to-end tests

A full-match test should eventually cover:

1. Multiple clients join.
2. Each player receives a unique color.
3. Players ready up.
4. Roles are assigned privately.
5. Players move.
6. A meeting is called.
7. Votes are submitted and resolved.
8. A match ends through a valid victory condition.

---

## 17. Observability

Use structured server logs for important lifecycle events:

- Room creation and disposal.
- Join, leave, and reconnect.
- Match start and end.
- Phase transitions.
- Rejected messages and rate-limit events.
- Internal errors.

Do not log:

- Authentication secrets.
- Raw tokens.
- Personal information that is not needed for operations.
- Private role assignments in production logs unless a tightly controlled diagnostic policy explicitly permits it.

Metrics and analytics are deferred unless a milestone explicitly introduces them.

---

## 18. Proposed Repository Structure

```text
project-root/
├── AGENTS.md
├── GAME_SPEC.md
├── ARCHITECTURE.md
├── MILESTONES.md
├── package.json
├── apps/
│   ├── server/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── app.config.ts
│   │       ├── index.ts
│   │       ├── rooms/
│   │       │   ├── GameRoom.ts
│   │       │   └── schema/
│   │       │       ├── GameState.ts
│   │       │       ├── PublicMeetingState.ts
│   │       │       └── PublicPlayerState.ts
│   │       ├── match/
│   │       │   ├── MatchContext.ts
│   │       │   └── MatchConfig.ts
│   │       ├── systems/
│   │       │   ├── ColorSystem.ts
│   │       │   ├── KillSystem.ts
│   │       │   ├── LobbySystem.ts
│   │       │   ├── MatchLifecycleSystem.ts
│   │       │   ├── MeetingSystem.ts
│   │       │   ├── MovementSystem.ts
│   │       │   ├── RoleAssignmentSystem.ts
│   │       │   ├── VentSystem.ts
│   │       │   ├── VictorySystem.ts
│   │       │   └── VotingSystem.ts
│   │       ├── services/
│   │       │   ├── AccountService.ts
│   │       │   ├── Clock.ts
│   │       │   ├── PersistenceService.ts
│   │       │   └── RandomSource.ts
│   │       └── validation/
│   │           └── messageValidation.ts
│   └── client/
│       ├── index.html
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       └── src/
│           ├── main.ts
│           ├── app/
│           │   └── GameApp.ts
│           ├── input/
│           │   ├── DesktopInputAdapter.ts
│           │   ├── InputController.ts
│           │   └── TouchInputAdapter.ts
│           ├── network/
│           │   └── NetworkClient.ts
│           ├── rendering/
│           │   ├── Camera.ts
│           │   └── CanvasRenderer.ts
│           ├── state/
│           │   └── ClientStore.ts
│           └── ui/
│               ├── LobbyUI.ts
│               ├── MeetingUI.ts
│               ├── RoleUI.ts
│               └── VotingUI.ts
├── packages/
│   └── shared/
│       ├── package.json
│       └── src/
│           ├── constants.ts
│           ├── messages.ts
│           ├── publicTypes.ts
│           └── validation.ts
└── tests/
    ├── integration/
    └── e2e/
```

This is the target structure, not a requirement to create every file immediately. Milestones should introduce only the files needed for their current scope.

---

## 19. Dependency Rules

Allowed dependency direction:

```text
Client UI/Renderer -> Client Store -> Network Client -> Shared Contracts
GameRoom -> Game Systems -> Domain Types and Service Interfaces
Infrastructure Services -> Service Interfaces
Server and Client -> Shared Contracts
```

Prohibited dependencies:

- Shared contracts importing server code.
- Game systems importing Canvas or browser APIs.
- Renderer importing server implementations.
- Core rules directly accessing a database.
- Client code importing server-only secrets or runtime modules.
- One game system mutating another system's private data without a defined method or shared match-context contract.

Avoid circular imports. If two modules need the same concept, move the concept into an inward, dependency-neutral module.

---

## 20. Configuration

Balance and timing values should be centralized in server-owned configuration.

Examples:

```ts
interface MatchConfig {
  minPlayers: number;
  maxPlayers: number;
  simulationTicksPerSecond: number;
  playerSpeed: number;
  killRange: number;
  killCooldownMs: number;
  discussionDurationMs: number;
  votingDurationMs: number;
  emergencyMeetingsPerPlayer: number;
}
```

The client may receive public configuration needed for UI, but must not be trusted to enforce it.

Do not scatter unexplained gameplay constants across room handlers and systems.

---

## 21. Implementation Rules for Milestones

For each milestone:

1. Read `GAME_SPEC.md`, `ARCHITECTURE.md`, `MILESTONES.md`, and `AGENTS.md`.
2. Implement only the active milestone.
3. List files to create or change before editing.
4. Identify affected public state, private state, and network contracts.
5. Preserve the public/private information boundary.
6. Add or update tests for implemented rules.
7. Run type checking and tests.
8. Report deviations or unresolved design decisions.
9. Do not create deferred systems merely to anticipate future work.

A milestone may use a reduced implementation behind a stable interface, but must not violate the architecture to move faster.

---

## 22. Architectural Decisions

### Decision 1: Server-authoritative simulation

All gameplay outcomes are computed by the server to reduce cheating opportunities and keep clients consistent.

### Decision 2: Private roles outside public schema

Secret role assignments remain in server-only state and are delivered privately to the owning player.

### Decision 3: Thin Colyseus room

`GameRoom` coordinates networking and systems. Rule-heavy logic lives in focused modules that can be unit tested.

### Decision 4: Shared transport contracts

Server and client share explicit message types and public constants, while server-only domain data remains private.

### Decision 5: Unified logical input

Keyboard and touch controls produce the same device-independent input intentions.

### Decision 6: Fixed-rate server simulation

Game simulation progresses independently of client rendering speed.

### Decision 7: Persistence outside active room logic

Accounts and progression are accessed through services rather than embedded database logic in `GameRoom`.

---

## 23. Explicitly Deferred Architecture

The following must not be designed in detail until a milestone requires them:

- Horizontal room scaling.
- Distributed presence.
- Matchmaking queues.
- Ranked ratings.
- Voice chat.
- Replay storage.
- Advanced anti-cheat systems.
- Production analytics pipeline.
- Store or payment systems.
- Full client prediction, rollback, and lag compensation.

Code should not block these possibilities, but the MVP must not carry speculative complexity for them. The architecture should not prevent them from being added as separate applications or services.

---

## 24. Definition of Architectural Compliance

A change complies with this architecture when:

- The server remains authoritative.
- Secret information remains private.
- `GameRoom` delegates rule-heavy behavior.
- Each rule has one canonical owner.
- Client rendering and input remain separate from simulation rules.
- Network payloads are typed and validated.
- Core rules can be tested without starting the browser renderer.
- Persistent storage is accessed through service boundaries.
- The change implements only the current milestone unless documentation is intentionally updated.
