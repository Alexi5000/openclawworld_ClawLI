// Sitting system — seat tracking and spot computation
// Extracted from index.js
// unsitCharacter accepts a broadcastFn instead of capturing io from closure

export const DEFAULT_SIT_FACING_OFFSET = Math.PI;

export const ensureSeatMaps = (room) => {
  if (!(room.seatOccupancy instanceof Map)) room.seatOccupancy = new Map();
  if (!(room.characterSeats instanceof Map)) room.characterSeats = new Map();
};

export const normalizeAngle = (a) => {
  const twoPi = Math.PI * 2;
  let x = a % twoPi;
  if (x <= -Math.PI) x += twoPi;
  else if (x > Math.PI) x -= twoPi;
  return x;
};

export const getSitSpots = (room, item, sittable, facingOffset = DEFAULT_SIT_FACING_OFFSET) => {
  const rot = item.rotation || 0;
  const w = rot === 1 || rot === 3 ? item.size[1] : item.size[0];
  const h = rot === 1 || rot === 3 ? item.size[0] : item.size[1];
  const gx = item.gridPosition[0];
  const gy = item.gridPosition[1];
  const maxX = room.size[0] * room.gridDivision - 1;
  const maxY = room.size[1] * room.gridDivision - 1;
  const seatHeight = sittable.seatHeight;

  // seatOffsets: explicit list of local offsets along the edge where seats are.
  // For a 5-wide sofa with 2 cushions, [1, 3] means skip arms (0, 4) and center seam (2).
  // If not set, fall back to seatInset (skip N cells from each end), or use all cells.
  const inset = sittable.seatInset || 0;

  // Build the set of valid offsets for width-edges and height-edges.
  // seatOffsets applies to the primary (wider) dimension; the other uses inset or full range.
  let wOffsets, hOffsets;
  if (sittable.seatOffsets) {
    // seatOffsets is defined relative to the unrotated item size[0] dimension.
    // When rotated 90/270, size[0] maps to the h dimension instead.
    const rawOffsets = sittable.seatOffsets;
    if (rot === 1 || rot === 3) {
      hOffsets = rawOffsets;
      wOffsets = null; // use default range with inset
    } else {
      wOffsets = rawOffsets;
      hOffsets = null;
    }
  }
  // Fill in defaults for whichever dimension doesn't have explicit offsets
  if (!wOffsets) {
    wOffsets = [];
    for (let i = inset; i < w - inset; i++) wOffsets.push(i);
  }
  if (!hOffsets) {
    hOffsets = [];
    for (let i = inset; i < h - inset; i++) hOffsets.push(i);
  }

  const spots = [];
  let seatIdx = 0;

  // Front edge (gy + h side)
  for (const x of wOffsets) {
    const adjX = gx + x;
    const adjY = gy + h;
    const seatX = gx + x;
    const seatY = gy + h - 1;
    const faceRot = normalizeAngle(0 + facingOffset);
    if (adjY <= maxY) {
      spots.push({ walkTo: [adjX, adjY], seatPos: [seatX, seatY], seatHeight, seatRotation: faceRot, seatIdx: seatIdx++ });
    }
  }
  // Back edge (gy - 1 side)
  for (const x of wOffsets) {
    const adjX = gx + x;
    const adjY = gy - 1;
    const seatX = gx + x;
    const seatY = gy;
    const faceRot = normalizeAngle(Math.PI + facingOffset);
    if (adjY >= 0) {
      spots.push({ walkTo: [adjX, adjY], seatPos: [seatX, seatY], seatHeight, seatRotation: faceRot, seatIdx: seatIdx++ });
    }
  }
  // Left edge (gx - 1 side)
  for (const y of hOffsets) {
    const adjX = gx - 1;
    const adjY = gy + y;
    const seatX = gx;
    const seatY = gy + y;
    const faceRot = normalizeAngle(-Math.PI / 2 + facingOffset);
    if (adjX >= 0) {
      spots.push({ walkTo: [adjX, adjY], seatPos: [seatX, seatY], seatHeight, seatRotation: faceRot, seatIdx: seatIdx++ });
    }
  }
  // Right edge (gx + w side)
  for (const y of hOffsets) {
    const adjX = gx + w;
    const adjY = gy + y;
    const seatX = gx + w - 1;
    const seatY = gy + y;
    const faceRot = normalizeAngle(Math.PI / 2 + facingOffset);
    if (adjX <= maxX) {
      spots.push({ walkTo: [adjX, adjY], seatPos: [seatX, seatY], seatHeight, seatRotation: faceRot, seatIdx: seatIdx++ });
    }
  }

  return spots;
};

// --- Cell occupancy helpers (prevent two characters sharing a final cell) ---

export const ensureCellOccupancy = (room) => {
  if (!(room.cellOccupancy instanceof Map)) room.cellOccupancy = new Map();
};

export const cellKey = (x, y) => `${x},${y}`;

export const occupyCell = (room, x, y, socketId) => {
  ensureCellOccupancy(room);
  room.cellOccupancy.set(cellKey(x, y), socketId);
};

export const vacateCell = (room, x, y, socketId) => {
  ensureCellOccupancy(room);
  const key = cellKey(x, y);
  if (room.cellOccupancy.get(key) === socketId) {
    room.cellOccupancy.delete(key);
  }
};

export const isCellOccupied = (room, x, y, excludeSocketId) => {
  ensureCellOccupancy(room);
  const owner = room.cellOccupancy.get(cellKey(x, y));
  return owner != null && owner !== excludeSocketId;
};

/**
 * Walk backward from the last waypoint in `path`, returning a truncated copy
 * ending at the first cell not occupied by another character. If the endpoint
 * is already free, returns the path unchanged. If every cell is occupied,
 * returns null (character stays put).
 */
export const trimPathToFreeCell = (room, path, socketId) => {
  if (!path || path.length === 0) return null;
  ensureCellOccupancy(room);
  for (let i = path.length - 1; i >= 0; i--) {
    const [x, y] = path[i];
    if (!isCellOccupied(room, x, y, socketId)) {
      return path.slice(0, i + 1);
    }
  }
  return null; // every cell along path is taken
};

export const unsitCharacter = (room, characterId, broadcastFn) => {
  if (!room) return;
  ensureSeatMaps(room);
  const seatInfo = room.characterSeats.get(characterId);
  if (!seatInfo) return;
  room.seatOccupancy.delete(`${seatInfo.itemIndex}-${seatInfo.seatIdx}`);
  room.characterSeats.delete(characterId);

  // Re-register the character's floor cell occupancy after standing up
  ensureCellOccupancy(room);
  const char = room.characters?.find(c => c.id === characterId);
  if (char?.position) {
    room.cellOccupancy.set(cellKey(char.position[0], char.position[1]), characterId);
  }

  if (broadcastFn) broadcastFn(room.id, "playerUnsit", { id: characterId });
};
