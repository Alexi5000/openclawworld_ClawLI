// Item catalog: furniture definitions, avatar URLs, and emote list
// Extracted from index.js — pure constants, zero dependencies

export const ALLOWED_EMOTES = ["dance", "wave", "sit", "nod", "highfive", "hug", "happy", "laugh", "love", "sad", "think", "clap", "thumbsup"];

export const AVATAR_URLS = [
  "https://models.readyplayer.me/64f0265b1db75f90dcfd9e2c.glb",
  "https://models.readyplayer.me/663833cf6c79010563b91e1b.glb",
  "https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb",
  "https://models.readyplayer.me/64a3f54c1d64e9f3dbc832ac.glb",
  "/models/sillyNubCat.glb",
];
export const randomAvatarUrl = () => AVATAR_URLS[Math.floor(Math.random() * AVATAR_URLS.length)];
export const DEFAULT_AVATAR_URL = AVATAR_URLS[0];
export const sanitizeAvatarUrl = (url) => (url && AVATAR_URLS.includes(url.split("?")[0])) ? url : DEFAULT_AVATAR_URL;

export const items = {
  // --- Bathroom ---
  washer: { name: "washer", size: [2, 2], role: "appliance", alignment: "wall",
    affinities: [{ target: "dryer", relation: "beside", distance: { min: 0, max: 2 }, priority: 8 }] },
  toiletSquare: { name: "toiletSquare", size: [2, 2], role: "hygiene", alignment: "wall",
    affinities: [{ target: "bathroomSink", relation: "nearby", distance: { min: 2, max: 5 }, priority: 6 }] },
  trashcan: { name: "trashcan", size: [1, 1], role: "decor" },
  bathroomCabinetDrawer: { name: "bathroomCabinetDrawer", size: [2, 2], role: "storage", alignment: "wall",
    affinities: [{ target: "bathroomSink", relation: "beside", distance: { min: 0, max: 2 }, priority: 7 }] },
  bathtub: { name: "bathtub", size: [4, 2], role: "hygiene", anchor: true, alignment: "wall",
    affinities: [{ target: "bathroomSink", relation: "nearby", distance: { min: 2, max: 6 }, priority: 5 }] },
  bathroomMirror: { name: "bathroomMirror", size: [2, 1], wall: true, wallHeight: 0.8, role: "decor",
    affinities: [{ target: "bathroomSink", relation: "facing", distance: { min: 0, max: 2 }, priority: 10 }] },
  bathroomCabinet: { name: "bathroomCabinet", size: [2, 1], wall: true, wallHeight: 0.7, role: "storage",
    affinities: [{ target: "bathroomSink", relation: "beside", distance: { min: 0, max: 3 }, priority: 7 }] },
  bathroomSink: { name: "bathroomSink", size: [2, 2], wall: true, wallHeight: 0.7, role: "hygiene", anchor: true, alignment: "wall",
    affinities: [{ target: "bathroomMirror", relation: "facing", distance: { min: 0, max: 2 }, priority: 10 }] },
  showerRound: { name: "showerRound", size: [2, 2], role: "hygiene", alignment: "wall" },
  shower: { name: "shower", size: [2, 2], scale: 1.75, role: "hygiene", alignment: "wall" },
  bathroomSinkSquare: { name: "bathroomSinkSquare", size: [2, 2], scale: 2.33, wall: true, wallHeight: 0.7, role: "hygiene", alignment: "wall",
    affinities: [{ target: "bathroomMirror", relation: "facing", distance: { min: 0, max: 2 }, priority: 10 }] },
  toilet: { name: "toilet", size: [3, 2], scale: 2.1, role: "hygiene", alignment: "wall",
    affinities: [{ target: "bathroomSink", relation: "nearby", distance: { min: 2, max: 5 }, priority: 6 }] },
  washerDryerStacked: { name: "washerDryerStacked", size: [2, 2], scale: 2.08, role: "appliance", alignment: "wall" },

  // --- Living ---
  tableCoffee: { name: "tableCoffee", size: [4, 2], role: "surface",
    affinities: [
      { targetRole: "seating", relation: "beside", distance: { min: 1, max: 3 }, priority: 9 },
    ] },
  loungeSofaCorner: { name: "loungeSofaCorner", size: [5, 5], rotation: 2, sittable: { seats: 3, seatHeight: 0.18, seatInset: 1 },
    role: "seating", anchor: true, alignment: "wall", facingDirection: 2,
    affinities: [
      { targetRole: "entertainment", relation: "facing", distance: { min: 4, max: 10 }, priority: 10 },
      { target: "tableCoffee", relation: "beside", distance: { min: 1, max: 3 }, priority: 8 },
    ] },
  bear: { name: "bear", size: [2, 1], wall: true, wallHeight: 0.8, role: "decor" },
  loungeSofaOttoman: { name: "loungeSofaOttoman", size: [2, 2], sittable: { seats: 1, seatHeight: 0.2 },
    role: "seating",
    affinities: [{ targetRole: "seating", relation: "beside", distance: { min: 1, max: 3 }, priority: 6 }] },
  loungeSofaLong: { name: "loungeSofaLong", size: [5, 4], scale: 2.17, sittable: { seats: 3, seatHeight: 0.18, seatOffsets: [1, 3, 5], facingOffset: 0 },
    role: "seating", anchor: true, alignment: "wall",
    affinities: [
      { targetRole: "entertainment", relation: "facing", distance: { min: 4, max: 10 }, priority: 10 },
      { target: "tableCoffee", relation: "beside", distance: { min: 1, max: 3 }, priority: 8 },
    ] },
  loungeChairRelax: { name: "loungeChairRelax", size: [2, 2], scale: 1.48, sittable: { seats: 1, seatHeight: 0.2, facingOffset: 0 },
    role: "seating",
    affinities: [
      { targetRole: "entertainment", relation: "facing", distance: { min: 3, max: 8 }, priority: 8 },
      { target: "tableCoffee", relation: "beside", distance: { min: 1, max: 3 }, priority: 6 },
    ] },
  loungeDesignChair: { name: "loungeDesignChair", size: [4, 2], scale: 2.25, sittable: { seats: 1, seatHeight: 0.25, facingOffset: 0 },
    role: "seating",
    affinities: [
      { targetRole: "entertainment", relation: "facing", distance: { min: 3, max: 8 }, priority: 8 },
      { target: "tableCoffee", relation: "beside", distance: { min: 1, max: 3 }, priority: 6 },
    ] },
  pillow: { name: "pillow", size: [1, 1], scale: 2.17, walkable: true, role: "decor" },
  pillowLong: { name: "pillowLong", size: [2, 1], scale: 2.59, walkable: true, role: "decor" },
  tableCoffeeGlassSquare: { name: "tableCoffeeGlassSquare", size: [2, 2], role: "surface",
    affinities: [{ targetRole: "seating", relation: "beside", distance: { min: 1, max: 3 }, priority: 9 }] },
  tableCoffeeGlass: { name: "tableCoffeeGlass", size: [4, 2], scale: 2.5, role: "surface",
    affinities: [{ targetRole: "seating", relation: "beside", distance: { min: 1, max: 3 }, priority: 9 }] },
  tableCoffeeSquare: { name: "tableCoffeeSquare", size: [3, 2], scale: 2.5, role: "surface",
    affinities: [{ targetRole: "seating", relation: "beside", distance: { min: 1, max: 3 }, priority: 9 }] },
  sideTable: { name: "sideTable", size: [2, 1], scale: 1.3, role: "surface",
    affinities: [{ targetRole: "seating", relation: "beside", distance: { min: 0, max: 2 }, priority: 7 }] },
  sideTableDrawers: { name: "sideTableDrawers", size: [2, 2], scale: 1.3, role: "surface",
    affinities: [{ targetRole: "seating", relation: "beside", distance: { min: 0, max: 2 }, priority: 7 }] },
  cabinetTelevision: { name: "cabinetTelevision", size: [4, 1], scale: 1.88, role: "storage", alignment: "wall",
    affinities: [{ targetRole: "entertainment", relation: "beside", distance: { min: 0, max: 1 }, priority: 10 }] },
  cabinetTelevisionDoors: { name: "cabinetTelevisionDoors", size: [5, 2], scale: 1.87, role: "storage", alignment: "wall",
    affinities: [{ targetRole: "entertainment", relation: "beside", distance: { min: 0, max: 1 }, priority: 10 }] },
  loungeDesignSofaCorner: { name: "loungeDesignSofaCorner", size: [5, 5], rotation: 2, sittable: { seats: 3, seatHeight: 0.18, seatInset: 1 },
    role: "seating", anchor: true, alignment: "wall", facingDirection: 2,
    affinities: [
      { targetRole: "entertainment", relation: "facing", distance: { min: 4, max: 10 }, priority: 10 },
      { target: "tableCoffee", relation: "beside", distance: { min: 1, max: 3 }, priority: 8 },
    ] },
  loungeDesignSofa: { name: "loungeDesignSofa", size: [5, 2], rotation: 2, sittable: { seats: 2, seatHeight: 0.18, seatOffsets: [1, 3] },
    role: "seating", anchor: true, alignment: "wall", facingDirection: 2,
    affinities: [
      { targetRole: "entertainment", relation: "facing", distance: { min: 4, max: 10 }, priority: 10 },
      { target: "tableCoffee", relation: "beside", distance: { min: 1, max: 3 }, priority: 8 },
      { target: "lampRoundFloor", relation: "beside", distance: { min: 0, max: 2 }, priority: 5 },
    ] },
  loungeSofa: { name: "loungeSofa", size: [5, 2], rotation: 2, sittable: { seats: 2, seatHeight: 0.18, seatOffsets: [1, 3] },
    role: "seating", anchor: true, alignment: "wall", facingDirection: 2,
    affinities: [
      { targetRole: "entertainment", relation: "facing", distance: { min: 4, max: 10 }, priority: 10 },
      { target: "tableCoffee", relation: "beside", distance: { min: 1, max: 3 }, priority: 8 },
      { target: "lampRoundFloor", relation: "beside", distance: { min: 0, max: 2 }, priority: 5 },
    ] },

  // --- Storage / Shelving ---
  bookcaseOpenLow: { name: "bookcaseOpenLow", size: [2, 1], wallPreferred: true, role: "storage", alignment: "wall" },
  bookcaseClosedWide: { name: "bookcaseClosedWide", size: [3, 1], rotation: 2, wallPreferred: true, role: "storage", alignment: "wall" },
  bookcaseOpen: { name: "bookcaseOpen", size: [2, 1], scale: 2, wallPreferred: true, role: "storage", alignment: "wall" },
  bookcaseClosed: { name: "bookcaseClosed", size: [2, 1], scale: 2, wallPreferred: true, role: "storage", alignment: "wall" },
  bookcaseClosedDoors: { name: "bookcaseClosedDoors", size: [3, 1], scale: 1.79, wallPreferred: true, role: "storage", alignment: "wall" },
  books: { name: "books", size: [1, 1], scale: 3.32, walkable: true, role: "decor" },
  cardboardBoxClosed: { name: "cardboardBoxClosed", size: [1, 1], role: "storage" },
  cardboardBoxOpen: { name: "cardboardBoxOpen", size: [1, 1], scale: 1.34, role: "storage" },

  // --- Bedroom ---
  bedBunk: { name: "bedBunk", size: [4, 4], rotation: 2, role: "bed", anchor: true, alignment: "wall",
    affinities: [
      { target: "cabinetBedDrawer", relation: "beside", distance: { min: 0, max: 1 }, priority: 9 },
      { target: "lampSquareTable", relation: "beside", distance: { min: 0, max: 2 }, priority: 7 },
    ] },
  bedSingle: { name: "bedSingle", size: [3, 6], rotation: 2, role: "bed", anchor: true, alignment: "wall",
    affinities: [
      { target: "cabinetBedDrawer", relation: "beside", distance: { min: 0, max: 1 }, priority: 9 },
      { target: "lampSquareTable", relation: "beside", distance: { min: 0, max: 2 }, priority: 7 },
    ] },
  bench: { name: "bench", size: [2, 1], rotation: 2, sittable: { seats: 2, seatHeight: 0.25 }, role: "seating" },
  bedDouble: { name: "bedDouble", size: [5, 5], rotation: 2, role: "bed", anchor: true, alignment: "wall",
    affinities: [
      { target: "cabinetBedDrawer", relation: "beside", distance: { min: 0, max: 1 }, priority: 9 },
      { target: "cabinetBedDrawerTable", relation: "beside", distance: { min: 0, max: 1 }, priority: 9 },
      { target: "lampSquareTable", relation: "beside", distance: { min: 0, max: 2 }, priority: 7 },
    ] },
  benchCushion: { name: "benchCushion", size: [2, 1], scale: 2.5, sittable: { seats: 2, seatHeight: 0.25, facingOffset: 0 }, role: "seating" },
  benchCushionLow: { name: "benchCushionLow", size: [2, 1], sittable: { seats: 2, seatHeight: 0.2 }, role: "seating" },
  loungeChair: { name: "loungeChair", size: [2, 2], rotation: 2, sittable: { seats: 1, seatHeight: 0.25 },
    role: "seating", facingDirection: 2,
    affinities: [
      { targetRole: "entertainment", relation: "facing", distance: { min: 3, max: 8 }, priority: 8 },
      { target: "tableCoffee", relation: "beside", distance: { min: 1, max: 3 }, priority: 6 },
    ] },
  cabinetBed: { name: "cabinetBed", size: [2, 1], scale: 1.88, rotation: 2, role: "storage",
    affinities: [{ targetRole: "bed", relation: "beside", distance: { min: 0, max: 1 }, priority: 10 }] },
  cabinetBedDrawer: { name: "cabinetBedDrawer", size: [1, 1], rotation: 2, role: "storage",
    affinities: [{ targetRole: "bed", relation: "beside", distance: { min: 0, max: 1 }, priority: 10 }] },
  cabinetBedDrawerTable: { name: "cabinetBedDrawerTable", size: [1, 1], rotation: 2, role: "storage",
    affinities: [{ targetRole: "bed", relation: "beside", distance: { min: 0, max: 1 }, priority: 10 }] },

  // --- Dining ---
  table: { name: "table", size: [4, 2], role: "surface", anchor: true, alignment: "center",
    affinities: [{ targetRole: "seating", relation: "beside", distance: { min: 0, max: 2 }, priority: 8 }] },
  tableCrossCloth: { name: "tableCrossCloth", size: [4, 2], role: "surface", anchor: true, alignment: "center",
    affinities: [{ targetRole: "seating", relation: "beside", distance: { min: 0, max: 2 }, priority: 8 }] },
  tableCross: { name: "tableCross", size: [4, 3], scale: 2.24, role: "surface", anchor: true, alignment: "center",
    affinities: [{ targetRole: "seating", relation: "beside", distance: { min: 0, max: 2 }, priority: 8 }] },
  tableCloth: { name: "tableCloth", size: [4, 3], scale: 2.24, role: "surface", anchor: true, alignment: "center",
    affinities: [{ targetRole: "seating", relation: "beside", distance: { min: 0, max: 2 }, priority: 8 }] },
  tableRound: { name: "tableRound", size: [3, 4], scale: 1.88, role: "surface", anchor: true, alignment: "center",
    affinities: [{ targetRole: "seating", relation: "beside", distance: { min: 0, max: 2 }, priority: 8 }] },
  tableGlass: { name: "tableGlass", size: [4, 3], scale: 2.24, role: "surface", anchor: true, alignment: "center",
    affinities: [{ targetRole: "seating", relation: "beside", distance: { min: 0, max: 2 }, priority: 8 }] },

  // --- Decor ---
  plant: { name: "plant", size: [1, 1], role: "decor" },
  plantSmall: { name: "plantSmall", size: [1, 1], role: "decor" },
  plantSmall1: { name: "plantSmall1", size: [1, 1], scale: 2.64, role: "decor" },
  plantSmall2: { name: "plantSmall2", size: [1, 1], scale: 2.64, role: "decor" },
  plantSmall3: { name: "plantSmall3", size: [1, 1], scale: 2.64, role: "decor" },
  pottedPlant: { name: "pottedPlant", size: [2, 2], role: "decor" },

  coatRack: { name: "coatRack", size: [2, 1], scale: 1.15, role: "decor", alignment: "wall" },

  // --- Rugs ---
  rugRounded: { name: "rugRounded", size: [6, 4], walkable: true, role: "rug",
    affinities: [{ targetRole: "seating", relation: "nearby", distance: { min: 0, max: 3 }, priority: 7 }] },
  rugRound: { name: "rugRound", size: [4, 4], walkable: true, role: "rug",
    affinities: [{ targetRole: "bed", relation: "beside", distance: { min: 0, max: 2 }, priority: 6 }] },
  rugSquare: { name: "rugSquare", size: [4, 4], walkable: true, role: "rug",
    affinities: [{ targetRole: "surface", relation: "nearby", distance: { min: 0, max: 2 }, priority: 6 }] },
  rugRectangle: { name: "rugRectangle", size: [8, 4], walkable: true, role: "rug",
    affinities: [{ targetRole: "seating", relation: "nearby", distance: { min: 0, max: 3 }, priority: 7 }] },
  rugDoormat: { name: "rugDoormat", size: [2, 1], scale: 2.11, walkable: true, role: "rug" },

  // --- Entertainment ---
  televisionVintage: { name: "televisionVintage", size: [4, 2], wall: true, wallHeight: 0.9,
    role: "entertainment", anchor: true },
  televisionModern: { name: "televisionModern", size: [4, 2], wall: true, wallHeight: 0.9,
    role: "entertainment", anchor: true },
  televisionAntenna: { name: "televisionAntenna", size: [2, 1], scale: 3.78, role: "entertainment", wallPreferred: true,
    affinities: [{ target: "cabinetTelevision", relation: "beside", distance: { min: 0, max: 1 }, priority: 9 }] },

  // --- Kitchen ---
  kitchenFridge: { name: "kitchenFridge", size: [2, 1], rotation: 2, wallPreferred: true,
    role: "appliance", alignment: "wall",
    affinities: [
      { target: "kitchenStove", relation: "nearby", distance: { min: 2, max: 6 }, priority: 7 },
      { target: "kitchenCabinet", relation: "beside", distance: { min: 0, max: 3 }, priority: 6 },
    ] },
  kitchenFridgeLarge: { name: "kitchenFridgeLarge", size: [3, 2], wallPreferred: true,
    role: "appliance", alignment: "wall",
    affinities: [
      { target: "kitchenStove", relation: "nearby", distance: { min: 2, max: 6 }, priority: 7 },
      { target: "kitchenCabinet", relation: "beside", distance: { min: 0, max: 3 }, priority: 6 },
    ] },
  kitchenFridgeSmall: { name: "kitchenFridgeSmall", size: [1, 1], scale: 1.16, wallPreferred: true, role: "appliance", alignment: "wall",
    affinities: [{ target: "kitchenCabinet", relation: "beside", distance: { min: 0, max: 3 }, priority: 6 }] },
  kitchenFridgeBuiltIn: { name: "kitchenFridgeBuiltIn", size: [2, 3], scale: 2.1, wallPreferred: true, role: "appliance", alignment: "wall",
    affinities: [{ target: "kitchenCabinet", relation: "beside", distance: { min: 0, max: 2 }, priority: 7 }] },
  kitchenBar: { name: "kitchenBar", size: [2, 1], role: "surface",
    affinities: [{ target: "stoolBar", relation: "beside", distance: { min: 0, max: 2 }, priority: 8 }] },
  kitchenCabinetCornerRound: { name: "kitchenCabinetCornerRound", size: [2, 2], role: "storage", alignment: "wall" },
  kitchenCabinetCornerInner: { name: "kitchenCabinetCornerInner", size: [2, 2], role: "storage", alignment: "wall" },
  kitchenCabinetDrawer: { name: "kitchenCabinetDrawer", size: [2, 2], scale: 2.08, role: "storage", alignment: "wall",
    affinities: [{ target: "kitchenStove", relation: "beside", distance: { min: 0, max: 3 }, priority: 7 }] },
  kitchenCabinetUpper: { name: "kitchenCabinetUpper", size: [2, 1], scale: 2.17, wall: true, wallHeight: 0.8, role: "storage",
    affinities: [{ target: "kitchenCabinet", relation: "facing", distance: { min: 0, max: 1 }, priority: 9 }] },
  kitchenCabinetUpperCorner: { name: "kitchenCabinetUpperCorner", size: [2, 1], scale: 2.38, wall: true, wallHeight: 0.8, role: "storage" },
  kitchenCabinetUpperDouble: { name: "kitchenCabinetUpperDouble", size: [3, 1], scale: 2.17, wall: true, wallHeight: 0.8, role: "storage",
    affinities: [{ target: "kitchenCabinet", relation: "facing", distance: { min: 0, max: 1 }, priority: 9 }] },
  kitchenCabinetUpperLow: { name: "kitchenCabinetUpperLow", size: [2, 1], scale: 2.17, wall: true, wallHeight: 0.8, role: "storage" },
  kitchenBarEnd: { name: "kitchenBarEnd", size: [1, 1], scale: 2.38, role: "surface",
    affinities: [{ target: "kitchenBar", relation: "beside", distance: { min: 0, max: 1 }, priority: 9 }] },
  kitchenCoffeeMachine: { name: "kitchenCoffeeMachine", size: [1, 2], scale: 1.92, role: "appliance",
    affinities: [{ targetRole: "surface", relation: "beside", distance: { min: 0, max: 2 }, priority: 5 }] },
  kitchenStoveElectric: { name: "kitchenStoveElectric", size: [2, 2], scale: 2.22, role: "appliance", anchor: true, alignment: "wall",
    affinities: [
      { target: "kitchenSink", relation: "beside", distance: { min: 0, max: 3 }, priority: 9 },
      { target: "kitchenCabinet", relation: "beside", distance: { min: 0, max: 3 }, priority: 8 },
    ] },
  hoodLarge: { name: "hoodLarge", size: [2, 1], scale: 1.76, wall: true, wallHeight: 1.1, role: "appliance",
    affinities: [{ target: "kitchenStove", relation: "facing", distance: { min: 0, max: 1 }, priority: 10 }] },
  hoodModern: { name: "hoodModern", size: [2, 1], scale: 1.76, wall: true, wallHeight: 1.1, role: "appliance",
    affinities: [{ target: "kitchenStove", relation: "facing", distance: { min: 0, max: 1 }, priority: 10 }] },
  kitchenCabinet: { name: "kitchenCabinet", size: [2, 2], role: "storage", alignment: "wall",
    affinities: [
      { target: "kitchenStove", relation: "beside", distance: { min: 0, max: 3 }, priority: 8 },
      { target: "kitchenSink", relation: "beside", distance: { min: 0, max: 3 }, priority: 7 },
    ] },
  kitchenBlender: { name: "kitchenBlender", size: [1, 1], role: "appliance",
    affinities: [{ targetRole: "surface", relation: "beside", distance: { min: 0, max: 2 }, priority: 5 }] },
  dryer: { name: "dryer", size: [2, 2], role: "appliance", alignment: "wall",
    affinities: [{ target: "washer", relation: "beside", distance: { min: 0, max: 2 }, priority: 8 }] },

  // --- Seating (chairs) ---
  chairCushion: { name: "chairCushion", size: [1, 1], rotation: 2, sittable: { seats: 1, seatHeight: 0.3 },
    role: "seating",
    affinities: [{ targetRole: "surface", relation: "beside", distance: { min: 0, max: 2 }, priority: 9 }] },
  chair: { name: "chair", size: [1, 1], rotation: 2, sittable: { seats: 1, seatHeight: 0.3 },
    role: "seating",
    affinities: [{ targetRole: "surface", relation: "beside", distance: { min: 0, max: 2 }, priority: 9 }] },
  chairRounded: { name: "chairRounded", size: [1, 1], sittable: { seats: 1, seatHeight: 0.3, facingOffset: 0 },
    role: "seating",
    affinities: [{ targetRole: "surface", relation: "beside", distance: { min: 0, max: 2 }, priority: 9 }] },

  // --- Office ---
  deskComputer: { name: "deskComputer", size: [3, 2], role: "surface", anchor: true, alignment: "wall",
    affinities: [{ targetRole: "seating", relation: "beside", distance: { min: 0, max: 1 }, priority: 10 }] },
  deskCorner: { name: "deskCorner", size: [4, 5], scale: 1.74, role: "surface", anchor: true, alignment: "wall",
    affinities: [{ targetRole: "seating", relation: "beside", distance: { min: 0, max: 1 }, priority: 10 }] },
  computerScreen: { name: "computerScreen", size: [2, 1], scale: 1.8, role: "entertainment",
    affinities: [{ target: "desk", relation: "beside", distance: { min: 0, max: 1 }, priority: 9 }] },
  computerKeyboard: { name: "computerKeyboard", size: [1, 1], scale: 1.77, walkable: true, role: "entertainment",
    affinities: [{ target: "desk", relation: "beside", distance: { min: 0, max: 1 }, priority: 9 }] },
  computerMouse: { name: "computerMouse", size: [1, 1], scale: 2.0, walkable: true, role: "entertainment",
    affinities: [{ target: "desk", relation: "beside", distance: { min: 0, max: 1 }, priority: 9 }] },
  chairDesk: { name: "chairDesk", size: [2, 1], scale: 1.05, sittable: { seats: 1, seatHeight: 0.35, facingOffset: 0 },
    role: "seating",
    affinities: [{ targetRole: "surface", relation: "beside", distance: { min: 0, max: 1 }, priority: 10 }] },
  desk: { name: "desk", size: [3, 2], role: "surface", anchor: true, alignment: "wall",
    affinities: [
      { targetRole: "seating", relation: "beside", distance: { min: 0, max: 1 }, priority: 10 },
      { target: "laptop", relation: "beside", distance: { min: 0, max: 1 }, priority: 7 },
    ] },
  chairModernCushion: { name: "chairModernCushion", size: [1, 1], rotation: 2, sittable: { seats: 1, seatHeight: 0.3 },
    role: "seating",
    affinities: [{ targetRole: "surface", relation: "beside", distance: { min: 0, max: 1 }, priority: 9 }] },
  chairModernFrameCushion: { name: "chairModernFrameCushion", size: [1, 1], rotation: 2, sittable: { seats: 1, seatHeight: 0.3 },
    role: "seating",
    affinities: [{ targetRole: "surface", relation: "beside", distance: { min: 0, max: 1 }, priority: 9 }] },

  // --- Kitchen small items ---
  kitchenMicrowave: { name: "kitchenMicrowave", size: [1, 1], role: "appliance",
    affinities: [{ target: "kitchenCabinet", relation: "beside", distance: { min: 0, max: 2 }, priority: 6 }] },
  coatRackStanding: { name: "coatRackStanding", size: [1, 1], role: "decor", wallPreferred: true },
  kitchenSink: { name: "kitchenSink", size: [2, 2], role: "appliance", anchor: true, alignment: "wall",
    affinities: [
      { target: "kitchenStove", relation: "beside", distance: { min: 0, max: 3 }, priority: 9 },
      { target: "kitchenCabinet", relation: "beside", distance: { min: 0, max: 3 }, priority: 7 },
    ] },

  // --- Lighting ---
  lampRoundFloor: { name: "lampRoundFloor", size: [1, 1], role: "lighting",
    affinities: [{ targetRole: "seating", relation: "beside", distance: { min: 0, max: 2 }, priority: 7 }] },
  lampRoundTable: { name: "lampRoundTable", size: [1, 1], role: "lighting",
    affinities: [{ targetRole: "surface", relation: "beside", distance: { min: 0, max: 1 }, priority: 7 }] },
  lampSquareFloor: { name: "lampSquareFloor", size: [1, 1], role: "lighting",
    affinities: [{ targetRole: "seating", relation: "beside", distance: { min: 0, max: 2 }, priority: 7 }] },
  lampSquareTable: { name: "lampSquareTable", size: [1, 1], role: "lighting",
    affinities: [{ targetRole: "bed", relation: "beside", distance: { min: 0, max: 2 }, priority: 8 }] },
  lampSquareCeiling: { name: "lampSquareCeiling", size: [1, 1], scale: 2.5, wall: true, wallHeight: 3.2, role: "lighting" },
  ceilingFan: { name: "ceilingFan", size: [2, 2], scale: 1.9, wall: true, wallHeight: 3.2, role: "appliance" },
  lampWall: { name: "lampWall", size: [1, 1], scale: 2.21, wall: true, wallHeight: 0.9, role: "lighting" },

  // --- Kitchen appliances ---
  toaster: { name: "toaster", size: [1, 1], role: "appliance",
    affinities: [{ targetRole: "surface", relation: "beside", distance: { min: 0, max: 2 }, priority: 5 }] },
  kitchenStove: { name: "kitchenStove", size: [2, 2], role: "appliance", anchor: true, alignment: "wall",
    affinities: [
      { target: "kitchenSink", relation: "beside", distance: { min: 0, max: 3 }, priority: 9 },
      { target: "kitchenCabinet", relation: "beside", distance: { min: 0, max: 3 }, priority: 8 },
    ] },

  // --- Electronics ---
  laptop: { name: "laptop", size: [1, 1], role: "entertainment",
    affinities: [{ target: "desk", relation: "beside", distance: { min: 0, max: 1 }, priority: 9 }] },
  radio: { name: "radio", size: [1, 1], role: "entertainment" },
  speaker: { name: "speaker", size: [1, 1], role: "entertainment",
    affinities: [{ targetRole: "entertainment", relation: "beside", distance: { min: 1, max: 4 }, priority: 5 }] },
  speakerSmall: { name: "speakerSmall", size: [1, 1], rotation: 2, role: "entertainment" },

  // --- Bar seating ---
  stoolBar: { name: "stoolBar", size: [1, 1], sittable: { seats: 1, seatHeight: 0.45 },
    role: "seating",
    affinities: [{ target: "kitchenBar", relation: "beside", distance: { min: 0, max: 2 }, priority: 9 }] },
  stoolBarSquare: { name: "stoolBarSquare", size: [1, 1], sittable: { seats: 1, seatHeight: 0.45 },
    role: "seating",
    affinities: [{ target: "kitchenBar", relation: "beside", distance: { min: 0, max: 2 }, priority: 9 }] },
};

// Alias for use inside handlers where "items" parameter shadows this
export const itemsCatalog = items;

export const isValidWallPlacement = (itemDef, gridPosition, rotation, roomSize, gridDivision) => {
  if (!itemDef.wall) return true;
  if (roomSize[0] > 30 || roomSize[1] > 30) return true; // plaza = unrestricted

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

export const wallEdgeCapacity = (roomSize, gridDivision) => {
  const maxX = roomSize[0] * gridDivision;
  const maxY = roomSize[1] * gridDivision;
  return {
    front: Math.floor(maxX * 0.4),
    back:  Math.floor(maxX * 0.4),
    left:  Math.floor(maxY * 0.4),
    right: Math.floor(maxY * 0.4),
  };
};
