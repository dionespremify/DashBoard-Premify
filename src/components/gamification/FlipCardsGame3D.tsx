import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { PerspectiveCamera, Html, Stars, Environment, OrbitControls, ContactShadows } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import type { PrizeDefinition } from "../prizes/PrizePoolEditor";

interface Props {
  prizes: PrizeDefinition[];
  winningPrizeIndex?: number;
  buttonColor?: string;
  autoReveal?: boolean;
  onRevealed?: (prize: PrizeDefinition) => void;
  size?: number;
  /** Logo do estabelecimento — aparece no verso de cada carta. */
  logoUrl?: string | null;
}

type Phase = "aim" | "revealing" | "done";

// Grid: até 9 cartas. Mínimo 4. Layout calculado dinamicamente.
function layout(count: number): { cols: number; rows: number } {
  if (count <= 4) return { cols: 2, rows: 2 };
  if (count <= 6) return { cols: 3, rows: 2 };
  if (count <= 9) return { cols: 3, rows: 3 };
  return { cols: 3, rows: 3 };
}

export default function FlipCardsGame3D({
  prizes,
  winningPrizeIndex,
  buttonColor = "#FF6B35",
  autoReveal,
  onRevealed,
  size = 380,
  logoUrl,
}: Props) {
  const realPrizes = useMemo(() => prizes.filter((p) => p.type !== "try_again"), [prizes]);
  const winningPrize = winningPrizeIndex != null && winningPrizeIndex < prizes.length
    ? prizes[winningPrizeIndex]
    : null;

  // Distribui prêmios pelas cartas. Total de cartas baseado em quantos prêmios há.
  const cardCount = Math.min(9, Math.max(4, realPrizes.length || 4));
  const { cols, rows } = layout(cardCount);

  // Conteúdo das cartas: cicla os prêmios pra preencher
  const cardsContent = useMemo<PrizeDefinition[]>(() => {
    if (realPrizes.length === 0) return [];
    const arr: PrizeDefinition[] = [];
    for (let i = 0; i < cardCount; i++) {
      arr.push(realPrizes[i % realPrizes.length]);
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realPrizes, cardCount]);

  // Em qual índice da carta colocar o prêmio sorteado. Cliente "escolhe" → carta clicada vai mostrar o sorteado.
  // Quando o cliente clica num índice X, modificamos cardsContent[X] = winningPrize antes de virar.

  const [phase, setPhase] = useState<Phase>("aim");
  const [clickedIdx, setClickedIdx] = useState<number | null>(null);
  const [revealedIdx, setRevealedIdx] = useState<Set<number>>(new Set());

  // Quando uma carta é clicada, força ela a mostrar o prêmio sorteado.
  const finalCardsContent = useMemo<PrizeDefinition[]>(() => {
    if (clickedIdx == null || !winningPrize) return cardsContent;
    const arr = [...cardsContent];
    arr[clickedIdx] = winningPrize;
    return arr;
  }, [cardsContent, clickedIdx, winningPrize]);

  function handleClickCard(i: number) {
    if (phase !== "aim" || !winningPrize) return;
    setClickedIdx(i);
    setPhase("revealing");
    setRevealedIdx(new Set([i]));
    // Depois de revelar a primeira carta, vira as outras automaticamente
    setTimeout(() => {
      const all = new Set<number>();
      for (let j = 0; j < cardCount; j++) all.add(j);
      setRevealedIdx(all);
    }, 1000);
    setTimeout(() => {
      setPhase("done");
      onRevealed?.(winningPrize);
    }, 2200);
  }

  // Auto-reveal: clica numa carta aleatória automaticamente
  useEffect(() => {
    if (!autoReveal || phase !== "aim") return;
    const t = setTimeout(() => {
      const idx = Math.floor(Math.random() * cardCount);
      handleClickCard(idx);
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoReveal, phase]);

  if (realPrizes.length === 0) {
    return <div style={{ padding: 24, textAlign: "center", opacity: 0.8 }}>Nenhum prêmio configurado.</div>;
  }

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size * 1.15,
        borderRadius: 16,
        overflow: "hidden",
        background: "#0f172a",
        boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
        userSelect: "none",
      }}
    >
      <Canvas
        shadows="soft"
        dpr={[1, 2]}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
      >
        <PerspectiveCamera makeDefault position={[0, 2.2, 5.5]} fov={45} />
        <color attach="background" args={["#0a0a18"]} />
        <fog attach="fog" args={["#0a0a18", 8, 18]} />

        {/* Iluminação tipo "estúdio" (key + fill + rim) */}
        <ambientLight intensity={0.35} />
        <directionalLight
          position={[4, 7, 4]}
          intensity={2.4}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-5}
          shadow-camera-right={5}
          shadow-camera-top={5}
          shadow-camera-bottom={-5}
          shadow-bias={-0.0002}
        />
        <pointLight position={[-4, 2, 3]} intensity={1.2} color="#a855f7" distance={10} />
        <pointLight position={[4, 2, 3]} intensity={1.2} color={buttonColor} distance={10} />
        <spotLight
          position={[0, 6, 0]}
          angle={0.5}
          penumbra={0.7}
          intensity={1.5}
          color="#FFFFFF"
          castShadow
        />

        <Suspense fallback={null}>
          {/* Environment HDR pra reflexões realistas nas cartas (PBR) */}
          <Environment preset="city" background={false} />

          <Stars radius={50} depth={30} count={1500} factor={3} fade speed={1} />

          {/* "Mesa" — superfície metálica sutil refletindo as cartas */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]} receiveShadow>
            <planeGeometry args={[30, 30]} />
            <meshStandardMaterial color="#0a0820" roughness={0.4} metalness={0.6} />
          </mesh>

          {/* Sombras de contato (mais realistas que shadow map simples) */}
          <ContactShadows
            position={[0, -1.49, 0]}
            opacity={0.65}
            scale={12}
            blur={2.4}
            far={4}
            resolution={512}
            color="#000000"
          />

          {/* Grid de cartas */}
          <CardsGrid
            cols={cols}
            rows={rows}
            count={cardCount}
            contents={finalCardsContent}
            revealed={revealedIdx}
            phase={phase}
            buttonColor={buttonColor}
            logoUrl={logoUrl}
            onClickCard={handleClickCard}
          />

          {/* Câmera orbital — cliente pode girar e zoom (estilo Babylon ArcRotateCamera) */}
          <OrbitControls
            enablePan={false}
            enableZoom={true}
            minDistance={4}
            maxDistance={8}
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={Math.PI / 2.2}
            autoRotate={phase === "aim"}
            autoRotateSpeed={0.4}
          />
        </Suspense>

        {/* Pós-processamento: Bloom (brilho) + Vignette + leve aberração cromática */}
        <EffectComposer multisampling={2}>
          <Bloom
            intensity={0.6}
            luminanceThreshold={0.4}
            luminanceSmoothing={0.6}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.15} darkness={0.6} blendFunction={BlendFunction.NORMAL} />
          <ChromaticAberration offset={[0.0008, 0.0008]} radialModulation={false} modulationOffset={0} />
        </EffectComposer>
      </Canvas>

      {/* Overlay com instrução */}
      {phase === "aim" && (
        <div style={overlayBottomCenter}>
          <div style={instructionStyle}>🃏 ESCOLHA UMA CARTA E REVELE SEU PRÊMIO</div>
        </div>
      )}

      {phase === "done" && winningPrize && (
        <div style={resultStyle(buttonColor, "#FFFFFF")}>
          🎉 {winningPrize.label}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────
function CardsGrid({
  cols,
  rows,
  count,
  contents,
  revealed,
  phase,
  buttonColor,
  logoUrl,
  onClickCard,
}: {
  cols: number;
  rows: number;
  count: number;
  contents: PrizeDefinition[];
  revealed: Set<number>;
  phase: Phase;
  buttonColor: string;
  logoUrl?: string | null;
  onClickCard: (i: number) => void;
}) {
  const spacing = 1.5;
  const cardW = 1.2;
  const cardH = 1.6;

  const positions = useMemo(() => {
    const arr: [number, number, number][] = [];
    const totalW = (cols - 1) * spacing;
    const totalH = (rows - 1) * spacing;
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const x = col * spacing - totalW / 2;
      const y = -(row * spacing - totalH / 2);
      arr.push([x, y, 0]);
    }
    return arr;
  }, [cols, rows, count]);

  return (
    <group rotation={[-Math.PI / 9, 0, 0]}>
      {positions.map((pos, i) => (
        <FlipCard
          key={i}
          position={pos}
          prize={contents[i]}
          revealed={revealed.has(i)}
          phase={phase}
          buttonColor={buttonColor}
          logoUrl={logoUrl}
          width={cardW}
          height={cardH}
          onClick={() => onClickCard(i)}
          delay={revealed.has(i) ? 0 : i * 0.05}
        />
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────────
function FlipCard({
  position,
  prize,
  revealed,
  phase,
  buttonColor,
  logoUrl,
  width,
  height,
  onClick,
  delay,
}: {
  position: [number, number, number];
  prize: PrizeDefinition;
  revealed: boolean;
  phase: Phase;
  buttonColor: string;
  logoUrl?: string | null;
  width: number;
  height: number;
  onClick: () => void;
  delay: number;
}) {
  const ref = useRef<THREE.Group>(null);
  const targetRot = useRef(0);
  const startedAt = useRef<number | null>(null);
  const [hovered, setHovered] = useState(false);
  const [showFront, setShowFront] = useState(false);

  // Quando muda pra revealed, dispara animação
  useEffect(() => {
    if (revealed && startedAt.current === null) {
      startedAt.current = performance.now() + delay * 1000;
      targetRot.current = Math.PI;
    }
  }, [revealed, delay]);

  useFrame(() => {
    if (!ref.current) return;

    // Hover/idle: leve bounce
    const t = performance.now() / 1000;
    const idleY = phase === "aim" ? Math.sin(t * 2 + position[0]) * 0.04 : 0;
    ref.current.position.set(position[0], position[1] + idleY, position[2] + (hovered ? 0.15 : 0));

    // Rotação: vira até PI quando revelada
    const startTime = startedAt.current;
    if (startTime !== null) {
      const elapsed = performance.now() - startTime;
      if (elapsed < 0) return;
      const dur = 600;
      const t01 = Math.min(1, elapsed / dur);
      // ease out
      const eased = 1 - Math.pow(1 - t01, 3);
      const rot = eased * Math.PI;
      ref.current.rotation.y = rot;
      // Troca a face visual quando passa de 90°
      if (rot > Math.PI / 2 && !showFront) setShowFront(true);
    } else {
      ref.current.rotation.y = 0;
    }
  });

  // Cor da face (verso)
  const backColor = "#1e293b";
  const cornerR = 0.08;

  return (
    <group
      ref={ref}
      position={position}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (phase === "aim") onClick();
      }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = "default"; }}
    >
      {/* Carta — corpo metalizado (PBR responde ao Environment) */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[width, height, 0.08]} />
        <meshStandardMaterial
          color={backColor}
          roughness={0.25}
          metalness={0.75}
          envMapIntensity={1.4}
        />
      </mesh>

      {/* Verso visível (decoração da carta — padrão e borda colorida) */}
      {!showFront && (
        <group position={[0, 0, 0.05]}>
          {/* Borda colorida */}
          <mesh>
            <planeGeometry args={[width - 0.05, height - 0.05]} />
            <meshBasicMaterial color={buttonColor} />
          </mesh>
          {/* Centro escuro */}
          <mesh position={[0, 0, 0.001]}>
            <planeGeometry args={[width - 0.18, height - 0.18]} />
            <meshBasicMaterial color={backColor} />
          </mesh>
          {/* Logo do estabelecimento (ou "?" como fallback) — ocupa quase toda a face */}
          <Html
            transform
            position={[0, 0, 0.01]}
            distanceFactor={1.2}
            style={{
              pointerEvents: "none",
              userSelect: "none",
            }}
          >
            <div
              style={{
                width: 150,
                height: 200,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 6,
                color: buttonColor,
                opacity: hovered ? 1 : 0.95,
                transform: hovered ? "scale(1.06)" : "scale(1)",
                transition: "all 0.2s",
              }}
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo"
                  draggable={false}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    filter: "drop-shadow(0 3px 10px rgba(0,0,0,0.6))",
                  }}
                />
              ) : (
                <div
                  style={{
                    fontSize: 110,
                    fontWeight: 900,
                    fontFamily: "Impact, system-ui, sans-serif",
                    textShadow: "0 3px 10px rgba(0,0,0,0.6)",
                    lineHeight: 1,
                  }}
                >
                  ?
                </div>
              )}
            </div>
          </Html>
        </group>
      )}

      {/* Frente da carta (com prêmio) — só visível depois que vira 90° */}
      {showFront && (
        <group position={[0, 0, -0.05]} rotation={[0, Math.PI, 0]}>
          {/* Fundo da face */}
          <mesh>
            <planeGeometry args={[width - 0.05, height - 0.05]} />
            <meshBasicMaterial color={prize.color || "#FFB300"} />
          </mesh>
          {/* Borda branca */}
          <mesh position={[0, 0, 0.001]}>
            <planeGeometry args={[width - 0.15, height - 0.15]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
          {/* Conteúdo do prêmio (Html overlay) — ocupa quase toda a face */}
          <Html
            transform
            position={[0, 0, 0.01]}
            distanceFactor={1.2}
            style={{
              pointerEvents: "none",
              userSelect: "none",
            }}
          >
            <div
              style={{
                width: 150,
                height: 200,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: 6,
                textAlign: "center",
                color: "#1F2937",
                gap: 4,
              }}
            >
              {prize.imageUrl ? (
                <img
                  src={prize.imageUrl}
                  alt={prize.label}
                  style={{
                    width: 120,
                    height: 120,
                    objectFit: "cover",
                    borderRadius: 10,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                  }}
                />
              ) : (
                <div style={{ fontSize: 90, lineHeight: 1 }}>{prize.icon ?? "🎁"}</div>
              )}
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 900,
                  lineHeight: 1.1,
                  textShadow: "0 1px 2px rgba(255,255,255,0.6)",
                  marginTop: 4,
                }}
              >
                {truncate(prize.label, 22)}
              </div>
            </div>
          </Html>
        </group>
      )}

      {/* Cornerguards (efeito metalizado nas pontas) */}
      <mesh position={[width / 2 - cornerR, height / 2 - cornerR, 0]}>
        <cylinderGeometry args={[cornerR, cornerR, 0.085, 12]} />
        <meshStandardMaterial color={backColor} metalness={0.85} roughness={0.2} envMapIntensity={1.5} />
      </mesh>
      <mesh position={[-(width / 2 - cornerR), height / 2 - cornerR, 0]}>
        <cylinderGeometry args={[cornerR, cornerR, 0.085, 12]} />
        <meshStandardMaterial color={backColor} metalness={0.85} roughness={0.2} envMapIntensity={1.5} />
      </mesh>
      <mesh position={[width / 2 - cornerR, -(height / 2 - cornerR), 0]}>
        <cylinderGeometry args={[cornerR, cornerR, 0.085, 12]} />
        <meshStandardMaterial color={backColor} metalness={0.85} roughness={0.2} envMapIntensity={1.5} />
      </mesh>
      <mesh position={[-(width / 2 - cornerR), -(height / 2 - cornerR), 0]}>
        <cylinderGeometry args={[cornerR, cornerR, 0.085, 12]} />
        <meshStandardMaterial color={backColor} metalness={0.85} roughness={0.2} envMapIntensity={1.5} />
      </mesh>
    </group>
  );
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
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
  background: "rgba(0,0,0,0.6)",
  color: "white",
  padding: "8px 16px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 1,
};

function resultStyle(bg: string, color: string): React.CSSProperties {
  return {
    position: "absolute",
    top: "6%",
    left: "50%",
    transform: "translate(-50%, 0)",
    background: bg,
    color: color,
    padding: "14px 24px",
    borderRadius: 16,
    fontSize: 20,
    fontWeight: 900,
    letterSpacing: 1,
    boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
    border: "3px solid white",
    pointerEvents: "none",
    maxWidth: "85%",
    textAlign: "center",
  };
}
