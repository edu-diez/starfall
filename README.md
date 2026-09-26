# Codename Starfall

A server-authoritative, real-time multiplayer social-deduction game for desktop and touch browsers. Players gather in a lobby, receive unique colors, ready up, and enter a match where one privately assigned **Killer** attempts to eliminate the crew while Crewmates call meetings, vote, and eject the suspect.

Starfall is an original TypeScript project built around explicit public/private state boundaries: clients submit intentions, while the server validates every gameplay outcome.

> **Project status:** Milestones M0–M11 are complete. Core gameplay, accounts, and reconnect support are implemented. Networking polish and release hardening remain planned work; see [`docs/MILESTONES.md`](docs/MILESTONES.md).

## Features

- **Authoritative multiplayer simulation** using Colyseus and WebSockets.
- **Canvas client** built with Vite and TypeScript.
- Lobby with **unique colors**, player readiness, and server-side start validation.
- Private Killer/Crewmate role assignment—roles never appear in synchronized public state.
- Authoritative movement, map collision, elimination range and cooldown validation.
- Emergency meetings, timed discussion, private votes, vote resolution, ejection, and win conditions.
- Killer-only vent traversal through an original, server-owned vent graph.
- Responsive desktop and touch controls, including a virtual joystick and action buttons.
- Device-linked guest accounts with persisted display names and sound preference.
- Reconnection grace period that preserves the original player entity without allowing stale input or duplicate control.
- Unit and integration coverage for server game systems, shared contracts, and client input/account behavior.

## Technology

| Area | Technology |
| --- | --- |
| Server | Node.js, TypeScript, Colyseus, Express |
| Client | Vite, TypeScript, HTML5 Canvas, `colyseus.js` |
| Shared contracts | TypeScript workspace package |
| Tests | Vitest |
| Local profile storage | Versioned JSON with atomic writes |

## Requirements

- **Node.js 22.12.0 or later**
- npm (included with Node.js)
- A modern browser with WebSocket support

## Quick start

1. Install workspace dependencies:

   ```sh
   npm install
   ```

2. Optionally create a local server configuration file:

   ```sh
   cp apps/server/.env.example apps/server/.env
   ```

   The defaults run the game server on port `2567`. See [Configuration](#configuration) for all supported values.

3. Start the server and browser client together:

   ```sh
   npm run dev
   ```

4. Open [http://localhost:5173](http://localhost:5173). Open additional browser windows or devices on the same reachable host to join a multiplayer session.

For local development, the Vite client proxies `/api` and `/colyseus` to the server. The client connects to `ws://localhost:2567` by default, so using another device requires serving/configuring the client for a reachable server address.

## How to play

1. Enter a display name and select **Save Profile & Join**.
2. Choose an available color, then select **Ready**.
3. When the player-count and readiness requirements are met, start the match.
4. The server privately informs each player whether they are a Crewmate or the Killer.
5. During play, move around the ship. The Killer may eliminate nearby Crewmates and use vents; living players can call one emergency meeting per match.
6. Discuss, vote for a living player or abstain, then continue play or view the match result.

### Desktop controls

| Action | Control |
| --- | --- |
| Move | `WASD` or Arrow keys |
| Kill (Killer only) | `Space` or `K` |
| Call emergency meeting | `E` or `M` |
| Toggle collision debug overlay | `F3` |

Touch devices use an on-screen joystick and context-sensitive action controls. Client action availability is only a convenience—the server remains authoritative for every request.

## Scripts

Run these from the repository root:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start server and client development processes together |
| `npm run dev:server` | Start only the Colyseus/Express server |
| `npm run dev:client` | Start only the Vite client |
| `npm run build` | Build every workspace package |
| `npm run typecheck` | Type-check every workspace package without emitting files |
| `npm run test` | Run all workspace test suites |
| `npm run lint` | Run ESLint for all workspace packages |
| `npm run format` | Format source files with Prettier |

Target an individual package when needed:

```sh
npm run test --workspace=apps/server
npm run test --workspace=apps/client
npm run test --workspace=packages/shared
```

## Configuration

Copy [`apps/server/.env.example`](apps/server/.env.example) to `apps/server/.env` to override server settings.

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `2567` | HTTP, WebSocket, and Colyseus server port |
| `NODE_ENV` | `development` | Enables production cookie security behavior when set to `production` |
| `ACCOUNT_STORE_PATH` | `.starfall/accounts.json` | Path to local JSON account persistence data |

The account store is designed for a **single local server process**. It is intentionally not production database infrastructure. It is written atomically but should be replaced behind the `PersistenceService` boundary before a production deployment.

## Project structure

```text
.
├── apps/
│   ├── client/              # Vite + Canvas browser client
│   │   └── src/
│   │       ├── account/     # Profile API client
│   │       ├── input/       # Desktop and touch input adapters
│   │       └── main.ts      # UI, room connection, and rendering
│   └── server/              # Colyseus + Express application
│       └── src/
│           ├── rooms/       # Thin GameRoom network adapter and public schema
│           ├── services/    # Account and persistence boundaries
│           └── systems/     # Authoritative game-rule systems
├── packages/
│   └── shared/              # Shared contracts, constants, and map data
├── docs/
│   ├── GAME_SPEC.md         # Product and gameplay rules
│   ├── ARCHITECTURE.md      # State ownership and module boundaries
│   ├── MILESTONES.md        # Delivery roadmap and accepted decisions
│   └── AGENTS.md            # Development conventions
└── package.json             # npm workspaces and root scripts
```

## Architecture and security model

The game distinguishes between synchronized public state and private server-only state:

- **Public state:** player position, color, ready/alive/connection status, match phase, timers, and published match results.
- **Private state:** roles, cooldown deadlines, unrevealed votes, input tracking, meeting allowances, and vent occupancy.
- **Persistent state:** device-linked account ID, display name, and preferences, stored outside active game rooms.

`GameRoom` coordinates Colyseus lifecycle and message routing. Dedicated systems own individual rules, including `MovementSystem`, `KillSystem`, `MeetingSystem`, `VotingSystem`, `VentSystem`, and `VictorySystem`. Server validation covers payload shape, phase, player eligibility, target/range checks, rate limiting, and other action-specific rules.

For the full ownership model and network contract guidance, read [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Accounts and reconnection

- The server creates or resolves an opaque, device-linked guest account through an HttpOnly, SameSite=Lax cookie.
- Profiles retain a display name (1–24 trimmed characters) and sound preference locally.
- On an unexpected disconnect, the server retains the original session for **30 seconds**. The public player remains visible as disconnected, while active movement input and vent occupancy are cleared.
- A successful reconnect restores the same player entity and only that player's private context. Once the grace period expires, public and private state are removed deterministically and victory is reevaluated.

See the accepted decisions in [`docs/MILESTONES.md`](docs/MILESTONES.md) for the exact current behavior and limitations.

## Development workflow

Before changing gameplay or networking behavior:

1. Read [`docs/GAME_SPEC.md`](docs/GAME_SPEC.md), [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/MILESTONES.md`](docs/MILESTONES.md), and [`docs/AGENTS.md`](docs/AGENTS.md).
2. Keep `GameRoom` thin and place each rule in its canonical system.
3. Preserve the public/private state boundary—never add roles, private cooldowns, auth credentials, or unrevealed votes to the synchronized schema.
4. Validate all client messages on the server and add focused automated tests.
5. Run type checking and relevant test suites before considering the work complete.

## Verification

A standard local verification pass is:

```sh
npm run build
npm run typecheck
npm run test
```

For manual multiplayer testing, start the development environment, join from at least two browser clients, and verify synchronized movement, lobby flow, role privacy, meetings, voting, vent restrictions, and reconnect behavior.

## Documentation

| Document | Use it for |
| --- | --- |
| [`docs/GAME_SPEC.md`](docs/GAME_SPEC.md) | Gameplay vision and rules |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Technical boundaries, state ownership, and security model |
| [`docs/MILESTONES.md`](docs/MILESTONES.md) | Scope, sequencing, decisions, and project status |
| [`docs/AGENTS.md`](docs/AGENTS.md) | Coding, testing, and documentation expectations |

## Current limitations

- Local JSON persistence is single-process development infrastructure, not a production storage solution.
- The default client WebSocket endpoint is localhost-oriented.
- Remote interpolation/prediction, presentation polish, performance/load testing, and release hardening are planned future milestones.
- Public matchmaking, voice/text chat, progression, tasks, sabotage, and production deployment are out of scope for the current implementation.
