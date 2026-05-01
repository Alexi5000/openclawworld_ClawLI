# Spec: Wall Item Audit — Newly Added Models

## Context

Several new `.glb` models were added to the codebase. This audit identifies which of those items should have wall-related properties and ensures the item catalog is updated accordingly.

---

## Wall Property Reference

The codebase uses three wall-related properties:

| Property | Meaning | Effect |
|----------|---------|--------|
| `wall: true` | **Wall-mounted** — item hangs on the wall, elevated off floor | Snaps to wall edge, auto-rotates, rendered at `wallHeight` elevation, skips floor collision |
| `alignment: "wall"` | **Floor item against wall** — sits on the floor but backs up to a wall | Placement engine scores wall-edge positions higher, wall-edge candidates generated |
| `wallPreferred: true` | **Soft wall preference** — looks best against wall but can go anywhere | Same scoring as `alignment: "wall"` but no strict enforcement |

---

## Audit Results

### Already Correctly Configured (no changes needed)

These newly added items already have correct wall properties:

| Item | Properties | Status |
|------|-----------|--------|
| `bathroomSinkSquare` | `wall: true, wallHeight: 1.0, alignment: "wall"` | Correct — wall-mounted sink |
| `bedBunk` | `alignment: "wall"` | Correct — bed against wall |
| `bookcaseClosed` | `wallPreferred: true, alignment: "wall"` | Correct |
| `bookcaseClosedDoors` | `wallPreferred: true, alignment: "wall"` | Correct |
| `bookcaseOpen` | `wallPreferred: true, alignment: "wall"` | Correct |
| `cabinetTelevision` | `alignment: "wall"` | Correct — TV stand backs to wall |
| `cabinetTelevisionDoors` | `alignment: "wall"` | Correct |
| `coatRack` | `alignment: "wall"` | Correct — wall-hung rack |
| `deskCorner` | `alignment: "wall"` | Correct — corner desk |
| `hoodLarge` | `wall: true, wallHeight: 1.8` | Correct — range hood on wall |
| `hoodModern` | `wall: true, wallHeight: 1.8` | Correct |
| `kitchenCabinetDrawer` | `alignment: "wall"` | Correct — base cabinet |
| `kitchenCabinetUpper` | `wall: true, wallHeight: 1.5` | Correct — upper cabinet |
| `kitchenCabinetUpperCorner` | `wall: true, wallHeight: 1.5` | Correct |
| `kitchenCabinetUpperDouble` | `wall: true, wallHeight: 1.5` | Correct |
| `kitchenCabinetUpperLow` | `wall: true, wallHeight: 1.2` | Correct |
| `kitchenFridgeBuiltIn` | `alignment: "wall"` | Correct — built-in fridge |
| `kitchenFridgeSmall` | `alignment: "wall"` | Correct |
| `kitchenStoveElectric` | `alignment: "wall"` | Correct |
| `lampWall` | `wall: true, wallHeight: 1.8` | Correct — wall sconce |
| `loungeSofaLong` | `alignment: "wall"` | Correct — sofa backs to wall |
| `shower` | `alignment: "wall"` | Correct — shower against wall |
| `toilet` | `alignment: "wall"` | Correct |
| `washerDryerStacked` | `alignment: "wall"` | Correct |

### Items Needing Updates

#### 1. `ceilingFan` — Needs ceiling mounting

**Current:** `{ name: "ceilingFan", size: [2, 2], role: "decor" }`

**Problem:** A ceiling fan hangs from the ceiling. Currently it would render on the floor with no elevation and no wall/ceiling constraint. There is no dedicated ceiling-mount system, but the existing `wall: true` + high `wallHeight` achieves the same visual effect (item rendered elevated, snapped to room boundary).

**Proposed:**
```js
ceilingFan: { name: "ceilingFan", size: [2, 2], wall: true, wallHeight: 3.2, role: "decor" }
```

**Note:** Using `wall: true` means the fan will snap to a wall edge. This is acceptable — ceiling fans are typically centered in rooms in real life, but for interior rooms the wall snap gives a reasonable position. An alternative is a new `ceiling: true` property but that requires new placement/rendering logic for a single item.

---

#### 2. `lampSquareCeiling` — Needs ceiling mounting

**Current:** `{ name: "lampSquareCeiling", size: [1, 1], role: "lighting" }`

**Problem:** A ceiling lamp should hang from the ceiling. Same issue as `ceilingFan` — renders on the floor with no elevation.

**Proposed:**
```js
lampSquareCeiling: { name: "lampSquareCeiling", size: [1, 1], wall: true, wallHeight: 3.2, role: "lighting" }
```

---

#### 3. `televisionAntenna` — Should prefer wall placement

**Current:** `{ name: "televisionAntenna", size: [2, 1], role: "entertainment" }`

**Problem:** A tabletop TV with antenna sits on a surface (TV cabinet, table) that is typically against a wall. While the TV itself isn't wall-mounted, it should prefer positions near walls to look natural.

**Proposed:**
```js
televisionAntenna: { name: "televisionAntenna", size: [2, 1], role: "entertainment", wallPreferred: true,
  affinities: [{ target: "cabinetTelevision", relation: "beside", distance: { min: 0, max: 1 }, priority: 9 }] }
```

---

#### 4. `coatRackStanding` — Should prefer wall placement

**Current:** `{ name: "coatRackStanding", size: [1, 1], role: "decor" }`

**Problem:** A standing coat rack is typically placed near an entrance or against a wall/corner. Currently has no wall preference, so bot auto-placement may put it in the middle of the room.

**Proposed:**
```js
coatRackStanding: { name: "coatRackStanding", size: [1, 1], role: "decor", wallPreferred: true }
```

---

#### 5. `kitchenFridgeBuiltIn` — Should add `wallPreferred`

**Current:** `{ name: "kitchenFridgeBuiltIn", size: [2, 1], role: "appliance", alignment: "wall" }`

**Problem:** Has `alignment: "wall"` but not `wallPreferred: true`. The other fridges (`kitchenFridge`, `kitchenFridgeLarge`) have both. Adding `wallPreferred` ensures consistent behavior with wall-edge candidate generation.

**Proposed:**
```js
kitchenFridgeBuiltIn: { name: "kitchenFridgeBuiltIn", size: [2, 1], wallPreferred: true, role: "appliance", alignment: "wall", ... }
```

---

#### 6. `kitchenFridgeSmall` — Should add `wallPreferred`

**Current:** `{ name: "kitchenFridgeSmall", size: [1, 1], role: "appliance", alignment: "wall" }`

**Problem:** Same as `kitchenFridgeBuiltIn` — has `alignment: "wall"` but missing `wallPreferred: true` for consistency with other fridges.

**Proposed:**
```js
kitchenFridgeSmall: { name: "kitchenFridgeSmall", size: [1, 1], wallPreferred: true, role: "appliance", alignment: "wall", ... }
```

---

### Items Confirmed as Non-Wall (no changes needed)

These newly added items correctly have no wall properties:

| Item | Reason |
|------|--------|
| `benchCushion` | Free-standing bench seating |
| `books` | Shelf/table decor |
| `cabinetBed` | Goes beside bed (bed handles wall alignment) |
| `cardboardBoxOpen` | Free-standing storage |
| `chairDesk` | Desk chair, rolls freely |
| `computerKeyboard` | Desktop surface item |
| `computerMouse` | Desktop surface item |
| `computerScreen` | Desktop monitor on desk |
| `kitchenBarEnd` | Kitchen counter extension |
| `kitchenCoffeeMachine` | Countertop appliance |
| `loungeChairRelax` | Free-standing accent chair |
| `loungeDesignChair` | Free-standing accent chair |
| `pillow` / `pillowLong` | Sofa/bed decor |
| `plantSmall1` / `plantSmall2` / `plantSmall3` | Floor/surface decor |
| `pottedPlant` | Floor/surface decor |
| `rugDoormat` | Floor covering |
| `sideTable` / `sideTableDrawers` | Goes beside seating |
| `tableCloth` / `tableCoffeeGlass` / `tableCoffeeSquare` / `tableCross` / `tableGlass` / `tableRound` | Center/dining tables |

---

## Changes Summary

| File | Changes |
|------|---------|
| `server/itemCatalog.js` | Add `wall: true, wallHeight: 3.2` to `ceilingFan` and `lampSquareCeiling`; add `wallPreferred: true` to `televisionAntenna`, `coatRackStanding`, `kitchenFridgeBuiltIn`, `kitchenFridgeSmall`; add affinities to `televisionAntenna` |

## Implementation

All changes are in a single file (`server/itemCatalog.js`). Six item definitions need updating. No client-side changes required — `Item.jsx` already reads `wallHeight` from the catalog and the placement engine already handles `wallPreferred`.

### Risks
- **Ceiling items using `wall: true`**: `ceilingFan` and `lampSquareCeiling` will snap to wall edges in interior rooms rather than floating freely at ceiling height. This is a visual trade-off — they'll be elevated but positioned at a wall rather than room center. If this is unacceptable, a dedicated `ceiling: true` system would be needed (separate spec).
- **Existing room layouts**: Rooms already containing these items won't retroactively reposition. Only new placements are affected.
