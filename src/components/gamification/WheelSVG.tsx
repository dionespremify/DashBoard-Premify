import { useEffect, useMemo, useRef, useState } from "react";
import type { PrizeDefinition } from "../prizes/PrizePoolEditor";

export type WheelTheme = "classic" | "vegas" | "neon";

interface WheelSVGProps {
  prizes: PrizeDefinition[];
  /** Índice do PRÊMIO (não da fatia) que a roleta deve premiar */
  winningPrizeIndex?: number;
  /** Inicia animação ao montar */
  autoSpin?: boolean;
  /** Tamanho em px */
  size?: number;
  /** Tema visual */
  theme?: WheelTheme;
  /** Logo do tenant pra exibir no centro da roleta */
  centerLogoUrl?: string | null;
  /** Disparado quando a animação termina */
  onSpinEnd?: (prize: PrizeDefinition) => void;
}

const DEFAULT_COLORS = ["#FFB300", "#42A5F5", "#66BB6A", "#EF5350", "#AB47BC", "#26A69A", "#FFA726", "#5C6BC0"];

interface ExpandedSlice {
  prize: PrizeDefinition;
  prizeIndex: number;
  sliceIndex: number;
  color: string;
}

export default function WheelSVG({
  prizes,
  winningPrizeIndex,
  autoSpin = false,
  size = 320,
  theme = "classic",
  centerLogoUrl,
  onSpinEnd,
}: WheelSVGProps) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const wheelRef = useRef<SVGGElement>(null);
  const animationStartedRef = useRef(false);

  // Filtra prêmios visíveis e distribui as fatias INTERCALADAS (round-robin)
  // assim 2 fatias do mesmo prêmio não ficam grudadas — vira "AABCABC" em vez de "AAABBC".
  const slices: ExpandedSlice[] = useMemo(() => {
    const visible = prizes.filter((p) => p.type !== "try_again");
    if (visible.length === 0) return [];

    const pool = visible.map((prize, prizeIndex) => ({
      prize,
      prizeIndex,
      color: prize.color || DEFAULT_COLORS[prizeIndex % DEFAULT_COLORS.length],
      remaining: Math.max(1, prize.slices ?? 1),
    }));

    const out: ExpandedSlice[] = [];
    // Round-robin: a cada passagem pega 1 fatia de cada prêmio que ainda tem cota.
    let safety = 1000; // evita loop infinito em algum cenário inesperado
    while (pool.some((p) => p.remaining > 0) && safety-- > 0) {
      for (const item of pool) {
        if (item.remaining > 0) {
          out.push({
            prize: item.prize,
            prizeIndex: item.prizeIndex,
            sliceIndex: out.length,
            color: item.color,
          });
          item.remaining--;
        }
      }
    }
    return out;
  }, [prizes]);

  const sliceCount = slices.length;
  const sliceAngle = sliceCount > 0 ? 360 / sliceCount : 360;

  useEffect(() => {
    if (autoSpin && winningPrizeIndex !== undefined && winningPrizeIndex >= 0 && !animationStartedRef.current) {
      animationStartedRef.current = true;
      // Escolhe aleatoriamente uma das fatias do prêmio vencedor
      const candidateSlices = slices.filter((s) => s.prizeIndex === winningPrizeIndex);
      if (candidateSlices.length === 0) return;
      const targetSlice = candidateSlices[Math.floor(Math.random() * candidateSlices.length)];
      spinTo(targetSlice.sliceIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSpin, winningPrizeIndex, slices]);

  function spinTo(sliceIdx: number) {
    if (spinning) return;
    if (sliceIdx < 0 || sliceIdx >= sliceCount) return;

    const targetCenterAngle = sliceIdx * sliceAngle + sliceAngle / 2;
    const extraTurns = 6;
    const finalRotation = -(extraTurns * 360 + targetCenterAngle);

    setSpinning(true);
    setRotation(finalRotation);

    setTimeout(() => {
      setSpinning(false);
      onSpinEnd?.(slices[sliceIdx].prize);
    }, 4200);
  }

  const center = size / 2;
  const outerMargin = theme === "vegas" ? 28 : theme === "neon" ? 18 : 12;
  const radius = center - outerMargin;

  if (slices.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-300 rounded-full w-full max-w-[300px] aspect-square"
        style={{ maxWidth: size }}
      >
        Sem prêmios configurados
      </div>
    );
  }

  // ─── Estilo do tema ───
  const themeStyle = getThemeStyle(theme);

  return (
    <div className="relative w-full aspect-square" style={{ maxWidth: size }}>
      {/* Halo/glow externo (neon e vegas) */}
      {(theme === "neon" || theme === "vegas") && (
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            boxShadow:
              theme === "neon"
                ? "0 0 60px 8px rgba(255, 0, 200, 0.6), 0 0 30px 4px rgba(0, 200, 255, 0.5) inset"
                : "0 0 30px 4px rgba(255, 215, 0, 0.6)",
          }}
        />
      )}

      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full block">
        <defs>
          <filter id={`neonGlow-${theme}`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Anel externo decorativo */}
        {theme === "vegas" && (
          <circle
            cx={center}
            cy={center}
            r={radius + 14}
            fill="none"
            stroke="url(#goldGradient)"
            strokeWidth={6}
          />
        )}
        {theme === "neon" && (
          <circle
            cx={center}
            cy={center}
            r={radius + 10}
            fill="none"
            stroke="#ff00ff"
            strokeWidth={4}
            opacity={0.8}
            filter={`url(#neonGlow-${theme})`}
          />
        )}

        <defs>
          <linearGradient id="goldGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFD700" />
            <stop offset="50%" stopColor="#FFA500" />
            <stop offset="100%" stopColor="#FFD700" />
          </linearGradient>
        </defs>

        {/* Luzes piscando (vegas) */}
        {theme === "vegas" && <VegasLights cx={center} cy={center} r={radius + 14} count={20} />}

        <g
          ref={wheelRef}
          style={{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: `${center}px ${center}px`,
            transition: spinning ? "transform 4s cubic-bezier(0.17, 0.67, 0.22, 1)" : "none",
            filter: theme === "neon" ? `url(#neonGlow-${theme})` : undefined,
          }}
        >
          {slices.map((slice, i) => {
            const startAngle = i * sliceAngle - 90;
            const endAngle = (i + 1) * sliceAngle - 90;
            const path = describeSlice(center, center, radius, startAngle, endAngle);

            // Posição central da fatia
            const midAngle = (startAngle + endAngle) / 2;
            const textRadius = radius * 0.6;
            const tx = center + textRadius * Math.cos((midAngle * Math.PI) / 180);
            const ty = center + textRadius * Math.sin((midAngle * Math.PI) / 180);

            // Sem texto na roleta — só imagem/ícone (maiores e centralizados)
            const imgSize = Math.max(40, size * 0.16);

            return (
              <g key={`slice-${i}`}>
                <path
                  d={path}
                  fill={slice.color}
                  stroke={themeStyle.sliceBorder}
                  strokeWidth={themeStyle.sliceBorderWidth}
                />

                {slice.prize.imageUrl ? (
                  <g transform={`rotate(${midAngle + 90} ${tx} ${ty})`}>
                    <image
                      href={slice.prize.imageUrl}
                      x={tx - imgSize / 2}
                      y={ty - imgSize / 2}
                      width={imgSize}
                      height={imgSize}
                      preserveAspectRatio="xMidYMid slice"
                      clipPath={`circle(${imgSize / 2}px at ${imgSize / 2}px ${imgSize / 2}px)`}
                    />
                  </g>
                ) : (
                  <text
                    x={tx}
                    y={ty}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${midAngle + 90} ${tx} ${ty})`}
                    className="select-none pointer-events-none"
                    style={{
                      fontSize: size * 0.085,
                    }}
                  >
                    {slice.prize.icon ?? "🎁"}
                  </text>
                )}
              </g>
            );
          })}
        </g>

        {/* Círculo central + logo (se houver) */}
        <defs>
          <clipPath id={`center-logo-clip-${theme}`}>
            <circle cx={center} cy={center} r={size * 0.085} />
          </clipPath>
        </defs>

        <circle
          cx={center}
          cy={center}
          r={size * 0.11}
          fill={themeStyle.centerFill}
          stroke={themeStyle.centerStroke}
          strokeWidth={3}
        />

        {centerLogoUrl ? (
          <image
            href={centerLogoUrl}
            x={center - size * 0.085}
            y={center - size * 0.085}
            width={size * 0.17}
            height={size * 0.17}
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#center-logo-clip-${theme})`}
          />
        ) : (
          <circle
            cx={center}
            cy={center}
            r={size * 0.04}
            fill={themeStyle.centerDot}
          />
        )}
      </svg>

      {/* Ponteiro */}
      <div className="absolute left-1/2 -translate-x-1/2" style={{ top: -2 }}>
        <svg width={32} height={42} viewBox="0 0 32 42">
          <path
            d="M16 36 L3 6 L29 6 Z"
            fill={themeStyle.pointerFill}
            stroke={themeStyle.pointerStroke}
            strokeWidth={2.5}
          />
        </svg>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Luzes piscando do tema Vegas
// ─────────────────────────────────────────────────
function VegasLights({ cx, cy, r, count }: { cx: number; cy: number; r: number; count: number }) {
  const lights = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    const odd = i % 2 === 0;
    return { x, y, odd, idx: i };
  });

  return (
    <>
      {lights.map(({ x, y, odd, idx }) => (
        <circle
          key={idx}
          cx={x}
          cy={y}
          r={4}
          fill={odd ? "#FFD700" : "#FF4444"}
          style={{
            animation: `blink-${odd ? "a" : "b"} 0.8s ease-in-out infinite`,
            animationDelay: `${(idx * 60) % 800}ms`,
          }}
        />
      ))}
      <style>{`
        @keyframes blink-a { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes blink-b { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
      `}</style>
    </>
  );
}

// ─────────────────────────────────────────────────
// Estilo por tema
// ─────────────────────────────────────────────────
function getThemeStyle(theme: WheelTheme) {
  switch (theme) {
    case "vegas":
      return {
        sliceBorder: "#FFD700",
        sliceBorderWidth: 3,
        textColor: "white",
        centerFill: "#FFD700",
        centerStroke: "#8B4513",
        centerDot: "#8B4513",
        pointerFill: "#DC143C",
        pointerStroke: "#FFD700",
      };
    case "neon":
      return {
        sliceBorder: "#00FFFF",
        sliceBorderWidth: 2,
        textColor: "white",
        centerFill: "#1a0033",
        centerStroke: "#ff00ff",
        centerDot: "#00FFFF",
        pointerFill: "#ff00ff",
        pointerStroke: "#00FFFF",
      };
    case "classic":
    default:
      return {
        sliceBorder: "white",
        sliceBorderWidth: 2,
        textColor: "white",
        centerFill: "white",
        centerStroke: "#333",
        centerDot: "#333",
        pointerFill: "#222",
        pointerStroke: "white",
      };
  }
}

// ─────────────────────────────────────────────────
// Helpers de geometria SVG
// ─────────────────────────────────────────────────
function describeSlice(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? "0" : "1";
  return ["M", cx, cy, "L", start.x, start.y, "A", r, r, 0, largeArc, 0, end.x, end.y, "Z"].join(" ");
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

