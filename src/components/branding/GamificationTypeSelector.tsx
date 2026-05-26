import type { GamificationType } from "../../api/branding";

export const GAMIFICATION_OPTIONS: {
  value: GamificationType;
  label: string;
  icon: string;
  tag?: string;
  description: string;
  available: boolean;
}[] = [
  {
    value: "wheel",
    label: "Roleta",
    icon: "🎡",
    description: "O cliente gira a roleta e descobre o prêmio na hora.",
    available: true,
  },
  {
    value: "scratch",
    label: "Raspadinha",
    icon: "🎟️",
    description: "O cliente raspa a área cinza com o dedo e revela o prêmio.",
    available: true,
  },
  {
    value: "box",
    label: "Caixa surpresa",
    icon: "📦",
    tag: "em breve",
    description: "Abrindo uma caixa misteriosa com animação 3D.",
    available: false,
  },
];

interface Props {
  value: GamificationType;
  onChange: (next: GamificationType) => void;
  /** Mostra aviso de "afeta todas as campanhas" (usar no editor de campanha). */
  showGlobalWarning?: boolean;
  /** Variante compacta (sem descrição), pra contextos menores. */
  compact?: boolean;
}

export default function GamificationTypeSelector({ value, onChange, showGlobalWarning, compact }: Props) {
  return (
    <div>
      {showGlobalWarning && (
        <div className="mb-4 p-3 text-sm rounded-lg bg-warning-50 text-warning-700 border border-warning-200 dark:bg-warning-500/10 dark:text-warning-300 dark:border-warning-500/30">
          ⚠️ Esta escolha é <strong>global</strong> — afeta como o cliente vê <em>todas</em> as suas
          campanhas. Para mudar apenas o visual desta campanha específica, ainda não é possível.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {GAMIFICATION_OPTIONS.map((g) => {
          const selected = value === g.value;
          return (
            <button
              type="button"
              key={g.value}
              disabled={!g.available}
              onClick={() => g.available && onChange(g.value)}
              className={`relative p-4 text-left rounded-xl border-2 transition ${
                !g.available
                  ? "bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed dark:bg-gray-800 dark:border-gray-700"
                  : selected
                    ? "bg-brand-50 border-brand-500 dark:bg-brand-500/10 dark:border-brand-400 shadow-sm"
                    : "bg-white border-gray-200 hover:border-brand-300 dark:bg-gray-900 dark:border-gray-700 dark:hover:border-brand-500"
              }`}
            >
              {selected && g.available && (
                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-brand-500 text-white text-xs flex items-center justify-center font-bold">
                  ✓
                </div>
              )}
              {g.tag && (
                <div className="absolute top-2 right-2 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide rounded-full bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                  {g.tag}
                </div>
              )}
              <div className={compact ? "text-2xl mb-1" : "text-4xl mb-2"}>{g.icon}</div>
              <div className="font-semibold text-sm text-gray-800 dark:text-white/90 mb-1">{g.label}</div>
              {!compact && (
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{g.description}</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
