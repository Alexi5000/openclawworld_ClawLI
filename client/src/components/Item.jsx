import { Html, useCursor, useGLTF } from "@react-three/drei";
import { useAtom } from "jotai";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { SkeletonUtils } from "three-stdlib";
import { useGrid } from "../hooks/useGrid";
import { mapAtom, itemsAtom } from "./SocketManager";
import { buildModeAtom } from "./UI";

// Items that sit on top of surfaces rather than on the floor
const SURFACE_ITEMS = new Set([
  "laptop", "computerScreen", "computerKeyboard", "computerMouse",
  "kitchenMicrowave", "kitchenCoffeeMachine", "kitchenBlender", "toaster",
  "radio", "books", "plantSmall1", "plantSmall2", "plantSmall3",
]);

// Surface heights (Y offset) for items that other things can sit on
const SURFACE_HEIGHTS = {
  desk: 0.42,
  deskComputer: 0.42,
  deskCorner: 0.42,
  table: 0.42,
  tableCrossCloth: 0.42,
  tableCross: 0.42,
  tableCloth: 0.42,
  tableRound: 0.42,
  tableGlass: 0.42,
  tableCoffee: 0.28,
  tableCoffeeGlass: 0.28,
  tableCoffeeGlassSquare: 0.28,
  tableCoffeeSquare: 0.28,
  sideTable: 0.32,
  sideTableDrawers: 0.32,
  kitchenCabinet: 0.5,
  kitchenCabinetCornerInner: 0.5,
  kitchenCabinetCornerRound: 0.5,
  kitchenCabinetDrawer: 0.5,
  kitchenBar: 0.55,
  kitchenBarEnd: 0.55,
  cabinetBedDrawer: 0.3,
  cabinetBedDrawerTable: 0.3,
  cabinetBed: 0.3,
};

/** Animated dot indicator for agent working status */
const AgentWorkingIndicator = () => {
  const ref = useRef();
  useFrame((state) => {
    if (ref.current) {
      ref.current.position.y = 0.8 + Math.sin(state.clock.elapsedTime * 2) * 0.06;
    }
  });

  return (
    <group ref={ref} position={[0, 0.8, 0]}>
      <Html center distanceFactor={8} zIndexRange={[1, 0]} style={{ pointerEvents: "none" }}>
        <div className="flex items-center gap-1.5 bg-gray-950/90 backdrop-blur-sm border border-emerald-500/30 rounded-full px-2.5 py-1 shadow-lg shadow-emerald-500/10 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-mono text-emerald-400">Working...</span>
        </div>
      </Html>
    </group>
  );
};

export const Item = ({
  item,
  onClick,
  onSitClick,
  isDragging,
  dragPosition,
  canDrop,
  dragRotation,
  isComputer,
  agentWorking,
}) => {
  const { name, gridPosition, size, rotation: itemRotation } = item;

  const rotation = isDragging ? dragRotation : itemRotation;
  const { gridToVector3 } = useGrid();
  const [map] = useAtom(mapAtom);
  const [itemsCatalog] = useAtom(itemsAtom);
  const itemScale = itemsCatalog?.[name]?.scale ?? 1;
  const { scene } = useGLTF(`/models/items/${name}.glb`);
  // Skinned meshes cannot be re-used in threejs without cloning them
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const width = rotation === 1 || rotation === 3 ? size[1] : size[0];
  const height = rotation === 1 || rotation === 3 ? size[0] : size[1];
  const [hover, setHover] = useState(false);
  const [buildMode] = useAtom(buildModeAtom);
  const isSittable = !!onSitClick;
  useCursor(buildMode ? hover : (isSittable || onClick) ? hover : undefined);

  useEffect(() => {
    clone.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = false;
        child.receiveShadow = true;
      }
    });
  }, []);

  const isWallMounted = item.wall && map.size[0] <= 30;
  const yOffset = isWallMounted ? (itemsCatalog?.[item.name]?.wallHeight ?? 0.9) : 0;

  // Surface stacking: lift items that sit on top of surfaces
  const surfaceLift = useMemo(() => {
    if (isDragging || isWallMounted || !SURFACE_ITEMS.has(name)) return 0;
    // Check if this item overlaps with any surface item in the room
    const roomItems = map.items || [];
    for (const other of roomItems) {
      if (other === item) continue;
      const h = SURFACE_HEIGHTS[other.name];
      if (!h) continue;
      // Check grid overlap
      const otherRot = other.rotation || 0;
      const ow = otherRot === 1 || otherRot === 3 ? other.size[1] : other.size[0];
      const oh = otherRot === 1 || otherRot === 3 ? other.size[0] : other.size[1];
      const ox = other.gridPosition[0];
      const oy = other.gridPosition[1];
      const mx = gridPosition[0];
      const my = gridPosition[1];
      // Check if this item's origin is within the surface footprint
      if (mx >= ox && mx < ox + ow && my >= oy && my < oy + oh) {
        return h;
      }
    }
    return 0;
  }, [name, gridPosition, map.items, isDragging, isWallMounted]);

  const basePosition = gridToVector3(
    isDragging ? dragPosition || gridPosition : gridPosition,
    width,
    height
  );

  return (
    <group
      onPointerDown={(e) => {
        if (e.nativeEvent?.button !== undefined && e.nativeEvent.button !== 0) return;
        if (onSitClick) {
          e.stopPropagation();
          onSitClick();
        } else if (onClick) {
          onClick(e);
        }
      }}
      position={[basePosition.x, basePosition.y + yOffset + surfaceLift, basePosition.z]}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
    >
      <primitive object={clone} rotation-y={((rotation || 0) * Math.PI) / 2} scale={itemScale} />
      {isComputer && agentWorking && <AgentWorkingIndicator />}
      {isDragging && (
        <mesh>
          <boxGeometry
            args={[width / map.gridDivision, 0.2, height / map.gridDivision]}
          />
          <meshBasicMaterial
            color={canDrop ? "green" : "red"}
            opacity={0.3}
            transparent
          />
        </mesh>
      )}
    </group>
  );
};
