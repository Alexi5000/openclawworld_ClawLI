export function ensureUserId(storage = globalThis.localStorage, crypto = globalThis.crypto) {
  const existing = storage.getItem("clawland_user_id");
  if (existing) return existing;

  let id;
  if (typeof crypto?.randomUUID === "function") {
    id = crypto.randomUUID();
  } else {
    if (typeof crypto?.getRandomValues !== "function") {
      throw new Error("Secure randomness is required to create a user identity");
    }
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    id = "u_" + Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
  }
  storage.setItem("clawland_user_id", id);
  return id;
}
