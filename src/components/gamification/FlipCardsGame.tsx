import { useEffect, useMemo, useState } from "react";
import type { PrizeDefinition } from "../prizes/PrizePoolEditor";

interface Props {
  prizes: PrizeDefinition[];
  winningPrizeIndex?: number;
  buttonColor?: string;
  autoReveal?: boolean;
  onRevealed?: (prize: PrizeDefinition) => void;
  logoUrl?: string | null;
}

type Phase = "aim" | "revealing" | "done";

function layout(count: number): { cols: number; rows: number } {
  if (count <= 4) return { cols: 2, rows: 2 };
  if (count <= 6) return { cols: 3, rows: 2 };
  if (count <= 9) return { cols: 3, rows: 3 };
  return { cols: 3, rows: 3 };
}

export default function FlipCardsGame({
  prizes,
  winningPrizeIndex,
  buttonColor = "#FF6B35",
  autoReveal,
  onRevealed,
  logoUrl,
}: Props) {
  const realPrizes = useMemo(() => prizes.filter((p) => p.type !== "try_again"), [prizes]);
  const winningPrize = winningPrizeIndex != null && winningPrizeIndex < prizes.length
    ? prizes[winningPrizeIndex]
    : null;

  const cardCount = Math.min(9, Math.max(4, realPrizes.length || 4));
  const { cols } = layout(cardCount);

  const cardsContent = useMemo<PrizeDefinition[]>(() => {
    if (realPrizes.length === 0) return [];
    const arr: PrizeDefinition[] = [];
    for (let i = 0; i < cardCount; i++) arr.push(realPrizes[i % realPrizes.length]);
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realPrizes, cardCount]);

  const [phase, setPhase] = useState<Phase>("aim");
  const [clickedIdx, setClickedIdx] = useState<number | null>(null);
  const [flippedIdx, setFlippedIdx] = useState<Set<number>>(new Set());

  const finalContent = useMemo<PrizeDefinition[]>(() => {
    if (clickedIdx == null || !winningPrize) return cardsContent;
    const arr = [...cardsContent];
    arr[clickedIdx] = winningPrize;
    return arr;
  }, [cardsContent, clickedIdx, winningPrize]);

  function handleClick(i: number) {
    if (phase !== "aim" || !winningPrize) return;
    setClickedIdx(i);
    setPhase("revealing");
    setFlippedIdx(new Set([i]));

    // Depois de revelar a clicada, vira as outras em sequência
    setTimeout(() => {
      const all = new Set<number>();
      for (let j = 0; j < cardCount; j++) all.add(j);
      setFlippedIdx(all);
    }, 900);

    setTimeout(() => {
      setPhase("done");
      onRevealed?.(winningPrize);
    }, 2100);
  }

  useEffect(() => {
    if (!autoReveal || phase !== "aim") return;
    const t = setTimeout(() => {
      const idx = Math.floor(Math.random() * cardCount);
      handleClick(idx);
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
        width: "100%",
        maxWidth: 420,
        margin: "0 auto",
        position: "relative",
      }}
    >
      {/* Grid de cartas */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 12,
          padding: 8,
        }}
      >
        {finalContent.map((prize, i) => (
          <FlipCard
            key={i}
            prize={prize}
            flipped={flippedIdx.has(i)}
            phase={phase}
            buttonColor={buttonColor}
            logoUrl={logoUrl}
            delay={flippedIdx.has(i) && i !== clickedIdx ? i * 90 : 0}
            onClick={() => handleClick(i)}
          />
        ))}
      </div>

      {/* Instrução / resultado */}
      <div style={{ textAlign: "center", marginTop: 14, minHeight: 32 }}>
        {phase === "aim" && (
          <div
            style={{
              display: "inline-block",
              padding: "8px 18px",
              background: "rgba(0,0,0,0.55)",
              color: "white",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            🃏 ESCOLHA UMA CARTA E REVELE SEU PRÊMIO
          </div>
        )}
        {phase === "done" && winningPrize && (
          <div
            style={{
              display: "inline-block",
              padding: "12px 24px",
              background: buttonColor,
              color: "white",
              borderRadius: 16,
              fontSize: 18,
              fontWeight: 900,
              letterSpacing: 1,
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
              border: "3px solid white",
              animation: "popIn 0.5s ease-out",
            }}
          >
            🎉 {winningPrize.label}
          </div>
        )}
      </div>

      {/* Keyframes inline */}
      <style>{`
        @keyframes popIn {
          0% { transform: scale(0.5); opacity: 0; }
          80% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes shimmer {
          0%, 100% { box-shadow: 0 6px 20px rgba(0,0,0,0.45); }
          50% { box-shadow: 0 6px 26px rgba(255,255,255,0.25), 0 6px 20px rgba(0,0,0,0.45); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────
function FlipCard({
  prize,
  flipped,
  phase,
  buttonColor,
  logoUrl,
  delay,
  onClick,
}: {
  prize: PrizeDefinition;
  flipped: boolean;
  phase: Phase;
  buttonColor: string;
  logoUrl?: string | null;
  delay: number;
  onClick: () => void;
}) {
  const isInteractive = phase === "aim";

  return (
    <div
      onClick={isInteractive ? onClick : undefined}
      style={{
        perspective: 1200,
        cursor: isInteractive ? "pointer" : "default",
        aspectRatio: "3 / 4",
        animation: isInteractive ? "float 3s ease-in-out infinite" : undefined,
        animationDelay: `${delay}ms`,
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          transformStyle: "preserve-3d",
          transition: `transform 0.7s cubic-bezier(0.4, 0, 0.2, 1) ${delay}ms`,
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* VERSO da carta — logo do tenant */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            borderRadius: 12,
            overflow: "hidden",
            background: `linear-gradient(135deg, #1e293b 0%, #0f172a 100%)`,
            border: `3px solid ${buttonColor}`,
            boxShadow: `0 6px 20px rgba(0,0,0,0.5), inset 0 0 30px ${buttonColor}40`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 8,
            transition: "transform 0.2s, box-shadow 0.2s",
            animation: isInteractive && !flipped ? "shimmer 2.4s ease-in-out infinite" : undefined,
          }}
          onMouseEnter={(e) => {
            if (!isInteractive) return;
            e.currentTarget.style.transform = "scale(1.04)";
          }}
          onMouseLeave={(e) => {
            if (!isInteractive) return;
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          {/* Padrão decorativo de fundo */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `radial-gradient(circle at center, ${buttonColor}25 0%, transparent 70%)`,
            }}
          />
          {/* Borda interna */}
          <div
            style={{
              position: "absolute",
              inset: 8,
              border: `1px dashed ${buttonColor}80`,
              borderRadius: 8,
              pointerEvents: "none",
            }}
          />
          {/* Logo ou "?" */}
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Logo"
              draggable={false}
              style={{
                width: "78%",
                height: "78%",
                objectFit: "contain",
                filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.6))",
                position: "relative",
                zIndex: 1,
              }}
            />
          ) : (
            <div
              style={{
                fontSize: "5rem",
                fontWeight: 900,
                fontFamily: "Impact, system-ui, sans-serif",
                color: buttonColor,
                textShadow: "0 4px 12px rgba(0,0,0,0.6)",
                lineHeight: 1,
                position: "relative",
                zIndex: 1,
              }}
            >
              ?
            </div>
          )}
        </div>

        {/* FRENTE da carta — prêmio */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            borderRadius: 12,
            overflow: "hidden",
            background: prize.color || "#FFB300",
            boxShadow: "0 6px 24px rgba(0,0,0,0.55)",
            display: "flex",
            flexDirection: "column",
            border: "3px solid white",
          }}
        >
          {/* Imagem do prêmio ocupando topo */}
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              background: "rgba(0,0,0,0.05)",
            }}
          >
            {prize.imageUrl ? (
              <img
                src={prize.imageUrl}
                alt={prize.label}
                draggable={false}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <div style={{ fontSize: "6rem", lineHeight: 1 }}>{prize.icon ?? "🎁"}</div>
            )}
          </div>
          {/* Nome do prêmio */}
          <div
            style={{
              padding: "8px 6px",
              background: "rgba(0,0,0,0.85)",
              color: "white",
              textAlign: "center",
              fontSize: 13,
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: 0.3,
            }}
          >
            {prize.label}
          </div>
        </div>
      </div>
    </div>
  );
}
