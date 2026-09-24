# Project Instructions

## Technology

- Use TypeScript in strict mode.
- Backend: Node.js and Colyseus.
- Frontend: Vite and HTML5 Canvas.
- Use the dependency versions already defined in package.json.
- Do not assume APIs from different library versions.

## Documentation

Before beginning any work, read:

1. GAME_SPEC.md
2. ARCHITECTURE.md
3. MILESTONES.md
4. AGENTS.md

Treat these documents as the source of truth.

If documentation conflicts:

1. GAME_SPEC.md wins.
2. ARCHITECTURE.md wins over MILESTONES.md.
3. MILESTONES.md wins over implementation assumptions.

Do not silently invent requirements.

## Architecture

- The server is authoritative.
- Clients send intentions, never final positions or outcomes.
- Keep game simulation independent from rendering.
- Keep networking independent from game rules.
- Keep persistence independent from game rules.
- Prefer small modules over large room classes.
- Keep GameRoom thin and use dedicated systems.
- Each game rule should have one canonical owner.
- Do not duplicate business logic across systems.

## Security

- Do not reveal secret role information in public synchronized state.
- Validate every client message on the server.
- Never trust client positions, cooldowns, votes, or role claims.
- Keep private match state separate from public room state.
- Authentication does not replace gameplay validation.

## Implementation Process

- Implement only the requested milestone.
- Do not implement future milestones.
- Do not add speculative features.
- Do not perform architectural rewrites unless requested.
- Before implementation, list the files that will be modified.
- Identify public-state, private-state, and network-contract changes.

## Testing

- Add tests for implemented game rules.
- Prefer unit tests for game systems.
- Keep core rules testable without running the game client.
- Run type checking and tests before declaring a milestone complete.

## Documentation Maintenance

Update documentation when:

- A network contract changes.
- Public synchronized state changes.
- Private authoritative state changes.
- An architectural decision changes.
- A milestone is completed.

Do not rewrite completed milestones.
Only update their status and progress notes.

## Milestone Completion

A milestone may be marked COMPLETE only when:

- Acceptance criteria are satisfied.
- Required tests pass.
- Type checking passes.
- No known blocking issues remain.
- The implementation matches the architecture.

If uncertain, leave the milestone IN PROGRESS and explain why.