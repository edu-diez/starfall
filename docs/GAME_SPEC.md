# Project: Codename Starfall

## Vision

A real-time multiplayer social deduction game inspired by the genre established by games such as Among Us, but implemented as an original project with its own architecture, assets, map, progression systems, and gameplay implementation.

Players are crew members aboard a spaceship. One player is secretly assigned the role of Killer. Crewmates must identify and eject the Killer before they are eliminated. The Killer must deceive the crew and reduce the number of living crewmates until parity is reached.

The game is designed for cross-platform play between desktop and mobile devices.

---

# Core Design Principles

## Server Authority

The server is the source of truth.

Clients may:

- Send input intentions.
- Render game state.
- Play animations.
- Display UI.

Clients may not:

- Decide movement outcomes.
- Decide kills.
- Decide meeting results.
- Decide victory conditions.
- Assign roles.

All game rules are validated and executed on the server.

---

## Hidden Information

The game relies on secret information.

The Killer role is private.

No client may receive another player's role through synchronized state.

Role information may only be delivered privately to the owning player.

---

## Fairness

All players:

- Move at the same speed.
- Share identical visuals.
- Have access to equivalent controls for their platform.

The Killer must have no visual differences from crewmates.

---

# Supported Platforms

## Desktop

Input:

- Keyboard
- Mouse

## Mobile

Input:

- Virtual joystick
- Touch buttons

---

# Technical Requirements

## Frontend

- TypeScript
- Vite
- HTML5 Canvas

## Backend

- Node.js
- TypeScript
- Colyseus

## Networking

- WebSockets via Colyseus

## Architecture

Strict separation of:

- Game simulation
- Networking
- Rendering
- UI
- Input

---

# Match Lifecycle

A match progresses through several phases.

```text
Lobby
  ↓
Role Assignment
  ↓
Playing
  ↓
Meeting
  ↓
Voting
  ↓
Playing
  ↓
End Game
```

---

# Phase Definitions

## Lobby

Players gather before the match begins.

Allowed actions:

- Join room
- Leave room
- Choose color
- Ready up

Disallowed:

- Movement
- Voting
- Killing

---

## Role Assignment

The server randomly assigns roles.

Process:

1. Lock lobby.
2. Select Killer.
3. Assign remaining players as Crewmates.
4. Send role privately.
5. Transition to Playing.

---

## Playing

Main gameplay phase.

Players move freely around the spaceship.

Crewmates:

- Explore
- Gather information
- Call emergency meetings

Killer:

- Move
- Kill
- Travel through vents

A meeting can interrupt this phase.

---

## Meeting

All living players are moved to a discussion area.

Actions disabled:

- Movement
- Killing
- Venting

Players discuss.

Discussion lasts a configurable amount of time.

After discussion:

```text
Meeting
    ↓
Voting
```

---

## Voting

Living players may vote.

Options:

- Vote for a player
- Abstain

When voting ends:

- Votes are counted.
- Results are revealed.
- Ejection occurs if applicable.

---

## End Game

The match concludes.

Results screen is displayed.

Players may return to lobby.

---

# Player Roles

## Crewmate

### Objective

Identify and eject the Killer.

### Abilities

- Move
- Participate in meetings
- Vote
- Call emergency meeting

### Restrictions

Cannot:

- Kill
- Enter vents

---

## Killer

### Objective

Eliminate crewmates and avoid detection.

### Abilities

- Move
- Kill
- Vote
- Use vents

### Restrictions

Cannot reveal role directly.

---

# Lobby System

## Player Capacity

Configurable.

Default target:

```text
4 to 12 players
```

---

## Ready System

Match may start when:

- Minimum players reached.
- All required players ready.

---

# Color System

There are 21 unique player colors.

No duplicates are allowed.

## Requirements

A color:

- May be selected only once.
- Becomes unavailable while assigned.
- Returns to pool if player leaves.

---

## Initial Color Assignment

Server assigns an available color automatically.

Players may switch to another available color before the match starts.

---

# Player Account System

Each device must create a persistent account.

Minimum stored information:

```text
Player ID
Display Name
Selected Preferences
Progression Data
Statistics
Cosmetics
```

---

# World

## Setting

Large spaceship.

Contains:

- Hallways
- Rooms
- Utility areas
- Meeting area

---

# Vent System

The ship contains vent tunnels.

Only the Killer may use them.

---

## Vent Rules

Crewmates:

- Cannot enter.
- Cannot travel through them.

Killer:

- May enter.
- May move between connected vent nodes.
- May exit at valid destinations.

---

# Visibility Model

All players can observe:

- Living players in view range.

The Killer should not gain hidden knowledge beyond normal vision.

Visibility implementation details may be deferred in early prototypes.

---

# Elimination System

## Kill Action

Only Killer may perform kills.

Requirements:

- Target must be alive.
- Target must be in range.
- Cooldown must be complete.

Validation occurs exclusively on server.

---

## Kill Cooldown

Configurable.

Initial recommendation:

```text
20 seconds
```

---

## Death State

A dead player:

- Cannot move.
- Cannot vote.
- Cannot call meetings.
- Remains in match as spectator.

---

# Emergency Meeting System

Each crewmate receives:

```text
1 emergency meeting per match
```

Use is tracked individually.

---

## Meeting Conditions

A player may call a meeting only if:

- Alive.
- Meeting available.
- Not already in a meeting.
- Match currently in Playing phase.

---

# Voting System

## Eligible Voters

Only living players.

---

## Vote Rules

Each voter may submit exactly one vote.

Players may:

- Vote for a candidate.
- Abstain.

Votes may be changed until the voting timer ends.

---

# Vote Resolution

At timer expiration:

1. Count votes.
2. Determine highest total.
3. Resolve tie rules.
4. Apply ejection if needed.
5. Evaluate victory conditions.

---

## Tie Resolution

Initial version:

```text
No ejection on tie.
```

---

# Ejection System

The ejected player becomes eliminated.

Role is revealed after ejection.

---

# Victory Conditions

## Crewmate Victory

Immediate victory when:

```text
The Killer is ejected.
```

---

## Killer Victory

Immediate victory when:

```text
Living Killers >= Living Crewmates
```

Example:

```text
1 Killer
1 Crewmate
```

Killer wins instantly.

---

# Public Game State

The synchronized room state may contain:

```text
Match Phase

Player Positions

Player Color

Player Alive Status

Player Connected Status

Player Vote Status

Current Meeting State

Current Vote Totals

Game Timer Information
```

---

# Private Game State

Player-specific information:

```text
Assigned Role

Kill Cooldown

Vent Availability

Private Notifications
```

Must never be exposed through public room state.

---

# Network Message Contracts

## Client → Server

### movement

```ts
{
  x: number;
  y: number;
}
```

Represents movement intent.

---

### callMeeting

```ts
{}
```

---

### vote

```ts
{
  targetPlayerId: string | null;
}
```

null = abstain

---

### kill

```ts
{
  targetPlayerId: string;
}
```

---

### ventEnter

```ts
{
  ventId: string;
}
```

---

### ventExit

```ts
{
  ventId: string;
}
```

---

### changeColor

```ts
{
  colorId: string;
}
```

---

### ready

```ts
{}
```

---

## Server → Client

### roleAssigned

```ts
{
  role: "killer" | "crewmate";
}
```

Private message.

---

### matchStarted

```ts
{}
```

---

### playerKilled

```ts
{
  victimId: string;
}
```

---

### meetingStarted

```ts
{
  initiatedBy: string;
}
```

---

### votingStarted

```ts
{}
```

---

### votingResults

```ts
{
  ejectedPlayerId?: string;
  voteSummary: Record<string, number>;
}
```

---

### gameEnded

```ts
{
  winner: "killer" | "crewmate";
}
```

---

# Non-Functional Requirements

## Performance

Target:

```text
60 FPS rendering
20–30 simulation ticks/sec
```

---

## Reconnection

Future feature.

Players should eventually be able to reconnect to ongoing matches.

---

## Security

All gameplay decisions occur on the server.

Never trust:

- Client positions
- Client cooldowns
- Client votes
- Client role claims

---

# Deferred Features

The following are intentionally excluded from MVP:

- Matchmaking service
- Friend system
- Ranked mode
- Chat moderation
- Voice chat
- Cosmetics store
- Battle pass
- Advanced visibility system
- Replay system
- Analytics
- Anti-cheat beyond server authority

---

# MVP Definition

Version 1.0 is considered playable when:

- Players can join a room.
- Colors are unique.
- Roles are assigned secretly.
- Players can move.
- Killer can eliminate players.
- Players can call meetings.
- Players can vote.
- Ejection works.
- Victory conditions work.
- Desktop and mobile controls function.
- Multiple clients can complete a full match from start to finish.
