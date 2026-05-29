import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import Button from "../../components/ui/button/Button";
import {
  deleteCampaign,
  getCampaign,
  updateCampaignStatus,
  type Campaign,
} from "../../api/campaigns";
import { getBranding, type Branding } from "../../api/branding";
import { extractApiError } from "../../api/client";
import CampaignMobilePage, {
  type CampaignBranding,
  type CampaignDisplay,
} from "../../components/gamification/CampaignMobilePage";
import QRCodeCard from "../../components/campaigns/QRCodeCard";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  draft: { label: "Rascunho", className: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" },
  active: { label: "Ativa", className: "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-300" },
  paused: { label: "Pausada", className: "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-300" },
  ended: { label: "Encerrada", className: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400" },
};

const MECHANIC_LABEL: Record<string, string> = {
  stamps: "Cartão fidelidade (carimbos)",
  coupon: "Cupom de desconto",
  raffle: "Sorteio",
  instant_win: "Posição premiada",
  points: "Pontos / cashback",
  referral: "Indique amigo",
};

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [branding, setBranding] = useState<Branding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!id) return;
      try {
        const [data, b] = await Promise.all([
          getCampaign(parseInt(id, 10)),
          getBranding().catch(() => null),
        ]);
        if (!active) return;
        setCampaign(data);
        if (b) setBranding(b);
      } catch (err) {
        if (active) setError(extractApiError(err, "Erro ao carregar campanha"));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  async function changeStatus(newStatus: string) {
    if (!campaign) return;
    setUpdating(true);
    setError(null);
    try {
      const updated = await updateCampaignStatus(campaign.id, newStatus);
      setCampaign(updated);
    } catch (err) {
      setError(extractApiError(err, "Erro ao atualizar status"));
    } finally {
      setUpdating(false);
    }
  }

  async function performDelete() {
    if (!campaign) return;
    setUpdating(true);
    setError(null);
    try {
      await deleteCampaign(campaign.id);
      navigate("/campanhas", { replace: true });
    } catch (err) {
      setError(extractApiError(err, "Erro ao excluir"));
      setUpdating(false);
      setConfirmDelete(false);
    }
  }

  if (loading) {
    return (
      <>
        <PageBreadcrumb pageTitle="Campanha" />
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">Carregando…</div>
      </>
    );
  }

  if (!campaign) {
    return (
      <>
        <PageBreadcrumb pageTitle="Campanha" />
        <div className="p-8 text-center">
          <p className="mb-4 text-gray-500 dark:text-gray-400">{error ?? "Campanha não encontrada"}</p>
          <Link to="/campanhas">
            <Button>Voltar pra lista</Button>
          </Link>
        </div>
      </>
    );
  }

  const status = STATUS_LABEL[campaign.status] ?? {
    label: campaign.status,
    className: "bg-gray-100 text-gray-700",
  };

  return (
    <>
      <PageMeta title={`${campaign.name} | Premify`} description={campaign.description ?? "Campanha"} />
      <PageBreadcrumb pageTitle={campaign.name} />

      <div className="grid gap-6">
        {/* Header */}
        <div className="p-4 sm:p-6 bg-white rounded-2xl shadow-sm dark:bg-gray-800/50 dark:border dark:border-gray-700">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">{campaign.name}</h1>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${status.className}`}>
                  {status.label}
                </span>
              </div>
              {campaign.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400">{campaign.description}</p>
              )}
              <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                {campaign.blueprintCode && <span className="mr-3">📋 {campaign.blueprintCode}</span>}
                {campaign.objectiveCode && <span className="mr-3">🎯 {campaign.objectiveCode}</span>}
                <span>Início: {new Date(campaign.startsAt).toLocaleDateString("pt-BR")}</span>
                {campaign.endsAt && (
                  <span className="ml-3">Fim: {new Date(campaign.endsAt).toLocaleDateString("pt-BR")}</span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setShowPreview(true)} disabled={updating}>
                👁 Pré-visualizar
              </Button>
              <Button variant="outline" onClick={() => navigate(`/campanhas/${campaign.id}/editar`)} disabled={updating}>
                ✏️ Editar
              </Button>
              {campaign.status === "draft" && (
                <Button onClick={() => changeStatus("active")} disabled={updating}>
                  Ativar
                </Button>
              )}
              {campaign.status === "active" && (
                <>
                  <Button variant="outline" onClick={() => changeStatus("paused")} disabled={updating}>
                    Pausar
                  </Button>
                  <Button variant="outline" onClick={() => changeStatus("ended")} disabled={updating}>
                    Encerrar
                  </Button>
                </>
              )}
              {campaign.status === "paused" && (
                <>
                  <Button onClick={() => changeStatus("active")} disabled={updating}>
                    Retomar
                  </Button>
                  <Button variant="outline" onClick={() => changeStatus("ended")} disabled={updating}>
                    Encerrar
                  </Button>
                </>
              )}
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={updating}
                className="px-4 h-11 text-sm font-medium text-error-600 hover:bg-error-50 dark:hover:bg-error-500/10 rounded-lg border border-error-300 disabled:opacity-40"
              >
                🗑️ Excluir
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 text-sm rounded-lg bg-error-50 text-error-700 border border-error-200 dark:bg-error-500/10 dark:text-error-300 dark:border-error-500/30">
            {error}
          </div>
        )}

        {/* QR Code da campanha */}
        {branding && (
          <QRCodeCard
            url={`${window.location.origin}/p/${branding.tenantSlug}/c/${campaign.id}`}
            tenantName={branding.tenantName}
            campaignName={campaign.name}
            fgColor={branding.buttonColor ?? "#111827"}
          />
        )}

        {/* Mecânicas */}
        <div className="p-4 sm:p-6 bg-white rounded-2xl shadow-sm dark:bg-gray-800/50 dark:border dark:border-gray-700">
          <h2 className="mb-4 text-lg font-medium text-gray-800 dark:text-white/90">
            Mecânicas da campanha
          </h2>

          <div className="grid gap-3">
            {campaign.mechanics.map((m) => (
              <div
                key={m.id}
                className="p-4 border rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-medium text-gray-800 dark:text-white/90">
                    {MECHANIC_LABEL[m.type] ?? m.type}
                  </span>
                  {m.isPrimary && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                      Principal
                    </span>
                  )}
                </div>
                {m.config != null && (
                  <pre className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap font-mono overflow-x-auto">
                    {JSON.stringify(m.config, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal de preview */}
      {showPreview && (
        <CampaignPreviewModal
          campaign={campaign}
          branding={branding}
          onClose={() => setShowPreview(false)}
        />
      )}

      {/* Modal de confirmação de exclusão */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => !updating && setConfirmDelete(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-3xl mb-3">⚠️</div>
            <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white/90">
              Excluir "{campaign.name}"?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Essa ação apaga a campanha, todas as participações e prêmios. Não tem como desfazer.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={updating}
                className="px-4 h-10 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={performDelete}
                disabled={updating}
                className="px-4 h-10 text-sm font-medium text-white bg-error-500 hover:bg-error-600 rounded-lg disabled:opacity-50"
              >
                {updating ? "Excluindo…" : "Excluir definitivamente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────
function CampaignPreviewModal({
  campaign,
  branding,
  onClose,
}: {
  campaign: Campaign;
  branding: Branding | null;
  onClose: () => void;
}) {
  const previewBranding: CampaignBranding = {
    tenantSlug: branding?.tenantSlug,
    tenantName: branding?.tenantName ?? "Seu negócio",
    logoUrl: branding?.logoUrl,
    backgroundColor: branding?.backgroundColor ?? "#1a1a2e",
    backgroundImageUrl: branding?.backgroundImageUrl,
    buttonColor: branding?.buttonColor ?? "#FF6B35",
    wheelTheme: branding?.wheelTheme ?? "vegas",
  };

  const display: CampaignDisplay = {
    id: campaign.id,
    name: campaign.name,
    description: campaign.description,
    status: campaign.status,
    mechanics: campaign.mechanics.map((m) => ({
      type: m.type,
      config: m.config as CampaignDisplay["mechanics"][number]["config"],
    })),
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ width: "min(380px, 100%)" }}
      >
        <div className="flex items-center justify-between p-3 bg-gray-800 text-white">
          <p className="text-sm font-medium">Preview do cliente final</p>
          <button onClick={onClose} className="text-xl hover:opacity-80">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-auto">
          <CampaignMobilePage branding={previewBranding} campaign={display} interactive={false} demoMode />
        </div>
      </div>
    </div>
  );
}
