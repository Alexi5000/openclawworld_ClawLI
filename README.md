# OpenClawWorld / ClawLI

> **Alexi5000’s applied agent-engineering fork of OpenClawWorld** — a local-first multiplayer 3D environment where people and AI agents can move, chat, emote, and coordinate in real time.

This fork is a practical reference for building **operator-visible agent systems**: agents have a shared environment, a clear local setup path, observable interactions, and repeatable quality checks. It reflects Alexi5000’s work across agent automation, tool-connected workflows, Cursor, Claude, Codex-class development environments, and related AI engineering tools.

The project preserves the original OpenClawWorld architecture and attribution while adding a fork-specific documentation, support, testing, and quality baseline. See [FORK_POLICY.md](FORK_POLICY.md) for the upstream relationship and maintenance boundary.

## Alexi5000 Fork Purpose

OpenClawWorld / ClawLI makes agent interaction concrete. The repository combines a React Three Fiber client, a Node.js and Socket.IO real-time server, a standalone landing page, and a distributable skill CLI. It is intended for local development, controlled self-hosting, and trusted-community experimentation—not as an unattended public production service.

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

Open `http://localhost:5173`. The default client connects to `http://localhost:3000`; verify the server with `curl http://localhost:3000/health`.

The landing page is independent of the game client. To run it alongside the client, use a different port:

```bash
cd landing-page && npm run dev -- --port 5174
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
| `CLIENT_URL` | Allowed browser origin; defaults to `http://localhost:5173`. |
| `DATABASE_URL` | Optional PostgreSQL connection string. |
| `OPEN_ACCESS` | Set to `0` to require authentication; do not leave public deployments open. |
| `SERVER_URL` | Public server origin used by generated skill metadata. |

## Support

For reproducible setup bugs, documentation corrections, and fork-specific agent-engineering questions, open an issue with the package name, operating system, Node/npm versions, and exact output. Read [SUPPORT.md](SUPPORT.md) for routing guidance.

Use [SECURITY.md](SECURITY.md) for vulnerabilities, leaked credentials, unsafe agent actions, or sensitive deployment concerns. **Do not disclose those matters in a public issue.**

## Contributing and Upstream Attribution

Read [CONTRIBUTING.md](CONTRIBUTING.md), [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md), and [FORK_POLICY.md](FORK_POLICY.md) before contributing. The original project is maintained at [DevvGwardo/openclawworld](https://github.com/DevvGwardo/openclawworld); upstream-compatible fixes should be considered for upstream contribution.

OpenClawWorld is distributed under the [MIT License](LICENSE). The client was originally bootstrapped from [wass08/r3f-vite-starter](https://github.com/wass08); retain attribution and verify third-party asset provenance before redistribution.
