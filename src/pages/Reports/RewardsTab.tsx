import { useEffect, useState } from "react";
import { listRewards, type RewardsReport } from "../../api/reports";
import { extractApiError } from "../../api/client";
import { listCampaigns, type Campaign } from "../../api/campaigns";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendente", className: "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-300" },
  redeemed: { label: "Resgatado", className: "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-300" },
  expired: { label: "Expirado", className: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400" },
  canceled: { label: "Cancelado", className: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400" },
};

export default function RewardsTab() {
  const [report, setReport] = useState<RewardsReport | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCampaignId, setFilterCampaignId] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [page, setPage] = useState(1);
  const pageSize = 30;

  useEffect(() => {
    listCampaigns().then(setCampaigns).catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const r = await listRewards({
          campaignId: filterCampaignId ? parseInt(filterCampaignId, 10) : undefined,
          status: filterStatus || undefined,
          page,
          pageSize,
        });
        if (active) setReport(r);
      } catch (err) {
        if (active) setError(extractApiError(err, "Erro ao carregar prêmios"));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [filterCampaignId, filterStatus, page]);

  function changeFilter(setter: (v: string) => void, value: string) {
    setter(value);
    setPage(1);
  }

  if (error) {
    return (
      <div className="p-3 text-sm rounded-lg bg-error-50 text-error-700 border border-error-200 dark:bg-error-500/10 dark:text-error-300 dark:border-error-500/30">
        {error}
      </div>
    );
  }

  const summary = report?.summary;
  const totalPages = report ? Math.ceil(report.total / report.pageSize) : 1;

  return (
    <div className="space-y-5">
      {/* Cards de sumário */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <SummaryCard label="Gerados" value={summary.totalGenerated} color="brand" />
          <SummaryCard label="Pendentes" value={summary.pending} color="warning" />
          <SummaryCard label="Resgatados" value={summary.redeemed} color="success" />
          <SummaryCard label="Expirados" value={summary.expired} color="gray" />
          <SummaryCard label="Taxa de resgate" value={`${summary.redemptionRate.toFixed(0)}%`} color="brand" />
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filterCampaignId}
          onChange={(e) => changeFilter(setFilterCampaignId, e.target.value)}
          className="h-10 px-3 text-sm border border-gray-300 rounded-lg dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        >
          <option value="">Todas as campanhas</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => changeFilter(setFilterStatus, e.target.value)}
          className="h-10 px-3 text-sm border border-gray-300 rounded-lg dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        >
          <option value="">Todos os status</option>
          <option value="pending">Pendentes</option>
          <option value="redeemed">Resgatados</option>
          <option value="expired">Expirados</option>
          <option value="canceled">Cancelados</option>
        </select>

        {(filterCampaignId || filterStatus) && (
          <button
            type="button"
            onClick={() => {
              setFilterCampaignId("");
              setFilterStatus("");
              setPage(1);
            }}
            className="text-xs text-brand-500 hover:text-brand-600"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-2xl shadow-sm dark:bg-gray-800/50 dark:border dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">Carregando…</div>
        ) : !report || report.items.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-4xl mb-3">🎁</div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Nenhum prêmio com esses filtros.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                    <th className="px-4 py-3 font-medium">Prêmio</th>
                    <th className="px-4 py-3 font-medium">Campanha</th>
                    <th className="px-4 py-3 font-medium">Cliente</th>
                    <th className="px-4 py-3 font-medium text-center">Status</th>
                    <th className="px-4 py-3 font-medium">Gerado em</th>
                    <th className="px-4 py-3 font-medium">Resgate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {report.items.map((r) => {
                    const s = STATUS_LABEL[r.status] ?? { label: r.status, className: "bg-gray-100 text-gray-700" };
                    const code = r.code.split(":").pop();
                    return (
                      <tr key={r.id}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-800 dark:text-white/90">{r.description}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">{code}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{r.campaignName}</td>
                        <td className="px-4 py-3">
                          <div className="text-gray-700 dark:text-gray-300">
                            {r.customerName ?? <span className="italic text-gray-400">sem nome</span>}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {r.customerPhone}
                            {r.customerEmail && <> · {r.customerEmail}</>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${s.className}`}>
                            {s.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                          {new Date(r.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                          {r.redeemedAt
                            ? new Date(r.redeemedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-3 border-t border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Página {report.page} de {totalPages} · {report.total} prêmios no total
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 h-8 text-xs border border-gray-300 dark:border-gray-700 rounded disabled:opacity-50"
                  >
                    ← Anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="px-3 h-8 text-xs border border-gray-300 dark:border-gray-700 rounded disabled:opacity-50"
                  >
                    Próxima →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number | string; color: "brand" | "success" | "warning" | "gray" }) {
  const colorClass =
    color === "success"
      ? "text-success-600"
      : color === "warning"
        ? "text-warning-600"
        : color === "brand"
          ? "text-brand-500"
          : "text-gray-500";
  return (
    <div className="p-4 bg-white rounded-xl shadow-sm dark:bg-gray-800/50 dark:border dark:border-gray-700">
      <div className={`text-2xl font-bold ${colorClass}`}>{value}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</div>
    </div>
  );
}
