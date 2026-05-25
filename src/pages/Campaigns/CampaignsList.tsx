import { useEffect, useState } from "react";
import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import Button from "../../components/ui/button/Button";
import { listCampaigns, type Campaign } from "../../api/campaigns";
import { extractApiError } from "../../api/client";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  draft: { label: "Rascunho", className: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" },
  active: { label: "Ativa", className: "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-300" },
  paused: { label: "Pausada", className: "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-300" },
  ended: { label: "Encerrada", className: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400" },
};

export default function CampaignsList() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const list = await listCampaigns();
        if (active) setCampaigns(list);
      } catch (err) {
        if (active) setError(extractApiError(err, "Erro ao carregar campanhas"));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <PageMeta title="Campanhas | Premify" description="Lista de campanhas do seu estabelecimento." />
      <PageBreadcrumb pageTitle="Campanhas" />

      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {loading ? "Carregando…" : `${campaigns.length} campanha${campaigns.length === 1 ? "" : "s"}`}
        </p>
        <Link to="/campanhas/nova">
          <Button>+ Nova campanha</Button>
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-3 text-sm rounded-lg bg-error-50 text-error-700 border border-error-200 dark:bg-error-500/10 dark:text-error-300 dark:border-error-500/30">
          {error}
        </div>
      )}

      {!loading && campaigns.length === 0 && !error && (
        <div className="p-10 text-center bg-white rounded-2xl shadow-sm dark:bg-gray-800/50 dark:border dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-800 dark:text-white/90 mb-2">
            Você ainda não tem campanhas
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            O wizard te guia em 2-3 perguntas até a campanha ideal pro seu negócio.
          </p>
          <Link to="/campanhas/nova">
            <Button>Criar primeira campanha</Button>
          </Link>
        </div>
      )}

      {campaigns.length > 0 && (
        <div className="grid gap-3">
          {campaigns.map((c) => {
            const status = STATUS_LABEL[c.status] ?? {
              label: c.status,
              className: "bg-gray-100 text-gray-700",
            };
            return (
              <Link
                to={`/campanhas/${c.id}`}
                key={c.id}
                className="block p-4 transition bg-white rounded-xl shadow-sm hover:shadow-md dark:bg-gray-800/50 dark:border dark:border-gray-700 dark:hover:border-gray-600"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-medium text-gray-800 dark:text-white/90 truncate">
                        {c.name}
                      </h3>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${status.className}`}>
                        {status.label}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {c.blueprintCode && <span className="mr-3">📋 {c.blueprintCode}</span>}
                      <span>
                        {c.mechanics.length} mecânica{c.mechanics.length === 1 ? "" : "s"}
                      </span>
                      <span className="ml-3">
                        início: {new Date(c.startsAt).toLocaleDateString("pt-BR")}
                      </span>
                      {c.endsAt && (
                        <span className="ml-3">
                          fim: {new Date(c.endsAt).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
