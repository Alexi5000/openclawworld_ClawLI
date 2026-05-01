# Spec: Wall Items v2 — Polish, Robustness & Extensibility

## Context

Wall items (`bathroomMirror`, `bathroomCabinet`, `bear`) now snap to wall edges in interior rooms, auto-rotate to face inward, and render elevated. This spec covers the next round of improvements to make the feature feel complete.

---

## 1. Per-Item Wall Mount Height

### Problem
All wall items use a blanket `yOffset = 1.5`. A mirror should hang higher than a cabinet. The bear (wall trophy) should sit between them.

### Changes

**`server/itemCatalog.js`**
Add a `wallHeight` field to each wall item definition:

```js
bathroomMirror:  { name: "bathroomMirror",  size: [2, 1], wall: true, wallHeight: 2.0 },
bathroomCabinet: { name: "bathroomCabinet", size: [2, 1], wall: true, wallHeight: 1.0 },
bear:            { name: "bear",            size: [2, 1], wall: true, wallHeight: 1.8 },
```

**`client/src/components/Item.jsx`**
Replace the hardcoded `1.5`:

```js
const isWallMounted = item.wall && map.size[0] <= 30;
const yOffset = isWallMounted ? (item.wallHeight ?? 1.5) : 0;
```

The `wallHeight` value must be plumbed through to the client. Currently `item` in `Item.jsx` comes from `room.items[]` which is built from the catalog on the server. In `sanitizeRoomItemsUpdate()` (socketHandlers.js) and the various placement flows, the `wallHeight` field is **not** currently included on the wire item. Two options:

- **Option A (recommended)**: Look up `wallHeight` from the client-side `itemsAtom` catalog (already available via `useAtom(itemsAtom)`) instead of reading it off the item object. This avoids any server changes.
- **Option B**: Add `wallHeight` to the serialized item in every server path that builds item objects. More invasive.

Go with **Option A**: in `Item.jsx`, import `itemsAtom` from `SocketManager`, look up `itemsCatalog[item.name]?.wallHeight`.

---

## 2. Elevated Drag Preview Indicator

### Problem
When dragging a wall item, the green/red drop indicator box renders on the floor (y=0) even though the placed item will appear elevated on the wall. This is misleading.

### Changes

**`client/src/components/Item.jsx`**
The indicator `<mesh>` inside the `isDragging` block already inherits the group's position (which includes `yOffset`). However, the indicator box is a flat `0.2`-height box centered at the group origin — with the y offset it now floats in air, which is correct for wall items.

Verify this is already working with the v1 changes. If the indicator appears on the floor despite the group offset, explicitly set the mesh's `position-y` to `0`:

```jsx
{isDragging && (
  <mesh position-y={0}>
    <boxGeometry args={[width / map.gridDivision, 0.2, height / map.gridDivision]} />
    <meshBasicMaterial color={canDrop ? "green" : "red"} opacity={0.3} transparent />
  </mesh>
)}
```

This should just need visual verification — no code change expected beyond confirming the group-level offset already handles it.

---

## 3. Wall-to-Wall Collision Detection

### Problem
Wall items skip collision checks entirely (both client and server). Two mirrors can overlap each other on the same wall. This looks wrong and shouldn't be allowed.

### Changes

**`client/src/components/Room.jsx`** — `canDrop` useEffect (after the wall-edge check):

Add a wall-vs-wall overlap check. Wall items should collide with **other wall items** but not with floor items:

```js
// check wall-vs-wall collisions
if (item.wall) {
  items.forEach((otherItem, idx) => {
    if (idx === draggedItem) return;
    if (!otherItem.wall) return; // only check wall-vs-wall

    const otherWidth =
      otherItem.rotation === 1 || otherItem.rotation === 3
        ? otherItem.size[1] : otherItem.size[0];
    const otherHeight =
      otherItem.rotation === 1 || otherItem.rotation === 3
        ? otherItem.size[0] : otherItem.size[1];
    if (
      dragPosition[0] < otherItem.gridPosition[0] + otherWidth &&
      dragPosition[0] + width > otherItem.gridPosition[0] &&
      dragPosition[1] < otherItem.gridPosition[1] + otherHeight &&
      dragPosition[1] + height > otherItem.gridPosition[1]
    ) {
      droppable = false;
    }
  });
}
```

**`server/socketHandlers.js`** — `sanitizeRoomItemsUpdate()`:

After the wall placement check, add wall-vs-wall collision tracking. Use a separate `occupiedWallCells` set (analogous to the existing `occupiedCells` for floor items):

```js
// At the top of the loop, alongside occupiedCells:
const occupiedWallCells = new Set();

// After isValidWallPlacement check:
if (itemDef.wall) {
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const key = `${gx + x},${gy + y}`;
      if (occupiedWallCells.has(key)) {
        return { ok: false, error: `Wall item collision detected for ${itemDef.name}` };
      }
    }
  }
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      occupiedWallCells.add(`${gx + x},${gy + y}`);
    }
  }
}
```

**`server/socketHandlers.js`** — `placeItem` handler:

Add wall-vs-wall grid check against existing wall items in the room:

```js
if (itemDef.wall) {
  for (const existing of room.items) {
    if (!existing.wall) continue;
    const ew = existing.rotation === 1 || existing.rotation === 3 ? existing.size[1] : existing.size[0];
    const eh = existing.rotation === 1 || existing.rotation === 3 ? existing.size[0] : existing.size[1];
    if (gx < existing.gridPosition[0] + ew && gx + width > existing.gridPosition[0] &&
        gy < existing.gridPosition[1] + eh && gy + height > existing.gridPosition[1]) {
      return; // collision
    }
  }
}
```

**`server/httpRoutes.js`** — `/api/v1/rooms/:id/place-item`:

Same wall-vs-wall check as the socket handler above.

---

## 4. Server-Side Rotation Validation

### Problem
`isValidWallPlacement()` checks position but not rotation. A bot could place a mirror on the front wall (gy=0) with rotation=2 (facing the wall instead of into the room). The client auto-sets rotation, but the API doesn't enforce it.

### Changes

**`server/itemCatalog.js`** — extend `isValidWallPlacement()`:

Add an optional `strictRotation` check. Compute which wall the item is on and verify rotation matches:

```js
export const isValidWallPlacement = (itemDef, gridPosition, rotation, roomSize, gridDivision) => {
  if (!itemDef.wall) return true;
  if (roomSize[0] > 30 || roomSize[1] > 30) return true;

  const maxX = roomSize[0] * gridDivision;
  const maxY = roomSize[1] * gridDivision;
  const [gx, gy] = gridPosition;
  const w = (rotation === 1 || rotation === 3) ? itemDef.size[1] : itemDef.size[0];
  const h = (rotation === 1 || rotation === 3) ? itemDef.size[0] : itemDef.size[1];

  const onFront = gy === 0;
  const onLeft  = gx === 0;
  const onBack  = (gy + h === maxY);
  const onRight = (gx + w === maxX);

  if (!onFront && !onLeft && !onBack && !onRight) return false;

  // Validate rotation matches the wall (corners: accept either wall's rotation)
  const validRotations = new Set();
  if (onFront) validRotations.add(0);
  if (onLeft)  validRotations.add(1);
  if (onBack)  validRotations.add(2);
  if (onRight) validRotations.add(3);

  return validRotations.has(rotation);
};
```

This is a **breaking change** for the existing function signature — the rotation check is now mandatory for interior rooms. All callers already pass rotation, so no signature changes needed. However, this means existing rooms with wall items that have mismatched rotations would fail validation on save. This is acceptable — the client already auto-corrects rotation on drag, so the only way to hit this is via the API.

---

## 5. Wall Proximity Highlight

### Problem
When dragging a wall item, the snap behavior is invisible. Players don't understand why the item locks to a wall edge. A visual highlight on the target wall makes this clear.

### Changes

**`client/src/components/Room.jsx`**

Add a state for which wall is being targeted:

```js
const [activeWall, setActiveWall] = useState(null); // 'front' | 'left' | 'back' | 'right' | null
```

In the `onPointerMove` handler, when snapping a wall item, set `activeWall` based on which wall was chosen. Clear it when `draggedItem` becomes null.

In the interior room walls group (the 4 `<mesh>` elements starting around line 472), conditionally change the material color or add emissive glow when that wall is active:

```jsx
<mesh position={[map.size[0] / 2, 2, -0.15]} castShadow receiveShadow>
  <boxGeometry args={[map.size[0] + 0.3, 4, 0.3]} />
  <meshStandardMaterial
    color="#e8e0d4"
    emissive={activeWall === 'front' ? '#4a9eff' : '#000000'}
    emissiveIntensity={activeWall === 'front' ? 0.3 : 0}
  />
</mesh>
```

Repeat for each of the 4 walls with their corresponding `activeWall` value.

Clear on drag end:

```js
useEffect(() => {
  if (draggedItem === null) setActiveWall(null);
}, [draggedItem]);
```

**Important**: The wall meshes are currently inside a `!buildMode` conditional, but wall highlighting only matters in build mode. The build mode floor plane doesn't render interior walls. Two options:

- **Option A (recommended)**: Also render the interior wall meshes in build mode (they're currently hidden). This gives visual context and enables the highlight.
- **Option B**: Add separate, simpler highlight planes at each wall edge that only render during wall-item drag.

Go with **Option A** — render walls in build mode too (inside a `raycast={() => null}` group so they don't intercept clicks), and add the highlight material.

---

## 6. First-Time Tooltip

### Problem
The auto-snap + hidden rotate button may confuse players expecting free placement.

### Changes

**`client/src/components/UI.jsx`**

Show a one-time tooltip when a wall item is first dragged. Use `localStorage` to track if the hint has been shown:

```js
// Inside the build mode toolbar area, when dragging a wall item:
{buildMode && draggedItem !== null && roomItems[draggedItem]?.wall && map?.size?.[0] <= 30 &&
  !localStorage.getItem('wallItemHintSeen') && (
  <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-black/80 text-white text-sm px-4 py-2 rounded-lg pointer-events-none animate-pulse">
    Wall items snap to the nearest wall
  </div>
)}
```

Set `localStorage.setItem('wallItemHintSeen', '1')` when the item is placed (in `onPlaneClicked` after a successful wall item drop). Auto-dismiss after 4 seconds with a timeout as a fallback.

---

## 7. Expand Wall Item Set

### Problem
Only 3 items have `wall: true`. Several other items are visually wall-adjacent (televisions, bookcases, kitchen cabinets) but can currently be placed anywhere.

### Changes

**`server/itemCatalog.js`**

Add `wall: true` to these items that are visually wall-mounted or wall-leaning:

```js
televisionModern:    { ..., wall: true, wallHeight: 2.0 },
televisionVintage:   { ..., wall: true, wallHeight: 1.8 },
```

Add a new `wallPreferred: true` flag (soft suggestion, no enforcement) for items that look best against walls but can go anywhere:

```js
bookcaseClosedWide:  { ..., wallPreferred: true },
bookcaseOpenLow:     { ..., wallPreferred: true },
kitchenFridge:       { ..., wallPreferred: true },
kitchenFridgeLarge:  { ..., wallPreferred: true },
```

`wallPreferred` items are **not** restricted by `isValidWallPlacement`. Instead, bot auto-placement (`tryPlaceItemInRoom`) gives them a 70% chance of wall-edge placement and 30% random. No client-side snap behavior for `wallPreferred`.

Add `wallHeight` to the newly wall-flagged TVs. No `wallHeight` needed for `wallPreferred` items (they sit on the floor).

---

## 8. Wall Item Capacity Per Edge

### Problem
A player could line an entire wall with mirrors. While technically valid, it looks silly and wastes the wall for other items.

### Changes

**`server/itemCatalog.js`** — Add to `isValidWallPlacement` signature or create a new helper:

```js
export const wallEdgeCapacity = (roomSize, gridDivision) => {
  // max wall-item grid cells per edge = 40% of edge length
  const maxX = roomSize[0] * gridDivision;
  const maxY = roomSize[1] * gridDivision;
  return {
    front: Math.floor(maxX * 0.4),
    back:  Math.floor(maxX * 0.4),
    left:  Math.floor(maxY * 0.4),
    right: Math.floor(maxY * 0.4),
  };
};
```

**Server validation** (`sanitizeRoomItemsUpdate`, `placeItem`, HTTP place-item):

After wall placement + collision checks, tally how many wall-item grid cells are on each edge. If placing this item would exceed 40% of the edge, reject.

**Client** (`Room.jsx` canDrop):

Mirror the capacity check client-side for immediate red/green feedback.

**Note**: This is the lowest-priority item. Skip if scope needs trimming.

---

## Files Modified Summary

| File | Changes |
|------|---------|
| `server/itemCatalog.js` | `wallHeight` fields, rotation validation in `isValidWallPlacement`, `wallEdgeCapacity` helper, new `wall`/`wallPreferred` flags on additional items |
| `client/src/components/Item.jsx` | Per-item `wallHeight` lookup from catalog, verify drag indicator elevation |
| `client/src/components/Room.jsx` | Wall-vs-wall collision in `canDrop`, `activeWall` state + highlight, render walls in build mode |
| `client/src/components/UI.jsx` | First-time wall-snap tooltip |
| `server/socketHandlers.js` | Wall-vs-wall collision in `sanitizeRoomItemsUpdate` and `placeItem`, wall capacity check |
| `server/httpRoutes.js` | Wall-vs-wall collision and capacity check in place-item endpoint |
| `server/index.js` | `wallPreferred` handling in `tryPlaceItemInRoom` |

## Implementation Order

1. Per-item wall mount height *(quick, visual win)*
2. Wall-to-wall collision detection *(correctness fix)*
3. Server-side rotation validation *(security/robustness)*
4. Elevated drag preview verification *(may already work, just verify)*
5. Wall proximity highlight *(UX polish)*
6. First-time tooltip *(UX polish)*
7. Expand wall item set *(content)*
8. Wall item capacity per edge *(optional, skip if tight on scope)*
