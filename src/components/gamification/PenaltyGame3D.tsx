import { Suspense, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type MutableRefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { PerspectiveCamera, useAnimations, useFBX, useTexture, ContactShadows, Line } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import type { PrizeDefinition } from "../prizes/PrizePoolEditor";

// URLs dos assets em /public/games/penalty/
// Versão mobile-friendly: só o FBX idle do goleiro (~10MB) — o resto é procedural.
// O dive (esquerda/direita) é animado por translate/rotate do group, sem precisar de FBX extra.
const ASSETS = {
  keeperIdle: "/games/penalty/keeper_idle.fbx",
  grassColor: "/games/penalty/grass_color.jpg",
  grassNormal: "/games/penalty/grass_normal.jpg",
  stadiumBg: "/games/penalty/estadio.jpg",
};

// Escala e altura do modelo do goleiro (Mixamo FBX vem em CENTÍMETROS — base é ~0.012)
const KEEPER_SCALE = 0.022;
const KEEPER_Y = 0;
// Rotação Y inicial do goleiro (radianos): ajusta se o modelo veio orientado errado
// 0 = frente | Math.PI/2 = 90° dir | Math.PI = costas | -Math.PI/2 = 90° esq
const KEEPER_ROTATION_Y = 0;

interface Props {
  prizes: PrizeDefinition[];
  winningPrizeIndex?: number;
  buttonColor?: string;
  autoReveal?: boolean;
  onRevealed?: (prize: PrizeDefinition) => void;
  size?: number;
}

const TARGETS_3D: { x: number; y: number; z: number }[] = [
  { x: -2.4, y: 1.9, z: -3 },
  { x: 0,    y: 2.1, z: -3 },
  { x: 2.4,  y: 1.9, z: -3 },
  { x: -1.7, y: 0.6, z: -3 },
  { x: 1.7,  y: 0.6, z: -3 },
];

const BALL_HOME: [number, number, number] = [0, 0.18, 4];

interface AnimState {
  t0: number;
  duration: number;
  start: [number, number, number];
  target: [number, number, number];
  keeperStart: [number, number, number];
  keeperEnd: [number, number, number];
  keeperRot: [number, number, number];
}

type Phase = "aim" | "kicking" | "result";

export default function PenaltyGame3D({
  prizes,
  winningPrizeIndex,
  buttonColor = "#FF6B35",
  autoReveal,
  onRevealed,
  size = 380,
}: Props) {
  const realPrizes = useMemo(() => prizes.filter((p) => p.type !== "try_again"), [prizes]);
  const winningPrize = winningPrizeIndex != null && winningPrizeIndex < prizes.length
    ? prizes[winningPrizeIndex]
    : null;
  const isSavedShot = !!winningPrize && winningPrize.type === "try_again";

  const targetIdx = useMemo(() => {
    if (!winningPrize || isSavedShot) return 0;
    const idx = realPrizes.findIndex((p) => p.id === winningPrize.id);
    return Math.max(0, idx) % TARGETS_3D.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winningPrize, realPrizes]);

  const [phase, setPhase] = useState<Phase>("aim");
  const [dragOffset, setDragOffset] = useState({ dx: 0, dy: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const animState = useRef<AnimState | null>(null);
  const dragging = useRef(false);

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (phase !== "aim") return;
    dragging.current = true;
    setDragOffset({ dx: 0, dy: 0 });
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging.current || phase !== "aim") return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height * 0.85;
    const dx = (e.clientX - cx) / rect.width;
    const dy = (e.clientY - cy) / rect.height;
    setDragOffset({
      dx: Math.max(-0.5, Math.min(0.5, dx)),
      dy: Math.max(0, Math.min(0.4, dy)),
    });
  }
  function onPointerUp() {
    if (!dragging.current) return;
    dragging.current = false;
    const force = Math.hypot(dragOffset.dx, dragOffset.dy);
    if (force > 0.05 && phase === "aim") {
      kick();
    } else {
      setDragOffset({ dx: 0, dy: 0 });
    }
  }

  function kick() {
    if (!winningPrize || phase !== "aim") return;
    setPhase("kicking");

    // A BOLA SEGUE A MIRA do usuário (mesmo cálculo da AimLine).
    // Quando não há drag (autoReveal), usa TARGETS_3D[targetIdx] como fallback.
    const hasAim = Math.hypot(dragOffset.dx, dragOffset.dy) > 0.05;
    const fallback = TARGETS_3D[targetIdx];
    const aimX = hasAim
      ? Math.max(-3.0, Math.min(3.0, -dragOffset.dx * 6))
      : fallback.x;
    const aimY = hasAim
      ? Math.max(0.5, Math.min(2.2, 0.4 + dragOffset.dy * 5))
      : fallback.y;
    const target = { x: aimX, y: aimY, z: -3 };

    let keeperEnd: [number, number, number];
    let keeperRot: [number, number, number] = [0, 0, 0];
    if (isSavedShot) {
      // Defende: mergulha pro MESMO lado da bola (intercepta). Centro → escolhe esquerda.
      const sideX = aimX < -0.2 ? -2.2 : aimX > 0.2 ? 2.2 : -2.0;
      keeperEnd = [sideX, 0.3, -2.6];
      keeperRot = [0, 0, sideX < 0 ? Math.PI / 2.4 : -Math.PI / 2.4];
    } else {
      // Gol: goleiro vai pro lado OPOSTO da bola (erra o mergulho).
      const flipX = aimX < 0 ? 2.6 : -2.6;
      keeperEnd = [flipX, 0.3, -2.6];
      keeperRot = [0, 0, aimX < 0 ? -Math.PI / 2.4 : Math.PI / 2.4];
    }

    animState.current = {
      t0: performance.now(),
      duration: 900,
      start: [BALL_HOME[0] + dragOffset.dx * 0.8, BALL_HOME[1], BALL_HOME[2]],
      target: [target.x, target.y, target.z],
      keeperStart: [0, 0, -2.5],
      keeperEnd,
      keeperRot,
    };
  }

  useEffect(() => {
    if (autoReveal && phase === "aim") {
      const t = setTimeout(() => kick(), 800);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoReveal, phase]);

  function handleAnimDone() {
    setPhase("result");
    if (winningPrize) setTimeout(() => onRevealed?.(winningPrize), 700);
  }

  const aimForce = Math.min(1, Math.hypot(dragOffset.dx, dragOffset.dy) / 0.4);
  const result = phase === "result" ? (isSavedShot ? "DEFENDEU" : "GOOOL") : null;
  const [assetsLoaded, setAssetsLoaded] = useState(false);

  return (
    <div
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      style={{
        position: "relative",
        width: size,
        height: size * 1.25,
        borderRadius: 16,
        overflow: "hidden",
        background: "linear-gradient(180deg, #0c1e4c 0%, #1e3a8a 50%, #f59e0b 100%)",
        boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
        touchAction: "none",
        userSelect: "none",
      }}
    >
      {!assetsLoaded && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 5,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          color: "white", fontSize: 13, fontWeight: 600, letterSpacing: 1,
          background: "rgba(0,0,0,0.3)",
          pointerEvents: "none",
        }}>
          <div className="animate-spin" style={{ fontSize: 36, marginBottom: 10 }}>⚽</div>
          <div>Carregando jogo…</div>
        </div>
      )}
      <Canvas
        shadows="soft"
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
      >
        <PerspectiveCamera makeDefault position={[0, 1.8, 6]} fov={55} />
        {/* Ambiente claro pra compensar a falta de HDR environment */}
        <ambientLight intensity={0.7} />
        {/* Luz principal (refletor) — projeta sombra no gramado */}
        <directionalLight
          position={[5, 10, 5]}
          intensity={1.8}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-8}
          shadow-camera-right={8}
          shadow-camera-top={8}
          shadow-camera-bottom={-8}
          shadow-bias={-0.0002}
        />
        {/* Hemisphere: ceu azul claro + bounce do gramado pra cima */}
        <hemisphereLight args={["#cfe7ff", "#2a3f55", 0.7]} />
        {/* Fill light frontal — ilumina o GOLEIRO de frente sem custar shadow */}
        <directionalLight position={[0, 3, 8]} intensity={0.8} />

        <Suspense fallback={<LoadingTracker onLoaded={() => setAssetsLoaded(true)} />}>
          <LoadedNotifier onLoaded={() => setAssetsLoaded(true)} />
          {/* Backdrop com foto do estádio (255KB) atrás do gol */}
          <StadiumBackdrop />
          <StadiumSky />

          <Field />
          <Goal />

          {/* Sombras de contato — mais realistas que shadow map */}
          <ContactShadows
            position={[0, 0.001, -2.5]}
            opacity={0.45}
            scale={10}
            blur={2}
            far={4}
            resolution={512}
            color="#000000"
          />

          {/* Linha de mira 3D — só aparece durante o drag */}
          {phase === "aim" && (Math.hypot(dragOffset.dx, dragOffset.dy) > 0.05) && (
            <AimLine dragOffset={dragOffset} color={buttonColor} />
          )}

          <Ball
            animStateRef={animState}
            phase={phase}
            dragOffset={dragOffset}
            color={buttonColor}
            onFinish={handleAnimDone}
          />
          <Keeper
            animStateRef={animState}
            phase={phase}
          />
        </Suspense>

        {/* Pós-processamento: bloom + vignette (sem chromatic aberration pra economizar GPU mobile) */}
        <EffectComposer multisampling={0}>
          <Bloom intensity={0.5} luminanceThreshold={0.6} luminanceSmoothing={0.6} mipmapBlur />
          <Vignette eskil={false} offset={0.18} darkness={0.55} />
        </EffectComposer>
      </Canvas>

      {phase === "aim" && (
        <div style={overlayBottomCenter}>
          {aimForce < 0.05 ? (
            <div style={instructionStyle}>⚽ ARRASTE PRA MIRAR E SOLTE PRA CHUTAR</div>
          ) : (
            <ForceBar value={aimForce} />
          )}
        </div>
      )}
      {result === "GOOOL" && (
        <div style={resultStyle("#FFD54F", "#1F2937")}>GOOOOL!</div>
      )}
      {result === "DEFENDEU" && (
        <div style={resultStyle("#42A5F5", "#FFFFFF")}>🧤 DEFENDEU!</div>
      )}
    </div>
  );
}

// Renderiza no Canvas só depois que o Suspense liberou — sinaliza pro overlay de loading sumir.
function LoadedNotifier({ onLoaded }: { onLoaded: () => void }) {
  useEffect(() => {
    onLoaded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

// Fallback do Suspense (não renderiza nada — só serve pra distinguir "carregando" no React tree).
function LoadingTracker({ onLoaded: _onLoaded }: { onLoaded: () => void }) {
  return null;
}

// ─────────────────────────────────────────────────
// Backdrop fotográfico — foto do estádio (sem gol) num plane atrás do gol 3D.
// 255KB de JPG. O sky procedural cobre os lados/topo onde a foto não chega.
function StadiumBackdrop() {
  const tex = useTexture(ASSETS.stadiumBg);
  // Aspect da foto recortada (1600x1323 ≈ 1.21:1). Plane 18x15 cobre o frustrum vertical.
  return (
    <mesh position={[0, 5, -10]}>
      <planeGeometry args={[18, 15]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  );
}

// ─────────────────────────────────────────────────
// Skybox procedural com refletores + arquibancada com torcida estilizada.
// Mantém o "feeling" de estádio sem precisar de HDR/JPG (gera ~200KB de textura em memória).
function StadiumSky() {
  const skyTexture = useMemo(() => {
    const W = 2048;
    const H = 1024;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    // ─── 1. Céu (azul escuro topo → âmbar no horizonte iluminado pelo estádio) ───
    const sky = ctx.createLinearGradient(0, 0, 0, H * 0.55);
    sky.addColorStop(0.0, "#0a1530");
    sky.addColorStop(0.4, "#1e3a8a");
    sky.addColorStop(0.85, "#7c3aed");
    sky.addColorStop(1.0, "#f59e0b");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H * 0.55);

    // ─── 2. Arquibancada superior (estrutura escura) ───
    ctx.fillStyle = "#0e0a18";
    ctx.fillRect(0, H * 0.55, W, H * 0.1);

    // ─── 3. Refletores (8 postes com halo brilhante) ───
    const projectorY = H * 0.5;
    for (let i = 0; i < 8; i++) {
      const x = (i + 0.5) * (W / 8);
      // Halo grande
      const halo = ctx.createRadialGradient(x, projectorY, 0, x, projectorY, 90);
      halo.addColorStop(0.0, "rgba(255, 250, 220, 0.85)");
      halo.addColorStop(0.3, "rgba(255, 230, 150, 0.45)");
      halo.addColorStop(0.7, "rgba(255, 200, 80, 0.12)");
      halo.addColorStop(1.0, "rgba(255, 200, 80, 0)");
      ctx.fillStyle = halo;
      ctx.fillRect(x - 90, projectorY - 90, 180, 180);
      // Núcleo brilhante
      ctx.fillStyle = "#fffae0";
      ctx.beginPath();
      ctx.arc(x, projectorY, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // ─── 4. Arquibancada com torcida (faixa horizontal de pixels coloridos) ───
    const standTop = H * 0.65;
    const standBottom = H * 0.95;
    // Fundo da arquibancada (gradient)
    const standGrad = ctx.createLinearGradient(0, standTop, 0, standBottom);
    standGrad.addColorStop(0.0, "#1f1f2e");
    standGrad.addColorStop(1.0, "#0f0f1a");
    ctx.fillStyle = standGrad;
    ctx.fillRect(0, standTop, W, standBottom - standTop);

    // Pixels da torcida
    const crowdColors = ["#ef4444", "#fbbf24", "#10b981", "#3b82f6", "#ec4899", "#ffffff", "#a855f7", "#22d3ee"];
    for (let i = 0; i < 8000; i++) {
      const x = Math.random() * W;
      const y = standTop + Math.random() * (standBottom - standTop);
      ctx.fillStyle = crowdColors[Math.floor(Math.random() * crowdColors.length)];
      ctx.globalAlpha = 0.55 + Math.random() * 0.4;
      ctx.fillRect(x, y, 2.5, 2.5);
    }
    ctx.globalAlpha = 1;

    // ─── 5. Bordo escuro embaixo (sombra do gramado fundindo no horizonte) ───
    const bottomShade = ctx.createLinearGradient(0, H * 0.95, 0, H);
    bottomShade.addColorStop(0.0, "rgba(0,0,0,0)");
    bottomShade.addColorStop(1.0, "#000");
    ctx.fillStyle = bottomShade;
    ctx.fillRect(0, H * 0.95, W, H * 0.05);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }, []);

  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[80, 48, 32]} />
      <meshBasicMaterial map={skyTexture} side={THREE.BackSide} />
    </mesh>
  );
}

function Field() {
  const [colorMap, normalMap] = useTexture([ASSETS.grassColor, ASSETS.grassNormal]);

  // Configura repetição da textura (tile)
  useMemo(() => {
    [colorMap, normalMap].forEach((tex) => {
      if (!tex) return;
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(20, 20);
      tex.anisotropy = 8;
    });
    if (colorMap) colorMap.colorSpace = THREE.SRGBColorSpace;
  }, [colorMap, normalMap]);

  return (
    <group>
      {/* Gramado com textura PBR */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial
          map={colorMap}
          normalMap={normalMap}
          normalScale={new THREE.Vector2(0.6, 0.6)}
          roughness={0.85}
          metalness={0}
        />
      </mesh>
      {/* Marca do pênalti */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 4]}>
        <circleGeometry args={[0.18, 32]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      {/* Linha de pênalti (semicírculo simulado) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
        <ringGeometry args={[8, 8.06, 64, 1, 0, Math.PI]} />
        <meshStandardMaterial color="#FFFFFF" side={THREE.DoubleSide} transparent opacity={0.85} />
      </mesh>
      {/* Linha da grande área */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, -1]}>
        <planeGeometry args={[10, 0.06]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
    </group>
  );
}

function Goal() {
  const W = 6.4;
  const H = 2.4;
  const D = 0.06;
  return (
    <group position={[0, 0, -3]}>
      <mesh position={[-W / 2, H / 2, 0]} castShadow>
        <cylinderGeometry args={[D, D, H, 12]} />
        <meshStandardMaterial color="#FFFFFF" metalness={0.3} roughness={0.4} />
      </mesh>
      <mesh position={[W / 2, H / 2, 0]} castShadow>
        <cylinderGeometry args={[D, D, H, 12]} />
        <meshStandardMaterial color="#FFFFFF" metalness={0.3} roughness={0.4} />
      </mesh>
      <mesh position={[0, H, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[D, D, W, 12]} />
        <meshStandardMaterial color="#FFFFFF" metalness={0.3} roughness={0.4} />
      </mesh>
      <mesh position={[0, H / 2, -1.2]}>
        <planeGeometry args={[W, H, 16, 8]} />
        <meshBasicMaterial color="#FFFFFF" wireframe transparent opacity={0.55} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[-W / 2, H / 2, -0.6]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[1.2, H, 6, 8]} />
        <meshBasicMaterial color="#FFFFFF" wireframe transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[W / 2, H / 2, -0.6]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[1.2, H, 6, 8]} />
        <meshBasicMaterial color="#FFFFFF" wireframe transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, H, -0.6]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, 1.2, 16, 6]} />
        <meshBasicMaterial color="#FFFFFF" wireframe transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function CrowdRing() {
  const dots = useMemo(() => {
    const arr: { pos: [number, number, number]; color: string }[] = [];
    const colors = ["#EF4444", "#FBBF24", "#10B981", "#3B82F6", "#EC4899", "#FFFFFF"];
    for (let i = 0; i < 180; i++) {
      const angle = (i / 180) * Math.PI * 2;
      const r = 14 + Math.random() * 2;
      arr.push({
        pos: [Math.sin(angle) * r, 2 + Math.random() * 2, Math.cos(angle) * r],
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    return arr;
  }, []);
  return (
    <group>
      <mesh position={[0, 2, 0]}>
        <cylinderGeometry args={[15, 16, 4, 32, 1, true]} />
        <meshStandardMaterial color="#1F2937" side={THREE.DoubleSide} />
      </mesh>
      {dots.map((d, i) => (
        <mesh key={i} position={d.pos}>
          <boxGeometry args={[0.15, 0.15, 0.05]} />
          <meshBasicMaterial color={d.color} />
        </mesh>
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────────
function useSoccerBallTexture() {
  return useMemo(() => {
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;

    // Fundo branco com leve gradiente
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, size, size);
    const grad = ctx.createRadialGradient(size / 2, size / 2, size * 0.1, size / 2, size / 2, size / 2);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(1, "rgba(0,0,0,0.12)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Padrão pseudo-hexagonal de pentágonos pretos
    const cell = 130;
    const rows = Math.ceil(size / (cell * 0.866)) + 2;
    const cols = Math.ceil(size / cell) + 2;
    for (let row = -1; row < rows; row++) {
      for (let col = -1; col < cols; col++) {
        const cx = col * cell + (row % 2 === 0 ? 0 : cell / 2);
        const cy = row * cell * 0.866;
        ctx.fillStyle = "#1F2937";
        ctx.beginPath();
        const r = cell * 0.27;
        for (let i = 0; i < 5; i++) {
          const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
      }
    }

    // Linhas de costura sutis ao redor dos pentágonos
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 1.5;
    for (let row = -1; row < rows; row++) {
      for (let col = -1; col < cols; col++) {
        const cx = col * cell + (row % 2 === 0 ? 0 : cell / 2);
        const cy = row * cell * 0.866;
        ctx.beginPath();
        const r = cell * 0.42;
        for (let i = 0; i < 5; i++) {
          const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    return texture;
  }, []);
}

function Ball({
  animStateRef,
  phase,
  dragOffset,
  color,
  onFinish,
}: {
  animStateRef: MutableRefObject<AnimState | null>;
  phase: Phase;
  dragOffset: { dx: number; dy: number };
  color: string;
  onFinish: () => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const done = useRef(false);

  useEffect(() => {
    if (phase === "aim") done.current = false;
  }, [phase]);

  useFrame(() => {
    if (!ref.current) return;
    const st = animStateRef.current;
    if (!st || phase !== "kicking") {
      if (phase === "aim") {
        // Drag VISUAL: bola "afunda" no gramado conforme o drag — sensação de "puxando pra trás"
        ref.current.position.set(
          BALL_HOME[0] + dragOffset.dx * 1.4,
          BALL_HOME[1] - dragOffset.dy * 0.05,
          BALL_HOME[2] + dragOffset.dy * 0.8,
        );
        // Leve rotação na direção do drag pra dar sensação de "rolando ao puxar"
        ref.current.rotation.set(
          -dragOffset.dy * 0.6,
          0,
          -dragOffset.dx * 0.5,
        );
      }
      return;
    }
    const t = Math.min(1, (performance.now() - st.t0) / st.duration);
    const eased = 1 - Math.pow(1 - t, 2);
    const x = st.start[0] + (st.target[0] - st.start[0]) * eased;
    const z = st.start[2] + (st.target[2] - st.start[2]) * eased;
    const flatY = st.start[1] + (st.target[1] - st.start[1]) * eased;
    const arc = Math.sin(t * Math.PI) * 0.7;
    ref.current.position.set(x, flatY + arc, z);
    ref.current.rotation.x += 0.4;
    ref.current.rotation.z += 0.2;
    if (t >= 1 && !done.current) {
      done.current = true;
      onFinish();
    }
  });

  const ballTexture = useSoccerBallTexture();

  return (
    <group ref={ref} position={BALL_HOME}>
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[0.18, 64, 32]} />
        <meshStandardMaterial
          map={ballTexture}
          roughness={0.42}
          metalness={0.05}
          envMapIntensity={1.2}
        />
      </mesh>
      {phase === "kicking" && (
        <mesh>
          <sphereGeometry args={[0.26, 16, 16]} />
          <meshBasicMaterial color={color} transparent opacity={0.3} />
        </mesh>
      )}
    </group>
  );
}

// ─────────────────────────────────────────────────
// Linha de mira 3D — só aparece durante o drag
function AimLine({
  dragOffset,
  color,
}: {
  dragOffset: { dx: number; dy: number };
  color: string;
}) {
  // Drag é "puxar pra trás" → bola vai pra direção OPOSTA
  // dragOffset.dx > 0 (puxou pra direita) → bola vai pra esquerda
  // dragOffset.dy > 0 (puxou pra baixo) → mira mais alto
  const force = Math.min(1, Math.hypot(dragOffset.dx, dragOffset.dy) / 0.4);
  const targetX = -dragOffset.dx * 6;
  const targetY = 0.4 + dragOffset.dy * 5;
  const targetZ = -3;

  // Gera 24 pontos em arco parabólico (sin)
  const points = useMemo(() => {
    const pts: [number, number, number][] = [];
    const startX = BALL_HOME[0] + dragOffset.dx * 0.8;
    const startY = BALL_HOME[1];
    const startZ = BALL_HOME[2];
    const N = 24;
    const peakHeight = 0.5 + force * 0.5;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const x = startX + (targetX - startX) * t;
      const z = startZ + (targetZ - startZ) * t;
      const y = startY + (targetY - startY) * t + Math.sin(t * Math.PI) * peakHeight;
      pts.push([x, y, z]);
    }
    return pts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragOffset.dx, dragOffset.dy, force]);

  // Cor varia: verde → amarelo → vermelho conforme força
  const lineColor = force > 0.75 ? "#EF4444" : force > 0.4 ? "#FBBF24" : "#22c55e";

  return (
    <group>
      <Line
        points={points}
        color={lineColor}
        lineWidth={3}
        dashed
        dashSize={0.15}
        gapSize={0.08}
        transparent
        opacity={0.9}
      />
      {/* Marca no ponto-alvo */}
      <mesh position={[targetX, targetY, targetZ]}>
        <ringGeometry args={[0.15, 0.22, 16]} />
        <meshBasicMaterial color={lineColor} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[targetX, targetY, targetZ]}>
        <ringGeometry args={[0.03, 0.06, 16]} />
        <meshBasicMaterial color={lineColor} side={THREE.DoubleSide} />
      </mesh>
      {/* Halo de força (cor pulsando) */}
      <mesh position={[targetX, targetY, targetZ]}>
        <ringGeometry args={[0.22 + force * 0.15, 0.28 + force * 0.15, 16]} />
        <meshBasicMaterial color={color} side={THREE.DoubleSide} transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────
// Goleiro usando modelo 3D Soldier.glb (humano rigado com animações)
// Customizado pra parecer goleiro: uniforme verde, luvas amarelas
function Keeper({
  animStateRef,
  phase,
}: {
  animStateRef: MutableRefObject<AnimState | null>;
  phase: Phase;
}) {
  const group = useRef<THREE.Group>(null);

  // Carrega só o FBX idle (vem com Y-Bot Mixamo dentro). O dive é animado matematicamente.
  const idleFbx = useFBX(ASSETS.keeperIdle);

  // Usa o FBX idle direto como modelo (sem clonar — clone profundo quebra skinning)
  const scene = idleFbx;

  // Só a animação de idle — dive lateral é feito via translate/rotate do group no useFrame
  const clips = useMemo(() => {
    const out: THREE.AnimationClip[] = [];
    if (idleFbx?.animations?.[0]) {
      const c = idleFbx.animations[0].clone();
      c.name = "Idle";
      out.push(c);
    }
    return out;
  }, [idleFbx]);

  // Aplica as clips no group (drei detecta os bones automaticamente dentro do group)
  const { actions } = useAnimations(clips, group);
  const currentAction = useRef<string | null>(null);
  const swing = useRef(0);

  // Ativa sombras nos meshes (mantém os materiais originais do FBX pra preservar skinning)
  useEffect(() => {
    if (!scene) return;
    scene.traverse((obj: THREE.Object3D) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      // Só ajusta envMapIntensity se for MeshStandardMaterial (sem converter)
      const mat = mesh.material as THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[];
      const apply = (m: THREE.MeshStandardMaterial) => {
        if (m && "envMapIntensity" in m) m.envMapIntensity = 1.0;
      };
      if (Array.isArray(mat)) mat.forEach(apply);
      else if (mat) apply(mat);
    });
  }, [scene]);

  // Toca Idle quando montar
  useEffect(() => {
    if (!actions.Idle) return;
    actions.Idle.reset().fadeIn(0.25).play();
    currentAction.current = "Idle";
    return () => {
      if (currentAction.current && actions[currentAction.current]) {
        actions[currentAction.current]?.fadeOut(0.2);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions.Idle]);

  useFrame(() => {
    if (!group.current) return;
    swing.current += 0.04;
    const st = animStateRef.current;
    if (!st || phase !== "kicking") {
      // Idle no centro do gol, olhando pra câmera
      group.current.position.set(0, 0, -2.5);
      group.current.rotation.set(0, KEEPER_ROTATION_Y, Math.sin(swing.current) * 0.03);
      return;
    }
    const t = Math.min(1, (performance.now() - st.t0) / st.duration);
    const kt = Math.max(0, (t - 0.3) / 0.7);
    const ke = 1 - Math.pow(1 - kt, 2);
    group.current.position.set(
      st.keeperStart[0] + (st.keeperEnd[0] - st.keeperStart[0]) * ke,
      st.keeperStart[1] + (st.keeperEnd[1] - st.keeperStart[1]) * ke,
      st.keeperStart[2] + (st.keeperEnd[2] - st.keeperStart[2]) * ke,
    );
    // Inclina o corpo na direção do mergulho (rota Z) + mantém orientação frontal (rota Y)
    group.current.rotation.set(
      st.keeperRot[0] * ke,
      KEEPER_ROTATION_Y + st.keeperRot[1] * ke,
      st.keeperRot[2] * ke,
    );
  });

  if (!scene) return null;
  return (
    <group ref={group} position={[0, KEEPER_Y, -2.5]} rotation={[0, KEEPER_ROTATION_Y, 0]} scale={KEEPER_SCALE}>
      <primitive object={scene} />
    </group>
  );
}

// ─────────────────────────────────────────────────
const overlayBottomCenter: React.CSSProperties = {
  position: "absolute",
  bottom: 16,
  left: 0,
  right: 0,
  display: "flex",
  justifyContent: "center",
  pointerEvents: "none",
};

const instructionStyle: React.CSSProperties = {
  background: "rgba(0,0,0,0.55)",
  color: "white",
  padding: "8px 16px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 1,
};

function ForceBar({ value }: { value: number }) {
  return (
    <div style={{
      background: "rgba(0,0,0,0.55)",
      borderRadius: 999,
      padding: "6px 14px",
      display: "flex",
      alignItems: "center",
      gap: 10,
      color: "white",
      fontSize: 11,
      fontWeight: 800,
    }}>
      <span>FORÇA</span>
      <div style={{ width: 120, height: 8, background: "rgba(255,255,255,0.2)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{
          width: `${value * 100}%`,
          height: "100%",
          background: "linear-gradient(90deg, #22c55e, #FBBF24, #EF4444)",
          transition: "width 0.05s linear",
        }} />
      </div>
      <span>{Math.round(value * 100)}%</span>
    </div>
  );
}

function resultStyle(bg: string, color: string): React.CSSProperties {
  return {
    position: "absolute",
    top: "40%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    background: bg,
    color: color,
    padding: "16px 28px",
    borderRadius: 16,
    fontSize: 28,
    fontWeight: 900,
    letterSpacing: 2,
    boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
    border: "3px solid white",
    fontFamily: "Impact, system-ui, sans-serif",
    pointerEvents: "none",
  };
}
