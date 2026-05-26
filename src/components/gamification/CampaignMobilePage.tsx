import { useEffect, useMemo, useState, type ReactNode } from "react";
import WheelSVG, { type WheelTheme } from "./WheelSVG";
import ScratchCard from "./ScratchCard";
import CelebrationModal from "./CelebrationModal";
import StampCard from "./StampCard";
import type { PrizeDefinition } from "../prizes/PrizePoolEditor";

export type GamificationType = "wheel" | "scratch" | "box";

export interface CampaignBranding {
  tenantSlug?: string;
  tenantName?: string;
  logoUrl?: string | null;
  backgroundColor?: string | null;
  backgroundImageUrl?: string | null;
  buttonColor?: string | null;
  wheelTheme?: WheelTheme | null;
  gamificationType?: GamificationType | null;
}

export interface CampaignMechanicData {
  type: string;
  config?: {
    everyone_wins?: boolean;
    prizes?: PrizeDefinition[];
    min_purchase_cents?: number;
    theme?: WheelTheme;
    // Stamps
    target_stamps?: number;
    reward?: string;
    stamp_image_url?: string;
    [k: string]: unknown;
  } | null;
  /** Progresso atual do cliente nessa mecânica (vem do backend após registrar/logar) */
  currentProgress?: unknown;
}

export interface CampaignDisplay {
  id?: number;
  name: string;
  description?: string | null;
  status?: string;
  mechanics: CampaignMechanicData[];
}

interface Props {
  branding: CampaignBranding;
  campaign: CampaignDisplay;
  /** Modo interativo? Em preview (false) o botão é decorativo. */
  interactive?: boolean;
  /** Slot pra ações customizadas no topo (ex: voltar) */
  topSlot?: ReactNode;
  /** Slot abaixo da mecânica (ex: form de cadastro do cliente) */
  bottomSlot?: ReactNode;
  /** Conteúdo opcional acima da mecânica (ex: saudação ao cliente) */
  preMechanicSlot?: ReactNode;
  /** Se um prêmio já foi sorteado pelo backend, passar o índice na lista de prêmios visíveis */
  winningPrizeIndex?: number;
  /** Sobreescreve o tema da roleta (se não vier do config da mecânica) */
  wheelTheme?: WheelTheme;
  /** Quando autoSpinOnMount é true, a roleta gira sozinha ao montar */
  autoSpinOnMount?: boolean;
  /** Callback quando a roleta para */
  onSpinEnd?: (prize: PrizeDefinition) => void;
  /** Texto do botão (default: "Girar a roleta!") */
  ctaLabel?: string;
  /** Click do botão (em modo interativo) */
  onCtaClick?: () => void;
  /** Código do prêmio (Reward.code) pra mostrar no modal de celebração */
  rewardCode?: string;
  /** Caminho do som de celebração */
  celebrationSoundUrl?: string;
  /** Modo demo (preview no painel): habilita o botão e gira a roleta com prêmio aleatório */
  demoMode?: boolean;
  /** Quando true, oculta a mecânica (roleta/etc) — usado pra tela pré-autenticação */
  hideMechanic?: boolean;
}

export default function CampaignMobilePage({
  branding,
  campaign,
  interactive = false,
  topSlot,
  bottomSlot,
  preMechanicSlot,
  winningPrizeIndex,
  autoSpinOnMount,
  onSpinEnd,
  ctaLabel = "Girar a roleta!",
  onCtaClick,
  wheelTheme,
  rewardCode,
  celebrationSoundUrl,
  demoMode = false,
  hideMechanic = false,
}: Props) {
  // Encontra qualquer mecânica de prize-pool (wheel | scratch | box) — todas usam o mesmo schema.
  const wheel = campaign.mechanics.find((m) => m.type === "wheel" || m.type === "scratch" || m.type === "box");
  const prizes = useMemo(
    () => (wheel?.config?.prizes ?? []) as PrizeDefinition[],
    [wheel],
  );
  // Tipo visual escolhido pelo dono (branding) ou fallback: tipo declarado na mecânica.
  const gamificationType: GamificationType =
    branding.gamificationType ?? ((wheel?.type as GamificationType | undefined) ?? "wheel");
  // Prioridade: prop wheelTheme > branding.wheelTheme > config legacy da mecânica > classic
  const effectiveTheme: WheelTheme =
    wheelTheme ?? branding.wheelTheme ?? (wheel?.config?.theme as WheelTheme | undefined) ?? "classic";

  const [revealed, setRevealed] = useState<PrizeDefinition | null>(null);

  // Estado do modo demo: gira a roleta com prêmio aleatório quando staff clica
  const [demoSpinKey, setDemoSpinKey] = useState(0);
  const [demoWinningIndex, setDemoWinningIndex] = useState<number | undefined>(undefined);

  useEffect(() => {
    // Reset reveal quando muda o prêmio determinado
    setRevealed(null);
  }, [winningPrizeIndex]);

  // Sempre que mudar o tipo de gamificação no demoMode, reseta o estado do demo
  // (evita auto-spin/modal aparecerem ao trocar entre roleta/raspadinha).
  useEffect(() => {
    if (!demoMode) return;
    setRevealed(null);
    setDemoSpinKey(0);
    setDemoWinningIndex(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gamificationType]);

  // Pra raspadinha no modo demo: já inicializa um prêmio aleatório de cara, pra cliente raspar.
  useEffect(() => {
    if (!demoMode || gamificationType !== "scratch") return;
    if (demoWinningIndex != null) return;
    const visible = prizes.filter((p) => p.type !== "try_again");
    if (visible.length === 0) return;
    setDemoWinningIndex(Math.floor(Math.random() * visible.length));
    setDemoSpinKey((k) => k + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoMode, gamificationType, prizes]);

  function startDemoSpin() {
    const visible = prizes.filter((p) => p.type !== "try_again");
    if (visible.length === 0) return;
    const idx = Math.floor(Math.random() * visible.length);
    setRevealed(null);
    setDemoWinningIndex(idx);
    setDemoSpinKey((k) => k + 1);
  }

  const buttonColor = branding.buttonColor || "#FF6B35";
  const bgColor = branding.backgroundColor || "#1a1a2e";

  const containerStyle: React.CSSProperties = {
    backgroundColor: bgColor,
    backgroundImage: branding.backgroundImageUrl ? `url(${branding.backgroundImageUrl})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  };

  return (
    <div
      className="relative w-full min-h-screen flex flex-col items-center text-white"
      style={containerStyle}
    >
      {/* Overlay escuro pra legibilidade quando há imagem de fundo */}
      {branding.backgroundImageUrl && (
        <div className="absolute inset-0 bg-black/40 pointer-events-none" />
      )}

      <div className="relative w-full max-w-sm mx-auto px-5 py-6 flex-1 flex flex-col">
        {topSlot && <div className="mb-3">{topSlot}</div>}

        {/* Header com logo + nome */}
        <div className="flex flex-col items-center text-center mb-6">
          {branding.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt={branding.tenantName ?? "logo"}
              className="w-32 h-32 sm:w-36 sm:h-36 object-contain rounded-full bg-white/10 mb-4 shadow-lg ring-2 ring-white/20"
            />
          ) : (
            <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-white/10 flex items-center justify-center text-5xl mb-4 shadow-lg ring-2 ring-white/20">
              {branding.tenantName?.[0] ?? "🍴"}
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold drop-shadow-md">{branding.tenantName ?? "Premify"}</h1>
        </div>

        {/* Card da campanha */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 mb-5 border border-white/20 text-center">
          <h2 className="text-lg font-semibold mb-1">{campaign.name}</h2>
          {campaign.description && (
            <p className="text-sm opacity-90">{campaign.description}</p>
          )}
        </div>

        {preMechanicSlot}

        {/* Mecânica visual — ocultada antes da autenticação */}
        {!hideMechanic && wheel && gamificationType === "wheel" && (
          <div className="flex flex-col items-center mb-6">
            <WheelSVG
              key={demoSpinKey > 0 ? `demo-${demoSpinKey}` : "live"}
              prizes={prizes}
              size={300}
              theme={effectiveTheme}
              centerLogoUrl={branding.logoUrl}
              winningPrizeIndex={demoMode ? demoWinningIndex : winningPrizeIndex}
              autoSpin={demoMode ? demoSpinKey > 0 : autoSpinOnMount}
              onSpinEnd={(p) => {
                setRevealed(p);
                onSpinEnd?.(p);
              }}
            />

            <button
              type="button"
              onClick={demoMode ? startDemoSpin : interactive ? onCtaClick : undefined}
              disabled={!demoMode && !interactive && !autoSpinOnMount}
              className="mt-5 px-8 py-4 rounded-full font-bold text-base shadow-lg hover:scale-105 active:scale-95 transition-transform disabled:opacity-70 disabled:cursor-not-allowed"
              style={{ backgroundColor: buttonColor, color: "white" }}
            >
              {ctaLabel}
            </button>
          </div>
        )}

        {!hideMechanic && wheel && gamificationType === "scratch" && (
          <div className="flex flex-col items-center mb-6">
            <ScratchCard
              key={demoSpinKey > 0 ? `demo-${demoSpinKey}` : "live"}
              prizes={prizes}
              size={300}
              buttonColor={buttonColor}
              winningPrizeIndex={demoMode ? demoWinningIndex : winningPrizeIndex}
              autoReveal={false}
              onRevealed={(p) => {
                setRevealed(p);
                onSpinEnd?.(p);
              }}
            />
            {demoMode && (
              <button
                type="button"
                onClick={startDemoSpin}
                className="mt-5 px-6 py-3 rounded-full font-semibold text-white shadow-lg hover:scale-105 transition-transform"
                style={{ backgroundColor: buttonColor }}
              >
                🔄 Gerar novo prêmio (preview)
              </button>
            )}
          </div>
        )}

        {/* Cartão fidelidade (stamps) — UI dedicada */}
        {!hideMechanic && !wheel && (() => {
          const stamps = campaign.mechanics.find((m) => m.type === "stamps");
          if (stamps) {
            return (
              <StampCard
                config={stamps.config ?? {}}
                progress={stamps.currentProgress as { stamps?: number; target?: number; cycles_completed?: number } | null}
                buttonColor={buttonColor}
              />
            );
          }
          return (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20">
              <p className="text-sm opacity-80 text-center">
                Essa campanha usa: {campaign.mechanics.map((m) => m.type).join(", ")}
              </p>
            </div>
          );
        })()}

        {bottomSlot && <div className="pt-4">{bottomSlot}</div>}

        <div className="mt-auto pt-6 text-center text-xs opacity-60">
          Powered by <span className="font-semibold">Premify</span>
        </div>
      </div>

      {/* Modal celebratório quando a roleta para */}
      {revealed && (
        <CelebrationModal
          prize={revealed}
          rewardCode={rewardCode}
          buttonColor={buttonColor}
          soundUrl={celebrationSoundUrl}
          onClose={() => setRevealed(null)}
        />
      )}
    </div>
  );
}
