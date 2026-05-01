/**
 * Verify roomConstants.js consolidation
 *
 * Checks that:
 *   1. The shared source of truth exists and exports all expected symbols
 *   2. The old server/shared/roomConstants.js is deleted
 *   3. Server imports resolve to the shared file
 *   4. Building footprints return correct structure
 *   5. PLAZA_LANDMARKS array matches footprints length
 *
 * Usage:
 *   cd server && node ../tests/manual/test-roomconstants-imports.js
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");

let passed = 0;
let failed = 0;
const errors = [];

function assert(condition, label) {
  if (condition) {
    passed++;
    console.log(`  \u2713 ${label}`);
  } else {
    failed++;
    errors.push(label);
    console.log(`  \u2717 ${label}`);
  }
}

async function runTests() {
  console.log("\nroomConstants.js Consolidation Tests\n");
  console.log("=".repeat(50));

  // ── Test 1: Shared file exists ──
  console.log("Test 1: Shared roomConstants.js exists and exports correctly");
  const sharedPath = path.join(ROOT, "shared", "roomConstants.js");
  assert(fs.existsSync(sharedPath), "shared/roomConstants.js exists");

  let sharedModule;
  try {
    sharedModule = await import(sharedPath);
    assert(true, "shared/roomConstants.js imports without error");
  } catch (err) {
    assert(false, `shared/roomConstants.js import failed: ${err.message}`);
    console.log("\n" + "=".repeat(50));
    console.log(`Results: ${passed} passed, ${failed} failed`);
    process.exit(1);
  }

  // ── Test 2: All expected exports present ──
  console.log("\nTest 2: All expected exports present");
  const expectedExports = [
    "ROOM_ZONES",
    "scaleZoneArea",
    "getBuildingFootprints",
    "PLAZA_LANDMARKS",
    "ENTRANCE_ZONE",
    "ZONE_ACTIONS",
    "OBJECT_AFFORDANCES",
    "DECAY_RATES",
    "MOTIVE_CLAMP",
    "TRAITS",
  ];
  for (const name of expectedExports) {
    assert(name in sharedModule, `exports '${name}'`);
  }

  // ── Test 3: Old server copy deleted ──
  console.log("\nTest 3: Old server/shared/roomConstants.js is deleted");
  const oldServerPath = path.join(ROOT, "server", "shared", "roomConstants.js");
  assert(!fs.existsSync(oldServerPath), "server/shared/roomConstants.js does NOT exist");

  const oldServerDir = path.join(ROOT, "server", "shared");
  assert(!fs.existsSync(oldServerDir), "server/shared/ directory does NOT exist");

  // ── Test 4: getBuildingFootprints returns correct structure ──
  console.log("\nTest 4: getBuildingFootprints returns correct structure");
  const { getBuildingFootprints, PLAZA_LANDMARKS } = sharedModule;
  const footprints = getBuildingFootprints([50, 50]);
  assert(Array.isArray(footprints), "getBuildingFootprints returns an array");
  assert(footprints.length === 10, `Returns 10 footprints (got ${footprints.length})`);

  for (let i = 0; i < footprints.length; i++) {
    const fp = footprints[i];
    const hasFields = typeof fp.x === "number" && typeof fp.z === "number" &&
                      typeof fp.w === "number" && typeof fp.d === "number";
    assert(hasFields, `Footprint[${i}] has x, z, w, d number fields`);
  }

  // ── Test 5: PLAZA_LANDMARKS matches footprints ──
  console.log("\nTest 5: PLAZA_LANDMARKS array matches footprints length");
  assert(Array.isArray(PLAZA_LANDMARKS), "PLAZA_LANDMARKS is an array");
  assert(PLAZA_LANDMARKS.length === footprints.length, `PLAZA_LANDMARKS length (${PLAZA_LANDMARKS.length}) matches footprints (${footprints.length})`);
  assert(PLAZA_LANDMARKS[0] === "Town Hall", "First landmark is 'Town Hall'");
  assert(PLAZA_LANDMARKS[1] === "Apartment", "Second landmark is 'Apartment'");
  assert(PLAZA_LANDMARKS[2] === "Shop", "Third landmark is 'Shop'");

  // ── Test 6: Known coordinate values (source of truth) ──
  console.log("\nTest 6: Building footprint coordinates match expected values");
  const fp50 = getBuildingFootprints([50, 50]);
  // TownHall: center-north, x = 50/2 - 6 = 19, z = 3
  assert(fp50[0].x === 19, `TownHall x = 19 (got ${fp50[0].x})`);
  assert(fp50[0].z === 3, `TownHall z = 3 (got ${fp50[0].z})`);
  // Apartment: west, x = 3
  assert(fp50[1].x === 3, `Apartment x = 3 (got ${fp50[1].x})`);
  // ShopBuilding: east, x = 50 - 11 = 39
  assert(fp50[2].x === 39, `Shop x = 39 (got ${fp50[2].x})`);
  // SE skyscraper: x = 50-8 = 42, z = 50-8 = 42
  assert(fp50[9].x === 42, `SE Skyscraper x = 42 (got ${fp50[9].x})`);
  assert(fp50[9].z === 42, `SE Skyscraper z = 42 (got ${fp50[9].z})`);

  // ── Test 7: Server index.js import path updated ──
  console.log("\nTest 7: Server import paths updated");
  const serverIndex = fs.readFileSync(path.join(ROOT, "server", "index.js"), "utf-8");
  assert(serverIndex.includes("../shared/roomConstants.js"), "server/index.js imports from ../shared/roomConstants.js");
  assert(!serverIndex.match(/from\s+["']\.\/shared\/roomConstants/), "server/index.js does NOT import from ./shared/roomConstants.js");

  const serverPathfinding = fs.readFileSync(path.join(ROOT, "server", "pathfinding.js"), "utf-8");
  assert(serverPathfinding.includes("../shared/roomConstants.js"), "server/pathfinding.js imports from ../shared/roomConstants.js");
  assert(!serverPathfinding.match(/from\s+["']\.\/shared\/roomConstants/), "server/pathfinding.js does NOT import from ./shared/roomConstants.js");

  // ── Test 8: Client Minimap imports from shared ──
  console.log("\nTest 8: Client Minimap.jsx imports from shared");
  const minimap = fs.readFileSync(path.join(ROOT, "client", "src", "components", "Minimap.jsx"), "utf-8");
  assert(minimap.includes("shared/roomConstants"), "Minimap.jsx imports from shared/roomConstants");
  assert(!minimap.includes("const getBuildingFootprints"), "Minimap.jsx no longer has hardcoded getBuildingFootprints");
  assert(minimap.includes("PLAZA_LANDMARKS"), "Minimap.jsx uses PLAZA_LANDMARKS");

  // ── Summary ──
  console.log("\n" + "=".repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (errors.length > 0) {
    console.log("\nFailed assertions:");
    for (const e of errors) console.log(`  - ${e}`);
  }
  console.log("");
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
