// Auto-interaction system — schedules automatic social responses (e.g. wave-back)
// Emits events directly to the room, bypassing socket handlers to prevent loops.

const pendingWaves = new Map(); // key: "roomId:responderId:targetId" → timerId

const AUTO_WAVE_MIN_DELAY = 1200;
const AUTO_WAVE_MAX_DELAY = 2200;

function waveKey(roomId, responderId, targetId) {
  return `${roomId}:${responderId}:${targetId}`;
}

/**
 * Schedule an automatic wave-back after a random delay.
 * Duplicate pending waves for the same pair are ignored.
 */
export function scheduleAutoWave({ roomId, responderId, targetId, callback }) {
  const key = waveKey(roomId, responderId, targetId);
  if (pendingWaves.has(key)) return; // already pending

  const delay =
    AUTO_WAVE_MIN_DELAY +
    Math.random() * (AUTO_WAVE_MAX_DELAY - AUTO_WAVE_MIN_DELAY);

  const timerId = setTimeout(() => {
    pendingWaves.delete(key);
    callback();
  }, delay);

  pendingWaves.set(key, timerId);
}

/**
 * Cancel all pending auto-waves involving a character (as responder OR target).
 * Call this when a character leaves a room or disconnects.
 */
export function cancelAutoWavesForCharacter(roomId, characterId) {
  for (const [key, timerId] of pendingWaves) {
    const parts = key.split(":");
    if (parts[0] === roomId && (parts[1] === characterId || parts[2] === characterId)) {
      clearTimeout(timerId);
      pendingWaves.delete(key);
    }
  }
}

// ---------------------------------------------------------------------------
// Proximity Greetings — bots wave at characters who walk near them
// ---------------------------------------------------------------------------

const GREETING_COOLDOWN_MS = 60_000;
const GREETING_MIN_DELAY = 1000;
const GREETING_MAX_DELAY = 3000;
const GREETING_DISTANCE = 10;

const greetingCooldowns = new Map(); // "nameA::nameB" → timestamp
const pendingGreetings = new Map(); // "roomId:greeterId:targetId" → timerId

function pairKey(nameA, nameB) {
  return [nameA, nameB].sort().join("::");
}

function gridDistance(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length < 2 || b.length < 2) return Infinity;
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

/**
 * Check if any bots in the room should greet the character who just moved.
 */
export function checkProximityGreetings({ room, moverId, io, bonds, applyBondProgress, saveBonds }) {
  if (!room || !room.characters) return;
  const mover = room.characters.find((c) => c.id === moverId);
  if (!mover) return;

  for (const bot of room.characters) {
    if (!bot.isBot || bot.id === moverId) continue;
    if (gridDistance(mover.position, bot.position) > GREETING_DISTANCE) continue;

    const pk = pairKey(bot.name, mover.name);
    const lastGreeted = greetingCooldowns.get(pk) || 0;
    if (Date.now() - lastGreeted < GREETING_COOLDOWN_MS) continue;

    const gKey = `${room.id}:${bot.id}:${mover.id}`;
    if (pendingGreetings.has(gKey)) continue;

    const delay = GREETING_MIN_DELAY + Math.random() * (GREETING_MAX_DELAY - GREETING_MIN_DELAY);

    const timerId = setTimeout(async () => {
      pendingGreetings.delete(gKey);
      greetingCooldowns.set(pk, Date.now());

      // Verify both are still in the room
      if (!room.characters.some((c) => c.id === bot.id) ||
          !room.characters.some((c) => c.id === mover.id)) return;

      io.to(room.id).emit("playerWaveAt", { id: bot.id, targetId: mover.id });
      io.to(room.id).emit("emote:play", { id: bot.id, emote: "wave" });

      // Bond progress for the greeting
      const key = [bot.name, mover.name].sort().join("::");
      if (bonds && applyBondProgress) {
        try {
          const result = applyBondProgress({ bondsMap: bonds, senderName: bot.name, targetName: mover.name, eventType: "wave", baseDelta: 1, cooldownMs: 10_000 });
          if (result && saveBonds) saveBonds();
        } catch (_) { /* non-critical */ }
      }
    }, delay);

    pendingGreetings.set(gKey, timerId);
  }
}

/**
 * Cancel pending proximity greetings involving a character.
 */
export function cancelProximityGreetingsForCharacter(roomId, characterId) {
  for (const [key, timerId] of pendingGreetings) {
    const parts = key.split(":");
    if (parts[0] === roomId && (parts[1] === characterId || parts[2] === characterId)) {
      clearTimeout(timerId);
      pendingGreetings.delete(key);
    }
  }
}

// ---------------------------------------------------------------------------
// Idle Bot Chatter — bots say ambient lines when idle near others
// ---------------------------------------------------------------------------

const BOT_IDLE_THRESHOLD_MS = 20_000;
const BOT_CHATTER_COOLDOWN_MS = 45_000;
const CHATTER_INTERVAL_MS = 10_000;
const CHATTER_DISTANCE = 12;

const botLastActivity = new Map(); // characterId → { lastMove, lastChat }
const botLastChatter = new Map();  // characterId → timestamp
const roomChatterIntervals = new Map(); // roomId → intervalId

const AMBIENT_LINES = [
  "Nice weather today, huh?",
  "I wonder what's for lunch...",
  "Have you been to the plaza lately?",
  "I really like what you've done with this room.",
  "Do you ever just... zone out?",
  "I had the weirdest dream last night.",
  "This is a nice spot to hang out.",
  "I should redecorate my place sometime.",
  "You know what would be great right now? A coffee.",
  "I keep forgetting where I left my keys.",
  "The view from here is pretty nice.",
  "I've been meaning to explore more.",
  "Have you met any new people lately?",
  "Sometimes I just like to stand here and think.",
  "I wonder how many rooms there are in this world.",
  "That's a cool outfit you've got.",
  "I need to stretch my legs more.",
  "Did you hear something just now?",
  "This place has really grown on me.",
  "I should probably organize my apartment.",
  "What a day...",
  "I could use a snack.",
  "Hello there! Just thinking out loud.",
  "I feel like something fun should happen today.",
  "Hey, how's it going?",
  "It's pretty cozy in here.",
  "I always forget how big this place is.",
  "Do you think it'll rain later?",
  "I wonder what everyone else is up to.",
  "Hmm, interesting...",
];

/**
 * Track a bot's activity (move or chat) for idle detection.
 */
export function trackBotActivity(characterId, type) {
  const entry = botLastActivity.get(characterId) || { lastMove: 0, lastChat: 0 };
  if (type === "move") entry.lastMove = Date.now();
  else if (type === "chat") entry.lastChat = Date.now();
  botLastActivity.set(characterId, entry);
}

/**
 * Start the per-room idle chatter interval (idempotent).
 */
export function startRoomChatterInterval({ roomId, getRoom, io, bonds, applyBondProgress, saveBonds, getNeeds, botSockets }) {
  if (roomChatterIntervals.has(roomId)) return;

  const intervalId = setInterval(() => {
    const room = getRoom(roomId);
    if (!room || !room.characters || room.characters.length === 0) return;

    const now = Date.now();
    const bots = room.characters.filter((c) => c.isBot);

    for (const bot of bots) {
      // Check chatter cooldown
      const lastChatter = botLastChatter.get(bot.id) || 0;
      if (now - lastChatter < BOT_CHATTER_COOLDOWN_MS) continue;

      // Check if bot is idle
      const activity = botLastActivity.get(bot.id) || { lastMove: 0, lastChat: 0 };
      const lastActive = Math.max(activity.lastMove, activity.lastChat);
      if (lastActive > 0 && now - lastActive < BOT_IDLE_THRESHOLD_MS) continue;

      // Check if any other character is nearby
      const nearby = room.characters.filter((c) => {
        if (!c || c.id === bot.id) return false;
        return gridDistance(bot.position, c.position) <= CHATTER_DISTANCE;
      });
      if (nearby.length === 0) continue;

      // Pick a random ambient line and emit
      const line = AMBIENT_LINES[Math.floor(Math.random() * AMBIENT_LINES.length)];
      botLastChatter.set(bot.id, now);

      io.to(roomId).emit("playerChatMessage", {
        id: bot.id,
        message: line,
      });

      // Bond progress with nearby characters
      if (bonds && applyBondProgress && saveBonds) {
        for (const peer of nearby) {
          if (!peer.name || !bot.name) continue;
          const key = [bot.name, peer.name].sort().join("::");
          try {
            const result = applyBondProgress({ bondsMap: bonds, senderName: bot.name, targetName: peer.name, eventType: "chat", baseDelta: 0.3, cooldownMs: 30_000 });
            if (result) saveBonds();
          } catch (_) { /* non-critical */ }
        }
      }

      // Only one bot chatters per interval tick per room
      break;
    }

    // Check for critical needs and push alerts to REST bot event buffers
    if (typeof getNeeds === "function" && botSockets) {
      for (const bot of bots) {
        const needs = getNeeds(bot.id);
        if (!needs || needs.criticalNeeds.length === 0) continue;
        // Find this bot's REST connection by iterating botSockets
        for (const [, conn] of botSockets) {
          if (conn.botId === bot.id && conn.eventBuffer) {
            conn.eventBuffer.push({
              type: "needs_alert",
              criticalNeeds: needs.criticalNeeds,
              motives: needs.motives,
              lowestNeed: needs.lowestNeed,
              lowestValue: needs.lowestValue,
              timestamp: Date.now(),
            });
            if (conn.eventBuffer.length > 100) conn.eventBuffer.shift();
            break;
          }
        }
      }
    }
  }, CHATTER_INTERVAL_MS);

  roomChatterIntervals.set(roomId, intervalId);
}

/**
 * Stop the per-room idle chatter interval.
 */
export function stopRoomChatterInterval(roomId) {
  const intervalId = roomChatterIntervals.get(roomId);
  if (intervalId != null) {
    clearInterval(intervalId);
    roomChatterIntervals.delete(roomId);
  }
}

/**
 * Clean up bot activity tracking when a character leaves.
 */
export function cleanupBotActivityTracking(characterId) {
  botLastActivity.delete(characterId);
  botLastChatter.delete(characterId);
}
