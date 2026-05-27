import { useEffect, useMemo, useRef, useState } from "react";
import type { PrizeDefinition } from "../prizes/PrizePoolEditor";

interface Props {
  prizes: PrizeDefinition[];
  winningPrizeIndex?: number;
  buttonColor?: string;
  autoReveal?: boolean;
  onRevealed?: (prize: PrizeDefinition) => void;
  size?: number;
}

// ─── Dimensões ───
const VIEW_W = 320;
const VIEW_H = 540;

// Gol
const GOAL_X = 22;
const GOAL_Y = 60;
const GOAL_W = VIEW_W - 44;
const GOAL_H = 180;
const POST_W = 6;

// Bola na marca do pênalti
const BALL_HOME = { x: VIEW_W / 2, y: 470 };
const BALL_RADIUS = 14;

// 5 alvos dentro do gol
const TARGETS = [
  { id: 0, x: GOAL_X + 40, y: GOAL_Y + 35 },                       // ângulo ↖
  { id: 1, x: GOAL_X + GOAL_W / 2, y: GOAL_Y + 25 },               // travessão centro
  { id: 2, x: GOAL_X + GOAL_W - 40, y: GOAL_Y + 35 },              // ângulo ↗
  { id: 3, x: GOAL_X + 60, y: GOAL_Y + GOAL_H - 35 },              // rasteiro ←
  { id: 4, x: GOAL_X + GOAL_W - 60, y: GOAL_Y + GOAL_H - 35 },     // rasteiro →
];

interface BallPos { x: number; y: number; rot: number; scale: number; }

type KeeperPose = "idle" | "ready" | "diveLeft" | "diveRight" | "jumpUp" | "celebrate";

// Caminhos das artes em /public/games/penalty/
const ASSET = {
  keeperIdle: "/games/penalty/mao%20aberta.png",
  keeperReady: "/games/penalty/goleiro%20achachado%20no%20centro.png",
  keeperDiveLeft: "/games/penalty/goleiro%20pulou%20pra%20esquerda.png",
  keeperDiveRight: "/games/penalty/goleiro%20pulou%20para%20direita.png",
  ballFire: "/games/penalty/bola%20pegando%20fogo.png",
};

export default function PenaltyGame({
  prizes,
  winningPrizeIndex,
  buttonColor = "#FF6B35",
  autoReveal,
  onRevealed,
  size = VIEW_W,
}: Props) {
  const realPrizes = useMemo(() => prizes.filter((p) => p.type !== "try_again"), [prizes]);
  const winningPrize = winningPrizeIndex != null && winningPrizeIndex < prizes.length
    ? prizes[winningPrizeIndex]
    : null;
  const isSavedShot = !!winningPrize && winningPrize.type === "try_again";

  const targetIdx = useMemo(() => {
    if (!winningPrize || isSavedShot) return 0;
    const idx = realPrizes.findIndex((p) => p.id === winningPrize.id);
    return Math.max(0, idx) % TARGETS.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winningPrize, realPrizes]);

  const [phase, setPhase] = useState<"aim" | "kicking" | "result">("aim");
  const [dragOffset, setDragOffset] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const [ball, setBall] = useState<BallPos>({ x: BALL_HOME.x, y: BALL_HOME.y, rot: 0, scale: 1 });
  const [keeperPos, setKeeperPos] = useState({ x: VIEW_W / 2, y: GOAL_Y + GOAL_H - 5, pose: "idle" as KeeperPose });
  const [netShake, setNetShake] = useState(false);
  const [showGoolText, setShowGoolText] = useState(false);
  const [confetti, setConfetti] = useState<{ id: number; x: number; y: number; dx: number; dy: number; color: string }[]>([]);
  const [kickAngle, setKickAngle] = useState(0);
  const dragging = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const trailRef = useRef<{ x: number; y: number }[]>([]);

  // Auto-reveal
  useEffect(() => {
    if (autoReveal && phase === "aim") {
      const t = setTimeout(() => kick(), 800);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoReveal, phase]);

  // Drag handlers
  function getLocalPos(e: React.PointerEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: ((e.clientX - rect.left) / rect.width) * VIEW_W,
      y: ((e.clientY - rect.top) / rect.height) * VIEW_H,
    };
  }
  function onPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    if (phase !== "aim") return;
    const pos = getLocalPos(e);
    const dx = pos.x - BALL_HOME.x;
    const dy = pos.y - BALL_HOME.y;
    if (Math.hypot(dx, dy) > 70) return;
    dragging.current = true;
    setDragOffset({ dx: 0, dy: 0 });
  }
  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!dragging.current || phase !== "aim") return;
    const pos = getLocalPos(e);
    let dx = pos.x - BALL_HOME.x;
    let dy = pos.y - BALL_HOME.y;
    dy = Math.max(0, Math.min(70, dy));
    dx = Math.max(-60, Math.min(60, dx));
    setDragOffset({ dx, dy });
    setBall({ x: BALL_HOME.x + dx, y: BALL_HOME.y + dy, rot: 0, scale: 1 });
  }
  function onPointerUp() {
    if (!dragging.current) return;
    dragging.current = false;
    if (phase !== "aim") return;
    if (Math.hypot(dragOffset.dx, dragOffset.dy) > 12) {
      kick();
    } else {
      // Volta a bola pra marca
      setBall({ x: BALL_HOME.x, y: BALL_HOME.y, rot: 0, scale: 1 });
      setDragOffset({ dx: 0, dy: 0 });
    }
  }

  // Anima o chute
  function kick() {
    if (phase !== "aim" || !winningPrize) return;
    setPhase("kicking");
    trailRef.current = [];

    const target = isSavedShot
      ? TARGETS[targetIdx % TARGETS.length] // bola vai pra um canto mas é defendida
      : TARGETS[targetIdx];

    const duration = 950;
    const startX = ball.x;
    const startY = ball.y;
    const t0 = performance.now();

    // Ângulo do chute pra orientar a bola em chamas
    const angle = Math.atan2(target.y - startY, target.x - startX) * (180 / Math.PI);
    setKickAngle(angle);

    // Goleiro mergulha:
    //  - Pênalti perdido (gol válido) → mergulha pro lado OPOSTO ao alvo
    //  - Defesa → mergulha NA DIREÇÃO da bola
    let keeperDestX: number;
    let keeperDestY: number;
    let keeperPose: KeeperPose;
    if (isSavedShot) {
      // Defende
      keeperDestX = target.x;
      keeperDestY = target.y + 10;
      if (target.x < VIEW_W / 2 - 20) keeperPose = "diveLeft";
      else if (target.x > VIEW_W / 2 + 20) keeperPose = "diveRight";
      else keeperPose = "jumpUp";
    } else {
      // Não pega
      const farFromTarget = target.x < VIEW_W / 2 ? VIEW_W - 80 : 80;
      keeperDestX = farFromTarget;
      keeperDestY = target.y + 30;
      keeperPose = target.x < VIEW_W / 2 ? "diveRight" : "diveLeft";
      // se for travessão centro alto, faz jump
      if (Math.abs(target.x - VIEW_W / 2) < 30 && target.y < GOAL_Y + 50) {
        keeperPose = "jumpUp";
        keeperDestX = VIEW_W / 2;
        keeperDestY = GOAL_Y + 50;
      }
    }

    const keeperStartX = keeperPos.x;
    const keeperStartY = keeperPos.y;

    function frame(now: number) {
      const t = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - t, 2);

      // Bola: parábola até o alvo
      const x = startX + (target.x - startX) * eased;
      const baseY = startY + (target.y - startY) * eased;
      const peak = -45 * Math.sin(t * Math.PI);
      const y = baseY + peak;
      const rot = t * 760;
      const scale = 1 - t * 0.3;
      setBall({ x, y, rot, scale });
      // Acumula trail
      trailRef.current.push({ x, y });
      if (trailRef.current.length > 8) trailRef.current.shift();

      // Goleiro começa a mergulhar depois de 30% (reação humana)
      const keeperT = Math.max(0, (t - 0.3) / 0.7);
      const ke = 1 - Math.pow(1 - keeperT, 2);
      const kx = keeperStartX + (keeperDestX - keeperStartX) * ke;
      const ky = keeperStartY + (keeperDestY - keeperStartY) * ke;
      setKeeperPos({ x: kx, y: ky, pose: keeperPose });

      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        finishKick();
      }
    }
    requestAnimationFrame(frame);
  }

  function finishKick() {
    setPhase("result");
    if (isSavedShot) {
      spawnConfetti(keeperPos.x, keeperPos.y, "#9CA3AF", 10);
      setTimeout(() => { if (winningPrize) onRevealed?.(winningPrize); }, 700);
    } else {
      setNetShake(true);
      setShowGoolText(true);
      spawnConfetti(TARGETS[targetIdx].x, TARGETS[targetIdx].y, buttonColor, 30);
      setTimeout(() => setNetShake(false), 800);
      setTimeout(() => { if (winningPrize) onRevealed?.(winningPrize); }, 800);
    }
  }

  function spawnConfetti(x: number, y: number, _baseColor: string, count: number) {
    const colors = ["#FFD54F", "#FFFFFF", "#00A859", "#FFCC29", buttonColor, "#42A5F5"];
    const burst = Array.from({ length: count }, () => ({
      id: Math.random(),
      x,
      y,
      dx: (Math.random() - 0.5) * 260,
      dy: -Math.random() * 240 - 60,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    setConfetti((prev) => [...prev, ...burst]);
    setTimeout(() => {
      setConfetti((prev) => prev.filter((c) => !burst.find((b) => b.id === c.id)));
    }, 1500);
  }

  const aimTargetX = BALL_HOME.x - dragOffset.dx * 4;
  const aimTargetY = BALL_HOME.y - dragOffset.dy * 6;
  const aimForce = Math.min(1, Math.hypot(dragOffset.dx, dragOffset.dy) / 65);

  if (prizes.length === 0) {
    return <div className="text-center p-6 text-sm opacity-80">Nenhum prêmio configurado.</div>;
  }

  return (
    <div className="flex flex-col items-center select-none" style={{ width: size }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        width={size}
        height={size * (VIEW_H / VIEW_W)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        style={{ touchAction: "none", borderRadius: 16, boxShadow: "0 12px 40px rgba(0,0,0,0.4)" }}
      >
        <defs>
          {/* Rede do gol — grid denso */}
          <pattern id="netDense" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill="none" />
            <path d="M 0 0 L 8 0 M 0 0 L 0 8" stroke="rgba(255,255,255,0.55)" strokeWidth="0.5" />
          </pattern>
          {/* Sombra suave da bola */}
          <filter id="ballShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" />
          </filter>
          {/* Glow do texto GOOOL */}
          <filter id="goolGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Arquibancada (topo) — silhueta escura com pixels coloridos da torcida */}
        <rect x="0" y="0" width={VIEW_W} height={GOAL_Y - 8} fill="#374151" />
        <Crowd width={VIEW_W} y={6} bottom={GOAL_Y - 10} />

        {/* Listras de gramado */}
        <rect x="0" y={GOAL_Y - 8} width={VIEW_W} height={VIEW_H} fill="#15803d" />
        <rect x="0" y={GOAL_Y - 8} width={VIEW_W} height={GOAL_H + 13} fill="#6b9971" />
        <rect x="0" y={GOAL_Y + GOAL_H + 5} width={VIEW_W} height="3" fill="#FFFFFF" opacity="0.85" />
        <rect x="0" y={GOAL_Y + GOAL_H + 8} width={VIEW_W} height="125" fill="#16a34a" />
        <rect x="0" y={GOAL_Y + GOAL_H + 133} width={VIEW_W} height="100" fill="#22c55e" />
        <rect x="0" y={GOAL_Y + GOAL_H + 233} width={VIEW_W} height="100" fill="#16a34a" />

        {/* Marca do pênalti (oval branca) */}
        <ellipse cx={BALL_HOME.x} cy={BALL_HOME.y + 18} rx="32" ry="10" fill="#FFFFFF" />

        {/* Rede do gol (atrás) */}
        <g transform={netShake ? `translate(${Math.sin(performance.now() * 0.04) * 2}, 0)` : undefined}>
          <rect
            x={GOAL_X + POST_W / 2}
            y={GOAL_Y}
            width={GOAL_W - POST_W}
            height={GOAL_H}
            fill="#6b9971"
          />
          <rect
            x={GOAL_X + POST_W / 2}
            y={GOAL_Y}
            width={GOAL_W - POST_W}
            height={GOAL_H}
            fill="url(#netDense)"
          />
        </g>

        {/* Goleiro */}
        <Keeper
          x={keeperPos.x}
          y={keeperPos.y}
          pose={keeperPos.pose}
          phase={phase}
          shirtColor={buttonColor}
        />

        {/* Traves brancas (frente) */}
        <rect x={GOAL_X} y={GOAL_Y} width={POST_W} height={GOAL_H + 6} fill="#FFFFFF" />
        <rect x={GOAL_X + GOAL_W - POST_W} y={GOAL_Y} width={POST_W} height={GOAL_H + 6} fill="#FFFFFF" />
        <rect x={GOAL_X} y={GOAL_Y} width={GOAL_W} height={POST_W} fill="#FFFFFF" />

        {/* Linha de mira (durante drag) */}
        {phase === "aim" && Math.hypot(dragOffset.dx, dragOffset.dy) > 8 && (
          <g>
            <line
              x1={ball.x}
              y1={ball.y}
              x2={aimTargetX}
              y2={aimTargetY}
              stroke="rgba(255,255,255,0.7)"
              strokeWidth="2.5"
              strokeDasharray="6 4"
            />
            <circle
              cx={aimTargetX}
              cy={aimTargetY}
              r={6 + aimForce * 6}
              fill="none"
              stroke={aimForce > 0.7 ? "#EF5350" : aimForce > 0.4 ? "#FFD54F" : "#FFFFFF"}
              strokeWidth="2.5"
              opacity="0.95"
            />
          </g>
        )}

        {/* Sombra da bola */}
        <ellipse
          cx={ball.x}
          cy={Math.max(BALL_HOME.y + 14, ball.y + 28)}
          rx={BALL_RADIUS * 0.9 * ball.scale}
          ry={3 * ball.scale}
          fill="rgba(0,0,0,0.45)"
          filter="url(#ballShadow)"
        />

        {/* Bola — durante o vôo usa a imagem da bola em chamas; senão usa SVG normal */}
        {phase === "kicking" ? (
          <g transform={`translate(${ball.x}, ${ball.y}) rotate(${kickAngle}) scale(${ball.scale})`}>
            <image
              href={ASSET.ballFire}
              x={-50}
              y={-25}
              width={80}
              height={50}
              preserveAspectRatio="xMidYMid meet"
            />
          </g>
        ) : (
          <SoccerBall x={ball.x} y={ball.y} rot={ball.rot} scale={ball.scale} radius={BALL_RADIUS} />
        )}

        {/* Confetti */}
        {confetti.map((c) => (
          <ConfettiBit key={c.id} x={c.x} y={c.y} dx={c.dx} dy={c.dy} color={c.color} />
        ))}

        {/* Texto GOOOOL */}
        {showGoolText && (
          <g filter="url(#goolGlow)">
            <text
              x={VIEW_W / 2}
              y={GOAL_Y + GOAL_H / 2 + 12}
              textAnchor="middle"
              fontSize="56"
              fontWeight="900"
              fill="#FFD54F"
              stroke="#1F2937"
              strokeWidth="2.5"
              style={{ letterSpacing: 2, fontFamily: "Impact, system-ui, sans-serif" }}
            >
              GOOOOL!
            </text>
          </g>
        )}

        {/* Barra de força (visível durante o drag) */}
        {phase === "aim" && aimForce > 0.05 && (
          <g>
            {/* Trilha (fundo) */}
            <rect
              x={VIEW_W / 2 - 80}
              y={VIEW_H - 30}
              width="160"
              height="10"
              rx="5"
              fill="rgba(0,0,0,0.55)"
              stroke="rgba(255,255,255,0.4)"
              strokeWidth="1"
            />
            {/* Preenchimento — gradient verde → amarelo → vermelho */}
            <defs>
              <linearGradient id="forceGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="50%" stopColor="#FBBF24" />
                <stop offset="100%" stopColor="#EF4444" />
              </linearGradient>
            </defs>
            <rect
              x={VIEW_W / 2 - 78}
              y={VIEW_H - 28}
              width={156 * aimForce}
              height="6"
              rx="3"
              fill="url(#forceGrad)"
            />
            {/* Label de %  */}
            <text
              x={VIEW_W / 2}
              y={VIEW_H - 36}
              textAnchor="middle"
              fontSize="10"
              fontWeight="800"
              fill="#FFFFFF"
              style={{ letterSpacing: 1 }}
            >
              FORÇA {Math.round(aimForce * 100)}%
            </text>
          </g>
        )}

        {/* Instrução */}
        {phase === "aim" && !autoReveal && Math.hypot(dragOffset.dx, dragOffset.dy) < 5 && (
          <text
            x={VIEW_W / 2}
            y={VIEW_H - 12}
            textAnchor="middle"
            fontSize="11"
            fontWeight="700"
            fill="#FFFFFF"
            style={{ letterSpacing: 1 }}
          >
            ⚽ ARRASTE A BOLA PRA TRÁS E SOLTE
          </text>
        )}
      </svg>

      {phase === "result" && winningPrize && (
        <div className="mt-4 text-center">
          <div className="text-xl font-bold">
            {isSavedShot ? "🧤 O goleiro defendeu!" : `🎉 ${winningPrize.label}`}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────
// Bola de futebol (estilo flat com pentágonos)
// ─────────────────────────────────────────────────
function SoccerBall({ x, y, rot, scale, radius }: { x: number; y: number; rot: number; scale: number; radius: number }) {
  return (
    <g transform={`translate(${x}, ${y}) rotate(${rot}) scale(${scale})`}>
      <circle r={radius} fill="#FFFFFF" stroke="#1F2937" strokeWidth="1.2" />
      {/* Pentágono central */}
      <polygon
        points={[
          [0, -radius * 0.45],
          [radius * 0.43, -radius * 0.14],
          [radius * 0.26, radius * 0.36],
          [-radius * 0.26, radius * 0.36],
          [-radius * 0.43, -radius * 0.14],
        ].map((p) => p.join(",")).join(" ")}
        fill="#1F2937"
      />
      {/* "Costuras" — pequenos hexágonos brancos ao redor (sugeridos com linhas) */}
      <line x1="0" y1={-radius * 0.45} x2="0" y2={-radius * 0.9} stroke="#1F2937" strokeWidth="1.2" />
      <line x1={radius * 0.43} y1={-radius * 0.14} x2={radius * 0.85} y2={-radius * 0.28} stroke="#1F2937" strokeWidth="1.2" />
      <line x1={-radius * 0.43} y1={-radius * 0.14} x2={-radius * 0.85} y2={-radius * 0.28} stroke="#1F2937" strokeWidth="1.2" />
      <line x1={radius * 0.26} y1={radius * 0.36} x2={radius * 0.52} y2={radius * 0.78} stroke="#1F2937" strokeWidth="1.2" />
      <line x1={-radius * 0.26} y1={radius * 0.36} x2={-radius * 0.52} y2={radius * 0.78} stroke="#1F2937" strokeWidth="1.2" />
      {/* Pentágonos pretos secundários nas bordas */}
      <polygon
        points={`0,${-radius * 0.95} ${radius * 0.32},${-radius * 0.78} ${radius * 0.18},${-radius * 0.5} ${-radius * 0.18},${-radius * 0.5} ${-radius * 0.32},${-radius * 0.78}`}
        fill="#1F2937"
        opacity="0.7"
      />
      <polygon
        points={`${radius * 0.78},${-radius * 0.28} ${radius * 0.92},${0} ${radius * 0.7},${radius * 0.32} ${radius * 0.43},${radius * 0.14} ${radius * 0.5},${-radius * 0.22}`}
        fill="#1F2937"
        opacity="0.7"
      />
      <polygon
        points={`${-radius * 0.78},${-radius * 0.28} ${-radius * 0.92},${0} ${-radius * 0.7},${radius * 0.32} ${-radius * 0.43},${radius * 0.14} ${-radius * 0.5},${-radius * 0.22}`}
        fill="#1F2937"
        opacity="0.7"
      />
    </g>
  );
}

// ─────────────────────────────────────────────────
// Goleiro — agora usando imagens PNG em /public/games/penalty/
// ─────────────────────────────────────────────────
function Keeper({
  x,
  y,
  pose,
  phase,
}: {
  x: number;
  y: number;
  pose: KeeperPose;
  phase: string;
  shirtColor: string;
}) {
  // Em aim sem chute em andamento → idle (braços abertos)
  // Durante kick → pose correspondente
  let img = ASSET.keeperIdle;
  let w = 90;
  let h = 130;

  if (phase !== "kicking" && pose === "idle") {
    img = ASSET.keeperIdle;
    w = 90; h = 130;
  } else if (pose === "diveLeft") {
    img = ASSET.keeperDiveLeft;
    w = 130; h = 95;
  } else if (pose === "diveRight") {
    img = ASSET.keeperDiveRight;
    w = 130; h = 95;
  } else if (pose === "jumpUp") {
    // Sem pose específica de pulo vertical → usa idle (já tem braços abertos)
    img = ASSET.keeperIdle;
    w = 90; h = 130;
  } else {
    img = ASSET.keeperReady;
    w = 90; h = 120;
  }

  return (
    <image
      href={img}
      x={x - w / 2}
      y={y - h}
      width={w}
      height={h}
      preserveAspectRatio="xMidYMax meet"
    />
  );
}

// ─────────────────────────────────────────────────
// Torcida na arquibancada (silhueta + pixels coloridos piscando)
// ─────────────────────────────────────────────────
function Crowd({ width, y, bottom }: { width: number; y: number; bottom: number }) {
  // Distribui "pixels" coloridos numa área retangular pra simular torcida vibrando
  const pixels: { x: number; y: number; color: string; delay: number }[] = [];
  const colors = ["#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#EC4899", "#FBBF24", "#FFFFFF"];
  const stepX = 7;
  const stepY = 6;
  let idx = 0;
  for (let py = y; py < bottom; py += stepY) {
    for (let px = 4; px < width - 4; px += stepX) {
      if (Math.random() < 0.55) {
        pixels.push({
          x: px + (Math.random() - 0.5) * 3,
          y: py + (Math.random() - 0.5) * 2,
          color: colors[Math.floor(Math.random() * colors.length)],
          delay: (idx * 0.07) % 2.4,
        });
        idx++;
      }
    }
  }
  return (
    <g>
      {/* Silhueta escura da arquibancada */}
      <rect x="0" y={y - 2} width={width} height={bottom - y + 4} fill="#1F2937" />
      {/* "Pixels" coloridos da torcida — piscam suavemente */}
      {pixels.map((p, i) => (
        <rect key={i} x={p.x} y={p.y} width="3" height="3" fill={p.color} opacity="0.85">
          <animate
            attributeName="opacity"
            values="0.4;1;0.4"
            dur="2.4s"
            begin={`${p.delay}s`}
            repeatCount="indefinite"
          />
        </rect>
      ))}
      {/* Faixa do alambrado/teto baixo */}
      <rect x="0" y={bottom - 4} width={width} height="4" fill="#111827" />
    </g>
  );
}

// ─────────────────────────────────────────────────
function ConfettiBit({ x, y, dx, dy, color }: { x: number; y: number; dx: number; dy: number; color: string }) {
  const [pos, setPos] = useState({ x, y });
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    const startTime = performance.now();
    let raf = 0;
    function tick(now: number) {
      const t = (now - startTime) / 1000;
      const px = x + dx * t;
      const py = y + dy * t + 350 * t * t;
      setPos({ x: px, y: py });
      setOpacity(Math.max(0, 1 - t * 1.1));
      if (t < 1.3) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [x, y, dx, dy]);

  return (
    <rect
      x={pos.x - 2}
      y={pos.y - 2}
      width={4}
      height={6}
      fill={color}
      opacity={opacity}
      transform={`rotate(${pos.x * 5}, ${pos.x}, ${pos.y})`}
    />
  );
}
