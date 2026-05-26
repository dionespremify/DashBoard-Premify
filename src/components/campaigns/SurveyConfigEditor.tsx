import {
  DEFAULT_SURVEY_CONFIG,
  type SurveyBonus,
  type SurveyConfig,
  type SurveyQuestion,
  type SurveyQuestionType,
} from "../../api/surveys";

const TYPE_META: Record<SurveyQuestionType, { label: string; icon: string }> = {
  rating: { label: "Rating (0-10 ou estrelas)", icon: "⭐" },
  multiple_choice: { label: "Múltipla escolha", icon: "🔘" },
  text: { label: "Texto livre", icon: "✍️" },
};

const BONUS_OPTIONS: { value: SurveyBonus; label: string; icon: string; description: string }[] = [
  { value: "none", label: "Sem bônus", icon: "💬", description: "Cliente responde por boa vontade." },
  { value: "extra_spin", label: "+1 giro extra", icon: "🎡", description: "Quem responder ganha um giro adicional na roleta/raspadinha/caixa." },
  { value: "extra_stamp", label: "+1 carimbo", icon: "🏆", description: "Quem responder ganha um carimbo bônus no cartão fidelidade." },
];

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

interface Props {
  value: SurveyConfig | null;
  onChange: (next: SurveyConfig) => void;
}

export default function SurveyConfigEditor({ value, onChange }: Props) {
  const config = value ?? DEFAULT_SURVEY_CONFIG;

  function update(patch: Partial<SurveyConfig>) {
    onChange({ ...config, ...patch });
  }

  function updateQuestion(idx: number, patch: Partial<SurveyQuestion>) {
    const next = config.questions.map((q, i) => (i === idx ? { ...q, ...patch } : q));
    update({ questions: next });
  }

  function removeQuestion(idx: number) {
    update({ questions: config.questions.filter((_, i) => i !== idx) });
  }

  function addQuestion() {
    update({
      questions: [
        ...config.questions,
        { id: makeId(), type: "text", label: "Nova pergunta", required: false },
      ],
    });
  }

  function moveQuestion(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= config.questions.length) return;
    const next = [...config.questions];
    [next[idx], next[target]] = [next[target], next[idx]];
    update({ questions: next });
  }

  return (
    <div className="space-y-5">
      {/* Toggle enabled */}
      <div className="p-4 bg-white rounded-xl border border-gray-200 dark:bg-gray-900 dark:border-gray-700">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => update({ enabled: e.target.checked })}
            className="w-5 h-5 rounded text-brand-500 focus:ring-brand-500"
          />
          <div>
            <div className="font-medium text-gray-800 dark:text-white/90">
              Habilitar pesquisa de satisfação
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Mostra a pesquisa após o cadastro, antes da roleta.
            </div>
          </div>
        </label>
      </div>

      {config.enabled && (
        <>
          {/* Bônus */}
          <div className="p-4 bg-white rounded-xl border border-gray-200 dark:bg-gray-900 dark:border-gray-700">
            <div className="mb-3 font-medium text-gray-800 dark:text-white/90">
              Bônus por responder
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {BONUS_OPTIONS.map((opt) => {
                const selected = config.bonus === opt.value;
                return (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => update({ bonus: opt.value })}
                    className={`p-3 text-left rounded-lg border transition ${
                      selected
                        ? "bg-brand-50 border-brand-500 dark:bg-brand-500/10 dark:border-brand-400"
                        : "bg-white border-gray-200 hover:border-gray-300 dark:bg-gray-900 dark:border-gray-700"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{opt.icon}</span>
                      <span className="font-medium text-sm text-gray-800 dark:text-white/90">{opt.label}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{opt.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Título + subtítulo */}
          <div className="p-4 bg-white rounded-xl border border-gray-200 dark:bg-gray-900 dark:border-gray-700 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Título da pesquisa
              </label>
              <input
                type="text"
                value={config.title ?? ""}
                onChange={(e) => update({ title: e.target.value })}
                placeholder="Ex: Sua opinião vale prêmios!"
                className="h-10 w-full px-3 text-sm border border-gray-300 rounded-lg dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Subtítulo (opcional)
              </label>
              <input
                type="text"
                value={config.subtitle ?? ""}
                onChange={(e) => update({ subtitle: e.target.value })}
                placeholder="Ex: Responda em 30 segundos e ganhe um bônus."
                className="h-10 w-full px-3 text-sm border border-gray-300 rounded-lg dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>
          </div>

          {/* Perguntas */}
          <div>
            <div className="mb-3 font-medium text-gray-800 dark:text-white/90">
              Perguntas ({config.questions.length})
            </div>

            <div className="space-y-3">
              {config.questions.map((q, idx) => (
                <div
                  key={q.id || idx}
                  className="p-4 bg-white border rounded-xl border-gray-200 dark:bg-gray-900 dark:border-gray-700"
                >
                  <div className="flex items-start gap-3">
                    {/* Ações de ordem */}
                    <div className="flex flex-col gap-1 pt-1">
                      <button
                        type="button"
                        onClick={() => moveQuestion(idx, -1)}
                        disabled={idx === 0}
                        className="w-7 h-7 text-xs rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30"
                        title="Mover pra cima"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveQuestion(idx, 1)}
                        disabled={idx === config.questions.length - 1}
                        className="w-7 h-7 text-xs rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30"
                        title="Mover pra baixo"
                      >
                        ↓
                      </button>
                    </div>

                    <div className="flex-1 space-y-3">
                      <input
                        type="text"
                        value={q.label}
                        onChange={(e) => updateQuestion(idx, { label: e.target.value })}
                        placeholder="Texto da pergunta"
                        className="h-10 w-full px-3 text-sm font-medium border border-gray-300 rounded-lg dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                      />

                      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                        <select
                          value={q.type}
                          onChange={(e) => {
                            const type = e.target.value as SurveyQuestionType;
                            const next: Partial<SurveyQuestion> = { type };
                            if (type === "multiple_choice" && !q.options) next.options = ["Opção 1", "Opção 2"];
                            if (type === "rating" && !q.max) next.max = 10;
                            updateQuestion(idx, next);
                          }}
                          className="h-10 px-3 text-sm border border-gray-300 rounded-lg dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                        >
                          {Object.entries(TYPE_META).map(([v, m]) => (
                            <option key={v} value={v}>
                              {m.icon} {m.label}
                            </option>
                          ))}
                        </select>

                        <label className="inline-flex items-center gap-2 px-3 cursor-pointer text-sm">
                          <input
                            type="checkbox"
                            checked={q.required}
                            onChange={(e) => updateQuestion(idx, { required: e.target.checked })}
                            className="w-4 h-4 rounded text-brand-500 focus:ring-brand-500"
                          />
                          Obrigatória
                        </label>
                      </div>

                      {q.type === "rating" && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-600 dark:text-gray-400">Escala de 0 a</span>
                          <input
                            type="number"
                            min="3"
                            max="10"
                            value={q.max ?? 10}
                            onChange={(e) => updateQuestion(idx, { max: parseInt(e.target.value || "10", 10) })}
                            className="w-16 h-8 px-2 text-sm text-center border border-gray-300 rounded dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                          />
                        </div>
                      )}

                      {q.type === "multiple_choice" && (
                        <div className="space-y-2">
                          <div className="text-xs text-gray-600 dark:text-gray-400">Opções (uma por linha)</div>
                          <textarea
                            value={(q.options ?? []).join("\n")}
                            onChange={(e) =>
                              updateQuestion(idx, {
                                options: e.target.value.split("\n").filter((l) => l.trim() !== ""),
                              })
                            }
                            rows={4}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 resize-none"
                            placeholder={"Opção 1\nOpção 2\nOpção 3"}
                          />
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => removeQuestion(idx)}
                      className="px-3 h-10 text-sm text-error-500 hover:text-error-700"
                      title="Remover pergunta"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addQuestion}
              className="mt-3 w-full p-3 text-sm font-medium text-brand-600 bg-brand-50 rounded-xl border-2 border-dashed border-brand-300 hover:bg-brand-100 dark:bg-brand-500/10 dark:border-brand-500/40 dark:text-brand-300"
            >
              + Adicionar pergunta
            </button>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            💡 Pesquisas curtas (3 perguntas) têm ~60% de resposta. Mais que isso, a taxa cai bastante.
          </p>
        </>
      )}
    </div>
  );
}
