import { useEffect, useMemo, useState } from "react";
import {
  getSurveyReport,
  listSurveyCampaigns,
  type SurveyCampaignSummary,
  type SurveyReport,
} from "../../api/reports";
import { extractApiError } from "../../api/client";

export default function SurveysTab() {
  const [campaigns, setCampaigns] = useState<SurveyCampaignSummary[] | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [report, setReport] = useState<SurveyReport | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const list = await listSurveyCampaigns();
        if (!active) return;
        setCampaigns(list);
        // Auto-seleciona a primeira com respostas
        const first = list.find((c) => c.totalResponses > 0) ?? list[0];
        if (first) setSelectedId(first.campaignId);
      } catch (err) {
        if (active) setError(extractApiError(err, "Erro ao carregar pesquisas"));
      } finally {
        if (active) setLoadingList(false);
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setReport(null);
      return;
    }
    let active = true;
    setLoadingDetail(true);
    (async () => {
      try {
        const r = await getSurveyReport(selectedId);
        if (active) setReport(r);
      } catch (err) {
        if (active) setError(extractApiError(err, "Erro ao carregar detalhes"));
      } finally {
        if (active) setLoadingDetail(false);
      }
    })();
    return () => { active = false; };
  }, [selectedId]);

  if (loadingList) {
    return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Carregando…</div>;
  }

  if (error) {
    return (
      <div className="p-3 text-sm rounded-lg bg-error-50 text-error-700 border border-error-200 dark:bg-error-500/10 dark:text-error-300 dark:border-error-500/30">
        {error}
      </div>
    );
  }

  if (!campaigns || campaigns.length === 0) {
    return (
      <div className="p-10 text-center bg-white rounded-2xl dark:bg-gray-800/50 dark:border dark:border-gray-700">
        <div className="text-4xl mb-3">📊</div>
        <h3 className="text-lg font-medium text-gray-800 dark:text-white/90 mb-2">
          Você ainda não tem pesquisas configuradas
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Edite uma campanha → aba "Pesquisa" → habilite, e as respostas aparecem aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      {/* Sidebar com campanhas */}
      <div className="space-y-2">
        <div className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
          Campanhas com pesquisa
        </div>
        {campaigns.map((c) => {
          const isSelected = c.campaignId === selectedId;
          return (
            <button
              type="button"
              key={c.campaignId}
              onClick={() => setSelectedId(c.campaignId)}
              className={`w-full text-left p-3 rounded-lg border transition ${
                isSelected
                  ? "bg-brand-50 border-brand-500 dark:bg-brand-500/10 dark:border-brand-400"
                  : "bg-white border-gray-200 hover:border-gray-300 dark:bg-gray-800/50 dark:border-gray-700"
              }`}
            >
              <div className="font-medium text-sm text-gray-800 dark:text-white/90 truncate">
                {c.campaignName}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {c.totalResponses} {c.totalResponses === 1 ? "resposta" : "respostas"}
                {c.lastResponseAt && (
                  <> · última {new Date(c.lastResponseAt).toLocaleDateString("pt-BR")}</>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Detalhe */}
      <div>
        {loadingDetail ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">Carregando detalhes…</div>
        ) : report ? (
          <SurveyReportView report={report} />
        ) : (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            Selecione uma campanha à esquerda
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
function SurveyReportView({ report }: { report: SurveyReport }) {
  if (report.totalResponses === 0) {
    return (
      <div className="p-10 text-center bg-white rounded-2xl dark:bg-gray-800/50 dark:border dark:border-gray-700">
        <div className="text-4xl mb-3">⏳</div>
        <h3 className="text-lg font-medium text-gray-800 dark:text-white/90 mb-1">
          Ainda sem respostas
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Quando clientes responderem, os números aparecem aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="p-5 bg-white rounded-2xl shadow-sm dark:bg-gray-800/50 dark:border dark:border-gray-700">
        <div className="flex items-baseline justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">{report.campaignName}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Estatísticas agregadas</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-brand-500">{report.totalResponses}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              respostas{report.totalResponses === 1 ? "" : ""}
            </div>
          </div>
        </div>
      </div>

      {/* Questions */}
      {report.questions.map((q) => (
        <QuestionStatsCard key={q.id} stats={q} />
      ))}

      {/* Text samples */}
      {report.textSamples.length > 0 && (
        <div className="p-5 bg-white rounded-2xl shadow-sm dark:bg-gray-800/50 dark:border dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-3">
            💬 Comentários ({report.textSamples.length})
          </h3>
          <div className="space-y-3">
            {report.textSamples.map((t, i) => (
              <div key={i} className="pb-3 border-b border-gray-100 dark:border-gray-700 last:border-0 last:pb-0">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {t.customerName ?? t.customerPhone} ·{" "}
                  {new Date(t.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">"{t.answer}"</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────
function QuestionStatsCard({ stats }: { stats: SurveyReport["questions"][number] }) {
  return (
    <div className="p-5 bg-white rounded-2xl shadow-sm dark:bg-gray-800/50 dark:border dark:border-gray-700">
      <div className="mb-1 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {stats.type === "rating" ? "⭐ Rating" : stats.type === "multiple_choice" ? "🔘 Múltipla escolha" : "✍️ Texto"}
      </div>
      <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">{stats.label}</h3>

      {stats.totalAnswered === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Sem respostas pra essa pergunta.</p>
      ) : stats.type === "rating" ? (
        <RatingChart stats={stats} />
      ) : stats.type === "multiple_choice" ? (
        <MultipleChoiceChart stats={stats} />
      ) : (
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {stats.textResponsesCount} resposta{stats.textResponsesCount === 1 ? "" : "s"} de texto.
          Veja todas embaixo em <strong>Comentários</strong>.
        </p>
      )}
    </div>
  );
}

function RatingChart({ stats }: { stats: SurveyReport["questions"][number] }) {
  const distribution = stats.ratingDistribution ?? {};
  const max = stats.ratingMax ?? 10;
  const start = max >= 10 ? 0 : 1;
  const keys = useMemo(
    () => Array.from({ length: max - start + 1 }, (_, i) => String(start + i)),
    [start, max],
  );
  const maxCount = Math.max(...Object.values(distribution), 1);

  return (
    <div>
      <div className="flex items-baseline gap-3 mb-4">
        <div className="text-4xl font-bold text-brand-500">
          {stats.averageRating?.toFixed(1) ?? "—"}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          média de {stats.totalAnswered} respostas (escala 0–{max})
        </div>
      </div>

      <div className="space-y-1.5">
        {keys.map((k) => {
          const count = distribution[k] ?? 0;
          const pct = (count / maxCount) * 100;
          return (
            <div key={k} className="flex items-center gap-2 text-xs">
              <span className="w-6 text-right font-mono text-gray-500">{k}</span>
              <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden">
                <div
                  className="h-full bg-brand-500 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-10 text-right text-gray-600 dark:text-gray-300">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MultipleChoiceChart({ stats }: { stats: SurveyReport["questions"][number] }) {
  const opts = stats.optionCounts ?? [];
  const maxCount = Math.max(...opts.map((o) => o.count), 1);

  return (
    <div className="space-y-2">
      {opts.map((o) => {
        const pct = (o.count / stats.totalAnswered) * 100;
        const barPct = (o.count / maxCount) * 100;
        return (
          <div key={o.option}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-700 dark:text-gray-300">{o.option}</span>
              <span className="text-gray-500 dark:text-gray-400">
                <strong className="text-gray-800 dark:text-white/90">{o.count}</strong> ({pct.toFixed(0)}%)
              </span>
            </div>
            <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-brand-500 transition-all" style={{ width: `${barPct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

