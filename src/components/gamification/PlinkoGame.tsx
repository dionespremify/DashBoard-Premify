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

const VIEW_W = 320;
const VIEW_H = 480;
const TOP_AREA = 80;       // área superior onde o cliente "mira"
const SLOTS_AREA = 90;     // área inferior dos slots
const ROWS = 8;             // linhas de pinos
const PIN_RADIUS = 4;
const BALL_RADIUS = 9;
const PINS_TOP = TOP_AREA + 20;
const PINS_BOTTOM = VIEW_H - SLOTS_AREA - 20;
const ROW_GAP = (PINS_BOTTOM - PINS_TOP) / (ROWS - 1);
const MIN_SLOTS = 3;
const MAX_SLOTS = 9;

interface PinPos {
  x: number;
  y: number;
  row: number;
  col: number;
}

function buildPins(slotsCount: number, colGap: number): PinPos[] {
  const pins: PinPos[] = [];
  for (let r = 0; r < ROWS; r++) {
    const y = PINS_TOP + r * ROW_GAP;
    const isOffset = r % 2 === 1;
    if (isOffset) {
      // Pinos nos "vales" — entre lanes
      for (let c = 0; c < slotsCount - 1; c++) {
        pins.push({ x: (c + 1) * colGap, y, row: r, col: c });
      }
    } else {
      // Pinos centrados nos lanes
      for (let c = 0; c < slotsCount; c++) {
        pins.push({ x: c * colGap + colGap / 2, y, row: r, col: c });
      }
    }
  }
  return pins;
}

/**
 * Planeja o caminho da bolinha do startLane até targetLane.
 * Em cada uma das ROWS linhas, a bolinha se move ±0.5 (1 pino).
 * Após ROWS movimentos, soma deve ser (targetLane - startLane).
 */
function planPath(startLane: number, targetLane: number, slotsCount: number): number[] {
  const totalSteps = ROWS;
  const diff = (targetLane - startLane) * 2; // em unidades de 0.5
  // Cada step é +1 ou -1 (em unidades de 0.5)
  // rights - lefts = diff; rights + lefts = totalSteps
  const rights = (totalSteps + diff) / 2;
  const lefts = totalSteps - rights;
  if (rights < 0 || lefts < 0 || !Number.isInteger(rights)) {
    // Caso impossível matemático: cai num lane próximo
    return Array.from({ length: totalSteps }, () => (Math.random() < 0.5 ? 1 : -1));
  }
  // Embaralha com restrição: lane nunca pode sair de [0, slotsCount-1]
  const moves: number[] = Array(rights).fill(1).concat(Array(lefts).fill(-1));
  // Tenta embaralhar com retry pra não estourar boundary
  for (let attempt = 0; attempt < 30; attempt++) {
    const shuffled = [...moves];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    // Valida
    let lane = startLane * 2; // unidades de 0.5
    let ok = true;
    for (const m of shuffled) {
      lane += m;
      if (lane < 0 || lane > (slotsCount - 1) * 2) { ok = false; break; }
    }
    if (ok) return shuffled;
  }
  // Fallback: ordena crescente/decrescente
  return moves.sort((a, b) => (targetLane > startLane ? b - a : a - b));
}

export default function PlinkoGame({
  prizes,
  winningPrizeIndex,
  buttonColor = "#FF6B35",
  autoReveal,
  onRevealed,
  size = VIEW_W,
}: Props) {
  // Lista de prêmios reais (sem try_again) — usada pra resolver o prêmio sorteado pelo backend.
  const realPrizes = useMemo(
    () => prizes.filter((p) => p.type !== "try_again"),
    [prizes],
  );

  // Slots derivados de `slices` (mesmo controle da roleta).
  // Cada prêmio entra `slices` vezes. Se total < 3 → completa ciclando. Se > 9 → limita.
  const filledSlots = useMemo<PrizeDefinition[]>(() => {
    if (realPrizes.length === 0) return [];
    const slots: PrizeDefinition[] = [];
    for (const prize of realPrizes) {
      const n = Math.max(1, prize.slices ?? 1);
      for (let i = 0; i < n; i++) slots.push(prize);
    }
    while (slots.length < MIN_SLOTS) {
      slots.push(realPrizes[slots.length % realPrizes.length]);
    }
    if (slots.length > MAX_SLOTS) slots.length = MAX_SLOTS;
    return slots;
  }, [realPrizes]);

  const slotsCount = filledSlots.length || MIN_SLOTS;
  const colGap = VIEW_W / slotsCount;
  const laneX = (lane: number) => lane * colGap + colGap / 2;
  const pins = useMemo(() => buildPins(slotsCount, colGap), [slotsCount, colGap]);

  const [dragLane, setDragLane] = useState(0);
  const [phase, setPhase] = useState<"aim" | "falling" | "done">("aim");
  const [ballPos, setBallPos] = useState({ x: VIEW_W / 2, y: 30 });

  // Centraliza dragLane sempre que mudar a quantidade de slots
  useEffect(() => {
    setDragLane(Math.floor(slotsCount / 2));
  }, [slotsCount]);
  const [hitPins, setHitPins] = useState<Set<number>>(new Set());
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; dx: number; dy: number; color: string }[]>([]);

  const trailRef = useRef<{ x: number; y: number }[]>([]);
  const [, forceTick] = useState(0);

  // Calcula em qual slot a bolinha deve cair pra mostrar o prêmio sorteado pelo backend.
  // Se o prêmio aparece em múltiplos slots (porque há menos prêmios que slots), escolhe
  // aleatoriamente entre eles — torna o resultado visualmente mais variado.
  const targetSlot = useMemo(() => {
    if (winningPrizeIndex == null || filledSlots.length === 0 || realPrizes.length === 0) return 0;
    const winningPrize = realPrizes[Math.min(winningPrizeIndex, realPrizes.length - 1)];
    const matches: number[] = [];
    filledSlots.forEach((p, i) => {
      if (p.id === winningPrize.id) matches.push(i);
    });
    if (matches.length === 0) return 0;
    return matches[Math.floor(Math.random() * matches.length)];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winningPrizeIndex, realPrizes, filledSlots]);

  // Atualiza posição da bolinha em modo aim
  useEffect(() => {
    if (phase !== "aim") return;
    setBallPos({ x: laneX(dragLane), y: 30 });
  }, [dragLane, phase]);

  // Auto-reveal: solta automaticamente se passado autoReveal
  useEffect(() => {
    if (autoReveal && phase === "aim") {
      // Pequeno delay pra dar pelo menos um glimpse da mira
      const t = setTimeout(() => launch(), 600);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoReveal, phase]);

  function launch() {
    if (phase !== "aim" || filledSlots.length === 0 || winningPrizeIndex == null) return;
    setPhase("falling");
    setHitPins(new Set());
    trailRef.current = [];

    const path = planPath(dragLane, targetSlot, slotsCount);
    let currentLane2 = dragLane * 2; // unidades de meio-lane
    let currentY = PINS_TOP;
    const segments: { fromX: number; fromY: number; toX: number; toY: number; pinIdx?: number }[] = [];
    const startX = laneX(dragLane);
    // Primeiro: do topo até a primeira fileira
    segments.push({ fromX: startX, fromY: 30, toX: startX, toY: PINS_TOP - PIN_RADIUS - BALL_RADIUS - 2 });
    for (let r = 0; r < ROWS; r++) {
      const pinY = PINS_TOP + r * ROW_GAP;
      const fromX = (currentLane2 / 2) * colGap + colGap / 2;
      const move = path[r];
      currentLane2 += move;
      const toLaneCenter = (currentLane2 / 2) * colGap + colGap / 2;
      // Bate no pino: pino está na pos atual antes do move (pra linhas centrais)
      // Vamos achar o pino mais próximo
      const pinX = fromX + (move > 0 ? colGap / 2 : -colGap / 2);
      const pinIdx = pins.findIndex((p) => p.row === r && Math.abs(p.x - pinX) < 2);
      // Movimento até o pino (ricochete)
      segments.push({ fromX, fromY: pinY - PIN_RADIUS - BALL_RADIUS, toX: pinX, toY: pinY, pinIdx });
      // Sai do pino pra próxima posição central
      segments.push({ fromX: pinX, fromY: pinY, toX: toLaneCenter, toY: pinY + ROW_GAP / 2 });
      currentY = pinY + ROW_GAP / 2;
    }
    // Final: cai no slot
    const finalSlotX = laneX(targetSlot);
    segments.push({ fromX: finalSlotX, fromY: currentY, toX: finalSlotX, toY: VIEW_H - SLOTS_AREA / 2 });

    animateSegments(segments);
  }

  function animateSegments(segments: { fromX: number; fromY: number; toX: number; toY: number; pinIdx?: number }[]) {
    let segIdx = 0;
    // Duração base + crescente: vai aumentando levemente conforme desce → cria suspense no final
    function segDuration(idx: number) {
      const total = segments.length;
      const progress = idx / Math.max(1, total - 1);
      // 180ms → 280ms (mais devagar conforme se aproxima do slot)
      return 180 + 100 * progress;
    }

    function runSegment(start: number) {
      if (segIdx >= segments.length) {
        setPhase("done");
        // Dispara reveal com pequeno delay
        if (winningPrizeIndex != null && filledSlots[targetSlot]) {
          setTimeout(() => onRevealed?.(filledSlots[targetSlot]), 400);
        }
        // Confetti final
        spawnConfetti();
        return;
      }
      const seg = segments[segIdx];
      const startTime = start;

      const dur = segDuration(segIdx);
      function frame(now: number) {
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / dur);
        // easing leve (sin out)
        const eased = Math.sin((t * Math.PI) / 2);
        const x = seg.fromX + (seg.toX - seg.fromX) * eased;
        const y = seg.fromY + (seg.toY - seg.fromY) * eased;
        // Acumula trail
        trailRef.current.push({ x, y });
        if (trailRef.current.length > 6) trailRef.current.shift();
        setBallPos({ x, y });
        if (t < 1) {
          requestAnimationFrame(frame);
        } else {
          // Final do segmento — se há pinIdx, marca colisão + partículas
          if (seg.pinIdx != null && seg.pinIdx >= 0) {
            setHitPins((prev) => {
              const next = new Set(prev);
              next.add(seg.pinIdx!);
              // Remove após animação
              setTimeout(() => {
                setHitPins((p) => {
                  const n = new Set(p);
                  n.delete(seg.pinIdx!);
                  return n;
                });
              }, 300);
              return next;
            });
            spawnPinParticles(seg.toX, seg.toY);
          }
          segIdx++;
          requestAnimationFrame(runSegment);
        }
      }
      requestAnimationFrame(frame);
    }

    requestAnimationFrame(runSegment);
  }

  function spawnPinParticles(x: number, y: number) {
    const colors = ["#FFD54F", "#FFFFFF", buttonColor];
    const newOnes = Array.from({ length: 5 }, (_, i) => ({
      id: Math.random(),
      x,
      y,
      dx: (Math.random() - 0.5) * 30,
      dy: -Math.random() * 25 - 5,
      color: colors[i % colors.length],
    }));
    setParticles((prev) => [...prev, ...newOnes]);
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !newOnes.find((n) => n.id === p.id)));
    }, 500);
  }

  function spawnConfetti() {
    const slotX = laneX(targetSlot);
    const slotY = VIEW_H - SLOTS_AREA / 2;
    const colors = ["#FFD54F", "#42A5F5", "#66BB6A", "#EF5350", "#AB47BC", buttonColor];
    const burst = Array.from({ length: 30 }, () => ({
      id: Math.random(),
      x: slotX,
      y: slotY,
      dx: (Math.random() - 0.5) * 200,
      dy: -Math.random() * 220 - 40,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    setParticles((prev) => [...prev, ...burst]);
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !burst.find((b) => b.id === p.id)));
    }, 1500);
    forceTick((n) => n + 1);
  }

  // ── Drag handlers ──
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  function laneFromClient(clientX: number) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return dragLane;
    const relX = (clientX - rect.left) / rect.width;
    const lane = Math.max(0, Math.min(slotsCount - 1, Math.round(relX * slotsCount - 0.5)));
    return lane;
  }
  function onPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    if (phase !== "aim") return;
    dragging.current = true;
    setDragLane(laneFromClient(e.clientX));
  }
  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!dragging.current || phase !== "aim") return;
    setDragLane(laneFromClient(e.clientX));
  }
  function onPointerUp() { dragging.current = false; }

  if (filledSlots.length === 0) {
    return (
      <div className="text-center p-6 text-sm opacity-80">
        Nenhum prêmio configurado pra mostrar.
      </div>
    );
  }

  const trail = trailRef.current;

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
        style={{ touchAction: "none", borderRadius: 16, overflow: "hidden", boxShadow: "0 12px 40px rgba(0,0,0,0.4)" }}
      >
        <defs>
          {/* Fundo do tabuleiro */}
          <linearGradient id="boardBg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e1b4b" />
            <stop offset="50%" stopColor="#312e81" />
            <stop offset="100%" stopColor="#1a1a2e" />
          </linearGradient>
          {/* Pino metálico */}
          <radialGradient id="pinGradient" cx="0.3" cy="0.3">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="40%" stopColor="#D1D5DB" />
            <stop offset="100%" stopColor="#4B5563" />
          </radialGradient>
          {/* Pino glow quando hit */}
          <radialGradient id="pinGlow" cx="0.5" cy="0.5">
            <stop offset="0%" stopColor={buttonColor} stopOpacity="0.9" />
            <stop offset="100%" stopColor={buttonColor} stopOpacity="0" />
          </radialGradient>
          {/* Bolinha */}
          <radialGradient id="ballGradient" cx="0.35" cy="0.35">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="30%" stopColor={buttonColor} stopOpacity="0.95" />
            <stop offset="100%" stopColor="#7C2D12" />
          </radialGradient>
          {/* Filtro de glow */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="ballGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
          {/* Pattern de "estrelas" sutil pro fundo */}
          <pattern id="stars" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="5" cy="8" r="0.8" fill="#FFFFFF" opacity="0.3" />
            <circle cx="22" cy="30" r="0.5" fill="#FFFFFF" opacity="0.4" />
            <circle cx="35" cy="15" r="0.6" fill="#FFFFFF" opacity="0.25" />
          </pattern>
        </defs>

        {/* Fundo */}
        <rect width={VIEW_W} height={VIEW_H} fill="url(#boardBg)" />
        <rect width={VIEW_W} height={VIEW_H} fill="url(#stars)" />

        {/* Borda interna */}
        <rect
          x="3"
          y="3"
          width={VIEW_W - 6}
          height={VIEW_H - 6}
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="1"
          rx="14"
        />

        {/* Luzes piscando ao redor (cassino) — distribuídas no perímetro */}
        <BorderLights buttonColor={buttonColor} />

        {/* Linha pontilhada de mira (durante aim) */}
        {phase === "aim" && (
          <line
            x1={laneX(dragLane)}
            y1={45}
            x2={laneX(dragLane)}
            y2={PINS_TOP - 10}
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="2"
            strokeDasharray="4 4"
          />
        )}

        {/* Pinos */}
        {pins.map((pin, idx) => {
          const isHit = hitPins.has(idx);
          return (
            <g key={idx}>
              {isHit && (
                <circle cx={pin.x} cy={pin.y} r={PIN_RADIUS * 4} fill="url(#pinGlow)" />
              )}
              <circle
                cx={pin.x}
                cy={pin.y}
                r={isHit ? PIN_RADIUS * 1.3 : PIN_RADIUS}
                fill="url(#pinGradient)"
                stroke="rgba(255,255,255,0.4)"
                strokeWidth="0.5"
                style={{ transition: "r 0.2s" }}
              />
              {/* Highlight especular */}
              <circle cx={pin.x - 1} cy={pin.y - 1} r={PIN_RADIUS * 0.4} fill="rgba(255,255,255,0.6)" />
            </g>
          );
        })}

        {/* Trail da bolinha (atrás da bolinha) */}
        {trail.map((t, i) => (
          <circle
            key={i}
            cx={t.x}
            cy={t.y}
            r={BALL_RADIUS * ((i + 1) / (trail.length + 1))}
            fill={buttonColor}
            opacity={0.15 * ((i + 1) / trail.length)}
          />
        ))}

        {/* Bolinha */}
        <g>
          <circle cx={ballPos.x} cy={ballPos.y} r={BALL_RADIUS + 4} fill={buttonColor} opacity="0.3" filter="url(#ballGlow)" />
          <circle
            cx={ballPos.x}
            cy={ballPos.y}
            r={BALL_RADIUS}
            fill="url(#ballGradient)"
            stroke="rgba(255,255,255,0.6)"
            strokeWidth="1"
          />
          <circle cx={ballPos.x - 2.5} cy={ballPos.y - 2.5} r={2.5} fill="rgba(255,255,255,0.85)" />
        </g>

        {/* Partículas (faíscas + confetti) */}
        {particles.map((p) => (
          <ConfettiParticle key={p.id} x={p.x} y={p.y} dx={p.dx} dy={p.dy} color={p.color} />
        ))}

        {/* Slots */}
        <g>
          {filledSlots.map((prize, i) => {
            const slotX = i * colGap;
            const slotY = VIEW_H - SLOTS_AREA;
            const isTarget = phase === "done" && i === targetSlot;
            return (
              <g key={prize.id || i}>
                {/* Divisória (parede esquerda) */}
                {i > 0 && (
                  <line
                    x1={slotX}
                    y1={slotY - 8}
                    x2={slotX}
                    y2={VIEW_H}
                    stroke="rgba(255,255,255,0.6)"
                    strokeWidth="1.5"
                  />
                )}
                {/* Fundo do slot com cor do prêmio */}
                <rect
                  x={slotX + 2}
                  y={slotY}
                  width={colGap - 4}
                  height={SLOTS_AREA}
                  fill={prize.color ?? "#FFB300"}
                  opacity={isTarget ? 1 : 0.85}
                  rx="4"
                />
                {/* Glow no slot vencedor */}
                {isTarget && (
                  <rect
                    x={slotX}
                    y={slotY - 4}
                    width={colGap}
                    height={SLOTS_AREA + 8}
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                    rx="6"
                  >
                    <animate attributeName="opacity" values="0.3;1;0.3" dur="0.8s" repeatCount="indefinite" />
                  </rect>
                )}
                {/* Conteúdo */}
                {prize.imageUrl ? (
                  <image
                    href={prize.imageUrl}
                    x={slotX + (colGap - 36) / 2}
                    y={slotY + 8}
                    width="36"
                    height="36"
                    preserveAspectRatio="xMidYMid slice"
                    style={{ clipPath: "circle(18px at 18px 18px)" }}
                  />
                ) : (
                  <text
                    x={slotX + colGap / 2}
                    y={slotY + 32}
                    textAnchor="middle"
                    fontSize="26"
                    style={{ pointerEvents: "none" }}
                  >
                    {prize.icon ?? "🎁"}
                  </text>
                )}
                <text
                  x={slotX + colGap / 2}
                  y={slotY + SLOTS_AREA - 12}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="700"
                  fill="rgba(255,255,255,0.95)"
                  style={{ pointerEvents: "none" }}
                >
                  {truncate(prize.label, 10)}
                </text>
              </g>
            );
          })}
        </g>

        {/* Texto de instrução no topo */}
        {phase === "aim" && (
          <text
            x={VIEW_W / 2}
            y={20}
            textAnchor="middle"
            fontSize="11"
            fontWeight="700"
            fill="rgba(255,255,255,0.85)"
            style={{ letterSpacing: 1 }}
          >
            ✦ ARRASTE E SOLTE ✦
          </text>
        )}
      </svg>

      {/* Botão SOLTAR (visível só em fase aim e não autoReveal) */}
      {phase === "aim" && !autoReveal && (
        <button
          type="button"
          onClick={launch}
          className="mt-5 px-8 py-3 rounded-full font-bold text-base shadow-lg hover:scale-105 active:scale-95 transition-transform text-white"
          style={{ backgroundColor: buttonColor }}
        >
          🎯 SOLTAR BOLINHA
        </button>
      )}
      {phase === "done" && filledSlots[targetSlot] && (
        <div className="mt-4 text-center">
          <div className="text-lg font-bold">🎉 {filledSlots[targetSlot].label}</div>
        </div>
      )}
    </div>
  );
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

// ─────────────────────────────────────────────────
// Luzes piscando no perímetro (cassino)
// ─────────────────────────────────────────────────
function BorderLights({ buttonColor }: { buttonColor: string }) {
  // Distribui pontos ao redor do retângulo (top + bottom + sides)
  const lights: { x: number; y: number; idx: number }[] = [];
  const stepX = 18;
  const stepY = 22;
  // Top + bottom
  for (let x = 12; x < VIEW_W - 12; x += stepX) {
    lights.push({ x, y: 8, idx: lights.length });
    lights.push({ x, y: VIEW_H - 8, idx: lights.length });
  }
  // Left + right
  for (let y = 28; y < VIEW_H - 28; y += stepY) {
    lights.push({ x: 8, y, idx: lights.length });
    lights.push({ x: VIEW_W - 8, y, idx: lights.length });
  }

  const colors = ["#FFD54F", "#FFFFFF", buttonColor, "#42A5F5", "#EF5350", "#66BB6A"];

  return (
    <g>
      {lights.map((l) => {
        const color = colors[l.idx % colors.length];
        const delay = (l.idx * 0.13) % 1.5;
        return (
          <circle key={l.idx} cx={l.x} cy={l.y} r="2.4" fill={color} opacity="0.5">
            <animate
              attributeName="opacity"
              values="0.2;1;0.2"
              dur="1.4s"
              begin={`${delay}s`}
              repeatCount="indefinite"
            />
            <animate
              attributeName="r"
              values="1.8;3.2;1.8"
              dur="1.4s"
              begin={`${delay}s`}
              repeatCount="indefinite"
            />
          </circle>
        );
      })}
    </g>
  );
}

// ─────────────────────────────────────────────────
// Partícula de confetti / faísca (SVG animado)
// ─────────────────────────────────────────────────
function ConfettiParticle({ x, y, dx, dy, color }: { x: number; y: number; dx: number; dy: number; color: string }) {
  const [pos, setPos] = useState({ x, y });
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    const startTime = performance.now();
    let raf = 0;
    function tick(now: number) {
      const t = (now - startTime) / 1000; // s
      const px = x + dx * t;
      const py = y + dy * t + 350 * t * t; // gravidade
      setPos({ x: px, y: py });
      setOpacity(Math.max(0, 1 - t * 1.2));
      if (t < 1.2) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [x, y, dx, dy]);

  return (
    <rect
      x={pos.x - 2}
      y={pos.y - 2}
      width={3}
      height={5}
      fill={color}
      opacity={opacity}
      transform={`rotate(${pos.x * 5}, ${pos.x}, ${pos.y})`}
    />
  );
}
