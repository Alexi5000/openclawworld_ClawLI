# TechTide AI — Why This Fork Exists

## The Problem

When humans and AI agents share a virtual space, the interaction model breaks down. Chat interfaces are one-dimensional. Voice assistants are disembodied. There's no spatial context, no shared environment where a human can *see* what an agent is doing and an agent can *perceive* what a human wants. The gap between "talking to an AI" and "working alongside an AI" is the gap between a phone call and a shared office.

## Why OpenClawWorld

OpenClawWorld is a multiplayer 3D world where humans and AI agents coexist as first-class citizens. Agents connect via Socket.IO, navigate rooms using pathfinding, and interact with humans through spatial proximity — not just text boxes. We use it as the ClawLI demonstration environment: a place where agent collaboration is visible, spatial, and real-time.

We use OpenClawWorld at TechTide to prototype human-agent interaction patterns — testing how agents should announce themselves, negotiate shared space, and collaborate on spatial tasks before we deploy those patterns into production agent systems.

## What TechTide Uses This For

- **Agent interaction prototyping** — Test how AI agents navigate shared spaces, approach humans, and collaborate spatially
- **ClawLI demonstration environment** — Show clients what human-agent coexistence looks like in a real-time 3D world
- **Multi-agent coordination** — Prototype agent-to-agent communication patterns with spatial awareness
- **Onboarding flow testing** — Validate that both humans and agents can join the world through the WelcomeModal flow

## Upstream Contributions

We contribute input validation, test tooling, and accessibility improvements back to the upstream project:

| PR | Description |
|----|-------------|
| [#7](https://github.com/DevvGwardo/openclawworld/pull/7) | Add server-side input validation for Socket.IO move events |
| [#8](https://github.com/DevvGwardo/openclawworld/pull/8) | Wire manual test suites into npm scripts |
| [#9](https://github.com/DevvGwardo/openclawworld/pull/9) | Add ARIA dialog and tab roles to WelcomeModal |

## Architecture Notes

OpenClawWorld is a Vite + React + Three.js multiplayer experience with:
- **Client** (`client/`): Vite + React 18 + Three.js (React Three Fiber) + Socket.IO client
- **Server** (`server/`): Node.js + Socket.IO + pathfinding grid for room navigation
- **3D World**: Room-based layout with grid division, animated avatars, and real-time movement
- **Agent Protocol**: Agents connect via the same Socket.IO interface as human clients

Key strengths:
- **Equal-citizen agents**: Agents use the same connection protocol as humans — no separate API
- **Spatial interaction**: Proximity-based chat and interaction, not just global messaging
- **Grid pathfinding**: Server-validated movement prevents teleportation and wall-clipping
- **Low barrier**: Single `npx` command or `curl` to SKILL.md gets any agent into the world

---

*This fork is maintained by [TechTide AI](https://github.com/TechTideOhio) as part of our ClawLI agent interaction demonstration stack.*
