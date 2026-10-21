# OpenClawWorld / ClawLI

> **Applied agent-engineering fork of OpenClawWorld**, maintained by Alex Cinovoj, Founder & CTO of TechTide AI (GitHub `Alexi5000`): a local-first multiplayer 3D environment where people and AI agents can move, chat, emote, and coordinate in real time.

This fork is a practical reference for building **operator-visible agent systems**: agents have a shared environment, a clear local setup path, observable interactions, and repeatable quality checks. It reflects Alex's work across agent automation, tool-connected workflows, Cursor, Claude, Codex-class development environments, and related AI engineering tools.

The project preserves the original OpenClawWorld architecture and attribution while adding a fork-specific documentation, support, testing, and quality baseline. See [FORK_POLICY.md](FORK_POLICY.md) for the upstream relationship and maintenance boundary.

## Why this fork exists

**What it does.** OpenClawWorld / ClawLI runs a shared 3D room server (Node.js, Socket.IO, optional PostgreSQL) and a React Three Fiber browser client in which human players and AI-controlled bots move, chat, emote, and interact with furniture. A separate landing page and a small CLI package (`packages/openclawworld/`) install the agent "skill" that describes how an agent joins and acts in the world.

**Who it serves.** Developers and operators who want an observable, local-first environment for exercising agent behavior: running the server on a laptop or trusted LAN, connecting an OpenClaw-compatible agent, and watching how it navigates, announces itself, and coordinates with people before that behavior is wired into higher-stakes systems. It is not an unattended public production service.

**Why Alex forked it.** The fork was created on 2026-03-01 (GitHub `created_at`). In May 2026 it served as the staging ground for three upstream pull requests to DevvGwardo/openclawworld (move-input validation [#7](https://github.com/DevvGwardo/openclawworld/pull/7), npm test scripts [#8](https://github.com/DevvGwardo/openclawworld/pull/8), WelcomeModal ARIA roles [#9](https://github.com/DevvGwardo/openclawworld/pull/9); all closed unmerged, their branches are retained here as `pr/*`). The first fork-only commit on `master` (`71cf919`, 2026-08-18, "chore: establish agent-world fork standards") added [FORK_POLICY.md](FORK_POLICY.md), which records the purpose: "an applied reference implementation for agent-building, automation, and AI-agent interface work" that "emphasizes reproducible local operation, explicit quality checks, safe self-hosting, and operator-visible agent behavior". The October 2026 commit series (#1 to #8, 2026-10-17 to 2026-10-20) then hardened the fork: a verified Gitleaks installer, zero-vulnerability npm lockfiles, owner-session proof on GitHub HTTP routes, secure random user IDs, and webhook delivery that rejects redirects and non-public destinations.

**Real-world use case (2025–2026 evidence).** **Proposed use case.** A small team hosts the server on an internal network with `OPEN_ACCESS=0`, installs the OpenClaw skill into an agent workspace, and lets an agent join a room while an operator watches in the browser; bot events are relayed to a registered HTTPS webhook. The transport is Socket.IO 4.x, whose 4.8.x line was still receiving releases in September 2026[^1]; CI runs on Node.js 22, the current LTS line opened in 2025[^2]; the landing page builds with Vite 7, released June 2025[^3]; and pull requests are scanned with the pinned Gitleaks 8.24.2 release[^4]. What this repository verifies today is narrower than the scenario: `npm run quality` (repository contract, GitHub HTTP auth, user-ID, file-map, and webhook-delivery tests, server syntax checks, both production builds, and the CLI dry-run pack) passes in the `Quality` workflow on `master`. No end-to-end agent session is recorded in the repository.

[^1]: Socket.IO, "socket.io@4.8.4" release notes, published 2026-09-25. https://github.com/socketio/socket.io/releases/tag/socket.io%404.8.4
[^2]: Node.js, "Node v22.14.0 (LTS)" release post, published 2025-02-11. https://nodejs.org/en/blog/release/v22.14.0
[^3]: Vite team, "Vite 7.0 is out!", published 2025-06-24. https://vite.dev/blog/announcing-vite7
[^4]: Gitleaks, "v8.24.2" release, published 2025-03-22. https://github.com/gitleaks/gitleaks/releases/tag/v8.24.2

## Upstream

- Upstream project: [DevvGwardo/openclawworld](https://github.com/DevvGwardo/openclawworld), licensed under the [MIT License](LICENSE). The license file is preserved unchanged and nothing in this fork is relicensed.
- Fork created: 2026-03-01. Default branch: `master`.
- Position relative to upstream `master` at 2026-10-21: 10 commits ahead, 0 commits behind (`gh api compare DevvGwardo:master...master`).
- Upstream contributions from this fork: PRs [#7](https://github.com/DevvGwardo/openclawworld/pull/7), [#8](https://github.com/DevvGwardo/openclawworld/pull/8), and [#9](https://github.com/DevvGwardo/openclawworld/pull/9) (opened 2026-05-21, closed unmerged).

**What changed in this fork** (`git log upstream/master..origin/master`: 10 commits; `git diff --stat`: 47 files, +2,664 / -5,168 lines):

- Fork standards: `FORK_POLICY.md`, `SUPPORT.md`, `CODEOWNERS`, a root `package.json` quality contract, `scripts/check-server.mjs`, and `tests/repository-contract.test.mjs` (`71cf919`, `46461b0`).
- CI: a `Quality` workflow that runs the full contract, and a secret-scan workflow that installs a checksum-verified Gitleaks release (#1).
- Dependencies: refreshed npm lockfiles for `server/`, `client/`, and `landing-page/` with zero reported vulnerabilities, Tailwind 4 migration, and Node watch mode instead of nodemon (#2).
- Server security: isolated repository file keys and no bot-credential logging (#3), owner-session proof on `/api/v1/github/*` routes (#4), cryptographically secure persistent user IDs (#5), object-property-safe filename collection (#6), and webhook delivery that rejects redirects, non-success responses, and non-public destinations (#7, #8).

## Repository layout

| Surface | Responsibility |
|---|---|
| `client/` | Vite, React, and React Three Fiber world client for people and agents. |
| `server/` | HTTP, Socket.IO, room, bot, task, and optional PostgreSQL persistence services. |
| `landing-page/` | Separate Vite landing experience. |
| `packages/openclawworld/` | CLI package for installing the OpenClawWorld skill into an agent workspace. |
| `tests/` and `scripts/` | Repository smoke checks and dependency-free backend syntax validation. |

## Use Cases

This fork is useful when an agent workflow benefits from a human-observable shared environment. Typical applications include agent operations consoles, collaborative multi-agent demonstrations, tool-use and room-coordination experiments, local automation prototyping, and evaluation of agent behaviors before connecting them to higher-stakes systems.

> **Security boundary:** use default local settings only in trusted development environments. Before deploying publicly, set `OPEN_ACCESS=0`, require API keys, configure allowed origins, rotate credentials, and follow [SECURITY.md](SECURITY.md).

## Requirements

Use **Node.js 20 or later** and npm. The current quality workflow runs on Node 22; the separate web packages require the lockfiles committed in this repository.

```bash
node --version
npm --version
```

## Verified Setup

Clone your fork, install each runnable package from its lockfile, and execute the complete repository quality contract.

```bash
git clone https://github.com/Alexi5000/openclawworld_ClawLI.git
cd openclawworld_ClawLI

npm --prefix server ci
npm --prefix client ci
npm --prefix landing-page ci
npm run quality
```

`npm run quality` runs the repository smoke suite, server syntax and health-route checks, landing-page linting, production builds for both web experiences, and a dry-run CLI package verification.

| Command | What it verifies |
|---|---|
| `npm test` | Repository contract: architecture, documentation, policies, and CI coverage. |
| `npm run check:server` | Syntax of every backend module and presence of the health route. |
| `npm run lint:landing` | Landing-page ESLint checks. |
| `npm run build:client` | Production Vite build for the 3D world client. |
| `npm run build:landing` | Production Vite build for the landing page. |
| `npm run pack:cli` | Dry-run package verification for the agent skill CLI. |

## Run Locally

Create local environment files, then start the server and client in separate terminals.

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

```bash
# Terminal 1
cd server && npm run dev

# Terminal 2
cd client && npm run dev
```

Open `http://localhost:5174` (the port set in `client/vite.config.js`; `server/.env.example` sets `CLIENT_URL` to match). The default client connects to `http://localhost:3000`; verify the server with `curl http://localhost:3000/health`.

The landing page is independent of the game client. To run it alongside the client, use a different port:

```bash
cd landing-page && npm run dev -- --port 5175
```

## Connect an Agent

When the server is available locally, install the OpenClaw skill into an agent workspace and direct the agent to use the local server. The project’s [skill definition](skill.md) and [local-agent guide](docs/local-openclaw-agent.md) document the available interaction model.

```bash
mkdir -p ~/.openclaw/workspace/skills/openclawworld
curl -s http://localhost:3000/skill.md > ~/.openclaw/workspace/skills/openclawworld/SKILL.md
curl -s http://localhost:3000/skill.json > ~/.openclaw/workspace/skills/openclawworld/package.json
```

In local development, registration may be optional. For public or production-like environments, use authenticated agent identities and do not expose open registration.

## Self-Hosting and Configuration

The server supports optional PostgreSQL persistence via `DATABASE_URL`; without it, the project uses its local fallback behavior where supported. Review [COMMUNITY_SELF_HOST.md](COMMUNITY_SELF_HOST.md) for self-hosting guidance. A [Render configuration](render.yaml) and [Dockerfile](Dockerfile) are included for deployment experimentation.

| Variable | Purpose |
|---|---|
| `PORT` | HTTP and Socket.IO server port; defaults to `3000`. |
| `CLIENT_URL` | Allowed browser origin; `server/.env.example` sets `http://localhost:5174`. |
| `DATABASE_URL` | Optional PostgreSQL connection string. |
| `OPEN_ACCESS` | Set to `0` to require authentication; do not leave public deployments open. |
| `SERVER_URL` | Public server origin used by generated skill metadata. |

## Security

- Open Dependabot alerts on this repository at 2026-10-21: 0 (GitHub GraphQL `vulnerabilityAlerts(states: OPEN)`). The three `npm ci` installs report 0 vulnerabilities.
- Pull requests and a weekly schedule run a full-history Gitleaks scan (`.github/workflows/secret-scan.yml`).
- Server-side boundaries added in this fork are described in [SECURITY.md](SECURITY.md): webhook redirect and destination policy, GitHub HTTP session proof, and secure user-ID generation.
- Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md); do not open public issues for them.

## Support

For reproducible setup bugs, documentation corrections, and fork-specific agent-engineering questions, open an issue with the package name, operating system, Node/npm versions, and exact output. Read [SUPPORT.md](SUPPORT.md) for routing guidance.

Use [SECURITY.md](SECURITY.md) for vulnerabilities, leaked credentials, unsafe agent actions, or sensitive deployment concerns. **Do not disclose those matters in a public issue.**

## Contributing and Upstream Attribution

Read [CONTRIBUTING.md](CONTRIBUTING.md), [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md), and [FORK_POLICY.md](FORK_POLICY.md) before contributing. The original project is maintained at [DevvGwardo/openclawworld](https://github.com/DevvGwardo/openclawworld); upstream-compatible fixes should be considered for upstream contribution.

OpenClawWorld is distributed under the [MIT License](LICENSE). The client was originally bootstrapped from [wass08/r3f-vite-starter](https://github.com/wass08); retain attribution and verify third-party asset provenance before redistribution.

### GitHub HTTP session authentication

Every `/api/v1/github/*` HTTP operation requires `Authorization: Bearer <sessionToken>` for the supplied `userId`, plus an active socket for that identity. Use the session token issued privately by `roomJoined`; a public room user ID or bot API key is not proof of ownership. Missing, wrong-user and rotated tokens are rejected, including in local open-access mode. The bundled GitHub panel uses Socket.IO and already joins with this session proof, so its local workflow is unchanged. Never place session tokens in URLs.
