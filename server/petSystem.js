/**
 * Pet System — visual companion characters for subagent tasks.
 *
 * Spawns animated pet characters (Shiba Inu / Cat) in rooms when subagents
 * are running. Pets wander randomly and despawn when the task completes.
 */

// ── State ──────────────────────────────────────────────────────────
const activePets = new Map();    // runId -> petState
const agentPets = new Map();     // agentId -> Set<runId>

// ── Limits ─────────────────────────────────────────────────────────
const MAX_PETS_PER_AGENT = 5;
const MAX_PETS_PER_ROOM = 10;
const DEFAULT_MAX_LIFETIME_MS = 300_000; // 5 minutes

const PET_MODELS = [
  "/models/items/shibaInu.glb",
  "/models/items/cat.glb",
];

let wanderInterval = null;

// ── Helpers ────────────────────────────────────────────────────────

function choosePetModel(runId) {
  const tail = parseInt(runId.slice(-4), 16) || 0;
  return PET_MODELS[tail % 2];
}

function petCountInRoom(roomId) {
  let count = 0;
  for (const pet of activePets.values()) {
    if (pet.roomId === roomId) count++;
  }
  return count;
}

// ── Exported functions ─────────────────────────────────────────────

/**
 * Spawn a pet character in a room for a given subagent run.
 */
export function spawnPet({ io, room, agentId, runId, taskType, taskLabel, findPath, generateRandomPosition }) {
  // Duplicate check
  if (activePets.has(runId)) return activePets.get(runId);

  // Per-agent limit
  const agentSet = agentPets.get(agentId) || new Set();
  if (agentSet.size >= MAX_PETS_PER_AGENT) return null;

  // Per-room limit
  if (petCountInRoom(room.id) >= MAX_PETS_PER_ROOM) return null;

  const position = generateRandomPosition(room);
  if (!position) return null;

  const petId = `pet_${runId}`;
  const avatarUrl = choosePetModel(runId);
  const label = taskLabel || taskType || "working";
  const modelName = avatarUrl.includes("shibaInu") ? "Shiba" : "Cat";
  const name = `${modelName} (${label})`;

  const pet = {
    id: petId,
    runId,
    agentId,
    roomId: room.id,
    position,
    avatarUrl,
    name,
    isPet: true,
    isBot: true,
    taskType: taskType || "custom",
    spawnedAt: Date.now(),
    maxLifetimeMs: DEFAULT_MAX_LIFETIME_MS,
  };

  activePets.set(runId, pet);
  agentSet.add(runId);
  agentPets.set(agentId, agentSet);

  // Add to room characters (as a visual-only character)
  room.characters.push({
    id: petId,
    position,
    avatarUrl,
    name,
    isPet: true,
    isBot: true,
  });

  // Broadcast to all clients in the room
  io.to(room.id).emit("characterJoined", {
    character: {
      id: petId,
      position,
      avatarUrl,
      name,
      isPet: true,
      isBot: true,
    },
    roomName: room.name,
  });

  return pet;
}

/**
 * Despawn a pet by its runId.
 */
export function despawnPet({ io, runId, rooms }) {
  const pet = activePets.get(runId);
  if (!pet) return false;

  // Remove from room characters
  const room = rooms.find((r) => r.id === pet.roomId);
  if (room) {
    const idx = room.characters.findIndex((c) => c.id === pet.id);
    if (idx !== -1) room.characters.splice(idx, 1);

    io.to(room.id).emit("characterLeft", {
      id: pet.id,
      name: pet.name,
      isBot: true,
      roomName: room.name,
    });
  }

  // Clean up maps
  activePets.delete(runId);
  const agentSet = agentPets.get(pet.agentId);
  if (agentSet) {
    agentSet.delete(runId);
    if (agentSet.size === 0) agentPets.delete(pet.agentId);
  }

  return true;
}

/**
 * Despawn all pets belonging to a specific agent (e.g. on disconnect).
 */
export function despawnAllAgentPets({ io, agentId, rooms }) {
  const agentSet = agentPets.get(agentId);
  if (!agentSet) return;

  for (const runId of [...agentSet]) {
    despawnPet({ io, runId, rooms });
  }
}

/**
 * Start the wandering interval. Pets move to a random nearby walkable cell every ~5s.
 */
export function startWandering(io, rooms, findPath) {
  if (wanderInterval) return;

  wanderInterval = setInterval(() => {
    for (const pet of activePets.values()) {
      const room = rooms.find((r) => r.id === pet.roomId);
      if (!room || !room.grid || !room.size) continue;

      const char = room.characters.find((c) => c.id === pet.id);
      if (!char) continue;

      const [cx, cy] = char.position;
      const maxW = room.size[0] * room.gridDivision;
      const maxH = room.size[1] * room.gridDivision;

      // Pick a random walkable cell within ~8 grid cells
      let target = null;
      for (let attempt = 0; attempt < 20; attempt++) {
        const dx = Math.floor(Math.random() * 17) - 8; // -8 to +8
        const dy = Math.floor(Math.random() * 17) - 8;
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || nx >= maxW || ny < 0 || ny >= maxH) continue;
        if (room.grid.isWalkableAt(nx, ny)) {
          target = [nx, ny];
          break;
        }
      }

      if (!target) continue;

      const path = findPath(room, [cx, cy], target);
      if (!path || path.length < 2) continue;

      // Update the character's position to the endpoint
      char.position = target;
      // Also update the pet state
      pet.position = target;

      // Broadcast movement to all clients
      io.to(room.id).emit("playerMove", {
        id: pet.id,
        path,
        position: target,
      });
    }
  }, 5000);
}

/**
 * Stop the wandering interval.
 */
export function stopWandering() {
  if (wanderInterval) {
    clearInterval(wanderInterval);
    wanderInterval = null;
  }
}

/**
 * Remove pets that have exceeded their maximum lifetime.
 */
export function cleanupStalePets(io, rooms) {
  const now = Date.now();
  for (const [runId, pet] of activePets) {
    if (now - pet.spawnedAt > pet.maxLifetimeMs) {
      console.log(`[petSystem] Cleaning up stale pet: ${pet.id} (runId: ${runId})`);
      despawnPet({ io, runId, rooms });
    }
  }
}

/**
 * Get all active pets for a specific agent.
 */
export function getAgentPets(agentId) {
  const agentSet = agentPets.get(agentId);
  if (!agentSet) return [];

  return [...agentSet].map((runId) => {
    const pet = activePets.get(runId);
    if (!pet) return null;
    return {
      runId: pet.runId,
      petId: pet.id,
      taskType: pet.taskType,
      spawnedAt: pet.spawnedAt,
    };
  }).filter(Boolean);
}
