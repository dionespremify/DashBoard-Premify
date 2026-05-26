import { useEffect, useRef, useState } from "react";
import type { PrizeDefinition } from "../prizes/PrizePoolEditor";

interface ScratchCardProps {
  prizes: PrizeDefinition[];
  winningPrizeIndex?: number;
  autoReveal?: boolean;
  buttonColor?: string;
  onRevealed?: (prize: PrizeDefinition) => void;
  size?: number;
}

const SCRATCH_RADIUS = 28;
const REVEAL_THRESHOLD = 0.55; // 55% raspado → auto-revela tudo

export default function ScratchCard({
  prizes,
  winningPrizeIndex,
  autoReveal,
  buttonColor = "#FF6B35",
  onRevealed,
  size = 320,
}: ScratchCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const drawing = useRef(false);
  const revealedRef = useRef(false);
  const [revealed, setRevealed] = useState(false);

  const prize = winningPrizeIndex != null ? prizes[winningPrizeIndex] : null;

  // Inicializa a "tinta" do canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Resolução nítida em telas retina
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    // Camada raspável: gradiente metálico/foil
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, "#9CA3AF");
    gradient.addColorStop(0.3, "#D1D5DB");
    gradient.addColorStop(0.5, "#E5E7EB");
    gradient.addColorStop(0.7, "#D1D5DB");
    gradient.addColorStop(1, "#9CA3AF");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    // Texto "RASPE AQUI" pra indicar ação
    ctx.fillStyle = "#4B5563";
    ctx.font = `bold ${Math.floor(size / 14)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("✨ RASPE AQUI ✨", size / 2, size / 2);
    ctx.font = `${Math.floor(size / 22)}px sans-serif`;
    ctx.fillText("e descubra seu prêmio", size / 2, size / 2 + Math.floor(size / 12));

    revealedRef.current = false;
    setRevealed(false);
  }, [size, winningPrizeIndex]);

  // Auto-reveal se passar como prop
  useEffect(() => {
    if (autoReveal && !revealedRef.current) {
      finishReveal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoReveal]);

  function getPos(e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const t = e.touches[0] ?? e.changedTouches[0];
      if (!t) return null;
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function scratchAt(x: number, y: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, SCRATCH_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }

  function checkProgress() {
    const canvas = canvasRef.current;
    if (!canvas || revealedRef.current) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Amostra: pega pixels num grid 20x20 e conta quantos têm alpha 0
    const dpr = window.devicePixelRatio || 1;
    const sampleSize = 20;
    const stepX = (size * dpr) / sampleSize;
    const stepY = (size * dpr) / sampleSize;
    let cleared = 0;
    for (let i = 0; i < sampleSize; i++) {
      for (let j = 0; j < sampleSize; j++) {
        const data = ctx.getImageData(Math.floor(i * stepX), Math.floor(j * stepY), 1, 1).data;
        if (data[3] < 30) cleared++;
      }
    }
    const ratio = cleared / (sampleSize * sampleSize);
    if (ratio >= REVEAL_THRESHOLD) {
      finishReveal();
    }
  }

  function finishReveal() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Limpa todo o canvas com fade
    canvas.style.transition = "opacity 0.5s";
    canvas.style.opacity = "0";
    revealedRef.current = true;
    setTimeout(() => {
      ctx.clearRect(0, 0, size, size);
      canvas.style.pointerEvents = "none";
      setRevealed(true);
      if (prize) onRevealed?.(prize);
    }, 500);
  }

  // Handlers
  function handleStart(e: React.MouseEvent | React.TouchEvent) {
    if (revealedRef.current) return;
    drawing.current = true;
    const pos = getPos(e);
    if (pos) scratchAt(pos.x, pos.y);
  }
  function handleMove(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing.current || revealedRef.current) return;
    const pos = getPos(e);
    if (pos) scratchAt(pos.x, pos.y);
    if ("preventDefault" in e) e.preventDefault();
  }
  function handleEnd() {
    if (!drawing.current) return;
    drawing.current = false;
    checkProgress();
  }

  return (
    <div ref={containerRef} className="flex flex-col items-center select-none" style={{ width: size }}>
      <div
        className="relative rounded-2xl overflow-hidden shadow-2xl"
        style={{
          width: size,
          height: size,
          backgroundColor: prize?.color ?? "#FFB300",
        }}
      >
        {/* Camada com o prêmio (sempre embaixo) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
          {prize?.imageUrl ? (
            <img src={prize.imageUrl} alt={prize.label} className="w-32 h-32 object-cover rounded-xl mb-3" />
          ) : (
            <div className="text-7xl mb-3">{prize?.icon ?? "🎁"}</div>
          )}
          <div className="text-xl font-bold text-white drop-shadow-md">{prize?.label ?? "Surpresa!"}</div>
          {revealed && (
            <div className="mt-3 text-3xl animate-bounce">🎉</div>
          )}
        </div>

        {/* Canvas raspável (em cima) */}
        <canvas
          ref={canvasRef}
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
          className="absolute inset-0 cursor-grab active:cursor-grabbing touch-none"
        />
      </div>

      {!revealed && (
        <p className="mt-4 text-sm opacity-80 text-center">
          Use o dedo (ou o mouse) pra raspar a área cinza
        </p>
      )}
      {revealed && (
        <button
          type="button"
          className="mt-5 px-6 py-3 rounded-full font-semibold text-white shadow-lg hover:scale-105 transition-transform"
          style={{ backgroundColor: buttonColor }}
          disabled
        >
          ✨ Você ganhou: {prize?.label ?? "um prêmio"}!
        </button>
      )}
    </div>
  );
}
