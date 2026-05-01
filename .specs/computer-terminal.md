# Computer Terminal UI for GitHub Integration

## Context

The current GitHub integration uses a plain white side-sliding panel (`GitHubPanel.jsx`) with 3 tabs (Repos, Files, Ask). The user wants this replaced with an immersive **retro computer terminal** aesthetic — a dark monitor frame with bezel, CRT effects, power LED, and terminal-green color scheme. Additionally, a new **Tasks tab** (GitHub Issues) should be added so users can create/view issues directly from the in-game terminal.

## Files to Modify

| File | Change |
|------|--------|
| `server/githubService.js` | Add `listIssues()`, `createIssue()`, `getIssue()` functions |
| `server/socketHandlers.js` | Add 3 socket handlers: `github:listIssues`, `github:createIssue`, `github:getIssue` (after line 1668) |
| `client/src/components/SocketManager.jsx` | Add `githubIssuesAtom`, `githubIssueDetailAtom` atoms + 3 socket listeners |
| `client/src/components/GitHubPanel.jsx` | **Replace entirely** — rewrite as `ComputerTerminal` with monitor frame + 5 tabs |
| `client/src/components/UI.jsx` | Update import, atom name, button label from "Code" to "Terminal" (lines 30, 1372, 1658, 1800) |
| `client/src/index.css` | Add terminal scrollbar styles + cursor blink animation |

## Implementation Steps

### Step 1: Server — `githubService.js` (3 new functions)

Add using the existing `ghFetch` helper (line 14):

- **`listIssues(token, owner, repo, opts)`** — `GET /repos/:owner/:repo/issues?state=open&per_page=30` — filters out PRs (GitHub includes them in issues endpoint), returns `[{number, title, state, user, labels, created_at, html_url}]`
- **`createIssue(token, owner, repo, title, body, labels)`** — `POST /repos/:owner/:repo/issues` — returns `{number, title, state, html_url}`
- **`getIssue(token, owner, repo, issueNumber)`** — `GET /repos/:owner/:repo/issues/:number` — returns full issue with body, comments count

### Step 2: Server — `socketHandlers.js` (3 new handlers)

Insert after the `github:createPR` handler (line 1668), following the identical pattern:

```
socket.on("github:listIssues", ...) → emits "github:issuesList"
socket.on("github:createIssue", ...) → emits "github:issueCreated"
socket.on("github:getIssue", ...)    → emits "github:issueDetail"
```

Each handler: validate `userId` → get connection from `githubStore` → parse `repoKey` → call `githubService` → emit result. Error path emits `github:error`.

### Step 3: Client — `SocketManager.jsx` (new atoms + listeners)

Add alongside existing GitHub atoms:
```js
export const githubIssuesAtom = atom([]);
export const githubIssueDetailAtom = atom(null);
```

Register 3 new socket listeners in the existing effect block:
- `github:issuesList` → `setGithubIssues(data.issues)`
- `github:issueCreated` → prepend to issues array
- `github:issueDetail` → `setGithubIssueDetail(data.issue)`

### Step 4: Client — Rewrite `GitHubPanel.jsx` as Computer Terminal

Replace the entire file content. The new component:

**Visual structure (outside → inside):**
1. **Backdrop** — `fixed inset-0 bg-black/50 z-[24]` with click-to-close
2. **Outer bezel** — `bg-gradient-to-b from-gray-700 via-gray-800 to-gray-900`, `rounded-2xl`, heavy shadow, `border-gray-600`
3. **Top bar** — Power LED (green dot with glow when connected), "OpenClaw Terminal" text, macOS-style window buttons (yellow/green/red circles)
4. **Screen area** — `m-2 sm:m-3` inset, `bg-gray-950`, `inset shadow` for depth
5. **CRT overlays** (pointer-events-none) — Subtle scanline repeating gradient + emerald/cyan color tint
6. **Terminal title bar** — GitHub icon + `github@openclaw:~$` prompt + connected username
7. **Tab bar** — 5 tabs: Dashboard, Repos, Files, Ask, Tasks — with emerald underline indicator
8. **Content area** — Scrollable with custom styled scrollbar

**Animation:** Scale 0.9→1 + opacity (like a screen powering on), not side-slide.

**Layout:** `fixed inset-4 sm:inset-8 md:inset-12 lg:inset-16` — centered floating monitor, responsive.

**Color scheme inside screen:**
- Primary text: `text-emerald-400` (terminal green)
- Inputs: `bg-gray-900 border-gray-700 text-emerald-300`
- Borders: `border-gray-800`
- Accents: `bg-emerald-600` buttons
- Code: `text-emerald-300` on `bg-gray-950`

**5 Tabs:**

| Tab | Content |
|-----|---------|
| **Dashboard** | Auth form (if not connected) OR status card + connected repos summary + quick stats grid (repos count, queries count, issues count) |
| **Repos** | Same logic as current Repos tab — connect/disconnect repos — restyled dark |
| **Files** | Same logic as current Files tab — file tree + content viewer — restyled dark |
| **Ask** | Same logic as current Ask tab — chat Q&A with streaming — restyled dark (bubbles become dark-themed) |
| **Tasks** | **NEW** — List/Create/Detail sub-views for GitHub Issues |

**Tasks tab sub-views:**
- **List** — Repo selector dropdown → fetch issues → show as clickable rows with `#number`, title, labels (colored), author, date
- **Create** — Title input + body textarea + "Create Issue" button
- **Detail** — Back button + issue card with number, state badge, title, author, date, rendered body

**Existing logic reuse:** All handlers (`handleAuth`, `handleDisconnect`, `handleAddRepo`, `handleDisconnectRepo`, `handleFileClick`, `toggleFolder`, `handleAsk`, `buildTree`, `getVisibleFiles`, `renderMessageContent`) are carried over from the current `GitHubPanel.jsx` — only the JSX markup and class names change.

Keep exporting `githubPanelOpenAtom` from this file for backward compatibility (the `/repo` chat commands in UI.jsx reference it).

### Step 5: Client — `index.css` additions

```css
/* Terminal scrollbar */
.terminal-content::-webkit-scrollbar { width: 6px; }
.terminal-content::-webkit-scrollbar-track { background: rgba(17, 24, 39, 0.5); }
.terminal-content::-webkit-scrollbar-thumb { background: rgba(52, 211, 153, 0.3); border-radius: 3px; }
.terminal-content::-webkit-scrollbar-thumb:hover { background: rgba(52, 211, 153, 0.5); }

/* Terminal cursor blink */
@keyframes terminal-cursor-blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}
.terminal-cursor { animation: terminal-cursor-blink 1s step-end infinite; }
```

### Step 6: Client — `UI.jsx` updates

4 surgical changes:
1. **Line 30** — `import GitHubPanel, { githubPanelOpenAtom } from "./GitHubPanel"` — keep as-is (file still exports `githubPanelOpenAtom` for backward compat)
2. **Line 1658** — Render: already works since GitHubPanel is default export
3. **Lines 1796-1806** — Change button label from "Code" to "Terminal", change icon to a computer/monitor icon, change colors from sky to emerald

## Verification

1. Start server: `cd server && npm run dev` — confirm no errors
2. Start client: `cd client && yarn dev` — confirm no errors
3. Open `http://localhost:5174`, join a room
4. Click "Terminal" button in bottom nav bar
5. Verify: Computer frame renders with bezel, power LED, CRT effects
6. Verify: Dashboard tab shows auth form
7. Enter a GitHub PAT → verify auth works, Dashboard shows status
8. Switch to Repos tab → connect a repo → verify it appears
9. Switch to Files tab → browse file tree → click a file → verify content shows
10. Switch to Ask tab → ask a question → verify streaming response
11. Switch to Tasks tab → verify issues list loads → create an issue → verify it appears
12. Click backdrop → verify terminal closes
13. Test on narrow viewport → verify responsive sizing
