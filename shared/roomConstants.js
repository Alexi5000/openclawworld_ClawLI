/**
 * Shared room layout constants used by both server and bot code.
 * Server is the source of truth; this module re-exports the canonical definitions
 * so bot-side code can derive spatial awareness without protocol changes.
 */

// Functional zones that bots will gradually fill in (generated rooms)
// Area values are proportions (0-1) relative to the room grid size,
// so they scale correctly for any room size (10x10, 15x15, 20x20, etc.)
export const ROOM_ZONES = [
  // Living area (center-left)
  {
    name: "Living Area",
    items: ["rugRounded", "loungeSofa", "tableCoffee", "televisionModern", "loungeChair", "lampRoundFloor", "plant", "speaker"],
    area: { x: [0.10, 0.45], y: [0.10, 0.40] },
    placementOrder: ["televisionModern", "loungeSofa", "tableCoffee", "loungeChair", "rugRounded", "lampRoundFloor", "speaker", "plant"],
    layout: "focal",
    walkwayMargin: 2,
    alternatives: {
      loungeSofa: {
        modern: ["loungeDesignSofa", "loungeDesignSofaCorner"],
        classic: ["loungeSofa", "loungeSofaCorner"],
        cozy: ["loungeSofaLong", "loungeSofaCorner"],
      },
      televisionModern: {
        modern: ["televisionModern"],
        classic: ["televisionVintage"],
        cozy: ["televisionAntenna"],
      },
      tableCoffee: {
        modern: ["tableCoffeeGlass", "tableCoffeeGlassSquare"],
        classic: ["tableCoffee"],
        cozy: ["tableCoffeeSquare", "tableCoffee"],
      },
      loungeChair: {
        modern: ["loungeDesignChair"],
        classic: ["loungeChair"],
        cozy: ["loungeChairRelax"],
      },
      lampRoundFloor: {
        modern: ["lampSquareFloor"],
        classic: ["lampRoundFloor"],
        cozy: ["lampRoundFloor"],
      },
      speaker: {
        modern: ["speaker"],
        classic: ["radio"],
        cozy: ["speakerSmall"],
      },
      rugRounded: {
        modern: ["rugRectangle"],
        classic: ["rugRounded"],
        cozy: ["rugRounded", "rugRound"],
      },
      plant: {
        modern: ["plantSmall1", "plantSmall2"],
        classic: ["plant"],
        cozy: ["pottedPlant", "plantSmall3"],
      },
    },
    extras: ["pillow", "pillowLong", "sideTable", "sideTableDrawers",
             "cabinetTelevision", "cabinetTelevisionDoors", "ceilingFan", "loungeSofaOttoman"],
  },
  // Kitchen (top-right)
  {
    name: "Kitchen",
    items: ["kitchenFridge", "kitchenCabinet", "kitchenStove", "kitchenSink", "kitchenBar", "kitchenMicrowave", "toaster", "kitchenBlender", "stoolBar", "stoolBar"],
    area: { x: [0.55, 0.95], y: [0.05, 0.35] },
    placementOrder: ["kitchenSink", "kitchenStove", "kitchenCabinet", "kitchenFridge", "kitchenBar", "stoolBar", "stoolBar", "kitchenMicrowave", "toaster", "kitchenBlender"],
    layout: "linear",
    walkwayMargin: 2,
    alternatives: {
      kitchenStove: {
        modern: ["kitchenStoveElectric"],
        classic: ["kitchenStove"],
        cozy: ["kitchenStove"],
      },
      kitchenFridge: {
        modern: ["kitchenFridgeBuiltIn", "kitchenFridgeLarge"],
        classic: ["kitchenFridge"],
        cozy: ["kitchenFridgeSmall", "kitchenFridge"],
      },
      kitchenCabinet: {
        modern: ["kitchenCabinetDrawer"],
        classic: ["kitchenCabinet"],
        cozy: ["kitchenCabinet", "kitchenCabinetCornerRound"],
      },
      stoolBar: {
        modern: ["stoolBarSquare"],
        classic: ["stoolBar"],
        cozy: ["stoolBar"],
      },
      kitchenBlender: {
        modern: ["kitchenCoffeeMachine"],
        classic: ["kitchenBlender"],
        cozy: ["kitchenBlender", "toaster"],
      },
    },
    extras: ["kitchenCabinetUpper", "kitchenCabinetUpperDouble", "kitchenCabinetUpperLow",
             "kitchenCabinetUpperCorner", "kitchenBarEnd", "hoodLarge", "hoodModern", "kitchenCabinetCornerInner"],
  },
  // Bedroom (bottom-left)
  {
    name: "Bedroom",
    items: ["bedDouble", "cabinetBedDrawer", "cabinetBedDrawerTable", "lampSquareTable", "bookcaseClosedWide", "rugRound", "plantSmall", "coatRackStanding"],
    area: { x: [0.05, 0.40], y: [0.55, 0.95] },
    placementOrder: ["bedDouble", "cabinetBedDrawer", "cabinetBedDrawerTable", "lampSquareTable", "rugRound", "bookcaseClosedWide", "plantSmall", "coatRackStanding"],
    layout: "anchored",
    walkwayMargin: 2,
    alternatives: {
      bedDouble: {
        modern: ["bedDouble"],
        classic: ["bedDouble"],
        cozy: ["bedBunk", "bedSingle"],
      },
      cabinetBedDrawer: {
        modern: ["cabinetBed"],
        classic: ["cabinetBedDrawer"],
        cozy: ["cabinetBedDrawer"],
      },
      bookcaseClosedWide: {
        modern: ["bookcaseClosedDoors"],
        classic: ["bookcaseClosedWide"],
        cozy: ["bookcaseOpen", "bookcaseClosed"],
      },
      plantSmall: {
        modern: ["plantSmall1", "plantSmall2"],
        classic: ["plantSmall"],
        cozy: ["pottedPlant", "plantSmall3"],
      },
      coatRackStanding: {
        modern: ["coatRack"],
        classic: ["coatRackStanding"],
        cozy: ["coatRackStanding"],
      },
    },
    extras: ["pillow", "pillowLong", "cardboardBoxClosed", "cardboardBoxOpen",
             "books", "rugDoormat", "bear"],
  },
  // Bathroom (bottom-right)
  {
    name: "Bathroom",
    items: ["bathtub", "toiletSquare", "bathroomSink", "bathroomCabinetDrawer", "trashcan", "bathroomMirror"],
    area: { x: [0.60, 0.95], y: [0.60, 0.95] },
    placementOrder: ["bathtub", "bathroomSink", "bathroomMirror", "toiletSquare", "bathroomCabinetDrawer", "trashcan"],
    layout: "linear",
    walkwayMargin: 1,
    alternatives: {
      bathtub: {
        modern: ["showerRound"],
        classic: ["bathtub"],
        cozy: ["shower", "bathtub"],
      },
      toiletSquare: {
        modern: ["toiletSquare"],
        classic: ["toilet"],
        cozy: ["toilet"],
      },
      bathroomSink: {
        modern: ["bathroomSinkSquare"],
        classic: ["bathroomSink"],
        cozy: ["bathroomSink"],
      },
      bathroomCabinetDrawer: {
        modern: ["bathroomCabinet"],
        classic: ["bathroomCabinetDrawer"],
        cozy: ["bathroomCabinetDrawer"],
      },
    },
    extras: ["washer", "dryer", "washerDryerStacked"],
  },
  // Office/desk area (top-left)
  {
    name: "Office",
    items: ["desk", "chairModernCushion", "laptop", "bookcaseOpenLow", "lampSquareFloor", "plantSmall"],
    area: { x: [0.05, 0.35], y: [0.05, 0.30] },
    placementOrder: ["desk", "chairModernCushion", "laptop", "bookcaseOpenLow", "lampSquareFloor", "plantSmall"],
    layout: "anchored",
    walkwayMargin: 2,
    alternatives: {
      desk: {
        modern: ["deskCorner", "deskComputer"],
        classic: ["desk"],
        cozy: ["desk"],
      },
      chairModernCushion: {
        modern: ["chairDesk"],
        classic: ["chairModernCushion"],
        cozy: ["chairModernFrameCushion", "chairCushion"],
      },
      laptop: {
        modern: ["computerScreen", "computerKeyboard"],
        classic: ["laptop"],
        cozy: ["laptop"],
      },
      bookcaseOpenLow: {
        modern: ["bookcaseClosedDoors"],
        classic: ["bookcaseOpenLow"],
        cozy: ["bookcaseOpen", "bookcaseClosed"],
      },
      lampSquareFloor: {
        modern: ["lampSquareFloor"],
        classic: ["lampRoundFloor"],
        cozy: ["lampRoundFloor"],
      },
      plantSmall: {
        modern: ["plantSmall2"],
        classic: ["plantSmall"],
        cozy: ["pottedPlant", "plantSmall3"],
      },
    },
    extras: ["computerMouse", "books", "lampWall", "lampSquareCeiling"],
  },
  // Dining area (center)
  {
    name: "Dining",
    items: ["tableCrossCloth", "chair", "chair", "chair", "chair", "lampRoundTable", "rugSquare"],
    area: { x: [0.35, 0.65], y: [0.35, 0.60] },
    placementOrder: ["tableCrossCloth", "rugSquare", "chair", "chair", "chair", "chair", "lampRoundTable"],
    layout: "focal",
    walkwayMargin: 2,
    alternatives: {
      tableCrossCloth: {
        modern: ["tableGlass", "tableRound"],
        classic: ["tableCrossCloth", "tableCross"],
        cozy: ["tableCloth", "table"],
      },
      chair: {
        modern: ["chairModernCushion", "chairModernFrameCushion"],
        classic: ["chair", "chairCushion"],
        cozy: ["chairRounded", "chairCushion"],
      },
      rugSquare: {
        modern: ["rugRectangle"],
        classic: ["rugSquare"],
        cozy: ["rugRounded", "rugRound"],
      },
      lampRoundTable: {
        modern: ["lampSquareCeiling"],
        classic: ["lampRoundTable"],
        cozy: ["lampRoundTable"],
      },
    },
    extras: ["bench", "benchCushion", "benchCushionLow"],
  },
];

// --- Room style system ---

export const ROOM_STYLES = ["modern", "classic", "cozy"];

export const resolveSlotItem = (zone, slotName, style) => {
  const alts = zone.alternatives?.[slotName];
  if (!alts) return slotName;
  const pool = alts[style];
  if (!pool || pool.length === 0) return slotName;
  return pool[Math.floor(Math.random() * pool.length)];
};

// Scale a zone's proportional area to actual grid coordinates for a given room
export const scaleZoneArea = (zoneArea, room) => {
  const gw = room.size[0] * (room.gridDivision || 2);
  const gh = room.size[1] * (room.gridDivision || 2);
  return {
    x: [Math.floor(zoneArea.x[0] * gw), Math.floor(zoneArea.x[1] * gw)],
    y: [Math.floor(zoneArea.y[0] * gh), Math.floor(zoneArea.y[1] * gh)],
  };
};

// Building footprints for large plaza rooms (world coordinates: [x, z, width, depth])
export const getBuildingFootprints = (sz) => [
  { x: sz[0] / 2 - 6, z: 3, w: 12, d: 10 },          // TownHall (center-north)
  { x: 3, z: sz[1] / 2 - 5, w: 8, d: 10 },            // Apartment (west)
  { x: sz[0] - 11, z: sz[1] / 2 - 5, w: 8, d: 10 },   // ShopBuilding (east)
  { x: 7, z: 7, w: 8, d: 8 },                         // SmallBuilding (NW) — shifted to clear NW skyscraper
  { x: sz[0] - 22, z: 12, w: 8, d: 8 },                // SmallBuilding (NE) — shifted to clear NE skyscraper
  { x: sz[0] / 2 + 11, z: 3, w: 6, d: 6 },            // Skyscraper (beside TownHall, east side)
  { x: 3, z: 3, w: 5, d: 5 },                         // Skyscraper (NW corner)
  { x: sz[0] - 8, z: 3, w: 5, d: 5 },                 // Skyscraper (NE corner)
  { x: 3, z: sz[1] - 8, w: 5, d: 5 },                 // Skyscraper (SW corner)
  { x: sz[0] - 8, z: sz[1] - 8, w: 5, d: 5 },        // Skyscraper (SE corner)
];

// Semantic names for plaza building footprints (same order as getBuildingFootprints)
export const PLAZA_LANDMARKS = [
  "Town Hall",
  "Apartment",
  "Shop",
  "Small Building (NW)",
  "Small Building (NE)",
  "Skyscraper (center-north)",
  "Skyscraper (NW corner)",
  "Skyscraper (NE corner)",
  "Skyscraper (SW corner)",
  "Skyscraper (SE corner)",
];

// Entrance zone for plaza rooms
export const ENTRANCE_ZONE = { x: [46, 52], y: [46, 52] };

// Zone action hints for bot behavior
export const ZONE_ACTIONS = {
  "Living Area": "relax, watch TV, chat with others",
  "Kitchen": "cook, store food, make drinks",
  "Bedroom": "rest, organize belongings, read",
  "Bathroom": "freshen up, tidy up",
  "Office": "work, browse laptop, read books",
  "Dining": "eat, have conversations, socialize",
};

// --- Sims-style needs/motive system ---

export const OBJECT_AFFORDANCES = {
  // --- Beds ---
  bedDouble:        { satisfies: { energy: 50 }, duration: 8000, interruptible: true },
  bedSingle:        { satisfies: { energy: 40 }, duration: 7000, interruptible: true },
  bedBunk:          { satisfies: { energy: 45 }, duration: 7500, interruptible: true },

  // --- Sofas ---
  loungeSofa:       { satisfies: { energy: 20, fun: 10 }, duration: 5000, interruptible: true },
  loungeChairRelax: { satisfies: { energy: 18, fun: 8 }, duration: 4500, interruptible: true },
  loungeDesignChair:{ satisfies: { energy: 15, fun: 8 }, duration: 4000, interruptible: true },
  loungeSofaCorner: { satisfies: { energy: 20, fun: 10 }, duration: 5000, interruptible: true },
  loungeSofaLong:   { satisfies: { energy: 20, fun: 10 }, duration: 5000, interruptible: true },
  loungeDesignSofa: { satisfies: { energy: 20, fun: 10 }, duration: 5000, interruptible: true },
  loungeDesignSofaCorner: { satisfies: { energy: 20, fun: 10 }, duration: 5000, interruptible: true },
  loungeSofaOttoman:{ satisfies: { energy: 12, fun: 5 }, duration: 4000, interruptible: true },

  // --- Benches ---
  bench:            { satisfies: { energy: 8, social: 10 }, duration: 3000, interruptible: true },
  benchCushion:     { satisfies: { energy: 10, social: 10 }, duration: 3000, interruptible: true },
  benchCushionLow:  { satisfies: { energy: 8, social: 10 }, duration: 3000, interruptible: true },

  // --- Chairs ---
  loungeChair:      { satisfies: { energy: 15 }, duration: 4000, interruptible: true },
  chair:            { satisfies: { energy: 10, social: 8 }, duration: 3000, interruptible: true },
  chairCushion:     { satisfies: { energy: 12, social: 8 }, duration: 3000, interruptible: true },
  chairRounded:     { satisfies: { energy: 10, social: 8 }, duration: 3000, interruptible: true },
  chairModernCushion:       { satisfies: { energy: 12, social: 8 }, duration: 3000, interruptible: true },
  chairModernFrameCushion:  { satisfies: { energy: 12, social: 8 }, duration: 3000, interruptible: true },
  chairDesk:        { satisfies: { energy: 10 }, duration: 3000, interruptible: true },
  stoolBar:         { satisfies: { energy: 5, social: 10 }, duration: 3000, interruptible: true },
  stoolBarSquare:   { satisfies: { energy: 5, social: 10 }, duration: 3000, interruptible: true },

  // --- Kitchen ---
  kitchenStove:     { satisfies: { hunger: 40, energy: 15 }, duration: 6000, interruptible: false },
  kitchenStoveElectric: { satisfies: { hunger: 40, energy: 15 }, duration: 6000, interruptible: false },
  kitchenFridge:    { satisfies: { hunger: 20, energy: 8 }, duration: 3000, interruptible: true },
  kitchenCoffeeMachine: { satisfies: { energy: 20, hunger: 10 }, duration: 3000, interruptible: true },
  kitchenMicrowave: { satisfies: { hunger: 25 }, duration: 3000, interruptible: false },
  kitchenBlender:   { satisfies: { hunger: 15 }, duration: 2000, interruptible: true },
  toaster:          { satisfies: { hunger: 15 }, duration: 2000, interruptible: true },
  kitchenSink:      { satisfies: { hunger: 5 }, duration: 2000, interruptible: true },

  // --- Bathroom ---
  bathtub:          { satisfies: { fun: 15, energy: 10 }, duration: 5000, interruptible: true },
  toilet:           { satisfies: { energy: 5 }, duration: 2000, interruptible: false },
  toiletSquare:     { satisfies: { energy: 5 }, duration: 2000, interruptible: false },
  shower:           { satisfies: { energy: 12, fun: 8 }, duration: 4000, interruptible: true },
  showerRound:      { satisfies: { energy: 12, fun: 8 }, duration: 4000, interruptible: true },
  bathroomSink:     { satisfies: { energy: 3 }, duration: 1500, interruptible: true },
  bathroomSinkSquare: { satisfies: { energy: 3 }, duration: 1500, interruptible: true },

  // --- Tables (social) ---
  tableCrossCloth:  { satisfies: { social: 15 }, duration: 4000, interruptible: true },
  table:            { satisfies: { social: 15 }, duration: 4000, interruptible: true },
  tableCross:       { satisfies: { social: 15 }, duration: 4000, interruptible: true },
  tableCloth:       { satisfies: { social: 15 }, duration: 4000, interruptible: true },
  tableRound:       { satisfies: { social: 15 }, duration: 4000, interruptible: true },
  tableGlass:       { satisfies: { social: 15 }, duration: 4000, interruptible: true },

  // --- Office / Entertainment ---
  desk:             { satisfies: { fun: 10 }, duration: 5000, interruptible: true },
  deskComputer:     { satisfies: { fun: 20 }, duration: 5000, interruptible: true },
  deskCorner:       { satisfies: { fun: 15 }, duration: 5000, interruptible: true },
  laptop:           { satisfies: { fun: 25 }, duration: 5000, interruptible: true },
  computerScreen:   { satisfies: { fun: 20 }, duration: 5000, interruptible: true },
  televisionModern: { satisfies: { fun: 35 }, duration: 6000, interruptible: true },
  televisionVintage:{ satisfies: { fun: 30 }, duration: 6000, interruptible: true },
  televisionAntenna:{ satisfies: { fun: 25 }, duration: 6000, interruptible: true },
  speaker:          { satisfies: { fun: 20 }, duration: 4000, interruptible: true },
  speakerSmall:     { satisfies: { fun: 15 }, duration: 4000, interruptible: true },
  radio:            { satisfies: { fun: 18 }, duration: 4000, interruptible: true },

  // --- Special ---
  eatSpot:          { satisfies: { hunger: 30, energy: 10 }, duration: 5000, interruptible: true },
};

// Decay per second — tuned so energy drains from 100→0 in ~15 minutes
export const DECAY_RATES = { energy: 0.11, social: 0.09, fun: 0.09, hunger: 0.06 };

export const MOTIVE_CLAMP = { min: 0, max: 100 };

export const TRAITS = {
  lazy:     { decayMod: { energy: 1.5 }, preferences: { bedDouble: 5, bedSingle: 5, loungeSofa: 4, televisionModern: 3 } },
  social:   { decayMod: { social: 1.4 }, preferences: { tableCrossCloth: 5 } },
  creative: { decayMod: { fun: 1.3 }, preferences: { desk: 4, speaker: 3 } },
  glutton:  { decayMod: { hunger: 1.5 }, preferences: { kitchenStove: 5, kitchenFridge: 4 } },
};

// --- Smart Placement Constants ---

export const ITEM_ROLES = {
  seating: "Items people sit on (sofas, chairs, stools)",
  surface: "Flat surfaces for placing objects (tables, desks, bars)",
  storage: "Storage furniture (cabinets, drawers, bookcases)",
  appliance: "Functional appliances (fridge, stove, washer)",
  decor: "Decorative items (plants, coat racks, bears)",
  lighting: "Light sources (lamps)",
  rug: "Floor coverings (rugs)",
  entertainment: "Entertainment items (TV, laptop, radio, speakers)",
  bed: "Sleeping furniture (beds)",
  hygiene: "Bathroom fixtures (sink, toilet, bathtub, shower)",
};

export const PLACEMENT_RELATIONS = {
  facing: "Item should face toward the target (e.g. sofa faces TV)",
  beside: "Item should be directly adjacent to the target (axis-aligned)",
  nearby: "Item should be within a comfortable distance of the target",
};
