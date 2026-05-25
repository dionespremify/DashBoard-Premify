import { useEffect, useMemo, useRef } from "react";
import type { PrizeDefinition } from "../prizes/PrizePoolEditor";

interface Props {
  prize: PrizeDefinition;
  rewardCode?: string;
  onClose: () => void;
  buttonColor?: string;
  /** Caminho do arquivo de som. Drope um mp3 em /public/sounds/celebration.mp3 que ele toca. */
  soundUrl?: string;
}

const PARTICLE_COUNT = 60;
const FIREWORK_COLORS = ["#FFD700", "#FF4444", "#42A5F5", "#66BB6A", "#AB47BC", "#FF6B35", "#FFA726", "#00E5FF"];

interface Particle {
  id: number;
  angle: number;
  distance: number;
  delay: number;
  duration: number;
  color: string;
  size: number;
  originX: number;
  originY: number;
}

export default function CelebrationModal({
  prize,
  rewardCode,
  onClose,
  buttonColor = "#FF6B35",
  soundUrl = "/sounds/celebration.mp3",
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Gera partículas pseudo-aleatórias (estáveis durante o ciclo de vida do modal)
  const particles = useMemo<Particle[]>(() => {
    const explosions = [
      { x: 25, y: 30 },
      { x: 75, y: 25 },
      { x: 50, y: 50 },
      { x: 30, y: 70 },
      { x: 80, y: 65 },
    ];
    const out: Particle[] = [];
    let id = 0;
    explosions.forEach((origin, eIdx) => {
      const count = Math.floor(PARTICLE_COUNT / explosions.length);
      for (let i = 0; i < count; i++) {
        out.push({
          id: id++,
          angle: (i / count) * 360 + Math.random() * 30,
          distance: 80 + Math.random() * 120,
          delay: eIdx * 200 + Math.random() * 300,
          duration: 1200 + Math.random() * 600,
          color: FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)],
          size: 4 + Math.random() * 4,
          originX: origin.x,
          originY: origin.y,
        });
      }
    });
    return out;
  }, []);

  useEffect(() => {
    if (audioRef.current && soundUrl) {
      audioRef.current.volume = 0.6;
      audioRef.current.play().catch(() => {
        // Autoplay bloqueado ou arquivo ausente — segue silencioso
      });
    }
  }, [soundUrl]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-hidden">
      {/* Áudio (silencioso se /sounds/celebration.mp3 não existir) */}
      {soundUrl && (
        <audio ref={audioRef} preload="auto">
          <source src={soundUrl} type="audio/mpeg" />
        </audio>
      )}

      {/* Fogos de artifício animados (CSS) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {particles.map((p) => {
          const rad = (p.angle * Math.PI) / 180;
          const dx = Math.cos(rad) * p.distance;
          const dy = Math.sin(rad) * p.distance;
          return (
            <span
              key={p.id}
              className="firework-particle"
              style={{
                left: `${p.originX}%`,
                top: `${p.originY}%`,
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
                animationDelay: `${p.delay}ms`,
                animationDuration: `${p.duration}ms`,
                ["--dx" as string]: `${dx}px`,
                ["--dy" as string]: `${dy}px`,
              }}
            />
          );
        })}
      </div>

      {/* Card central */}
      <div className="relative z-10 max-w-sm w-full bg-white rounded-3xl shadow-2xl p-8 text-center animate-pop">
        <div className="text-xl font-medium text-gray-500 uppercase tracking-wider mb-1">
          🎉 Parabéns!
        </div>
        <div className="text-2xl font-bold text-gray-800 mb-5">
          Você ganhou!
        </div>

        {prize.imageUrl ? (
          <div
            className="w-32 h-32 mx-auto mb-4 rounded-2xl overflow-hidden border-4 shadow-lg"
            style={{ borderColor: prize.color || "#FFD700" }}
          >
            <img src={prize.imageUrl} alt={prize.label} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div
            className="w-32 h-32 mx-auto mb-4 rounded-2xl flex items-center justify-center text-6xl shadow-lg"
            style={{ backgroundColor: prize.color || "#FFD700" }}
          >
            {prize.icon ?? "🎁"}
          </div>
        )}

        <div className="text-2xl font-extrabold text-gray-900 mb-2">{prize.label}</div>

        {(prize.type === "discount_percent" && prize.value) ? (
          <div className="text-sm text-gray-600 mb-4">{String(prize.value)}% de desconto</div>
        ) : null}

        {rewardCode && (
          <div className="mb-5 p-3 bg-gray-50 rounded-xl border border-gray-200">
            <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Seu código</div>
            <div className="text-xl font-mono font-bold tracking-wider text-gray-900">
              {rewardCode.split(":").pop()}
            </div>
            <div className="text-xs text-gray-500 mt-1">Apresente no caixa pra resgatar</div>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-xl font-bold text-white shadow-lg hover:scale-105 active:scale-95 transition-transform"
          style={{ backgroundColor: buttonColor }}
        >
          Continuar
        </button>
      </div>

      {/* Animações CSS */}
      <style>{`
        @keyframes firework-burst {
          0%   { transform: translate(0, 0) scale(0); opacity: 1; }
          10%  { transform: translate(calc(var(--dx) * 0.1), calc(var(--dy) * 0.1)) scale(1.2); opacity: 1; }
          70%  { opacity: 1; }
          100% { transform: translate(var(--dx), calc(var(--dy) * 1.2)) scale(0.3); opacity: 0; }
        }
        .firework-particle {
          position: absolute;
          border-radius: 50%;
          transform: translate(0, 0) scale(0);
          opacity: 0;
          animation-name: firework-burst;
          animation-timing-function: cubic-bezier(0.15, 0.7, 0.3, 1);
          animation-iteration-count: infinite;
        }
        @keyframes pop {
          0%   { transform: scale(0.3); opacity: 0; }
          70%  { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); }
        }
        .animate-pop {
          animation: pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </div>
  );
}
