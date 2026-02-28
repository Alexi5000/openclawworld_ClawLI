// Persistent user store (DB when available, JSON fallback)

import fs from "fs";
import crypto from "crypto";
import * as db from "./db.js";

const {
  isDbAvailable,
  getUserById,
  upsertUser,
  touchUser: dbTouchUser,
  validateSessionToken: dbValidateSessionToken,
} = db;
const dbSetSessionToken = db.setSessionToken;

const USERS_FILE = "users.json";
const users = new Map(); // userId -> user record

const nowMs = () => Date.now();
const SESSION_TOKEN_HASH_PREFIX = "sha256:";
const hashSessionToken = (token) =>
  `${SESSION_TOKEN_HASH_PREFIX}${crypto.createHash("sha256").update(token).digest("hex")}`;

export const createUserId = () => {
  if (crypto.randomUUID) return crypto.randomUUID();
  return crypto.randomBytes(16).toString("hex");
};

export const createSessionToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

const persistUsers = () => {
  if (isDbAvailable()) return;
  const payload = [...users.values()];
  fs.writeFileSync(USERS_FILE, JSON.stringify(payload, null, 2));
};

export const loadUserStore = () => {
  if (isDbAvailable()) return;
  let migratedTokens = false;
  try {
    const raw = fs.readFileSync(USERS_FILE, "utf8");
    const data = JSON.parse(raw);
    if (Array.isArray(data)) {
      data.forEach((u) => {
        if (!u || !u.id) return;
        if (typeof u.sessionToken === "string" && !u.sessionToken.startsWith(SESSION_TOKEN_HASH_PREFIX)) {
          u.sessionToken = hashSessionToken(u.sessionToken);
          migratedTokens = true;
        }
        users.set(u.id, u);
      });
    }
  } catch {
    // No users.json yet, that's fine
  }
  if (migratedTokens) persistUsers();
};

export const getUser = async (userId) => {
  if (!userId) return null;
  if (isDbAvailable()) {
    return await getUserById(userId);
  }
  return users.get(userId) || null;
};

export const ensureUser = async ({ userId, name = null, isBot = false } = {}) => {
  if (!userId) return null;
  if (isDbAvailable()) {
    // Check if user exists first to determine if we need a new session token
    const existingUser = await getUserById(userId);
    const sessionToken = existingUser ? undefined : createSessionToken();
    const record = await upsertUser({
      id: userId,
      name,
      isBot: !!isBot,
      sessionToken,
    });
    return record;
  }

  const existing = users.get(userId);
  if (!existing) {
    const createdAt = nowMs();
    const sessionToken = createSessionToken();
    const record = {
      id: userId,
      name: name || null,
      isBot: !!isBot,
      sessionToken: hashSessionToken(sessionToken),
      createdAt,
      updatedAt: createdAt,
      lastSeenAt: createdAt,
    };
    users.set(userId, record);
    persistUsers();
    return record;
  }

  let changed = false;
  if (name && existing.name !== name) {
    existing.name = name;
    changed = true;
  }
  if (existing.isBot !== !!isBot) {
    existing.isBot = !!isBot;
    changed = true;
  }
  existing.lastSeenAt = nowMs();
  if (changed) existing.updatedAt = existing.lastSeenAt;
  if (changed) persistUsers();
  return existing;
};

export const touchUser = async (userId) => {
  if (!userId) return;
  if (isDbAvailable()) {
    await dbTouchUser(userId);
    return;
  }
  const existing = users.get(userId);
  if (!existing) return;
  existing.lastSeenAt = nowMs();
  existing.updatedAt = existing.lastSeenAt;
  persistUsers();
};

export const validateSessionToken = async (userId, token) => {
  if (!userId || !token) return false;
  if (isDbAvailable()) {
    return await dbValidateSessionToken(userId, token);
  }
  const user = users.get(userId);
  if (!user?.sessionToken) return false;
  const hashed = hashSessionToken(token);
  if (user.sessionToken === hashed) return true;

  // Backward compatibility for legacy plaintext tokens; upgrade on first valid use.
  if (user.sessionToken === token) {
    user.sessionToken = hashed;
    persistUsers();
    return true;
  }
  return false;
};

export const setSessionToken = async (userId, token) => {
  if (!userId || !token) return false;
  if (isDbAvailable() && typeof dbSetSessionToken === "function") {
    return await dbSetSessionToken(userId, token);
  }
  const user = users.get(userId);
  if (!user) return false;
  user.sessionToken = hashSessionToken(token);
  persistUsers();
  return true;
};

