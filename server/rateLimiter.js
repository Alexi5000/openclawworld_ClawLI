import crypto from "crypto";
import { parseWebhookUrl, resolveWebhookDestination } from "./webhookTransport.js";

export const createRateLimiter = (maxRequests, windowMs) => {
  const hits = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (now > entry.resetTime) hits.delete(key);
    }
  }, 60_000);
  return (key) => {
    const now = Date.now();
    let entry = hits.get(key);
    if (!entry || now > entry.resetTime) {
      entry = { count: 0, resetTime: now + windowMs };
      hits.set(key, entry);
    }
    entry.count++;
    return entry.count > maxRequests;
  };
};

export const isValidWebhookUrl = (value) => {
  try { parseWebhookUrl(value); return true; } catch { return false; }
};

export const isSafeWebhookUrl = async (value) => {
  try { await resolveWebhookDestination(value); return true; } catch { return false; }
};

export const hashApiKey = (key) => crypto.createHash("sha256").update(key).digest("hex");
