# Milestones

## 1. Purpose

This document defines the implementation sequence for the game described in `GAME_SPEC.md` and constrained by `ARCHITECTURE.md`.

It answers:

- What should be built next?
- What is in and out of scope for each milestone?
- What must be demonstrable before moving forward?
- Which tests and documentation updates are required?

This roadmap favors small, playable vertical slices over broad unfinished systems.

---

## 2. Document Responsibilities

Use the project documents as follows:

1. `GAME_SPEC.md` defines the game and its behavior.
2. `ARCHITECTURE.md` defines system boundaries, ownership, and dependency rules.
3. `MILESTONES.md` defines implementation order and current scope.
4. `AGENTS.md` defines coding standards and instructions for coding agents.

A milestone may refine an implementation detail, but it must not silently override the game specification or architecture.

If a milestone exposes an unresolved design decision, record the decision explicitly before implementation.

---

## 3. Milestone Execution Rules

Only one milestone should be active at a time.

For every milestone:

1. Read `GAME_SPEC.md`, `ARCHITECTURE.md`, `MILESTONES.md`, and `AGENTS.md`.
2. Review the dependency versions already present in `package.json`.
3. Do not assume APIs from a different library version.
4. List the files that will be created or changed before editing.
5. Identify public state, private state, and network-contract changes.
6. Implement only the active milestone.
7. Add or update automated tests.
8. Run formatting, linting, type checking, and tests when configured.
9. Perform the milestone's manual verification scenario.
10. Update relevant documentation when contracts or decisions change.
11. Report any deviation from the architecture.
12. Stop when the milestone's acceptance criteria are satisfied.

Do not implement later milestones speculatively.

---

## 4. Definition of Done

A milestone is complete only when:

- All required deliverables exist.
- Acceptance criteria pass.
- Required automated tests pass.
- The manual verification scenario works.
- No known type errors remain.
- Public and private state boundaries are preserved.
- New client messages are validated by the server.
- No deferred feature was added unintentionally.
- Relevant setup and usage instructions are documented.
- The project remains runnable from a clean install.

If a criterion is intentionally postponed, record it as an explicit exception rather than silently declaring the milestone complete.

---

## 5. Roadmap Overview

```text
M0  Repository and toolchain foundation
 ↓
M1  Connection, spawning, and authoritative movement
 ↓
M2  Lobby, unique colors, and ready flow
 ↓
M3  Match lifecycle and private role assignment
 ↓
M4  Map boundaries and collision
 ↓
M5  Kill system, elimination, and basic victory
 ↓
M6  Emergency meetings and discussion phase
 ↓
M7  Voting, ejection, and complete victory flow
 ↓
M8  Vent network and Killer traversal
 ↓
M9  Mobile controls and responsive cross-platform UI
 ↓
M10 Accounts and persistence
 ↓
M11 Reconnection and resilience
 ↓
M12 Networking polish and gameplay presentation
 ↓
M13 Full-match hardening and release candidate
```

Milestones M0 through M9 form the first complete local-network gameplay loop.

Accounts, reconnection, production hardening, and advanced networking follow after the core game is fun and mechanically complete.

---

# Milestone 0: Repository and Toolchain Foundation

## Goal

Create a clean TypeScript workspace in which the server, client, and shared contracts can be developed and tested independently.

## Scope

- Root workspace configuration.
- Colyseus server application.
- Vite client application.
- Shared TypeScript package or directory.
- Strict TypeScript configuration.
- Formatting, linting, type-checking, and test commands.
- Environment-variable example files.
- Minimal health or startup verification.
- Basic developer setup instructions.

## Required decisions

Before implementation, pin compatible versions for:

- Node.js runtime.
- Colyseus server packages.
- Colyseus browser SDK.
- Vite.
- TypeScript.
- Test runner.
- Linter and formatter, if used.

Record versions in package files. Do not write code against unspecified versions.

## Expected deliverables

```text
project-root/
├── AGENTS.md
├── GAME_SPEC.md
├── ARCHITECTURE.md
├── MILESTONES.md
├── package.json
├── apps/
│   ├── server/
│   └── client/
└── packages/
    └── shared/
```

Minimum scripts:

```text
install
dev
dev:server
dev:client
build
typecheck
test
lint
format
```

Exact script names may follow the chosen workspace conventions, but their purpose must be documented.

## Automated verification

- Server package compiles.
- Client package compiles.
- Shared package compiles.
- Root type-check command covers every package.
- A starter test can run successfully.

## Manual verification

1. Install dependencies from a clean checkout.
2. Start server and client development processes.
3. Open the client in a browser.
4. Confirm the page loads and reports whether it can reach the server.

## Acceptance criteria

- One documented command starts the development environment.
- Client and server build without TypeScript errors.
- Shared contracts can be imported by both applications.
- Server-only code is not bundled into the browser.
- No gameplay feature is implemented yet.

## Out of scope

- Player movement.
- Lobby rules.
- Roles.
- Accounts.
- Database integration.
- Production deployment.

---

# Milestone 1: Connection, Spawning, and Authoritative Movement

## Goal

Allow multiple browser clients to join one room, spawn as simple placeholders, move using keyboard input, and observe server-authoritative positions on Canvas.

## Vertical slice

A player opens the client, joins a room, sees all connected players, moves their own placeholder, and sees other players move in real time.

## Scope

### Server

- `GameRoom` creation and disposal.
- Minimal public `GameState` and `PublicPlayerState` schemas.
- Join and leave handling.
- Safe random or deterministic spawn positions.
- Validated directional input.
- Fixed-rate authoritative movement simulation.
- Basic world boundaries.
- Removal of stale input on leave.

### Shared contracts

- Movement input message.
- Public identifiers and relevant constants.
- Transport-safe validation types or schemas.

### Client

- Colyseus connection and room join.
- Replicated-player store.
- Keyboard input adapter.
- Canvas renderer.
- Render loop independent from the server simulation rate.
- Basic connection and error status.

## Public state

Minimum synchronized fields:

```text
player id
x
y
connected state, only if needed
```

## Private state

Minimum server-only fields:

```text
latest validated movement input per player
input sequence or timing metadata, if used
```

## Validation requirements

- Reject non-finite input.
- Clamp or normalize input magnitude.
- Enforce server-defined movement speed.
- Do not accept client-submitted position as authoritative.
- Ignore movement from unknown or disconnected players.
- Apply a reasonable input-message rate limit.

## Automated tests

- Player is added on join.
- Player is removed on leave.
- Invalid movement payload does not mutate state.
- Diagonal input does not exceed configured speed.
- Position remains within basic world bounds.
- Movement distance is determined by server time and speed.

## Manual verification

1. Start one server and two browser clients.
2. Join the same room from both clients.
3. Confirm both placeholders are visible.
4. Move each player independently with the keyboard.
5. Confirm both clients converge on authoritative positions.
6. Close one client and confirm its player disappears.

## Acceptance criteria

- Two or more clients can join the same room.
- The server, not the client, calculates positions.
- Movement is smooth enough to evaluate locally.
- Client rendering does not mutate server state.
- `GameRoom` delegates movement rules to `MovementSystem`.

## Out of scope

- Touch controls.
- Collision with interior map geometry.
- Prediction and reconciliation.
- Colors and lobby readiness.
- Roles, killing, meetings, voting, and vents.
- Accounts and persistence.

---

# Milestone 2: Lobby, Unique Colors, and Ready Flow

## Goal

Create a functional pre-match lobby with unique colors and server-validated readiness.

## Vertical slice

Players join, receive unique colors, change to available colors, mark themselves ready, and see the shared lobby state.

## Scope

### Server

- Public lobby phase.
- Configurable minimum and maximum player counts.
- Catalog of 21 color identifiers.
- Automatic assignment of an available color on join.
- Server validation of color-change requests.
- Color release when a lobby player leaves.
- Ready and unready actions.
- Lobby start eligibility calculation.

### Client

- Lobby screen.
- Player list.
- Color selection UI.
- Unavailable-color indication.
- Ready toggle.
- Start eligibility feedback.

## Public state

Add:

```text
match phase
player display label or temporary name
color id
ready status
```

## Private state

No new secret gameplay state is required.

## Validation requirements

- Color changes are accepted only in the lobby.
- A color may belong to only one current player.
- Unknown color identifiers are rejected.
- Ready changes are accepted only in the lobby.
- Room capacity is enforced on the server.

## Automated tests

- Joining players receive distinct colors.
- Duplicate color requests are rejected.
- Leaving a lobby releases the color.
- Unknown colors are rejected.
- Ready state changes only in the lobby.
- Start eligibility requires the configured minimum and readiness rule.

## Manual verification

1. Open multiple clients.
2. Confirm every player receives a different color.
3. Attempt to select a color already in use.
4. Confirm the server rejects it and state remains consistent.
5. Toggle readiness from each client.
6. Disconnect a player and confirm their color becomes available.

## Acceptance criteria

- No two room players can share a color.
- All clients display the same color ownership.
- Ready state is authoritative and synchronized.
- Lobby logic resides in `LobbySystem` and `ColorSystem`.

## Out of scope

- Starting gameplay and assigning roles.
- Persistent names or account identity.
- Cosmetic inventory.
- Matchmaking.

---

# Milestone 3: Match Lifecycle and Private Role Assignment

## Goal

Start a match from the lobby, assign one Killer privately, assign all remaining players as Crewmates, and transition safely into gameplay.

## Vertical slice

Eligible players ready up, the server starts the match, each player privately learns their role, and nobody receives another player's role.

## Scope

### Server

- Match-start command or authoritative automatic start rule.
- Legal lifecycle transitions for:

```text
lobby
assigningRoles
playing
ended, only for administrative reset if needed
```

- Random role assignment using an injectable random source.
- Private server role map.
- Private role delivery to each client.
- Lobby lock when role assignment begins.
- Initial match reset behavior.

### Client

- Match-start transition.
- Private local role storage.
- Role reveal interface for the local player.
- Generic rendering that does not visually distinguish the Killer to other clients.

## Public state

Add or formalize:

```text
match phase
match identifier or round number, if needed
```

Do not add role fields to public player state.

## Private state

Add:

```text
role assignment map
local private role message
```

## Validation requirements

- Match starts only from the lobby.
- Minimum-player and readiness rules must pass.
- Exactly one Killer is assigned for the MVP configuration.
- Every participating player receives exactly one valid role.
- Role information is sent only to its owning client.
- Late join behavior is explicitly rejected or handled according to the chosen MVP rule.

## Automated tests

- Exactly one player becomes Killer.
- All other players become Crewmates.
- Assignment includes every participating player once.
- Roles never appear in serialized public room state.
- Match cannot start with too few or unready players.
- Invalid lifecycle transitions are rejected.
- Deterministic random source produces deterministic tests.

## Manual verification

1. Join with the minimum supported number of clients.
2. Ready every player.
3. Start the match.
4. Confirm each client sees only its own role.
5. Inspect synchronized public state and confirm it contains no role field.
6. Confirm all players appear visually identical apart from public color.

## Acceptance criteria

- Role secrecy is preserved at the network-state boundary.
- Match lifecycle is controlled by `MatchLifecycleSystem`.
- Role assignment is controlled by `RoleAssignmentSystem`.
- The project has an automated test that detects accidental public role exposure.

## Out of scope

- Killing.
- Meetings and voting.
- Vents.
- Full end-game rules.
- Multiple Killers.

---

# Milestone 4: Map Boundaries and Collision

## Goal

Replace the empty movement area with a simple original spaceship map and authoritative collision.

## Vertical slice

Players move through rooms and corridors but cannot cross walls or leave the playable area.

## Scope

### Shared or data layer

- Original map definition format.
- Spawn points.
- Collision geometry.
- Meeting-room spawn positions for later milestones.
- Stable identifiers for rooms and future interaction points.

### Server

- Authoritative collision checks.
- Valid spawn selection.
- Prevention of movement through walls.
- Separation of static map data from networking code.

### Client

- Render an original placeholder spaceship layout.
- Use the same map data or a compatible client representation.
- Draw collision boundaries only when debug mode is enabled.
- Camera behavior for a map larger than the viewport, if needed.

## Design constraint

The map must be original. Do not copy room layouts, names, artwork, proportions, or distinctive presentation from an existing commercial game.

## Automated tests

- Spawn points are inside playable areas.
- Players cannot cross representative walls.
- Players can pass through intended doors and corridors.
- Out-of-bounds movement is rejected or corrected.
- Collision results do not depend on client rendering.

## Manual verification

1. Join with two clients.
2. Move through every accessible corridor.
3. Attempt to cross exterior and interior walls.
4. Confirm both clients display the server-corrected position.
5. Resize the browser and verify the map remains usable.

## Acceptance criteria

- The server uses map collision to determine legal positions.
- Client and server agree on map scale and coordinates.
- Map data is not hard-coded inside `GameRoom`.
- Placeholder visuals are clearly original.

## Out of scope

- Tasks.
- Doors and sabotage.
- Vent traversal.
- Advanced field-of-view or fog-of-war.
- Finished artwork.

---

# Milestone 5: Kill System, Elimination, and Basic Victory

## Goal

Allow the Killer to eliminate an eligible nearby Crewmate under server authority and end the match when living-player parity is reached.

## Vertical slice

The Killer approaches a Crewmate, submits a kill request, the server validates the action, eliminates the target, starts the cooldown, and evaluates victory.

## Scope

### Server

- Kill command routing.
- Killer-role authorization.
- Alive-state checks.
- Authoritative range calculation.
- Configurable kill range.
- Configurable cooldown.
- Elimination state transition.
- Prevention of eliminated-player movement and actions.
- Basic spectator state.
- Killer parity victory evaluation.
- Ended phase and public winner information.

### Client

- Kill button or desktop action for the local Killer.
- Eligible-target highlighting based on client-visible approximation only.
- Server rejection feedback.
- Elimination presentation.
- Basic spectator presentation.
- End-of-match result screen.

Client target highlighting is advisory. The server remains authoritative.

## Public state

Add:

```text
alive status
winner after match end
public end reason
```

## Private state

Add:

```text
kill cooldown deadline per Killer
private rejection reason where appropriate
```

## Validation requirements

- Sender has the Killer role.
- Sender and target are alive.
- Sender cannot target themselves.
- Phase is `playing`.
- Target is within authoritative range.
- Kill cooldown has expired.
- Sender is not in an incompatible state.

## Automated tests

- Crewmates cannot kill.
- Killer cannot kill outside range.
- Killer cannot kill during cooldown.
- Killer cannot kill an eliminated player.
- Valid kill eliminates exactly one target.
- Eliminated players cannot move.
- Killer wins when living Killers are greater than or equal to living Crewmates.
- `VictorySystem` is the only owner of winner calculation.

## Manual verification

1. Start a match with multiple clients.
2. Confirm only the Killer sees the kill control.
3. Attempt a kill outside range and confirm rejection.
4. Perform a valid kill.
5. Attempt another kill during cooldown.
6. Reach parity and confirm the match ends for every client.

## Acceptance criteria

- Kill outcomes are calculated only by the server.
- Cooldown cannot be bypassed by client messages or clock changes.
- Eliminated players cannot affect active gameplay.
- Basic Killer victory works consistently.

## Out of scope

- Corpse reporting.
- Death animations beyond placeholders.
- Emergency meetings.
- Voting and ejection.
- Advanced spectator movement.

---

# Milestone 6: Emergency Meetings and Discussion Phase

## Goal

Allow each eligible living player to call one emergency meeting per match and transition all living players into a controlled discussion phase.

## Vertical slice

A living player interacts with the meeting mechanism, all living players are moved to the discussion room, gameplay actions are disabled, and a server-owned discussion timer runs.

## Scope

### Server

- Emergency-meeting command.
- One meeting use per eligible player per match.
- Optional meeting-button proximity or interaction validation.
- Transition from `playing` to `discussion`.
- Teleport living players to defined meeting positions.
- Clear movement inputs and incompatible action state.
- Disable killing, movement, and venting during discussion.
- Authoritative discussion deadline.
- Transition from `discussion` to `voting`.

### Client

- Emergency-meeting control.
- Meeting-use availability display for the local player.
- Discussion screen and timer.
- Clear visual transition into the meeting.
- Disable world-action controls during discussion.

## Public state

Add:

```text
discussion phase
meeting initiator id
discussion deadline or public remaining time
```

## Private state

Add:

```text
meetings remaining per player
```

Whether a player's remaining meeting count is shown publicly or privately must follow the game specification. Default to private unless intentionally changed.

## Validation requirements

- Caller exists and is alive.
- Phase is `playing`.
- Caller has a meeting use remaining.
- No meeting is already active.
- Required interaction conditions are satisfied.
- A rejected request does not consume the meeting use.

## Automated tests

- Eligible living player can call one meeting.
- Second meeting request from the same player is rejected.
- Eliminated player cannot call a meeting.
- Meeting cannot start outside `playing`.
- Valid meeting teleports all living players.
- Eliminated players are not eligible voters in the upcoming phase.
- Movement and killing are blocked during discussion.
- Discussion timer transitions to voting.

## Manual verification

1. Start a match.
2. Call an emergency meeting.
3. Confirm all living clients enter the meeting interface.
4. Confirm living players are positioned in the discussion room.
5. Attempt movement and kill commands during discussion.
6. Confirm the meeting caller cannot call a second meeting later.
7. Confirm transition to voting when the timer ends.

## Acceptance criteria

- Meeting use is consumed only after a valid meeting starts.
- Discussion timing is authoritative.
- Gameplay actions are blocked during discussion on the server.
- Meeting behavior is owned by `MeetingSystem`.

## Out of scope

- Text or voice chat.
- Vote submission and resolution.
- Corpse reporting.
- Meeting animations beyond placeholders.

---

# Milestone 7: Voting, Ejection, and Complete Victory Flow

## Goal

Complete the core social-deduction loop by allowing living players to vote, resolving ties and abstentions, ejecting a player when applicable, and evaluating both victory conditions.

## Vertical slice

A meeting enters voting, living players submit or change votes, the server resolves the result, optionally ejects a player, and either resumes play or ends the match.

## Scope

### Server

- Voting phase and deadline.
- Eligible living-voter list.
- Eligible candidate list.
- Vote submission and replacement.
- Abstention.
- Early completion when every eligible voter has submitted, if adopted.
- Vote tallying.
- No-ejection tie rule.
- Ejection state transition.
- Public results publication.
- Killer-ejected Crewmate victory.
- Post-vote transition back to play when nobody has won.
- Match-state cleanup after resolution.

### Client

- Voting interface.
- Living candidate list.
- Abstain option.
- Submitted-vote indication without exposing hidden choices early.
- Results screen.
- Ejection presentation.
- Return-to-play transition.
- Crewmate and Killer victory result screens.

## Public state

Add:

```text
voting phase
voting deadline
which eligible players have submitted, if intentionally public
published result after resolution
ejected player id, when applicable
winner and end reason
```

Do not synchronize individual vote choices before results are published.

## Private state

Add:

```text
voter-to-choice map before resolution
```

## Required design decisions

Before implementation, confirm:

- Whether voting ends early when all eligible players vote.
- Whether vote choices are revealed by voter after resolution or only totals are shown.
- How long results remain visible before play resumes or the end screen appears.
- Whether the ejected player's role is revealed, as currently stated in `GAME_SPEC.md`.

Record decisions in the appropriate document.

## Validation requirements

- Voter exists, is alive, and is eligible.
- Phase is `voting`.
- Candidate exists and is alive, or choice is valid abstention.
- Vote arrives before the authoritative deadline.
- One current vote per voter, with replacement allowed until locking.
- Eliminated and disconnected-ineligible players cannot vote.

## Automated tests

- Living eligible players can vote.
- Eliminated players cannot vote.
- Invalid candidates are rejected.
- Vote replacement keeps only the latest choice.
- Abstentions are counted correctly.
- Highest unique total causes ejection.
- Tie causes no ejection.
- Ejecting the Killer causes Crewmate victory.
- Ejecting a Crewmate resumes play unless parity gives the Killer victory.
- Individual choices remain private before publication.

## Manual verification

1. Start a multi-client match.
2. Call a meeting and enter voting.
3. Submit, change, and abstain from votes.
4. Test a tie and confirm no ejection.
5. Test ejection of a Crewmate and return to play.
6. Test ejection of the Killer and confirm Crewmate victory.
7. Confirm every client receives the same authoritative result.

## Acceptance criteria

- One complete match can end through either side's victory condition.
- Vote choices do not leak before publication.
- Tie and abstention behavior matches the specification.
- Vote counting is implemented only in `VotingSystem`.
- Winner calculation is implemented only in `VictorySystem`.

## Out of scope

- Chat moderation.
- Voice discussion.
- Ranked scoring.
- Multiple Killers.

---

# Milestone 8: Vent Network and Killer Traversal

## Goal

Add a server-authoritative vent or sewer network that only the Killer can enter and traverse.

## Vertical slice

The Killer approaches a vent, enters it, selects a connected destination, and exits at a valid node while Crewmates are denied access.

## Scope

### Map data

- Original vent-node identifiers.
- Node positions.
- Explicit connectivity graph.
- Valid entry and exit points.

### Server

- Vent entry, travel, and exit commands.
- Killer-role authorization.
- Entry-distance validation.
- Graph-connectivity validation.
- Runtime vent state.
- Position updates only at valid transitions.
- Blocking movement, killing, and meetings while venting where required.
- Cleanup on elimination, disconnect, or phase transition.

### Client

- Vent interaction control for the local Killer.
- Connected-destination selection.
- Vent-state presentation.
- No Killer-specific visual marker visible to other players.

## Public and private-state decision

Before implementation, decide what other players may observe while a Killer is venting.

At minimum, do not expose the Killer role directly. If vent entry or exit is intended to be observable, synchronize only the public visual event needed for witnesses.

Record the chosen visibility behavior.

## Validation requirements

- Sender is alive and has the Killer role.
- Phase is `playing`.
- Entry node exists and is within range.
- Destination is connected to the current node.
- Exit node exists and is valid.
- Sender is currently in the correct vent state for the command.

## Automated tests

- Crewmates cannot enter vents.
- Killer cannot enter a distant or unknown vent.
- Killer can travel only across connected nodes.
- Killer exits at the authoritative node position.
- Normal movement and incompatible actions are blocked while venting.
- Vent state is cleared on meeting transition and disconnect.

## Manual verification

1. Start a match and identify the local Killer client.
2. Approach and enter a vent.
3. Traverse to a connected node and exit.
4. Attempt to traverse to a disconnected node.
5. Attempt vent access from a Crewmate client.
6. Trigger a meeting and confirm vent state is cleaned up safely.

## Acceptance criteria

- Only the Killer can use the vent network.
- Traversal follows server-owned map connectivity.
- Vent usage does not reveal private role state through the public schema.
- Vent behavior is owned by `VentSystem`.

## Out of scope

- Complex vent animations.
- Vent sabotage.
- Hidden-camera or visibility mechanics.

---

# Milestone 9: Mobile Controls and Responsive Cross-Platform UI

## Goal

Make the complete core match playable on a touch-only mobile device without keyboard or mouse.

## Vertical slice

A mobile player can join, select a color, ready up, move, kill when assigned Killer, call a meeting, vote, use vents, and view match results.

## Scope

### Input

- Virtual joystick.
- Touch buttons for context-sensitive actions.
- Pointer and touch event handling.
- Device-independent `InputController` contract.
- Prevention of browser gestures that interfere with play where appropriate.

### Layout

- Responsive Canvas sizing.
- Safe-area handling.
- Orientation-aware control layout.
- Readable lobby, meeting, voting, and results UI.
- Dynamic control availability based on local state.

### Desktop parity

- Keyboard and mouse behavior remains functional.
- Desktop and mobile adapters generate equivalent logical intentions.

## Automated tests

- Keyboard and touch adapters produce bounded movement intentions.
- Releasing touch resets movement input.
- Action-button events produce one logical action per activation.
- UI state exposes correct controls for role and phase.
- Viewport resizing does not change authoritative coordinates.

## Manual verification

Test on at least:

- One desktop browser using keyboard and mouse.
- One touch-capable mobile browser or accurate device emulation.
- Portrait and landscape layouts if both are supported.

Run one complete match with mixed desktop and mobile clients.

## Acceptance criteria

- No core match action requires keyboard or mouse.
- Mobile and desktop clients can play in the same room.
- Controls do not obscure essential meeting or voting information.
- Touch controls use the same network contracts and server validation as desktop controls.

## Out of scope

- Native iOS or Android packages.
- App-store distribution.
- Controller or gamepad support.
- Accessibility certification, though accessible practices should be followed.

---

# Milestone 10: Accounts and Persistence

## Goal

Give each installation or authenticated user a stable identity and persist the minimum profile information required by the game specification.

## Vertical slice

A player creates or receives an account identity, chooses a display name, leaves, reconnects later, and retains their profile information.

## Required design decisions

Before implementation, decide and document:

- Guest device identity versus registered credentials.
- Authentication provider or custom approach.
- Database technology.
- Account-recovery expectations.
- Display-name rules.
- Privacy and data-retention requirements.
- Which progression and statistics are actually part of the first release.

Do not invent real authentication or privacy requirements during implementation.

## Scope

### Server and services

- `AccountService` interface.
- `PersistenceService` interface and implementation.
- Stable account identifier.
- Account creation or identity resolution.
- Display-name persistence.
- Minimal preferences persistence.
- Safe association between a connection and account identity.
- Migration mechanism or schema-version strategy.

### Client

- Account initialization flow.
- Display-name setup and validation feedback.
- Local secure handling appropriate to the chosen authentication method.
- Profile loading state.

## Security requirements

- Never trust a client-submitted account ID without authentication or a secure binding mechanism.
- Never store raw passwords without an established secure authentication implementation.
- Never expose tokens in public room state or logs.
- Use server-side authorization for profile updates.
- Collect only data required by documented product behavior.

## Automated tests

- New identity can be created or resolved.
- Returning identity loads the same profile.
- Invalid display names are rejected.
- One player cannot update another account's profile.
- Authentication secrets never appear in public game state.
- Room logic can be tested with a fake account service.

## Manual verification

1. Create a new profile.
2. Join a room and confirm the public safe identity is displayed.
3. Leave and restart the client.
4. Confirm the same profile is loaded.
5. Attempt an unauthorized profile update and confirm rejection.

## Acceptance criteria

- Each returning player can retain a stable identity.
- Database logic remains outside `GameRoom` and core game systems.
- Minimum privacy and security decisions are documented.
- The game remains playable with test or local account infrastructure.

## Out of scope

- Social login unless explicitly selected.
- Friends.
- Store purchases.
- Ranked profiles.
- Broad progression systems not yet specified.

---

# Milestone 11: Reconnection and Resilience

## Goal

Allow temporary disconnects without corrupting the match and restore the reconnecting player's public and private context safely.

## Vertical slice

A player disconnects during a match, reconnects within the allowed window, regains control of the same player, receives only their own private role data, and continues playing.

## Required design decisions

- Reconnection window length.
- Behavior while a player is disconnected.
- Whether a disconnected player remains targetable.
- How departures affect victory conditions after the window expires.
- Behavior during discussion and voting.
- Whether a reconnecting voter may vote if the deadline has not passed.

## Scope

### Server

- Stable authenticated player-to-session mapping.
- Grace-period handling.
- Pause or neutralization of stale movement input.
- Safe reconnection to the existing player entity.
- Redelivery of the reconnecting player's private role and relevant cooldown state.
- Cleanup after reconnection expiry.
- Victory reevaluation when a player is permanently removed.

### Client

- Connection-loss indication.
- Rejoin attempt flow.
- State reset and resynchronization.
- Prevention of duplicate local input loops after reconnecting.

## Automated tests

- Disconnect clears active movement input.
- Reconnection restores the same player entity.
- Reconnected player receives only their own role.
- Expired reconnection cleans up private runtime state.
- Duplicate sessions cannot control one player simultaneously without an explicit rule.
- Victory conditions remain consistent through disconnect and expiry scenarios.

## Manual verification

1. Start a multi-client match.
2. Disconnect one active player temporarily.
3. Reconnect within the allowed window.
4. Confirm position, alive state, role, and cooldown context are restored.
5. Disconnect again and let the reconnection window expire.
6. Confirm consistent cleanup and victory evaluation.

## Acceptance criteria

- Temporary network loss does not duplicate players.
- Reconnection does not expose another player's private information.
- Stale inputs cannot continue moving a disconnected player.
- Permanent departure behavior is deterministic and documented.

## Out of scope

- Migration of a live room between servers.
- Offline play.
- Cross-region failover.

---

# Milestone 12: Networking Polish and Gameplay Presentation

## Goal

Improve perceived movement quality and presentation without weakening server authority or changing core game rules.

## Scope

Potential features, introduced only as needed after measurement:

- Snapshot interpolation for remote players.
- Local input prediction.
- Server reconciliation.
- Sequence acknowledgements.
- Teleport and phase-transition handling.
- Network diagnostics in development mode.
- Placeholder animation and audio hooks.
- Improved action feedback.
- Camera smoothing.

## Implementation rule

Begin with remote-player interpolation. Add local prediction only if real testing demonstrates that it is necessary.

Prediction must never become authority.

## Automated tests

- Interpolation does not mutate authoritative replicated state.
- Reconciliation converges toward server state.
- Old input acknowledgements are ignored safely.
- Teleports and meeting transitions do not interpolate through walls.
- Packet-delay simulation does not break match rules.

## Manual verification

Test under simulated:

- Moderate latency.
- Jitter.
- Temporary packet delay.
- Multiple simultaneous moving players.

Confirm movement remains understandable and the server remains authoritative.

## Acceptance criteria

- Remote movement is visually stable under expected network conditions.
- Reconciliation cannot bypass collision or speed rules.
- Meeting teleports, vent exits, and eliminations render correctly.
- Networking polish remains isolated from core rule ownership.

## Out of scope

- Full rollback simulation unless separately justified.
- Competitive lag compensation beyond the documented design.
- Production-scale load testing, which belongs to the next milestone.

---

# Milestone 13: Full-Match Hardening and Release Candidate

## Goal

Validate the complete game loop, close critical reliability and security gaps, and produce a release candidate suitable for controlled playtesting.

## Scope

### Quality

- Full-match end-to-end tests.
- Cross-browser verification.
- Mobile and desktop verification.
- Repeated rematch or room-recreation testing.
- Error-state and disconnect testing.
- Configuration review.
- Removal of debug-only shortcuts from production builds.

### Security and abuse resistance

- Message-size limits.
- Per-message rate limits.
- Authentication and authorization review.
- Input and identifier validation review.
- Secret-state exposure audit.
- Dependency and build review.
- Safe logging review.

### Performance

- Multi-client room load testing at configured room capacity.
- Server simulation timing measurements.
- Client frame-rate review on target-class devices.
- Memory and cleanup review across repeated matches.

### Product completion

- Complete original placeholder or release-ready map presentation.
- Complete lobby-to-results flow.
- Clear setup and deployment documentation for the selected environment.
- Known-issues list.
- Playtest feedback template.

## Required end-to-end scenarios

At minimum:

1. Killer wins by reaching parity through kills.
2. Crewmates win by ejecting the Killer.
3. A tied vote causes no ejection.
4. A Crewmate is ejected and play resumes.
5. Each eligible player is limited to one emergency meeting.
6. Crewmates are denied vent access.
7. A mobile and desktop client complete the same match.
8. A temporary disconnect and successful reconnect occur.
9. A permanent departure does not leave corrupt room state.
10. Repeated matches do not reuse stale roles, votes, cooldowns, or meeting counters.

## Acceptance criteria

- All required end-to-end scenarios pass.
- No known critical state-leak, authentication, or match-integrity issue remains.
- A full match can be completed repeatedly at configured room capacity.
- Server simulation remains stable under the selected playtest load.
- Client controls are usable on desktop and touch devices.
- Setup, operation, and known limitations are documented.
- The build is ready for controlled external playtesting.

## Out of scope

Unless separately approved:

- Ranked play.
- Public matchmaking.
- Voice chat.
- Store or monetization.
- Battle pass.
- Replay service.
- Advanced analytics.
- Multiple regional deployments.

---

## 6. Deferred Feature Backlog

The following features are deliberately outside the milestone path until the core release candidate is stable:

- Public matchmaking service.
- Friends and parties.
- Ranked mode and ratings.
- Voice chat.
- Text-chat moderation.
- Store and payments.
- Battle pass.
- Additional roles.
- Multiple Killers.
- Tasks and task-based victory.
- Sabotage systems.
- Corpse reporting.
- Advanced field of view.
- Replay system.
- Spectator enhancements.
- Accessibility certification work.
- Native mobile applications.
- Gamepad support.
- Horizontal scaling and multi-region deployment.
- Production analytics pipeline.

A deferred feature must receive its own specification and milestone before implementation.

---

## 7. Decision Register

Record decisions that materially affect gameplay, architecture, networking, privacy, or milestone scope.

Use this format:

```md
### Decision: Short title

- Status: Proposed | Accepted | Replaced
- Date: YYYY-MM-DD
- Milestone: M<number>
- Context: Why the decision is needed.
- Decision: What was chosen.
- Consequences: Tradeoffs and follow-up work.
- Documents updated: List of affected files.
```

Do not use the decision register as a substitute for updating the authoritative section of `GAME_SPEC.md` or `ARCHITECTURE.md`.

---

## 8. Milestone Status Tracker

Update this section as work progresses.

```text
M0  Repository and toolchain foundation                COMPLETED
M1  Connection, spawning, and authoritative movement  NOT STARTED
M2  Lobby, unique colors, and ready flow               NOT STARTED
M3  Match lifecycle and private role assignment        NOT STARTED
M4  Map boundaries and collision                       NOT STARTED
M5  Kill system, elimination, and basic victory        NOT STARTED
M6  Emergency meetings and discussion phase            NOT STARTED
M7  Voting, ejection, and complete victory flow         NOT STARTED
M8  Vent network and Killer traversal                   NOT STARTED
M9  Mobile controls and responsive UI                   NOT STARTED
M10 Accounts and persistence                            NOT STARTED
M11 Reconnection and resilience                         NOT STARTED
M12 Networking polish and gameplay presentation         NOT STARTED
M13 Full-match hardening and release candidate          NOT STARTED
```

Allowed status values:

```text
NOT STARTED
IN PROGRESS
BLOCKED
COMPLETE
```

Only mark a milestone `COMPLETE` when its definition of done and acceptance criteria are satisfied.

---

## 9. Standard Prompt for Implementing a Milestone

Use this template with a coding agent:

```text
Read AGENTS.md, GAME_SPEC.md, ARCHITECTURE.md, and MILESTONES.md.

Implement Milestone M[number]: [name] only.

Before editing:
1. Summarize the milestone scope and explicit exclusions.
2. List the files you will create or change.
3. Identify public-state, private-state, and network-contract changes.
4. Identify unresolved decisions that block implementation.
5. Verify the dependency versions already present in package.json and use their APIs.

During implementation:
- Keep GameRoom thin.
- Preserve server authority.
- Do not expose private role or cooldown data in public synchronized state.
- Validate every client message on the server.
- Add tests for all acceptance criteria that can be automated.
- Do not implement later milestones.

After implementation:
1. Run formatting, linting, type checking, and tests.
2. Perform or describe the milestone's manual verification procedure.
3. Report files changed.
4. Report test results.
5. Report deviations, remaining risks, and documentation updates.
6. Stop after this milestone is complete.
```

---

## 10. First Development Target

Begin with `Milestone 0: Repository and Toolchain Foundation`.

Do not begin gameplay implementation until:

- Dependency versions are pinned.
- Server and client applications compile.
- Shared contracts are importable from both applications.
- Root development and verification commands work.

After M0 is complete, proceed to M1 and establish one small end-to-end multiplayer slice before adding lobby or social-deduction systems.
