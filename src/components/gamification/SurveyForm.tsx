import { useMemo, useState, type FormEvent } from "react";
import type { SurveyConfig } from "../../api/surveys";

interface Props {
  config: SurveyConfig;
  buttonColor?: string;
  onSubmit: (answers: Record<string, unknown>) => void;
  onSkip: () => void;
  submitting?: boolean;
}

export default function SurveyForm({
  config,
  buttonColor = "#FF6B35",
  onSubmit,
  onSkip,
  submitting = false,
}: Props) {
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [error, setError] = useState<string | null>(null);

  // Pesquisa pode ser pulada se NENHUMA pergunta for obrigatória
  const canSkip = useMemo(() => !config.questions.some((q) => q.required), [config]);

  const bonusBadge = useMemo(() => {
    if (config.bonus === "extra_spin") return "🎡 Ganhe +1 giro extra!";
    if (config.bonus === "extra_stamp") return "🏆 Ganhe +1 carimbo bônus!";
    return null;
  }, [config.bonus]);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    const missing = config.questions.find((q) => {
      if (!q.required) return false;
      const v = answers[q.id];
      if (v === undefined || v === null) return true;
      if (typeof v === "string" && v.trim() === "") return true;
      return false;
    });
    if (missing) {
      setError(`Responda "${missing.label}"`);
      return;
    }
    setError(null);
    onSubmit(answers);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 space-y-4"
    >
      <div className="text-center">
        {config.title && <h2 className="text-lg font-bold mb-1">{config.title}</h2>}
        {config.subtitle && <p className="text-sm opacity-90">{config.subtitle}</p>}
        {bonusBadge && (
          <div className="mt-3 inline-block px-3 py-1 text-xs font-semibold rounded-full bg-yellow-300/30 border border-yellow-300/50 text-yellow-100">
            {bonusBadge}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {config.questions.map((q, idx) => (
          <QuestionField
            key={q.id || idx}
            question={q}
            value={answers[q.id]}
            onChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))}
            buttonColor={buttonColor}
            index={idx + 1}
            total={config.questions.length}
          />
        ))}
      </div>

      {error && <p className="text-sm text-red-200 text-center">{error}</p>}

      <div className="flex flex-col gap-2 pt-1">
        <button
          type="submit"
          disabled={submitting}
          className="w-full h-12 rounded-lg font-semibold shadow disabled:opacity-50"
          style={{ backgroundColor: buttonColor, color: "white" }}
        >
          {submitting ? "Enviando…" : "Enviar respostas"}
        </button>
        {canSkip && (
          <button
            type="button"
            onClick={onSkip}
            disabled={submitting}
            className="w-full h-10 rounded-lg text-sm text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-50"
          >
            Pular pesquisa
          </button>
        )}
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────
function QuestionField({
  question,
  value,
  onChange,
  buttonColor,
  index,
  total,
}: {
  question: SurveyConfig["questions"][number];
  value: unknown;
  onChange: (v: unknown) => void;
  buttonColor: string;
  index: number;
  total: number;
}) {
  return (
    <div>
      <div className="mb-2">
        <span className="text-xs opacity-70 uppercase tracking-wide">
          {index} de {total}
        </span>
        <div className="text-sm font-medium leading-snug">
          {question.label}
          {question.required && <span className="text-red-300 ml-1">*</span>}
        </div>
      </div>

      {question.type === "rating" && (
        <RatingInput
          max={question.max ?? 10}
          value={typeof value === "number" ? value : null}
          onChange={onChange}
          buttonColor={buttonColor}
        />
      )}

      {question.type === "multiple_choice" && (
        <div className="space-y-1.5">
          {(question.options ?? []).map((opt) => {
            const selected = value === opt;
            return (
              <button
                type="button"
                key={opt}
                onClick={() => onChange(opt)}
                className={`w-full text-left px-4 py-2.5 rounded-lg border transition text-sm ${
                  selected
                    ? "bg-white/20 border-white/60 font-semibold"
                    : "bg-white/5 border-white/20 hover:border-white/40"
                }`}
              >
                {selected ? "✓ " : ""}
                {opt}
              </button>
            );
          })}
        </div>
      )}

      {question.type === "text" && (
        <textarea
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          placeholder="Digite sua resposta…"
          className="w-full px-3 py-2 rounded-lg bg-white/90 text-gray-900 placeholder:text-gray-500 text-sm resize-none"
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────
function RatingInput({
  max,
  value,
  onChange,
  buttonColor,
}: {
  max: number;
  value: number | null;
  onChange: (v: number) => void;
  buttonColor: string;
}) {
  // 0-10 ou 1-N
  const start = max >= 10 ? 0 : 1;
  const numbers = Array.from({ length: max - start + 1 }, (_, i) => start + i);

  return (
    <div className="flex flex-wrap gap-1.5 justify-center">
      {numbers.map((n) => {
        const selected = value === n;
        return (
          <button
            type="button"
            key={n}
            onClick={() => onChange(n)}
            className={`w-9 h-10 rounded-lg font-semibold text-sm transition ${
              selected ? "shadow-md" : "bg-white/10 hover:bg-white/20"
            }`}
            style={selected ? { backgroundColor: buttonColor, color: "white" } : {}}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}
