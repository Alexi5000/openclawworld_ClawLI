# Disconnection Fixes Spec

## Overview
Fix all client-server disconnections, divergent constants, missing event listeners, and stale code identified in the codebase audit.

---

## Task 1: Consolidate roomConstants.js (CRITICAL)

### Problem
Three divergent copies of building footprint data exist:
- `/shared/roomConstants.js` — root-level, most complete (has OBJECT_AFFORDANCES, DECAY_RATES, MOTIVE_CLAMP, TRAITS)
- `/server/shared/roomConstants.js` — server-local, incomplete, **different coordinate values**
- `/client/src/components/Minimap.jsx:6-18` — hardcoded third copy

### Fix
1. **Delete** `/server/shared/roomConstants.js`
2. **Update** `/server/index.js:6` import from `./shared/roomConstants.js` to `../shared/roomConstants.js`
3. **Update** `/server/pathfinding.js:5` import from `./shared/roomConstants.js` to `../shared/roomConstants.js`
4. **Check** for any other server files importing from `./shared/roomConstants` and update them
5. **Update** `/client/src/components/Minimap.jsx` — replace the hardcoded `getBuildingFootprints` function (lines 6-18) with an import from the shared constants. The import path should be relative to the client source: something like `../../../../shared/roomConstants.js` or use a vite alias. Check vite.config to see if an alias exists; if not, use a direct relative path.

### Validation
- Server starts without import errors
- Client builds without import errors
- Building footprints are consistent everywhere

---

## Task 2: Add emote:play client listener (HIGH)

### Problem
Server emits `emote:play` at `server/socketHandlers.js:760` and `:792`, but client has no listener. Other players' emotes are silently dropped.

### Fix
In `/client/src/components/SocketManager.jsx`:
1. Add an `emotePlay` dispatcher map in the `avatarDispatch` object (around line 74), following the pattern of `bondEmotePlay`:
   ```js
   emotePlay: new Map(), // id -> handler(value)
   ```
2. Add an `onEmotePlay` handler function (near the other handlers around line 650):
   ```js
   const onEmotePlay = (value) => {
     if (value && value.id) avatarDispatch.emotePlay.get(value.id)?.(value);
   };
   ```
3. Register the listener in both useEffect blocks where other avatar events are registered:
   ```js
   socket.on("emote:play", onEmotePlay);
   ```
4. Add cleanup in both useEffect return functions:
   ```js
   socket.off("emote:play", onEmotePlay);
   ```
5. In Avatar.jsx, register the dispatcher callback so that emote animations actually play when received. Look at how `bondEmotePlay` or `playerWaveAt` dispatchers are consumed in Avatar.jsx and follow the same pattern.

### Validation
- When one player does an emote, other players in the room see the animation

---

## Task 3: Fix emote event name in HTTP route (HIGH)

### Problem
`server/httpRoutes.js:1831` emits `"emote"` but the socket handler emits `"emote:play"`. Client should only need to listen for one event name.

### Fix
In `/server/httpRoutes.js:1831`, change:
```js
deps.io.to(botRoom.id).emit("emote", {
```
to:
```js
deps.io.to(botRoom.id).emit("emote:play", {
```

### Validation
- Bot emote actions via HTTP REST API emit the same event name as socket emotes

---

## Task 4: Fix or remove playerMoves (plural) dead listeners (MEDIUM)

### Problem
Client listens for `"playerMoves"` (plural) at SocketManager.jsx:707,712 but server only emits `"playerMove"` (singular).

### Fix
- Check if the `onPlayerMoves` and `onAvatarPlayerMoves` handlers do anything that `onPlayerMove` / `onAvatarPlayerMove` don't already handle
- If they're purely dead code, remove the listeners and handlers entirely
- If they were intended for batched updates, either implement the server-side batching or remove them
- Also remove the corresponding `socket.off("playerMoves", ...)` cleanup calls

### Validation
- No references to "playerMoves" (plural) remain unless server actually emits it
- Existing single-player movement still works

---

## Task 5: Add client-side error event listeners (MEDIUM)

### Problem
Server emits error events that client never handles: `switchRoomError`, `rateLimited`, `itemsUpdateError`.

### Fix
In `/client/src/components/SocketManager.jsx`:
1. Add listeners for each error event
2. Each handler should update a UI-visible state (toast/notification atom or console.warn at minimum)
3. Check if there's an existing notification/toast system in the UI. If so, use it. If not, at minimum log a console.warn and set appropriate error state atoms.

Suggested handlers:
```js
socket.on("switchRoomError", (data) => { /* show error */ });
socket.on("rateLimited", (data) => { /* show rate limit warning */ });
socket.on("itemsUpdateError", (data) => { /* show item update error */ });
```

### Validation
- When server emits any of these errors, client shows feedback

---

## Task 6: Clean up unused client dependencies (LOW)

### Problem
`@react-three/postprocessing` and `@types/three` are in client package.json but never imported.

### Fix
1. Run a final grep to confirm they're truly unused
2. Remove them from `/client/package.json` dependencies
3. Do NOT run npm install / yarn install (let the user do that)

### Validation
- No code imports these packages
