import { useEffect, useRef, useState, type FormEvent } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import {
  getRewardByCode,
  listPendingRewards,
  listRedeemedToday,
  redeemReward,
  type RewardDetail,
} from "../../api/rewards";
import { extractApiError } from "../../api/client";
import Tabs from "../../components/common/Tabs";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendente", className: "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-300" },
  redeemed: { label: "Já resgatado", className: "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-300" },
  expired: { label: "Expirado", className: "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-300" },
  canceled: { label: "Cancelado", className: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" },
};

export default function ManagementPage() {
  return (
    <>
      <PageMeta title="Gerenciamento | Premify" description="Valide e resgate prêmios dos seus clientes." />
      <PageBreadcrumb pageTitle="Gerenciamento de prêmios" />

      <Tabs
        tabs={[
          { key: "redeem", label: "Validar / Resgatar", icon: "🎟️", content: <RedeemTab /> },
          { key: "pending", label: "Pendentes", icon: "⏳", content: <PendingTab /> },
          { key: "today", label: "Resgatados hoje", icon: "✅", content: <RedeemedTodayTab /> },
        ]}
      />
    </>
  );
}

// ─────────────────────────────────────────────────
// Validar / Resgatar
// ─────────────────────────────────────────────────
function RedeemTab() {
  const [code, setCode] = useState("");
  const [reward, setReward] = useState<RewardDetail | null>(null);
  const [searching, setSearching] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!code.trim() || searching) return;
    setSearching(true);
    setError(null);
    setSuccess(null);
    setReward(null);
    try {
      const r = await getRewardByCode(code.trim());
      if (!r) {
        setError("Código não encontrado. Confira com o cliente.");
      } else {
        setReward(r);
      }
    } catch (err) {
      setError(extractApiError(err, "Erro ao buscar prêmio"));
    } finally {
      setSearching(false);
    }
  }

  async function handleRedeem() {
    if (!reward || redeeming) return;
    setRedeeming(true);
    setError(null);
    try {
      const updated = await redeemReward(reward.code);
      setReward(updated);
      setSuccess(`✅ Prêmio resgatado com sucesso! Entregue: ${updated.description}`);
      // Limpa pra próxima validação
      setTimeout(() => {
        setCode("");
        setReward(null);
        setSuccess(null);
        inputRef.current?.focus();
      }, 4000);
    } catch (err) {
      setError(extractApiError(err, "Não foi possível resgatar esse prêmio"));
    } finally {
      setRedeeming(false);
    }
  }

  function reset() {
    setCode("");
    setReward(null);
    setError(null);
    setSuccess(null);
    inputRef.current?.focus();
  }

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSearch} className="p-6 bg-white rounded-2xl shadow-sm dark:bg-gray-800/50 dark:border dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-1">
          Digite o código do prêmio
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Peça o cliente pra mostrar a tela do prêmio. O código tem 8 caracteres.
        </p>

        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))}
            placeholder="ABC12345"
            autoComplete="off"
            className="flex-1 h-14 px-4 text-2xl font-mono font-bold tracking-[0.4em] text-center uppercase border-2 border-gray-300 dark:border-gray-700 rounded-xl focus:border-brand-500 focus:outline-none dark:bg-gray-900 dark:text-white/90"
          />
          <button
            type="submit"
            disabled={searching || code.length < 4}
            className="px-6 h-14 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-xl disabled:opacity-50"
          >
            {searching ? "Buscando…" : "Buscar"}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 text-sm rounded-lg bg-error-50 text-error-700 border border-error-200 dark:bg-error-500/10 dark:text-error-300 dark:border-error-500/30">
            ⚠️ {error}
          </div>
        )}
      </form>

      {/* Resultado */}
      {reward && !error && (
        <div className="mt-5 p-6 bg-white rounded-2xl shadow-sm dark:bg-gray-800/50 dark:border dark:border-gray-700">
          {success ? (
            <div className="text-center">
              <div className="text-6xl mb-3">🎉</div>
              <p className="text-lg font-bold text-success-600 mb-1">{success}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Próxima validação em alguns segundos…</p>
            </div>
          ) : (
            <>
              <RewardDetailsCard reward={reward} />

              {reward.status === "pending" ? (
                <div className="mt-5 flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={handleRedeem}
                    disabled={redeeming}
                    className="flex-1 h-14 text-base font-bold text-white bg-success-600 hover:bg-success-700 rounded-xl disabled:opacity-50"
                  >
                    {redeeming ? "Resgatando…" : "✅ Confirmar resgate"}
                  </button>
                  <button
                    type="button"
                    onClick={reset}
                    className="px-6 h-14 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-xl"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <div className="mt-5">
                  <div className="p-3 text-sm rounded-lg bg-warning-50 text-warning-700 border border-warning-200 dark:bg-warning-500/10 dark:text-warning-300 dark:border-warning-500/30 mb-3">
                    ⚠️ Esse código não pode ser resgatado nesse estado.
                  </div>
                  <button
                    type="button"
                    onClick={reset}
                    className="w-full h-12 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-xl"
                  >
                    Buscar outro código
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────
function RewardDetailsCard({ reward }: { reward: RewardDetail }) {
  const status = STATUS_LABEL[reward.status] ?? { label: reward.status, className: "bg-gray-100 text-gray-700" };
  const code = reward.code.split(":").pop();

  return (
    <div>
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
            Prêmio
          </div>
          <div className="text-xl font-bold text-gray-800 dark:text-white/90">{reward.description}</div>
        </div>
        <span className={`px-3 py-1 text-sm font-medium rounded-full ${status.className}`}>
          {status.label}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 text-sm">
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Código</div>
          <div className="font-mono text-base font-semibold text-gray-800 dark:text-white/90 tracking-wider">{code}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Campanha</div>
          <div className="text-gray-800 dark:text-white/90">{reward.campaignName}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Cliente</div>
          <div className="text-gray-800 dark:text-white/90">
            {reward.customerName ?? <span className="italic text-gray-400">sem nome</span>}
            {reward.customerPhone && <span className="text-gray-500 ml-2">· {reward.customerPhone}</span>}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Gerado em</div>
          <div className="text-gray-800 dark:text-white/90">
            {new Date(reward.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
          </div>
        </div>
        {reward.expiresAt && (
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Expira em</div>
            <div className="text-gray-800 dark:text-white/90">
              {new Date(reward.expiresAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
            </div>
          </div>
        )}
        {reward.redeemedAt && (
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Resgatado em</div>
            <div className="text-gray-800 dark:text-white/90">
              {new Date(reward.redeemedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
function PendingTab() {
  const [rewards, setRewards] = useState<RewardDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listPendingRewards()
      .then(setRewards)
      .catch((err) => setError(extractApiError(err, "Erro ao carregar pendentes")))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Carregando…</div>;
  if (error) {
    return (
      <div className="p-3 text-sm rounded-lg bg-error-50 text-error-700 border border-error-200 dark:bg-error-500/10 dark:text-error-300 dark:border-error-500/30">
        {error}
      </div>
    );
  }

  return <RewardsTable rewards={rewards} emptyMessage="Nenhum prêmio aguardando resgate." dateField="created" />;
}

// ─────────────────────────────────────────────────
function RedeemedTodayTab() {
  const [rewards, setRewards] = useState<RewardDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listRedeemedToday()
      .then(setRewards)
      .catch((err) => setError(extractApiError(err, "Erro ao carregar resgates do dia")))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Carregando…</div>;
  if (error) {
    return (
      <div className="p-3 text-sm rounded-lg bg-error-50 text-error-700 border border-error-200 dark:bg-error-500/10 dark:text-error-300 dark:border-error-500/30">
        {error}
      </div>
    );
  }

  return <RewardsTable rewards={rewards} emptyMessage="Nenhum prêmio foi resgatado hoje ainda." dateField="redeemed" />;
}

// ─────────────────────────────────────────────────
function RewardsTable({
  rewards,
  emptyMessage,
  dateField,
}: {
  rewards: RewardDetail[];
  emptyMessage: string;
  dateField: "created" | "redeemed";
}) {
  if (rewards.length === 0) {
    return (
      <div className="p-10 text-center bg-white rounded-2xl dark:bg-gray-800/50 dark:border dark:border-gray-700">
        <div className="text-4xl mb-3">🎁</div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm dark:bg-gray-800/50 dark:border dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              <th className="px-4 py-3 font-medium">Código</th>
              <th className="px-4 py-3 font-medium">Prêmio</th>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Campanha</th>
              <th className="px-4 py-3 font-medium">{dateField === "created" ? "Gerado" : "Resgatado"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {rewards.map((r) => {
              const date = dateField === "redeemed" ? r.redeemedAt : r.createdAt;
              return (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-mono font-semibold text-gray-800 dark:text-white/90 tracking-wider">
                    {r.code.split(":").pop()}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{r.description}</td>
                  <td className="px-4 py-3">
                    <div className="text-gray-700 dark:text-gray-300">
                      {r.customerName ?? <span className="italic text-gray-400">sem nome</span>}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{r.customerPhone}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{r.campaignName}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                    {date ? new Date(date).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
