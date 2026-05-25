import { useEffect, useState, type MouseEvent } from "react";
import { Link, useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import Button from "../../components/ui/button/Button";
import {
  deleteCampaign,
  listCampaigns,
  updateCampaignStatus,
  type Campaign,
} from "../../api/campaigns";
import { extractApiError } from "../../api/client";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  draft: { label: "Rascunho", className: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" },
  active: { label: "Ativa", className: "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-300" },
  paused: { label: "Pausada", className: "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-300" },
  ended: { label: "Encerrada", className: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400" },
};

export default function CampaignsList() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Campaign | null>(null);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const list = await listCampaigns();
      setCampaigns(list);
    } catch (err) {
      setError(extractApiError(err, "Erro ao carregar campanhas"));
    } finally {
      setLoading(false);
    }
  }

  async function changeStatus(c: Campaign, newStatus: string, e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setActingId(c.id);
    setError(null);
    try {
      const updated = await updateCampaignStatus(c.id, newStatus);
      setCampaigns((prev) => prev.map((p) => (p.id === c.id ? updated : p)));
    } catch (err) {
      setError(extractApiError(err, "Erro ao atualizar status"));
    } finally {
      setActingId(null);
    }
  }

  function goEdit(c: Campaign, e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/campanhas/${c.id}/editar`);
  }

  function askDelete(c: Campaign, e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setConfirmDelete(c);
  }

  async function performDelete() {
    if (!confirmDelete) return;
    setActingId(confirmDelete.id);
    setError(null);
    try {
      await deleteCampaign(confirmDelete.id);
      setCampaigns((prev) => prev.filter((p) => p.id !== confirmDelete.id));
      setConfirmDelete(null);
    } catch (err) {
      setError(extractApiError(err, "Erro ao excluir"));
    } finally {
      setActingId(null);
    }
  }

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
            const isActing = actingId === c.id;

            return (
              <div
                key={c.id}
                className="p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition dark:bg-gray-800/50 dark:border dark:border-gray-700 dark:hover:border-gray-600"
              >
                <div className="flex items-start justify-between gap-4">
                  <Link to={`/campanhas/${c.id}`} className="flex-1 min-w-0 cursor-pointer">
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
                  </Link>

                  <div className="flex items-center gap-1 shrink-0">
                    <ActionButton
                      title="Editar"
                      onClick={(e) => goEdit(c, e)}
                      disabled={isActing}
                    >
                      ✏️
                    </ActionButton>

                    {c.status === "active" && (
                      <ActionButton
                        title="Pausar"
                        onClick={(e) => changeStatus(c, "paused", e)}
                        disabled={isActing}
                      >
                        ⏸
                      </ActionButton>
                    )}

                    {(c.status === "paused" || c.status === "draft") && (
                      <ActionButton
                        title="Ativar"
                        onClick={(e) => changeStatus(c, "active", e)}
                        disabled={isActing}
                      >
                        ▶️
                      </ActionButton>
                    )}

                    {(c.status === "active" || c.status === "paused") && (
                      <ActionButton
                        title="Encerrar"
                        onClick={(e) => changeStatus(c, "ended", e)}
                        disabled={isActing}
                      >
                        🔒
                      </ActionButton>
                    )}

                    <ActionButton
                      title="Excluir"
                      onClick={(e) => askDelete(c, e)}
                      disabled={isActing}
                      danger
                    >
                      🗑️
                    </ActionButton>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-3xl mb-3">⚠️</div>
            <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white/90">
              Excluir "{confirmDelete.name}"?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Essa ação apaga a campanha, todas as participações e prêmios gerados. Não tem como desfazer.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="px-4 h-10 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={performDelete}
                disabled={actingId !== null}
                className="px-4 h-10 text-sm font-medium text-white bg-error-500 hover:bg-error-600 rounded-lg disabled:opacity-50"
              >
                {actingId !== null ? "Excluindo…" : "Excluir definitivamente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ActionButton({
  children,
  title,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  title: string;
  onClick: (e: MouseEvent) => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`w-9 h-9 rounded-lg text-base flex items-center justify-center transition disabled:opacity-40 disabled:cursor-not-allowed ${
        danger
          ? "hover:bg-error-50 dark:hover:bg-error-500/10"
          : "hover:bg-gray-100 dark:hover:bg-gray-700"
      }`}
    >
      {children}
    </button>
  );
}
