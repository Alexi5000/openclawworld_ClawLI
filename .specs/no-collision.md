# Plan: Prevent User/Character Collisions

## Current State

- **No player-to-player collision exists.** Multiple avatars can freely occupy the exact same grid cell.
- The pathfinding grid only marks furniture/buildings as unwalkable — player positions are never considered.
- The server immediately sets `character.position` to the path endpoint, so it doesn't track intermediate positions along a path.
- The sitting system is the only mechanism that prevents two characters from sharing a spot (seat occupancy maps).

## Approach: Server-Side Occupancy Grid

The most reliable approach is to make the **server** treat occupied cells as obstacles during pathfinding, similar to how furniture works. This keeps the server as the authority and requires minimal client changes.

## Steps

### 1. Track character cell occupancy on the server

- Maintain a `Map<"x,y", Set<socketId>>` (call it `room.cellOccupancy`) that tracks which grid cell each character currently occupies.
- Update it when:
  - A character joins a room (set their spawn cell)
  - A `move` event is processed (remove from old cell, add to destination cell)
  - A character leaves/disconnects (remove from their cell)
  - A character is teleported (e.g., after item placement invalidates their position)

### 2. Mark occupied cells as unwalkable for pathfinding

- Before calling `findPath()` in the `"move"` handler, temporarily mark cells occupied by **other** characters as unwalkable on the grid clone.
- The moving character's own cell should remain walkable (so they can leave it).
- The destination cell should be checked — if occupied, reject the move or find the nearest unoccupied cell.
- Since `AStarFinder` already clones the grid, this can be done on the clone without affecting the base grid.

### 3. Handle path conflicts (two characters heading to the same cell)

- When a character starts moving toward a destination, **reserve** that destination cell in `room.cellOccupancy` immediately (similar to how seat reservations work in `sittingSystem.js`).
- If two characters target the same cell simultaneously, the second one's pathfind will route around it.
- When a path is cancelled (new move, disconnect, item blocks path), release the reservation.

### 4. Handle intermediate path positions

- Currently, `character.position` jumps to the endpoint immediately on the server. For collision to work along paths, the server needs to know roughly where characters are mid-path.
- **Option A (simpler):** Only enforce collision at endpoints (start + destination). Characters can pass through each other mid-walk but can't stop on the same cell. This is the pragmatic choice — most games use this approach.
- **Option B (complex):** Add a server-side tick that estimates each character's current cell based on elapsed time and path length. More accurate but adds complexity and server load.
- **Recommendation: Option A.** Endpoint-only collision is sufficient for a good experience and avoids the complexity of server-side movement simulation.

### 5. Update `generateRandomPosition()` to respect occupancy

- When spawning a character or teleporting one after grid invalidation, check `room.cellOccupancy` in addition to `grid.isWalkableAt()` to avoid placing characters on top of each other.

### 6. Client-side visual polish (optional)

- No client changes are strictly required since the server will simply never produce paths that end on an occupied cell.
- Optionally, add a subtle visual indicator (red tint on cursor, slight push-back) when clicking on an occupied cell, to give the player feedback that the exact spot is taken. The server would respond with a path to the nearest free cell instead.

## Files to Modify

| File | Change |
|------|--------|
| `server/socketHandlers.js` | Add `room.cellOccupancy` map management; modify `"move"` handler to check/reserve cells; update join/leave/teleport logic |
| `server/pathfinding.js` | Add `findPathAvoidingPlayers(room, start, end, excludeSocketId)` helper that marks occupied cells on the grid clone before pathfinding |
| `server/sittingSystem.js` | Update `unsitCharacter` to re-register the character's cell in `cellOccupancy` when they stand up |

## Edge Cases to Handle

- **Bots:** Bot movement (via `autoInteraction.js` / `walkThenPlace.js`) also calls into the same move/pathfind flow, so they'd automatically respect occupancy.
- **Plaza vs. apartments:** The plaza has 150x150 = 22,500 cells with potentially many players. The occupancy map is O(n) in player count, not grid size, so this scales fine.
- **Disconnects/crashes:** The `"disconnect"` handler must clean up `cellOccupancy` to avoid ghost-blocked cells.
- **Sitting:** When a character sits, their cell should be released from `cellOccupancy` (they're on a seat, not blocking the floor). When they stand, re-register their cell.
- **Path cancellation:** If a character starts a new move before finishing the old one, release the old destination reservation and reserve the new one.

## What This Does NOT Do

- Does not add physical collision (pushing characters apart). Characters simply can't path to occupied cells.
- Does not prevent characters from overlapping mid-walk (Option A). They just can't share a final resting position.
- Does not add client-side prediction — the server remains the sole authority.
