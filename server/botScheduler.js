// Bot scheduled routines — periodic actions that run on intervals
// State is in-memory only; cleared on disconnect (same pattern as objectiveSystem.js)

const botRoutines = new Map(); // hashedApiKey -> Map(routineId -> routine)

const MAX_ROUTINES_PER_BOT = 5;
const MIN_INTERVAL_MS = 10_000;
const MAX_INTERVAL_MS = 3_600_000;
const VALID_ACTIONS = ["move", "say", "emote", "sit", "switchRoom"];

let routineCounter = 0;

export function addRoutine(hashedApiKey, { action, params, intervalMs, description }, executor) {
  if (!VALID_ACTIONS.includes(action)) {
    return { error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(", ")}` };
  }
  if (typeof intervalMs !== "number" || intervalMs < MIN_INTERVAL_MS || intervalMs > MAX_INTERVAL_MS) {
    return { error: `intervalMs must be between ${MIN_INTERVAL_MS} and ${MAX_INTERVAL_MS}` };
  }

  if (!botRoutines.has(hashedApiKey)) {
    botRoutines.set(hashedApiKey, new Map());
  }
  const routines = botRoutines.get(hashedApiKey);
  if (routines.size >= MAX_ROUTINES_PER_BOT) {
    return { error: `Maximum ${MAX_ROUTINES_PER_BOT} routines per bot` };
  }

  routineCounter++;
  const routineId = `routine_${routineCounter}`;

  const timerId = setInterval(() => {
    try {
      executor(action, params || {});
    } catch (err) {
      console.error(`[botScheduler] Routine ${routineId} error:`, err.message);
    }
  }, intervalMs);

  const routine = {
    id: routineId,
    action,
    params: params || {},
    intervalMs,
    description: description || `${action} every ${Math.round(intervalMs / 1000)}s`,
    createdAt: Date.now(),
    timerId,
  };

  routines.set(routineId, routine);

  return {
    success: true,
    routine: {
      id: routine.id,
      action: routine.action,
      params: routine.params,
      intervalMs: routine.intervalMs,
      description: routine.description,
    },
  };
}

export function listRoutines(hashedApiKey) {
  const routines = botRoutines.get(hashedApiKey);
  if (!routines) return [];
  return [...routines.values()].map((r) => ({
    id: r.id,
    action: r.action,
    params: r.params,
    intervalMs: r.intervalMs,
    description: r.description,
    createdAt: r.createdAt,
  }));
}

export function cancelRoutine(hashedApiKey, routineId) {
  const routines = botRoutines.get(hashedApiKey);
  if (!routines) return { error: "No routines found" };
  const routine = routines.get(routineId);
  if (!routine) return { error: "Routine not found" };
  clearInterval(routine.timerId);
  routines.delete(routineId);
  if (routines.size === 0) botRoutines.delete(hashedApiKey);
  return { success: true, message: `Routine ${routineId} cancelled` };
}

export function cleanupRoutines(hashedApiKey) {
  const routines = botRoutines.get(hashedApiKey);
  if (!routines) return;
  for (const routine of routines.values()) {
    clearInterval(routine.timerId);
  }
  botRoutines.delete(hashedApiKey);
}
