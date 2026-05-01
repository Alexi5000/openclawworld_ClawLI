// GitHub connection store — per-user PAT + repo connections with JSON persistence
// Pattern mirrors botRegistry.js

import fs from "fs";
import crypto from "crypto";

const store = new Map();
const STORE_FILE = "github-store.json";
const KEY_FILE = ".github-store-key";
const TREE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// --- Encryption helpers (AES-256-GCM) ---

function loadEncryptionKey() {
  // 1. Prefer explicit env var
  if (process.env.GITHUB_STORE_KEY) {
    const buf = Buffer.from(process.env.GITHUB_STORE_KEY, "hex");
    if (buf.length === 32) return buf;
    console.warn("GITHUB_STORE_KEY must be 64 hex chars (32 bytes). Falling back to key file.");
  }
  // 2. Read from local key file
  try {
    const hex = fs.readFileSync(KEY_FILE, "utf8").trim();
    const buf = Buffer.from(hex, "hex");
    if (buf.length === 32) return buf;
  } catch { /* not found */ }
  // 3. Auto-generate
  const key = crypto.randomBytes(32);
  fs.writeFileSync(KEY_FILE, key.toString("hex"), { mode: 0o600 });
  console.log("Generated new GitHub store encryption key");
  return key;
}

const encryptionKey = loadEncryptionKey();

function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return iv.toString("hex") + ":" + authTag.toString("hex") + ":" + encrypted.toString("hex");
}

function decrypt(ciphertext) {
  const parts = ciphertext.split(":");
  if (parts.length !== 3) throw new Error("Invalid ciphertext format");
  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encrypted = Buffer.from(parts[2], "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final("utf8");
}

function decryptToken(storedToken) {
  if (!storedToken) return storedToken;
  try {
    return decrypt(storedToken);
  } catch {
    // Auto-migrate: treat as plaintext (legacy unencrypted token)
    return storedToken;
  }
}

// --- Store operations ---

export const loadGithubStore = () => {
  try {
    const data = fs.readFileSync(STORE_FILE, "utf8");
    const entries = JSON.parse(data);
    let migrated = false;
    for (const [key, value] of entries) {
      store.set(key, value);
      // Auto-migrate: re-encrypt plaintext tokens on load
      if (value.token) {
        const plain = decryptToken(value.token);
        const reEncrypted = encrypt(plain);
        if (reEncrypted !== value.token) {
          value.token = reEncrypted;
          migrated = true;
        }
      }
    }
    console.log(`Loaded ${store.size} GitHub connections`);
    if (migrated) saveGithubStore();
  } catch {
    // No store file yet, that's fine
  }
};

export const saveGithubStore = () => {
  // Strip treeCache before persisting — it's ephemeral
  const serializable = [];
  for (const [key, value] of store) {
    const { treeCache, ...rest } = value;
    serializable.push([key, rest]);
  }
  fs.writeFileSync(STORE_FILE, JSON.stringify(serializable, null, 2));
};

export const setConnection = (userId, { token, githubUsername }) => {
  const existing = store.get(userId) || { repos: [], treeCache: {} };
  existing.token = encrypt(token);
  existing.githubUsername = githubUsername;
  if (!existing.repos) existing.repos = [];
  if (!existing.treeCache) existing.treeCache = {};
  store.set(userId, existing);
  saveGithubStore();
};

export const getConnection = (userId) => {
  const entry = store.get(userId);
  if (!entry) return null;
  return { token: decryptToken(entry.token), githubUsername: entry.githubUsername };
};

export const removeConnection = (userId) => {
  store.delete(userId);
  saveGithubStore();
};

export const addRepo = (userId, owner, repo, metadata = {}) => {
  const entry = store.get(userId);
  if (!entry) return;
  if (!entry.repos) entry.repos = [];
  // Avoid duplicates
  const existing = entry.repos.find(
    (r) => r.owner === owner && r.repo === repo
  );
  if (existing) {
    Object.assign(existing, metadata);
  } else {
    entry.repos.push({ owner, repo, ...metadata });
  }
  saveGithubStore();
};

export const removeRepo = (userId, owner, repo) => {
  const entry = store.get(userId);
  if (!entry || !entry.repos) return;
  entry.repos = entry.repos.filter(
    (r) => !(r.owner === owner && r.repo === repo)
  );
  // Also clear tree cache for this repo
  if (entry.treeCache) {
    delete entry.treeCache[`${owner}/${repo}`];
  }
  saveGithubStore();
};

export const getRepos = (userId) => {
  const entry = store.get(userId);
  if (!entry || !entry.repos) return [];
  return entry.repos;
};

export const getRepoTreeCache = (userId, owner, repo) => {
  const entry = store.get(userId);
  if (!entry || !entry.treeCache) return null;
  const cached = entry.treeCache[`${owner}/${repo}`];
  if (!cached) return null;
  if (Date.now() - cached.timestamp > TREE_CACHE_TTL) {
    delete entry.treeCache[`${owner}/${repo}`];
    return null;
  }
  return cached.tree;
};

export const setRepoTreeCache = (userId, owner, repo, tree) => {
  const entry = store.get(userId);
  if (!entry) return;
  if (!entry.treeCache) entry.treeCache = {};
  entry.treeCache[`${owner}/${repo}`] = { tree, timestamp: Date.now() };
};
