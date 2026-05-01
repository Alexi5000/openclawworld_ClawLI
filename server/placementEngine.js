// Smart Furniture Placement Engine
// Score-based placement that considers spatial relationships, wall alignment, and walkways

import { items as itemsCatalog } from "./itemCatalog.js";
import { ROOM_ZONES, scaleZoneArea, ITEM_ROLES } from "../shared/roomConstants.js";

// --- Helpers ---

const itemCenter = (gridPosition, size, rotation) => {
  const w = (rotation === 1 || rotation === 3) ? size[1] : size[0];
  const h = (rotation === 1 || rotation === 3) ? size[0] : size[1];
  return [gridPosition[0] + w / 2, gridPosition[1] + h / 2];
};

const distance = (a, b) => Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);

const isAxisAligned = (posA, sizeA, rotA, posB, sizeB, rotB) => {
  const wA = (rotA === 1 || rotA === 3) ? sizeA[1] : sizeA[0];
  const hA = (rotA === 1 || rotA === 3) ? sizeA[0] : sizeA[1];
  const wB = (rotB === 1 || rotB === 3) ? sizeB[1] : sizeB[0];
  const hB = (rotB === 1 || rotB === 3) ? sizeB[0] : sizeB[1];

  // Horizontally aligned: overlapping x ranges
  const xOverlap = posA[0] < posB[0] + wB && posA[0] + wA > posB[0];
  // Vertically aligned: overlapping y ranges
  const yOverlap = posA[1] < posB[1] + hB && posA[1] + hA > posB[1];

  return xOverlap || yOverlap;
};

// Find all existing items matching a target name or role
const findTargetItems = (room, affinity) => {
  return room.items.filter((item) => {
    if (affinity.target && item.name === affinity.target) return true;
    if (affinity.targetRole) {
      const def = itemsCatalog[item.name];
      if (def && def.role === affinity.targetRole) return true;
    }
    return false;
  });
};

// Check if candidate position + size fits within grid and doesn't collide
const isValidPlacement = (room, gx, gy, width, height, itemDef) => {
  const maxX = room.size[0] * room.gridDivision;
  const maxY = room.size[1] * room.gridDivision;

  if (gx < 0 || gy < 0 || gx + width > maxX || gy + height > maxY) return false;

  // Walkable items (rugs) and wall items don't need grid collision checks
  if (itemDef.walkable || itemDef.wall) return true;

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      if (!room.grid.isWalkableAt(gx + x, gy + y)) return false;
    }
  }
  return true;
};

// --- Candidate Generation Strategies ---

const generateAffinityCandidates = (room, itemDef, area, rotation) => {
  const candidates = [];
  if (!itemDef.affinities) return candidates;

  const w = (rotation === 1 || rotation === 3) ? itemDef.size[1] : itemDef.size[0];
  const h = (rotation === 1 || rotation === 3) ? itemDef.size[0] : itemDef.size[1];

  // 8 compass offsets
  const dirs = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [-1, 1], [1, -1], [-1, -1],
  ];

  for (const affinity of itemDef.affinities) {
    const targets = findTargetItems(room, affinity);
    for (const target of targets) {
      const targetDef = itemsCatalog[target.name] || {};
      const tc = itemCenter(target.gridPosition, target.size, target.rotation ?? 0);
      const idealDist = (affinity.distance.min + affinity.distance.max) / 2;

      for (const [dx, dy] of dirs) {
        const len = Math.sqrt(dx * dx + dy * dy);
        const gx = Math.round(tc[0] + (dx / len) * idealDist - w / 2);
        const gy = Math.round(tc[1] + (dy / len) * idealDist - h / 2);
        candidates.push({ gx, gy, rotation, strategy: "affinity" });
      }
    }
  }
  return candidates;
};

const generateWallEdgeCandidates = (room, itemDef, area, rotation) => {
  const candidates = [];
  const maxX = room.size[0] * room.gridDivision;
  const maxY = room.size[1] * room.gridDivision;
  const w = (rotation === 1 || rotation === 3) ? itemDef.size[1] : itemDef.size[0];
  const h = (rotation === 1 || rotation === 3) ? itemDef.size[0] : itemDef.size[1];

  // Clamp to area
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  // Generate positions along each wall that overlap with the zone area
  const walls = [
    // Front wall (y=0)
    ...Array.from({ length: 5 }, () => ({
      gx: clamp(area.x[0] + Math.floor(Math.random() * (area.x[1] - area.x[0] - w)), 0, maxX - w),
      gy: 0,
    })),
    // Back wall (y=maxY-h)
    ...Array.from({ length: 5 }, () => ({
      gx: clamp(area.x[0] + Math.floor(Math.random() * (area.x[1] - area.x[0] - w)), 0, maxX - w),
      gy: maxY - h,
    })),
    // Left wall (x=0)
    ...Array.from({ length: 5 }, () => ({
      gx: 0,
      gy: clamp(area.y[0] + Math.floor(Math.random() * (area.y[1] - area.y[0] - h)), 0, maxY - h),
    })),
    // Right wall (x=maxX-w)
    ...Array.from({ length: 5 }, () => ({
      gx: maxX - w,
      gy: clamp(area.y[0] + Math.floor(Math.random() * (area.y[1] - area.y[0] - h)), 0, maxY - h),
    })),
  ];

  for (const pos of walls) {
    candidates.push({ gx: pos.gx, gy: pos.gy, rotation, strategy: "wall-edge" });
  }
  return candidates;
};

const generateGridSamplingCandidates = (room, itemDef, area, rotation) => {
  const candidates = [];
  const w = (rotation === 1 || rotation === 3) ? itemDef.size[1] : itemDef.size[0];
  const h = (rotation === 1 || rotation === 3) ? itemDef.size[0] : itemDef.size[1];
  const areaW = area.x[1] - area.x[0];
  const areaH = area.y[1] - area.y[0];

  // Systematic grid sampling within zone bounds
  const step = Math.max(2, Math.floor(Math.min(areaW, areaH) / 4));
  for (let gx = area.x[0]; gx + w <= area.x[1]; gx += step) {
    for (let gy = area.y[0]; gy + h <= area.y[1]; gy += step) {
      candidates.push({ gx, gy, rotation, strategy: "grid" });
    }
  }
  return candidates;
};

const generateRandomCandidates = (room, itemDef, area, rotation, count = 15) => {
  const candidates = [];
  const w = (rotation === 1 || rotation === 3) ? itemDef.size[1] : itemDef.size[0];
  const h = (rotation === 1 || rotation === 3) ? itemDef.size[0] : itemDef.size[1];
  const maxGrid = room.size[0] * room.gridDivision;

  for (let i = 0; i < count; i++) {
    const gx = area.x[0] + Math.floor(Math.random() * Math.max(1, area.x[1] - area.x[0] - w));
    const gy = area.y[0] + Math.floor(Math.random() * Math.max(1, area.y[1] - area.y[0] - h));
    if (gx >= 0 && gy >= 0 && gx + w <= maxGrid && gy + h <= maxGrid) {
      candidates.push({ gx, gy, rotation, strategy: "random" });
    }
  }
  return candidates;
};

// --- Scoring ---

const scoreCandidate = (room, candidate, itemDef, area) => {
  const { gx, gy, rotation } = candidate;
  const w = (rotation === 1 || rotation === 3) ? itemDef.size[1] : itemDef.size[0];
  const h = (rotation === 1 || rotation === 3) ? itemDef.size[0] : itemDef.size[1];
  const center = [gx + w / 2, gy + h / 2];
  const maxX = room.size[0] * room.gridDivision;
  const maxY = room.size[1] * room.gridDivision;

  let score = 0;
  const reasons = [];

  // Zone containment bonus
  if (center[0] >= area.x[0] && center[0] <= area.x[1] &&
      center[1] >= area.y[0] && center[1] <= area.y[1]) {
    score += 20;
    reasons.push("in-zone +20");
  } else {
    score -= 10;
    reasons.push("out-of-zone -10");
  }

  // Affinity scoring
  if (itemDef.affinities) {
    for (const affinity of itemDef.affinities) {
      const targets = findTargetItems(room, affinity);
      if (targets.length === 0) continue;

      for (const target of targets) {
        const targetDef = itemsCatalog[target.name] || {};
        const tc = itemCenter(target.gridPosition, target.size, target.rotation ?? 0);
        const dist = distance(center, tc);

        // Distance-based affinity score
        if (dist >= affinity.distance.min && dist <= affinity.distance.max) {
          score += affinity.priority * 10;
          reasons.push(`affinity(${affinity.target || affinity.targetRole}) +${affinity.priority * 10}`);
        } else if (dist < affinity.distance.min) {
          const penalty = Math.round((affinity.distance.min - dist) * affinity.priority);
          score -= penalty;
          reasons.push(`too-close(${affinity.target || affinity.targetRole}) -${penalty}`);
        } else {
          const excess = dist - affinity.distance.max;
          const penalty = Math.round(Math.min(excess * 2, affinity.priority * 5));
          score -= penalty;
          reasons.push(`too-far(${affinity.target || affinity.targetRole}) -${penalty}`);
        }

        // Facing bonus: check if item's facing direction points toward target
        if (affinity.relation === "facing" && itemDef.facingDirection != null) {
          const dx = tc[0] - center[0];
          const dy = tc[1] - center[1];
          // rotation 0=front(+y), 1=right(+x), 2=back(-y), 3=left(-x)
          const facingRot = (itemDef.facingDirection + rotation) % 4;
          let facesTarget = false;
          if (facingRot === 0 && dy > 0) facesTarget = true;
          if (facingRot === 1 && dx > 0) facesTarget = true;
          if (facingRot === 2 && dy < 0) facesTarget = true;
          if (facingRot === 3 && dx < 0) facesTarget = true;
          if (facesTarget) {
            score += affinity.priority * 5;
            reasons.push(`facing-bonus +${affinity.priority * 5}`);
          }
        }

        // Beside bonus: axis-aligned adjacency
        if (affinity.relation === "beside") {
          if (isAxisAligned([gx, gy], itemDef.size, rotation, target.gridPosition, target.size, target.rotation ?? 0)) {
            score += affinity.priority * 3;
            reasons.push(`beside-bonus +${affinity.priority * 3}`);
          }
        }
      }
    }
  }

  // Wall alignment bonus
  if (itemDef.alignment === "wall" || itemDef.wallPreferred) {
    const onWall = gx === 0 || gy === 0 || gx + w === maxX || gy + h === maxY;
    const nearWall = gx <= 2 || gy <= 2 || gx + w >= maxX - 2 || gy + h >= maxY - 2;
    if (onWall) {
      score += 15;
      reasons.push("wall-aligned +15");
    } else if (nearWall) {
      score += 8;
      reasons.push("near-wall +8");
    }
  }

  // Center alignment bonus (for dining tables, etc.)
  if (itemDef.alignment === "center") {
    const zoneCenterX = (area.x[0] + area.x[1]) / 2;
    const zoneCenterY = (area.y[0] + area.y[1]) / 2;
    const distFromCenter = distance(center, [zoneCenterX, zoneCenterY]);
    const zoneRadius = Math.min(area.x[1] - area.x[0], area.y[1] - area.y[0]) / 2;
    const centerScore = Math.round(Math.max(0, 10 * (1 - distFromCenter / zoneRadius)));
    score += centerScore;
    if (centerScore > 0) reasons.push(`center-aligned +${centerScore}`);
  }

  // Walkway penalty: penalize blocking the room center corridor
  const roomCenterX = maxX / 2;
  const roomCenterY = maxY / 2;
  if (Math.abs(center[0] - roomCenterX) < 3 && Math.abs(center[1] - roomCenterY) < 3) {
    score -= 10;
    reasons.push("blocks-walkway -10");
  }

  // Clustering penalty: avoid stacking items too close together
  let nearbyCount = 0;
  for (const existing of room.items) {
    const ec = itemCenter(existing.gridPosition, existing.size, existing.rotation ?? 0);
    if (distance(center, ec) < 2) nearbyCount++;
  }
  if (nearbyCount > 0) {
    const penalty = nearbyCount * 5;
    score -= penalty;
    reasons.push(`clustering -${penalty}`);
  }

  return { score, reasons };
};

// --- Wall Item Placement (special handling) ---

const placeWallItem = (room, itemDef, area) => {
  const maxX = room.size[0] * room.gridDivision;
  const maxY = room.size[1] * room.gridDivision;
  const isInterior = room.size[0] <= 30 && room.size[1] <= 30;
  if (!isInterior) return null;

  // For wall items, try affinity-guided placement first
  if (itemDef.affinities) {
    for (const affinity of itemDef.affinities) {
      const targets = findTargetItems(room, affinity);
      for (const target of targets) {
        const tc = itemCenter(target.gridPosition, target.size, target.rotation ?? 0);
        // Try to place on the nearest wall to the target
        const walls = [
          { rot: 0, gy: 0, genGx: () => Math.round(tc[0] - itemDef.size[0] / 2) },
          { rot: 2, gy: maxY - itemDef.size[1], genGx: () => Math.round(tc[0] - itemDef.size[0] / 2) },
          { rot: 1, gx: 0, genGy: () => Math.round(tc[1] - itemDef.size[0] / 2) },
          { rot: 3, gx: maxX - itemDef.size[1], genGy: () => Math.round(tc[1] - itemDef.size[0] / 2) },
        ];
        // Sort walls by distance to target
        walls.sort((a, b) => {
          const ay = a.gy != null ? a.gy : a.genGy();
          const ax = a.gx != null ? a.gx : a.genGx();
          const by = b.gy != null ? b.gy : b.genGy();
          const bx = b.gx != null ? b.gx : b.genGx();
          return distance([ax, ay], [tc[0], tc[1]]) - distance([bx, by], [tc[0], tc[1]]);
        });

        for (const wall of walls) {
          const w = (wall.rot === 1 || wall.rot === 3) ? itemDef.size[1] : itemDef.size[0];
          const h = (wall.rot === 1 || wall.rot === 3) ? itemDef.size[0] : itemDef.size[1];
          let gx, gy;
          if (wall.gx != null) {
            gx = wall.gx;
            gy = Math.max(0, Math.min(maxY - h, wall.genGy()));
          } else {
            gx = Math.max(0, Math.min(maxX - w, wall.genGx()));
            gy = wall.gy;
          }
          // Try a few offsets around the ideal position
          for (const offset of [0, -1, 1, -2, 2, -3, 3]) {
            let cx = gx, cy = gy;
            if (wall.gx != null) cy = Math.max(0, Math.min(maxY - h, gy + offset));
            else cx = Math.max(0, Math.min(maxX - w, gx + offset));

            if (cx < 0 || cy < 0 || cx + w > maxX || cy + h > maxY) continue;
            // Check no wall-item collision
            let blocked = false;
            for (const existing of room.items) {
              if (!existing.wall) continue;
              const ew = (existing.rotation === 1 || existing.rotation === 3) ? existing.size[1] : existing.size[0];
              const eh = (existing.rotation === 1 || existing.rotation === 3) ? existing.size[0] : existing.size[1];
              if (cx < existing.gridPosition[0] + ew && cx + w > existing.gridPosition[0] &&
                  cy < existing.gridPosition[1] + eh && cy + h > existing.gridPosition[1]) {
                blocked = true;
                break;
              }
            }
            if (!blocked) {
              return { name: itemDef.name, size: itemDef.size, gridPosition: [cx, cy], rotation: wall.rot, wall: true };
            }
          }
        }
      }
    }
  }

  // Fallback: random wall placement (original logic)
  const candidates = [];
  const walls = [
    { rot: 0, w: itemDef.size[0], h: itemDef.size[1], genPos: (r) => [Math.floor(Math.random() * (maxX - r.w)), 0] },
    { rot: 1, w: itemDef.size[1], h: itemDef.size[0], genPos: (r) => [0, Math.floor(Math.random() * (maxY - r.h))] },
    { rot: 2, w: itemDef.size[0], h: itemDef.size[1], genPos: (r) => [Math.floor(Math.random() * (maxX - r.w)), maxY - r.h] },
    { rot: 3, w: itemDef.size[1], h: itemDef.size[0], genPos: (r) => [maxX - r.w, Math.floor(Math.random() * (maxY - r.h))] },
  ];
  for (const wall of walls) {
    for (let i = 0; i < 5; i++) candidates.push(wall);
  }
  // Shuffle
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  for (let attempt = 0; attempt < Math.min(20, candidates.length); attempt++) {
    const wall = candidates[attempt];
    const [gx, gy] = wall.genPos(wall);
    if (gx < 0 || gy < 0 || gx + wall.w > maxX || gy + wall.h > maxY) continue;
    // Check no wall-item collision
    let blocked = false;
    for (const existing of room.items) {
      if (!existing.wall) continue;
      const ew = (existing.rotation === 1 || existing.rotation === 3) ? existing.size[1] : existing.size[0];
      const eh = (existing.rotation === 1 || existing.rotation === 3) ? existing.size[0] : existing.size[1];
      if (gx < existing.gridPosition[0] + ew && gx + wall.w > existing.gridPosition[0] &&
          gy < existing.gridPosition[1] + eh && gy + wall.h > existing.gridPosition[1]) {
        blocked = true;
        break;
      }
    }
    if (!blocked) {
      return { name: itemDef.name, size: itemDef.size, gridPosition: [gx, gy], rotation: wall.rot, wall: true };
    }
  }
  return null;
};

// --- Main Placement Function ---

/**
 * Smart item placement using score-based candidate evaluation.
 * @param {object} room - Room object with grid, items, size, gridDivision
 * @param {string} itemName - Item name from catalog
 * @param {object} area - Scaled zone area { x: [min, max], y: [min, max] }
 * @returns {object|null} - Placed item object (not yet added to room.items) or null
 */
export const smartPlaceItem = (room, itemName, area) => {
  const itemDef = itemsCatalog[itemName];
  if (!itemDef) return null;

  const isInterior = room.size[0] <= 30 && room.size[1] <= 30;

  // Wall items: use special wall placement logic
  if (itemDef.wall && isInterior) {
    return placeWallItem(room, itemDef, area);
  }

  const rot = itemDef.rotation ?? 0;
  const w = (rot === 1 || rot === 3) ? itemDef.size[1] : itemDef.size[0];
  const h = (rot === 1 || rot === 3) ? itemDef.size[0] : itemDef.size[1];

  // Generate candidates from all strategies
  let candidates = [
    ...generateAffinityCandidates(room, itemDef, area, rot),
    ...(itemDef.alignment === "wall" || itemDef.wallPreferred
      ? generateWallEdgeCandidates(room, itemDef, area, rot)
      : []),
    ...generateGridSamplingCandidates(room, itemDef, area, rot),
    ...generateRandomCandidates(room, itemDef, area, rot),
  ];

  // Deduplicate candidates by position
  const seen = new Set();
  candidates = candidates.filter((c) => {
    const key = `${c.gx},${c.gy},${c.rotation}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Filter to valid placements
  candidates = candidates.filter((c) =>
    isValidPlacement(room, c.gx, c.gy,
      (c.rotation === 1 || c.rotation === 3) ? itemDef.size[1] : itemDef.size[0],
      (c.rotation === 1 || c.rotation === 3) ? itemDef.size[0] : itemDef.size[1],
      itemDef)
  );

  if (candidates.length === 0) return null;

  // Score all candidates
  let best = null;
  let bestScore = -Infinity;

  for (const candidate of candidates) {
    const { score } = scoreCandidate(room, candidate, itemDef, area);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  if (!best) return null;

  const newItem = {
    name: itemDef.name,
    size: itemDef.size,
    gridPosition: [best.gx, best.gy],
    rotation: best.rotation,
  };
  if (itemDef.walkable) newItem.walkable = true;
  if (itemDef.wall) newItem.wall = true;

  return newItem;
};

/**
 * Generate scored placement suggestions for an item.
 * @param {object} room - Room object
 * @param {string} itemName - Item name from catalog
 * @param {number} count - Max number of suggestions to return
 * @returns {Array} - Array of { gridPosition, rotation, score, zone, reasons }
 */
export const suggestPlacements = (room, itemName, count = 5) => {
  const itemDef = itemsCatalog[itemName];
  if (!itemDef) return [];

  const suggestions = [];

  for (const zone of ROOM_ZONES) {
    const area = scaleZoneArea(zone.area, room);
    const rot = itemDef.rotation ?? 0;

    let candidates = [
      ...generateAffinityCandidates(room, itemDef, area, rot),
      ...(itemDef.alignment === "wall" || itemDef.wallPreferred
        ? generateWallEdgeCandidates(room, itemDef, area, rot)
        : []),
      ...generateGridSamplingCandidates(room, itemDef, area, rot),
      ...generateRandomCandidates(room, itemDef, area, rot, 5),
    ];

    // Deduplicate
    const seen = new Set();
    candidates = candidates.filter((c) => {
      const key = `${c.gx},${c.gy},${c.rotation}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Filter valid
    candidates = candidates.filter((c) =>
      isValidPlacement(room, c.gx, c.gy,
        (c.rotation === 1 || c.rotation === 3) ? itemDef.size[1] : itemDef.size[0],
        (c.rotation === 1 || c.rotation === 3) ? itemDef.size[0] : itemDef.size[1],
        itemDef)
    );

    for (const candidate of candidates) {
      const { score, reasons } = scoreCandidate(room, candidate, itemDef, area);
      suggestions.push({
        gridPosition: [candidate.gx, candidate.gy],
        rotation: candidate.rotation,
        score,
        zone: zone.name,
        reasons,
      });
    }
  }

  // Sort by score descending, return top N
  suggestions.sort((a, b) => b.score - a.score);
  return suggestions.slice(0, count);
};

/**
 * Analyze spatial relationships in a room's current layout.
 * @param {object} room - Room object
 * @returns {Array} - Array of { item, target, relation, satisfied, distance, idealRange }
 */
export const analyzeRoomLayout = (room) => {
  const relationships = [];

  for (const item of room.items) {
    const def = itemsCatalog[item.name];
    if (!def || !def.affinities) continue;

    const ic = itemCenter(item.gridPosition, item.size, item.rotation ?? 0);

    for (const affinity of def.affinities) {
      const targets = findTargetItems(room, affinity);
      if (targets.length === 0) {
        relationships.push({
          item: item.name,
          target: affinity.target || affinity.targetRole,
          relation: affinity.relation,
          satisfied: false,
          distance: null,
          idealRange: affinity.distance,
          reason: "target not found in room",
        });
        continue;
      }

      // Check the closest target
      let closestDist = Infinity;
      let closestSatisfied = false;
      for (const target of targets) {
        const tc = itemCenter(target.gridPosition, target.size, target.rotation ?? 0);
        const dist = distance(ic, tc);
        if (dist < closestDist) {
          closestDist = dist;
          closestSatisfied = dist >= affinity.distance.min && dist <= affinity.distance.max;
        }
      }

      relationships.push({
        item: item.name,
        target: affinity.target || affinity.targetRole,
        relation: affinity.relation,
        satisfied: closestSatisfied,
        distance: Math.round(closestDist * 10) / 10,
        idealRange: affinity.distance,
      });
    }
  }

  return relationships;
};

/**
 * Compute a 0-100 quality score for a room's furniture layout.
 * @param {object} room - Room object
 * @returns {number} - Score from 0 to 100
 */
export const computeLayoutScore = (room) => {
  if (room.items.length === 0) return 0;

  const relationships = analyzeRoomLayout(room);
  if (relationships.length === 0) return 50; // No relationships to evaluate

  const satisfied = relationships.filter((r) => r.satisfied).length;
  const total = relationships.length;
  const relationshipScore = (satisfied / total) * 60; // 60% weight for relationships

  // Zone coverage: how many zones have items?
  let filledZones = 0;
  for (const zone of ROOM_ZONES) {
    const area = scaleZoneArea(zone.area, room);
    const hasItems = room.items.some((item) => {
      const [ix, iy] = item.gridPosition;
      return ix >= area.x[0] && ix < area.x[1] && iy >= area.y[0] && iy < area.y[1];
    });
    if (hasItems) filledZones++;
  }
  const coverageScore = (filledZones / ROOM_ZONES.length) * 20; // 20% weight

  // Item count relative to expected (each zone has ~7 items on average)
  const expectedItems = ROOM_ZONES.reduce((sum, z) => sum + z.items.length, 0);
  const countRatio = Math.min(1, room.items.length / expectedItems);
  const countScore = countRatio * 20; // 20% weight

  return Math.round(relationshipScore + coverageScore + countScore);
};
