import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { writePrivateFile } from "../packages/openclawworld/lib/private-file.js";

async function sandbox(run) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "world-install-"));
  const originalHome = process.env.HOME;
  process.env.HOME = home;
  try { await run(home); } finally {
    if (originalHome === undefined) delete process.env.HOME;
    else process.env.HOME = originalHome;
    fs.rmSync(home, { recursive: true, force: true });
  }
}
test("private files retain data and replace existing content with private permissions", () => sandbox(home => {
  const file = path.join(home, ".config", "world", "credentials.json");
  writePrivateFile(file, '{"key":"secret"}');
  assert.equal(fs.statSync(file).mode & 0o777, 0o600);
  fs.chmodSync(file, 0o644);
  writePrivateFile(file, '{"key":"new"}');
  assert.equal(fs.readFileSync(file, "utf8"), '{"key":"new"}');
  assert.equal(fs.statSync(file).mode & 0o777, 0o600);
}));
test("symlink files and directories cannot redirect installer writes", () => sandbox(home => {
  const outside = path.join(home, "outside");
  fs.mkdirSync(outside);
  fs.writeFileSync(path.join(outside, "keep"), "unchanged");
  fs.symlinkSync(outside, path.join(home, "linked"));
  assert.throws(() => writePrivateFile(path.join(home, "linked", "keep"), "bad"));
  fs.symlinkSync(path.join(outside, "keep"), path.join(home, "file"));
  assert.throws(() => writePrivateFile(path.join(home, "file"), "bad"));
  assert.equal(fs.readFileSync(path.join(outside, "keep"), "utf8"), "unchanged");
}));
test("hardlinks and paths outside home are rejected", () => sandbox(home => {
  const original = path.join(home, "original");
  fs.writeFileSync(original, "keep");
  fs.linkSync(original, path.join(home, "linked"));
  assert.throws(() => writePrivateFile(path.join(home, "linked"), "bad"));
  assert.throws(() => writePrivateFile(path.join(home, "..", "escape"), "bad"));
  assert.equal(fs.readFileSync(original, "utf8"), "keep");
}));
async function installWith(home, responses, options, output = []) {
  const oldFetch = globalThis.fetch;
  const log = console.log;
  const error = console.error;
  globalThis.fetch = async (_url, request) => {
    assert.equal(request.redirect, "error");
    const next = responses.shift();
    return { ok: next.ok ?? true, status: next.status ?? 200,
      text: async () => next.text, json: async () => next.json };
  };
  console.log = console.error = (...args) => output.push(args.join(" "));
  try {
    const { default: install } = await import("../packages/openclawworld/lib/install.js?home=" + encodeURIComponent(home));
    await install(options);
    return output.join("\n");
  } finally { globalThis.fetch = oldFetch; console.log = log; console.error = error; }
}
test("registration stores credentials privately without printing keys", () => sandbox(async home => {
  const output = await installWith(home, [
    { text: "# Skill" }, { text: '{"name":"world"}' },
    { json: { bot: { api_key: "secret-sentinel", status: "verified" } } },
  ], { register: true, botName: "test" });
  const file = path.join(home, ".config", "openclawworld", "credentials.json");
  assert.equal(JSON.parse(fs.readFileSync(file, "utf8")).api_key, "secret-sentinel");
  assert.equal(fs.statSync(file).mode & 0o777, 0o600);
  assert.doesNotMatch(output, /secret-sentinel/);
  assert.match(output, /INSTALLATION COMPLETE/);
}));
test("download failures reject instead of reporting success", () => sandbox(async home => {
  await assert.rejects(installWith(home, [{ ok: false, status: 503 }], {}), /installation failed/);
  assert.equal(fs.existsSync(path.join(home, ".config", "openclawworld", "credentials.json")), false);
}));
test("malformed metadata and missing registration credentials reject", () => sandbox(async home => {
  await assert.rejects(installWith(home, [{ text: "# Skill" }, { text: "invalid" }], {}), /metadata installation failed/);
  await assert.rejects(installWith(home, [{ text: "# Skill" }, { text: "{}" }, { json: { bot: {} } }], { register: true, botName: "test" }), /registration failed/);
}));


test("untrusted writable directories are rejected without changing their permissions", () => sandbox(home => {
  if (typeof process.getuid !== "function") return;
  const directory = path.join(home, ".config");
  fs.mkdirSync(directory, { mode: 0o777 });
  fs.chmodSync(directory, 0o777);
  assert.throws(() => writePrivateFile(path.join(directory, "credentials.json"), "secret"), /not writable by others/);
  assert.equal(fs.statSync(directory).mode & 0o777, 0o777);
  assert.equal(fs.existsSync(path.join(directory, "credentials.json")), false);
}));

test("a trusted symlinked HOME still writes inside the canonical home", () => sandbox(home => {
  const alias = path.join(home, "home-alias");
  fs.symlinkSync(home, alias, "dir");
  process.env.HOME = alias;
  writePrivateFile(path.join(alias, ".config", "credentials.json"), "private");
  assert.equal(fs.readFileSync(path.join(home, ".config", "credentials.json"), "utf8"), "private");
}));

test("registration errors and status fields never echo remote credential material", () => sandbox(async home => {
  const errorOutput = [];
  await assert.rejects(installWith(home, [
    { text: "# Skill" }, { text: "{}" },
    { ok: false, status: 400, json: { error: "secret-sentinel" } },
  ], { register: true, botName: "test" }, errorOutput), /registration failed/);
  assert.doesNotMatch(errorOutput.join("\n"), /secret-sentinel|INSTALLATION COMPLETE/);
  assert.equal(fs.existsSync(path.join(home, ".config", "openclawworld", "credentials.json")), false);
  const output = await installWith(home, [
    { text: "# Skill" }, { text: "{}" },
    { json: { bot: { api_key: "secret-sentinel", status: "secret-sentinel" } } },
  ], { register: true, botName: "test" });
  assert.doesNotMatch(output, /secret-sentinel/);
}));

test("failed replacement preserves existing credentials and cleans temporary files", () => sandbox(home => {
  const file = path.join(home, ".config", "world", "credentials.json");
  writePrivateFile(file, "original");
  const rename = fs.renameSync;
  fs.renameSync = () => { throw new Error("fixture disk failure"); };
  try {
    assert.throws(() => writePrivateFile(file, "replacement"), /fixture disk failure/);
  } finally { fs.renameSync = rename; }
  assert.equal(fs.readFileSync(file, "utf8"), "original");
  assert.deepEqual(fs.readdirSync(path.dirname(file)), ["credentials.json"]);
}));
