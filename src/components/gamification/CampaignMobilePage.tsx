import { useEffect, useMemo, useState, type ReactNode } from "react";
import WheelSVG, { type WheelTheme } from "./WheelSVG";
import type { PrizeDefinition } from "../prizes/PrizePoolEditor";

export interface CampaignBranding {
  tenantSlug?: string;
  tenantName?: string;
  logoUrl?: string | null;
  backgroundColor?: string | null;
  backgroundImageUrl?: string | null;
  buttonColor?: string | null;
}

export interface CampaignMechanicData {
  type: string;
  config?: {
    everyone_wins?: boolean;
    prizes?: PrizeDefinition[];
    min_purchase_cents?: number;
    theme?: WheelTheme;
    [k: string]: unknown;
  } | null;
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
}: Props) {
  const wheel = campaign.mechanics.find((m) => m.type === "wheel");
  const prizes = useMemo(
    () => (wheel?.config?.prizes ?? []) as PrizeDefinition[],
    [wheel],
  );
  const effectiveTheme: WheelTheme = wheelTheme ?? (wheel?.config?.theme as WheelTheme) ?? "classic";

  const [revealed, setRevealed] = useState<PrizeDefinition | null>(null);

  useEffect(() => {
    // Reset reveal quando muda o prêmio determinado
    setRevealed(null);
  }, [winningPrizeIndex]);

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
      className="relative w-full min-h-full flex flex-col items-center text-white"
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
              className="w-20 h-20 object-contain rounded-full bg-white/10 p-2 mb-3"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center text-2xl mb-3">
              {branding.tenantName?.[0] ?? "🍴"}
            </div>
          )}
          <h1 className="text-2xl font-bold drop-shadow-md">{branding.tenantName ?? "Premify"}</h1>
        </div>

        {/* Card da campanha */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 mb-5 border border-white/20">
          <h2 className="text-lg font-semibold mb-1">{campaign.name}</h2>
          {campaign.description && (
            <p className="text-sm opacity-90">{campaign.description}</p>
          )}
        </div>

        {preMechanicSlot}

        {/* Mecânica visual */}
        {wheel && (
          <div className="flex flex-col items-center mb-6">
            <WheelSVG
              prizes={prizes}
              size={300}
              theme={effectiveTheme}
              winningPrizeIndex={winningPrizeIndex}
              autoSpin={autoSpinOnMount}
              onSpinEnd={(p) => {
                setRevealed(p);
                onSpinEnd?.(p);
              }}
            />

            {revealed && (
              <div className="mt-5 bg-white text-gray-900 rounded-2xl p-5 text-center shadow-xl animate-bounce-in w-full">
                <div className="text-4xl mb-1">{revealed.icon ?? "🎉"}</div>
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Parabéns! Você ganhou:
                </div>
                <div className="text-xl font-bold mt-1">{revealed.label}</div>
              </div>
            )}

            {!revealed && (
              <button
                type="button"
                onClick={interactive ? onCtaClick : undefined}
                disabled={!interactive && !autoSpinOnMount}
                className="mt-5 px-8 py-4 rounded-full font-bold text-base shadow-lg hover:scale-105 active:scale-95 transition-transform disabled:opacity-70 disabled:cursor-not-allowed"
                style={{ backgroundColor: buttonColor, color: "white" }}
              >
                {ctaLabel}
              </button>
            )}
          </div>
        )}

        {/* Sem roleta — mostra mecânicas em texto */}
        {!wheel && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20">
            <p className="text-sm opacity-80 text-center">
              Essa campanha usa: {campaign.mechanics.map((m) => m.type).join(", ")}
            </p>
          </div>
        )}

        {bottomSlot && <div className="mt-auto pt-6">{bottomSlot}</div>}

        <div className="mt-6 text-center text-xs opacity-60">
          Powered by <span className="font-semibold">Premify</span>
        </div>
      </div>
    </div>
  );
}
