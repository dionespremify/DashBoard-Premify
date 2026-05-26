import type { ParticipationLimitConfig, ParticipationLimitPeriod } from "../../api/campaigns";

const PERIOD_LABELS: Record<ParticipationLimitPeriod, string> = {
  total: "Total na campanha",
  day: "Por dia",
  week: "Por semana",
  month: "Por mês",
};

interface Props {
  value: ParticipationLimitConfig;
  onChange: (next: ParticipationLimitConfig) => void;
}

export default function ParticipationLimitEditor({ value, onChange }: Props) {
  const enabled = !!value.enabled;
  const period = (value.period ?? "total") as ParticipationLimitPeriod;
  const count = value.count ?? 1;

  return (
    <div className="p-5 bg-white rounded-2xl shadow-sm dark:bg-gray-800/50 dark:border dark:border-gray-700">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
            Limitar participação na gamificação
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Controla quantas vezes o mesmo cliente (por CPF) pode jogar a roleta/carimbo.
            A pesquisa de satisfação continua sempre disponível.
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={enabled}
            onChange={(e) =>
              onChange({
                enabled: e.target.checked,
                period: e.target.checked ? period : null,
                count: e.target.checked ? count : null,
              })
            }
          />
          <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500" />
        </label>
      </div>

      {enabled && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Período
              </label>
              <select
                value={period}
                onChange={(e) => onChange({ ...value, period: e.target.value as ParticipationLimitPeriod })}
                className="w-full h-11 px-3 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-brand-500 focus:outline-none dark:[color-scheme:dark]"
              >
                {(Object.keys(PERIOD_LABELS) as ParticipationLimitPeriod[]).map((p) => (
                  <option key={p} value={p} className="bg-white text-gray-900 dark:bg-gray-900 dark:text-white">
                    {PERIOD_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Quantas participações
              </label>
              <input
                type="number"
                min={1}
                max={999}
                value={count}
                onChange={(e) => {
                  const n = Math.max(1, parseInt(e.target.value || "1", 10) || 1);
                  onChange({ ...value, count: n });
                }}
                className="w-full h-11 px-3 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-white/90 focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-4 p-3 text-sm rounded-lg bg-warning-50 text-warning-700 border border-warning-200 dark:bg-warning-500/10 dark:text-warning-300 dark:border-warning-500/30">
            ⚠️ Com este limite ativo, o <strong>CPF passa a ser obrigatório</strong> no formulário de cadastro do cliente
            (necessário pra controlar a quantidade de participações).
          </div>

          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            {previewText(period, count)}
          </p>
        </>
      )}
    </div>
  );
}

function previewText(period: ParticipationLimitPeriod, count: number): string {
  const plural = count > 1 ? `${count} participações` : "1 participação";
  switch (period) {
    case "day": return `Resultado: cada cliente pode participar ${plural} por dia.`;
    case "week": return `Resultado: cada cliente pode participar ${plural} a cada 7 dias.`;
    case "month": return `Resultado: cada cliente pode participar ${plural} a cada 30 dias.`;
    default: return `Resultado: cada cliente pode participar ${plural} durante toda a campanha.`;
  }
}
