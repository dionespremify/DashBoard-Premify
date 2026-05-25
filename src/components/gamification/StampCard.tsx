interface StampConfig {
  target_stamps?: number;
  min_value_cents?: number;
  reward?: string;
  stamp_image_url?: string;
}

interface StampProgress {
  stamps?: number;
  target?: number;
  cycles_completed?: number;
}

interface Props {
  config: StampConfig;
  progress?: StampProgress | null;
  buttonColor?: string;
}

export default function StampCard({ config, progress, buttonColor = "#FF6B35" }: Props) {
  const target = config.target_stamps ?? progress?.target ?? 10;
  const current = Math.min(progress?.stamps ?? 0, target);
  const cyclesCompleted = progress?.cycles_completed ?? 0;
  const minValueReais = ((config.min_value_cents ?? 0) / 100).toFixed(2).replace(".", ",");
  const reward = config.reward ?? "Um prêmio incrível";

  const stamps = Array.from({ length: target }, (_, i) => i < current);
  const isComplete = current >= target;

  // Layout do grid: tenta linhas balanceadas (2 linhas se ≤10, 3 se ≤15)
  const cols = target <= 10 ? Math.ceil(target / 2) : Math.ceil(target / 3);

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20">
      {/* Header com prêmio em destaque */}
      <div className="text-center mb-4">
        <div className="text-xs uppercase tracking-wide opacity-80 mb-1">🎁 Seu prêmio</div>
        <div className="text-lg font-bold">{reward}</div>
      </div>

      {/* Grid de stamps */}
      <div
        className="grid gap-2 justify-center mb-4"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {stamps.map((collected, i) => (
          <div
            key={i}
            className="aspect-square rounded-full flex items-center justify-center text-xl font-bold transition border-2 overflow-hidden"
            style={
              collected
                ? {
                    backgroundColor: config.stamp_image_url ? "white" : buttonColor,
                    borderColor: buttonColor,
                    color: "white",
                    boxShadow: `0 2px 8px ${buttonColor}55`,
                  }
                : {
                    backgroundColor: "rgba(255,255,255,0.05)",
                    borderColor: "rgba(255,255,255,0.3)",
                    borderStyle: "dashed",
                    color: "rgba(255,255,255,0.4)",
                  }
            }
          >
            {collected ? (
              config.stamp_image_url ? (
                <img
                  src={config.stamp_image_url}
                  alt=""
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                "✓"
              )
            ) : (
              i + 1
            )}
          </div>
        ))}
      </div>

      {/* Progresso */}
      <div className="text-center mb-4">
        <div className="text-3xl font-bold">
          {current} <span className="opacity-60 text-xl">/ {target}</span>
        </div>
        <div className="text-xs opacity-80">carimbos coletados</div>
      </div>

      {/* Status / instruções */}
      {isComplete ? (
        <div
          className="text-center p-3 rounded-lg font-medium"
          style={{ backgroundColor: `${buttonColor}25`, border: `1px solid ${buttonColor}55` }}
        >
          🎉 Você completou o cartão! Mostre essa tela na próxima compra pra resgatar seu prêmio.
        </div>
      ) : (
        <div className="text-center text-xs opacity-80 leading-relaxed">
          {config.min_value_cents && config.min_value_cents > 0 ? (
            <>
              📍 Faça uma compra acima de <strong>R$ {minValueReais}</strong> e peça pra equipe
              registrar — você ganha 1 carimbo!
            </>
          ) : (
            <>📍 Faça uma compra e peça pra equipe registrar — você ganha 1 carimbo!</>
          )}
        </div>
      )}

      {cyclesCompleted > 0 && (
        <div className="mt-3 text-center text-xs opacity-70">
          🏆 Você já completou esse cartão {cyclesCompleted}{" "}
          {cyclesCompleted === 1 ? "vez" : "vezes"}!
        </div>
      )}
    </div>
  );
}
