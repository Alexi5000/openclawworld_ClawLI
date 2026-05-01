// Walk-then-place queue orchestration for bot item placement.
// Bots walk to each item's target position before placing it,
// one at a time, so players see the bot physically furnishing.

const MOVEMENT_SPEED = 4; // world units/sec — matches client Avatar.jsx
const ARRIVAL_BUFFER_MS = 300; // settling time after walk completes

// Per-bot placement queues: characterId -> { items, timer, processing, room, io, ... }
const placementQueues = new Map();

/**
 * Estimate how long the client walk animation takes for a given path.
 * Path cells are 1/gridDivision world units apart.
 */
export function estimateWalkTimeMs(path, gridDivision) {
  if (!path || path.length < 2) return ARRIVAL_BUFFER_MS;
  let totalDist = 0;
  for (let i = 1; i < path.length; i++) {
    const dx = path[i][0] - path[i - 1][0];
    const dy = path[i][1] - path[i - 1][1];
    totalDist += Math.sqrt(dx * dx + dy * dy);
  }
  const worldDist = totalDist / gridDivision;
  return Math.ceil((worldDist / MOVEMENT_SPEED) * 1000) + ARRIVAL_BUFFER_MS;
}

/**
 * Find the closest walkable cell adjacent to the item footprint.
 * For walkable items (rugs), returns the item center directly.
 * For wall items, targets the cell in front of the wall.
 * Uses expanding ring search around the item footprint.
 */
export function findAdjacentWalkableCell(room, gridPosition, size, rotation, itemDef) {
  const [gx, gy] = gridPosition;
  const w = rotation === 1 || rotation === 3 ? size[1] : size[0];
  const h = rotation === 1 || rotation === 3 ? size[0] : size[1];
  const maxX = room.size[0] * room.gridDivision;
  const maxY = room.size[1] * room.gridDivision;

  // For walkable items (rugs), target center directly
  if (itemDef && itemDef.walkable) {
    const cx = Math.floor(gx + w / 2);
    const cy = Math.floor(gy + h / 2);
    const clampedX = Math.max(0, Math.min(maxX - 1, cx));
    const clampedY = Math.max(0, Math.min(maxY - 1, cy));
    if (room.grid.isWalkableAt(clampedX, clampedY)) {
      return [clampedX, clampedY];
    }
  }

  // For wall items, prefer cells in front of the wall
  if (itemDef && itemDef.wall) {
    const wallCandidates = [];
    // Determine which wall the item is on based on rotation
    // rotation 0 = front wall (y=0), 1 = left wall (x=0), 2 = back wall, 3 = right wall
    const rot = rotation % 4;
    for (let x = gx; x < gx + w; x++) {
      for (let y = gy; y < gy + h; y++) {
        let fx, fy;
        if (rot === 0) { fx = x; fy = y + 1; }      // front wall: step into room
        else if (rot === 2) { fx = x; fy = y - 1; }  // back wall: step into room
        else if (rot === 1) { fx = x + 1; fy = y; }  // left wall: step into room
        else { fx = x - 1; fy = y; }                  // right wall: step into room
        if (fx >= 0 && fx < maxX && fy >= 0 && fy < maxY && room.grid.isWalkableAt(fx, fy)) {
          wallCandidates.push([fx, fy]);
        }
      }
    }
    if (wallCandidates.length > 0) {
      // Pick the middle candidate
      return wallCandidates[Math.floor(wallCandidates.length / 2)];
    }
  }

  // Expanding ring search around the item footprint
  for (let ring = 1; ring <= 10; ring++) {
    const candidates = [];
    for (let x = gx - ring; x < gx + w + ring; x++) {
      for (let y = gy - ring; y < gy + h + ring; y++) {
        // Only check the outer ring
        if (x >= gx - ring + 1 && x < gx + w + ring - 1 &&
            y >= gy - ring + 1 && y < gy + h + ring - 1) continue;
        if (x < 0 || x >= maxX || y < 0 || y >= maxY) continue;
        if (room.grid.isWalkableAt(x, y)) {
          candidates.push([x, y]);
        }
      }
    }
    if (candidates.length > 0) {
      // Pick the candidate closest to the item center
      const cx = gx + w / 2;
      const cy = gy + h / 2;
      candidates.sort((a, b) => {
        const da = (a[0] - cx) ** 2 + (a[1] - cy) ** 2;
        const db = (b[0] - cx) ** 2 + (b[1] - cy) ** 2;
        return da - db;
      });
      return candidates[0];
    }
  }

  return null; // No walkable cell found
}

/**
 * Enqueue item placements for a bot. Items are placed one-by-one after
 * the bot walks to each target position.
 *
 * @param {object} opts
 * @param {string} opts.botId - Socket ID or character ID
 * @param {object} opts.room - Room object
 * @param {Array<{newItem, itemDef}>} opts.items - Validated items to place
 * @param {object} opts.character - Bot's character object
 * @param {object} opts.io - Socket.IO server
 * @param {function} opts.findPathFn - A* pathfinding function
 * @param {function} opts.addItemToGridFn - Grid update function
 * @param {function} opts.persistRoomsFn - Room persistence function
 * @returns {{ queued: number }}
 */
export function enqueuePlacements({ botId, room, items, character, io, findPathFn, addItemToGridFn, persistRoomsFn, onPositionChange }) {
  let queue = placementQueues.get(botId);
  if (queue) {
    // Append to existing queue
    queue.items.push(...items);
    return { queued: items.length };
  }

  queue = {
    items: [...items],
    timer: null,
    processing: false,
    room,
    character,
    io,
    findPathFn,
    addItemToGridFn,
    persistRoomsFn,
    onPositionChange,
  };
  placementQueues.set(botId, queue);
  processNextItem(botId);
  return { queued: items.length };
}

/**
 * Internal recursive processor: walks bot to item position, then places item.
 */
function processNextItem(botId) {
  const queue = placementQueues.get(botId);
  if (!queue || queue.items.length === 0) {
    placementQueues.delete(botId);
    return;
  }

  queue.processing = true;
  const { newItem, itemDef } = queue.items.shift();
  const { room, character, io, findPathFn, addItemToGridFn, persistRoomsFn } = queue;

  // 1. Find walkable cell near the item
  const targetCell = findAdjacentWalkableCell(
    room, newItem.gridPosition, newItem.size, newItem.rotation, itemDef
  );

  const currentPos = character.position || [0, 0];

  // If no walkable cell found, try placing anyway if close enough
  if (!targetCell) {
    const [gx, gy] = newItem.gridPosition;
    const dist = Math.abs(currentPos[0] - gx) + Math.abs(currentPos[1] - gy);
    if (dist <= 4) {
      placeAndContinue(botId, newItem, itemDef);
    } else {
      console.warn(`[walkThenPlace] No walkable cell near ${newItem.name} at [${newItem.gridPosition}], skipping`);
      processNextItem(botId);
    }
    return;
  }

  // 2. Run A* pathfinding
  const path = findPathFn(room, currentPos, targetCell);

  if (!path || path.length === 0) {
    // If bot is within 2 cells, place anyway
    const dist = Math.abs(currentPos[0] - targetCell[0]) + Math.abs(currentPos[1] - targetCell[1]);
    if (dist <= 2) {
      const oldPos = character.position;
      character.position = targetCell;
      if (queue.onPositionChange) queue.onPositionChange(botId, oldPos, targetCell);
      placeAndContinue(botId, newItem, itemDef);
    } else {
      console.warn(`[walkThenPlace] No path to ${newItem.name} at [${newItem.gridPosition}], skipping`);
      processNextItem(botId);
    }
    return;
  }

  // 3. Emit playerMove to broadcast the walk
  character.position = currentPos;
  character.path = path;
  io.to(room.id).emit("playerMove", character);

  // 4. Update character position to destination
  const destination = path[path.length - 1];
  character.position = destination;
  if (queue.onPositionChange) queue.onPositionChange(botId, currentPos, destination);

  // 5. Emit building action
  const pretty = newItem.name.replace(/([A-Z])/g, " $1").toLowerCase().trim();
  io.to(room.id).emit("playerAction", {
    id: botId,
    action: "building",
    detail: "Walking to place a " + pretty + "...",
  });

  // 6. Wait for walk to complete
  const walkTime = estimateWalkTimeMs(path, room.gridDivision);

  queue.timer = setTimeout(() => {
    queue.timer = null;

    // Check queue still exists (bot may have disconnected)
    if (!placementQueues.has(botId)) return;

    placeAndContinue(botId, newItem, itemDef);
  }, walkTime);
}

/**
 * Place the item and continue to the next one in the queue.
 */
function placeAndContinue(botId, newItem, itemDef) {
  const queue = placementQueues.get(botId);
  if (!queue) return;

  const { room, io, addItemToGridFn, persistRoomsFn } = queue;

  // Re-validate: check if grid cell is still available
  let canPlace = true;
  if (!itemDef.walkable && !itemDef.wall) {
    const w = newItem.rotation === 1 || newItem.rotation === 3 ? newItem.size[1] : newItem.size[0];
    const h = newItem.rotation === 1 || newItem.rotation === 3 ? newItem.size[0] : newItem.size[1];
    const [gx, gy] = newItem.gridPosition;
    for (let x = 0; x < w && canPlace; x++) {
      for (let y = 0; y < h && canPlace; y++) {
        if (!room.grid.isWalkableAt(gx + x, gy + y)) canPlace = false;
      }
    }
  }

  if (canPlace) {
    // Place the item
    room.items.push(newItem);
    addItemToGridFn(room, newItem);

    // Broadcast map update
    io.to(room.id).emit("mapUpdate", {
      map: {
        gridDivision: room.gridDivision,
        size: room.size,
        items: room.items,
      },
    });

    // Show completion
    const pretty = newItem.name.replace(/([A-Z])/g, " $1").toLowerCase().trim();
    io.to(room.id).emit("playerAction", {
      id: botId,
      action: "done",
      detail: "Finished placing the " + pretty + "!",
    });

    persistRoomsFn(room);
  } else {
    console.warn(`[walkThenPlace] Grid occupied for ${newItem.name} at [${newItem.gridPosition}], skipping`);
  }

  // Clear action status after delay, then continue
  const roomId = room.id;
  setTimeout(() => {
    io.to(roomId).emit("playerAction", { id: botId, action: null });
  }, 1500);

  // Small delay between items for visual pacing
  setTimeout(() => {
    processNextItem(botId);
  }, 500);
}

/**
 * Cancel and clear a bot's placement queue.
 */
export function cancelQueue(botId) {
  const queue = placementQueues.get(botId);
  if (!queue) return;
  if (queue.timer) {
    clearTimeout(queue.timer);
    queue.timer = null;
  }
  placementQueues.delete(botId);
}

/**
 * Check if a bot has an active placement queue.
 */
export function hasActiveQueue(botId) {
  return placementQueues.has(botId);
}

/**
 * Get status of a bot's placement queue.
 */
export function getQueueStatus(botId) {
  const queue = placementQueues.get(botId);
  if (!queue) return null;
  return {
    remaining: queue.items.length,
    processing: queue.processing,
  };
}
