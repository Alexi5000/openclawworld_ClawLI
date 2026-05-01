// Needs-driven behavior engine for bots
// Tracks Sims-style motives (energy, social, fun, hunger) with decay and satisfaction

import { OBJECT_AFFORDANCES, DECAY_RATES, MOTIVE_CLAMP, TRAITS } from "../shared/roomConstants.js";

const botNeeds = new Map(); // characterId -> { energy, social, fun, hunger, traits, lastDecay, activeInteraction }

const DECAY_INTERVAL_MS = 5000;
const CRITICAL_THRESHOLD = 20;

let decayTimer = null;

const clamp = (val) => Math.max(MOTIVE_CLAMP.min, Math.min(MOTIVE_CLAMP.max, val));

function startDecayTimer() {
  if (decayTimer) return;
  decayTimer = setInterval(() => {
    const now = Date.now();
    for (const [botId, state] of botNeeds) {
      const elapsed = (now - state.lastDecay) / 1000;
      if (elapsed <= 0) continue;

      for (const [motive, rate] of Object.entries(DECAY_RATES)) {
        let mod = 1;
        for (const traitName of state.traits) {
          const trait = TRAITS[traitName];
          if (trait?.decayMod?.[motive]) mod *= trait.decayMod[motive];
        }
        state[motive] = clamp(state[motive] - rate * elapsed * mod);
      }
      state.lastDecay = now;
    }
  }, DECAY_INTERVAL_MS);
}

function stopDecayTimer() {
  if (decayTimer && botNeeds.size === 0) {
    clearInterval(decayTimer);
    decayTimer = null;
  }
}

export function initNeeds(botId, traits = []) {
  const validTraits = traits.filter((t) => TRAITS[t]);
  botNeeds.set(botId, {
    energy: 80,
    social: 70,
    fun: 70,
    hunger: 60,
    traits: validTraits,
    lastDecay: Date.now(),
    activeInteraction: null,
  });
  startDecayTimer();
}

export function getNeeds(botId) {
  const state = botNeeds.get(botId);
  if (!state) return null;

  // Apply pending decay before returning
  const now = Date.now();
  const elapsed = (now - state.lastDecay) / 1000;
  if (elapsed > 0) {
    for (const [motive, rate] of Object.entries(DECAY_RATES)) {
      let mod = 1;
      for (const traitName of state.traits) {
        const trait = TRAITS[traitName];
        if (trait?.decayMod?.[motive]) mod *= trait.decayMod[motive];
      }
      state[motive] = clamp(state[motive] - rate * elapsed * mod);
    }
    state.lastDecay = now;
  }

  const motives = { energy: state.energy, social: state.social, fun: state.fun, hunger: state.hunger };
  const entries = Object.entries(motives);
  const lowestEntry = entries.reduce((a, b) => (a[1] < b[1] ? a : b));
  const criticalNeeds = entries.filter(([, v]) => v < CRITICAL_THRESHOLD).map(([k]) => k);

  return {
    motives,
    traits: state.traits,
    lowestNeed: lowestEntry[0],
    lowestValue: Math.round(lowestEntry[1] * 100) / 100,
    criticalNeeds,
    activeInteraction: state.activeInteraction,
  };
}

export function satisfyNeeds(botId, objectName) {
  const state = botNeeds.get(botId);
  if (!state) return null;

  const affordance = OBJECT_AFFORDANCES[objectName];
  if (!affordance) return { error: `Unknown object: ${objectName}` };

  const changes = {};
  for (const [motive, delta] of Object.entries(affordance.satisfies)) {
    const before = state[motive];
    state[motive] = clamp(state[motive] + delta);
    changes[motive] = { before: Math.round(before * 100) / 100, after: Math.round(state[motive] * 100) / 100, delta };
  }

  state.activeInteraction = { objectName, startedAt: Date.now(), duration: affordance.duration };

  // Auto-clear active interaction after duration
  setTimeout(() => {
    if (state.activeInteraction?.objectName === objectName) {
      state.activeInteraction = null;
    }
  }, affordance.duration);

  return { objectName, changes, duration: affordance.duration };
}

export function applySocialBoost(botId, amount = 5) {
  const state = botNeeds.get(botId);
  if (!state) return;
  state.social = clamp(state.social + amount);
}

export function suggestInteraction(botId, availableObjects = []) {
  const state = botNeeds.get(botId);
  if (!state) return null;

  const motives = { energy: state.energy, social: state.social, fun: state.fun, hunger: state.hunger };
  const scored = [];

  for (const objName of availableObjects) {
    const affordance = OBJECT_AFFORDANCES[objName];
    if (!affordance) continue;

    let score = 0;
    for (const [motive, delta] of Object.entries(affordance.satisfies)) {
      const urgency = (MOTIVE_CLAMP.max - motives[motive]) / MOTIVE_CLAMP.max;
      score += delta * urgency;
    }

    // Trait preferences
    for (const traitName of state.traits) {
      const trait = TRAITS[traitName];
      if (trait?.preferences?.[objName]) {
        score += trait.preferences[objName];
      }
    }

    scored.push({ objectName: objName, score: Math.round(score * 100) / 100 });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.length > 0 ? scored[0] : null;
}

export function cleanupNeeds(botId) {
  botNeeds.delete(botId);
  stopDecayTimer();
}
