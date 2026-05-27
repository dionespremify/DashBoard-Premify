import { useEffect, useMemo, useState } from "react";
import type { PrizeDefinition } from "../prizes/PrizePoolEditor";

interface Props {
  prizes: PrizeDefinition[];
  winningPrizeIndex?: number;
  buttonColor?: string;
  autoReveal?: boolean;
  onRevealed?: (prize: PrizeDefinition) => void;
  logoUrl?: string | null;
  /** Se true, o cliente sempre acerta. Visualmente mostramos as minas que ele "escapou". */
  everyoneWins?: boolean;
}

// Grid 4 colunas × 5 linhas = 20 células
const COLS = 4;
const ROWS = 5;
const TOTAL = COLS * ROWS;

type CellState = "hidden" | "mine" | "prize";

interface Cell {
  state: CellState;
  prize?: PrizeDefinition; // se state === "prize"
}

export default function MinefieldGame({
  prizes,
  winningPrizeIndex,
  buttonColor = "#FF6B35",
  autoReveal,
  onRevealed,
  logoUrl,
  everyoneWins,
}: Props) {
  const realPrizes = useMemo(() => prizes.filter((p) => p.type !== "try_again"), [prizes]);
  const winningPrize = winningPrizeIndex != null && winningPrizeIndex < prizes.length
    ? prizes[winningPrizeIndex]
    : null;
  const playerLost = !!winningPrize && winningPrize.type === "try_again";

  const [cells, setCells] = useState<Cell[]>(() =>
    Array.from({ length: TOTAL }, () => ({ state: "hidden" as CellState })),
  );
  const [phase, setPhase] = useState<"aim" | "exploding" | "revealing" | "done">("aim");
  const [clickedIdx, setClickedIdx] = useState<number | null>(null);

  // Embaralha posições pra revelar TODAS as células restantes após o clique
  // Proporção alvo: ~55% minas / ~45% prêmios (dá sensação forte de "passou perto")
  const revealPlan = useMemo<{ idx: number; cell: Cell }[]>(() => {
    if (!winningPrize) return [];
    const available = Array.from({ length: TOTAL }, (_, i) => i);
    // Embaralha
    for (let i = available.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [available[i], available[j]] = [available[j], available[i]];
    }

    // Distribui minas e prêmios no array embaralhado
    const targetMines = Math.round(TOTAL * 0.55);
    const plan: { idx: number; cell: Cell }[] = [];
    let prizeCursor = 0;
    available.forEach((idx, i) => {
      if (i < targetMines) {
        plan.push({ idx, cell: { state: "mine" } });
      } else {
        const prize = realPrizes[prizeCursor % Math.max(1, realPrizes.length)];
        plan.push({ idx, cell: { state: "prize", prize } });
        prizeCursor++;
      }
    });
    return plan;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winningPrize, realPrizes]);

  function handleClick(i: number) {
    if (phase !== "aim" || !winningPrize) return;
    setClickedIdx(i);
    setPhase(playerLost ? "exploding" : "revealing");

    // Revela a célula clicada com o resultado real do sorteio
    setCells((prev) => {
      const next = [...prev];
      next[i] = playerLost
        ? { state: "mine" }
        : { state: "prize", prize: winningPrize };
      return next;
    });

    // Após 700ms começa a revelar outras células (minas + prêmios) em cascata
    setTimeout(() => {
      setPhase("revealing");
      revealCascade(i);
    }, 700);

    // Final
    setTimeout(() => {
      setPhase("done");
      onRevealed?.(winningPrize);
    }, 700 + revealPlan.length * 55 + 500);
  }

  function revealCascade(skipIdx: number) {
    const items = revealPlan.filter((p) => p.idx !== skipIdx);
    items.forEach((item, k) => {
      setTimeout(() => {
        setCells((prev) => {
          const next = [...prev];
          if (next[item.idx].state === "hidden") {
            next[item.idx] = item.cell;
          }
          return next;
        });
      }, k * 55);
    });
  }

  useEffect(() => {
    if (!autoReveal || phase !== "aim") return;
    const t = setTimeout(() => {
      const idx = Math.floor(Math.random() * TOTAL);
      handleClick(idx);
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoReveal, phase]);

  if (realPrizes.length === 0 && !playerLost) {
    return <div style={{ padding: 24, textAlign: "center", opacity: 0.8 }}>Nenhum prêmio configurado.</div>;
  }

  const minesRevealed = cells.filter((c) => c.state === "mine").length;
  const luckyMessage = everyoneWins
    ? `Que sorte! Você escapou de ${minesRevealed} minas! 💣`
    : "Sortudo! Esquivou da explosão 💥";

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 440,
        margin: "0 auto",
        position: "relative",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          marginBottom: 10,
          background: "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" style={{ width: 28, height: 28, objectFit: "contain" }} />
          ) : (
            <div style={{ fontSize: 24 }}>💣</div>
          )}
          <div style={{ color: "white", fontWeight: 800, fontSize: 14, letterSpacing: 0.5 }}>
            CAMPO MINADO
          </div>
        </div>
        <div style={{ color: "#FCA5A5", fontFamily: "monospace", fontWeight: 800, fontSize: 14 }}>
          💣 {phase === "aim" ? "??" : minesRevealed}
        </div>
      </div>

      {/* Tabuleiro */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gap: 5,
          padding: 6,
          background: "linear-gradient(180deg, #1e293b 0%, #0c0e1a 100%)",
          borderRadius: 12,
          boxShadow: "inset 0 0 24px rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.4)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {cells.map((cell, i) => (
          <MineCell
            key={i}
            index={i}
            cell={cell}
            isClicked={i === clickedIdx}
            phase={phase}
            buttonColor={buttonColor}
            onClick={() => handleClick(i)}
          />
        ))}
      </div>

      {/* Instrução / resultado */}
      <div style={{ textAlign: "center", marginTop: 14, minHeight: 56 }}>
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
            💣 ESCOLHA UMA CASA E TORÇA PRA NÃO PISAR NUMA MINA
          </div>
        )}
        {phase === "done" && winningPrize && !playerLost && (
          <div
            style={{
              display: "inline-block",
              padding: "12px 24px",
              background: buttonColor,
              color: "white",
              borderRadius: 16,
              fontSize: 16,
              fontWeight: 900,
              letterSpacing: 0.5,
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
              border: "3px solid white",
              animation: "popIn 0.5s ease-out",
            }}
          >
            🎉 {winningPrize.label}
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                marginTop: 4,
                opacity: 0.95,
                letterSpacing: 0.3,
              }}
            >
              {luckyMessage}
            </div>
          </div>
        )}
        {phase === "done" && playerLost && (
          <div
            style={{
              display: "inline-block",
              padding: "12px 24px",
              background: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
              color: "white",
              borderRadius: 16,
              fontSize: 16,
              fontWeight: 900,
              letterSpacing: 0.5,
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
              border: "3px solid white",
              animation: "popIn 0.5s ease-out",
            }}
          >
            💥 BOOM! Você pisou numa mina
            <div style={{ fontSize: 11, fontWeight: 600, marginTop: 4, opacity: 0.95 }}>
              Quase! Volte e tente de novo.
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes popIn {
          0% { transform: scale(0.5); opacity: 0; }
          80% { transform: scale(1.08); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes flipReveal {
          0% { transform: rotateY(0) scale(1); }
          50% { transform: rotateY(90deg) scale(1.1); }
          100% { transform: rotateY(0) scale(1); }
        }
        @keyframes explosion {
          0% { transform: scale(0.5); opacity: 1; box-shadow: 0 0 0 0 rgba(239,68,68,0.9); }
          50% { transform: scale(1.15); opacity: 1; box-shadow: 0 0 0 12px rgba(239,68,68,0.4); }
          100% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 24px rgba(239,68,68,0); }
        }
        @keyframes pulseGold {
          0%, 100% { box-shadow: 0 0 0 0 rgba(251,191,36,0.6); }
          50% { box-shadow: 0 0 0 8px rgba(251,191,36,0); }
        }
        @keyframes shake {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(-3px, 1px); }
          50% { transform: translate(2px, -1px); }
          75% { transform: translate(-2px, 1px); }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────
function MineCell({
  cell,
  isClicked,
  phase,
  buttonColor,
  onClick,
}: {
  index: number;
  cell: Cell;
  isClicked: boolean;
  phase: string;
  buttonColor: string;
  onClick: () => void;
}) {
  const isInteractive = phase === "aim";
  const isHidden = cell.state === "hidden";
  const isMine = cell.state === "mine";
  const isPrize = cell.state === "prize" && cell.prize;

  return (
    <div
      onClick={isInteractive ? onClick : undefined}
      style={{
        position: "relative",
        aspectRatio: "1 / 1",
        borderRadius: 6,
        overflow: "hidden",
        cursor: isInteractive ? "pointer" : "default",
        userSelect: "none",
        transition: "transform 0.15s",
        ...cellSurfaceStyle(cell, isClicked, buttonColor),
      }}
      onMouseEnter={(e) => {
        if (!isInteractive || !isHidden) return;
        e.currentTarget.style.transform = "scale(1.06)";
        e.currentTarget.style.filter = "brightness(1.15)";
      }}
      onMouseLeave={(e) => {
        if (!isInteractive) return;
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.filter = "brightness(1)";
      }}
    >
      {isHidden && <HiddenCell />}
      {isMine && <MineCellBody isClicked={isClicked} />}
      {isPrize && cell.prize && <PrizeCellBody prize={cell.prize} isClicked={isClicked} />}
    </div>
  );
}

function HiddenCell() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(135deg, #475569 0%, #334155 50%, #1e293b 100%)",
        borderTop: "2px solid rgba(255,255,255,0.18)",
        borderLeft: "2px solid rgba(255,255,255,0.12)",
        borderRight: "2px solid rgba(0,0,0,0.4)",
        borderBottom: "2px solid rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 20,
        color: "rgba(255,255,255,0.25)",
        fontWeight: 900,
      }}
    >
      ?
    </div>
  );
}

function MineCellBody({ isClicked }: { isClicked: boolean }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: isClicked
          ? "radial-gradient(circle, #fbbf24 0%, #ef4444 40%, #7f1d1d 100%)"
          : "linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 26,
        animation: isClicked
          ? "explosion 0.9s ease-out forwards, shake 0.4s ease-in-out"
          : "flipReveal 0.5s ease-out",
      }}
    >
      <span style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))" }}>💣</span>
    </div>
  );
}

function PrizeCellBody({ prize, isClicked }: { prize: PrizeDefinition; isClicked: boolean }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: prize.color || "#FFB300",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        animation: isClicked
          ? "flipReveal 0.5s ease-out, pulseGold 1.2s ease-in-out 0.5s infinite"
          : "flipReveal 0.5s ease-out",
        boxShadow: isClicked ? "0 0 0 2px white inset" : undefined,
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
        <div style={{ fontSize: 28, lineHeight: 1 }}>{prize.icon ?? "🎁"}</div>
      )}
    </div>
  );
}

function cellSurfaceStyle(_cell: Cell, isClicked: boolean, buttonColor: string): React.CSSProperties {
  if (isClicked) {
    return {
      outline: `2px solid ${buttonColor}`,
      outlineOffset: -1,
    };
  }
  return {};
}
