import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import PageMeta from "../../components/common/PageMeta";
import { getDashboardStats, type DashboardStats } from "../../api/dashboard";
import { extractApiError } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  draft: { label: "Rascunho", className: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" },
  active: { label: "Ativa", className: "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-300" },
  paused: { label: "Pausada", className: "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-300" },
  ended: { label: "Encerrada", className: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400" },
  pending: { label: "Pendente", className: "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-300" },
  redeemed: { label: "Resgatado", className: "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-300" },
  expired: { label: "Expirado", className: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400" },
};

export default function Home() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await getDashboardStats();
        if (active) setStats(data);
      } catch (err) {
        if (active) setError(extractApiError(err, "Erro ao carregar dashboard"));
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
      <PageMeta title="Dashboard | Premify" description="Visão geral das campanhas e métricas do seu estabelecimento." />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
          Olá, {user?.name?.split(" ")[0] ?? "boas-vindas"} 👋
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Acompanhe o desempenho das suas campanhas em tempo real.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 text-sm rounded-lg bg-error-50 text-error-700 border border-error-200 dark:bg-error-500/10 dark:text-error-300 dark:border-error-500/30">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-10 text-center text-gray-500 dark:text-gray-400">Carregando métricas…</div>
      ) : stats ? (
        <DashboardContent stats={stats} />
      ) : null}
    </>
  );
}

function DashboardContent({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      {/* Cards de métricas principais */}
      <div className="col-span-12 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon="🎯"
          label="Campanhas ativas"
          value={stats.campaigns.active}
          subtitle={`${stats.campaigns.total} no total`}
          color="success"
        />
        <MetricCard
          icon="👥"
          label="Clientes"
          value={stats.customers.total}
          subtitle={`+${stats.customers.last7Days} últimos 7 dias`}
          color="brand"
        />
        <MetricCard
          icon="🎁"
          label="Prêmios pendentes"
          value={stats.rewards.pending}
          subtitle="aguardando resgate"
          color="warning"
        />
        <MetricCard
          icon="✅"
          label="Prêmios resgatados"
          value={stats.rewards.redeemed}
          subtitle={`de ${stats.rewards.total} gerados`}
          color="success"
        />
      </div>

      {/* Chart de atividade da semana */}
      <div className="col-span-12 xl:col-span-8">
        <WeeklyActivityChart data={stats.weeklyActivity} />
      </div>

      {/* Breakdown status das campanhas */}
      <div className="col-span-12 xl:col-span-4">
        <CampaignStatusBreakdown campaigns={stats.campaigns} />
      </div>

      {/* Top campanhas */}
      <div className="col-span-12 xl:col-span-7">
        <TopCampaignsTable items={stats.topCampaigns} />
      </div>

      {/* Últimos prêmios gerados */}
      <div className="col-span-12 xl:col-span-5">
        <RecentRewardsList items={stats.recentRewards} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
function MetricCard({
  icon,
  label,
  value,
  subtitle,
  color,
}: {
  icon: string;
  label: string;
  value: number;
  subtitle: string;
  color: "brand" | "success" | "warning" | "gray";
}) {
  const colorClass =
    color === "success"
      ? "bg-success-50 dark:bg-success-500/10"
      : color === "warning"
        ? "bg-warning-50 dark:bg-warning-500/10"
        : color === "brand"
          ? "bg-brand-50 dark:bg-brand-500/10"
          : "bg-gray-100 dark:bg-gray-800/50";

  return (
    <div className="p-5 bg-white rounded-2xl shadow-sm dark:bg-gray-800/50 dark:border dark:border-gray-700">
      <div className={`inline-flex w-11 h-11 items-center justify-center rounded-xl text-xl mb-3 ${colorClass}`}>
        {icon}
      </div>
      <div className="text-3xl font-bold text-gray-800 dark:text-white/90">{value}</div>
      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-0.5">{label}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────
function WeeklyActivityChart({ data }: { data: DashboardStats["weeklyActivity"] }) {
  const categories = data.map((d) => {
    const date = new Date(d.date + "T12:00:00");
    return date.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" });
  });

  const options: ApexOptions = useMemo(
    () => ({
      chart: { type: "area", toolbar: { show: false }, fontFamily: "inherit" },
      colors: ["#FF6B35", "#42A5F5"],
      stroke: { curve: "smooth", width: 2 },
      dataLabels: { enabled: false },
      legend: { position: "top", horizontalAlign: "left" },
      grid: { borderColor: "#e5e7eb", strokeDashArray: 4 },
      xaxis: { categories, labels: { style: { fontSize: "11px" } } },
      yaxis: { labels: { style: { fontSize: "11px" } } },
      fill: {
        type: "gradient",
        gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0, stops: [0, 90, 100] },
      },
      tooltip: { theme: "light" },
    }),
    [categories.join(",")],
  );

  const series = [
    { name: "Novos participantes", data: data.map((d) => d.participations) },
    { name: "Prêmios gerados", data: data.map((d) => d.rewards) },
  ];

  return (
    <div className="p-5 bg-white rounded-2xl shadow-sm dark:bg-gray-800/50 dark:border dark:border-gray-700">
      <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-1">Atividade da semana</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Últimos 7 dias</p>
      <Chart options={options} series={series} type="area" height={280} />
    </div>
  );
}

// ─────────────────────────────────────────────────
function CampaignStatusBreakdown({ campaigns }: { campaigns: DashboardStats["campaigns"] }) {
  const rows: { label: string; value: number; color: string }[] = [
    { label: "Ativas", value: campaigns.active, color: "bg-success-500" },
    { label: "Pausadas", value: campaigns.paused, color: "bg-warning-500" },
    { label: "Rascunhos", value: campaigns.draft, color: "bg-gray-400" },
    { label: "Encerradas", value: campaigns.ended, color: "bg-gray-300" },
  ];
  const total = campaigns.total || 1;

  return (
    <div className="p-5 bg-white rounded-2xl shadow-sm dark:bg-gray-800/50 dark:border dark:border-gray-700 h-full">
      <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">Status das campanhas</h3>
      <div className="space-y-4">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="text-gray-700 dark:text-gray-300">{row.label}</span>
              <span className="font-semibold text-gray-800 dark:text-white/90">{row.value}</span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${row.color}`}
                style={{ width: `${(row.value / total) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
function TopCampaignsTable({ items }: { items: DashboardStats["topCampaigns"] }) {
  return (
    <div className="p-5 bg-white rounded-2xl shadow-sm dark:bg-gray-800/50 dark:border dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
          Top campanhas por participação
        </h3>
        <Link to="/campanhas" className="text-xs text-brand-500 hover:text-brand-600">
          ver todas →
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Você ainda não tem campanhas com participantes.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <th className="pb-2 font-medium">Campanha</th>
                <th className="pb-2 font-medium text-center">Status</th>
                <th className="pb-2 font-medium text-right">Participantes</th>
                <th className="pb-2 font-medium text-right">Prêmios</th>
                <th className="pb-2 font-medium text-right">Resgatados</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {items.map((c) => {
                const s = STATUS_LABEL[c.status] ?? { label: c.status, className: "bg-gray-100 text-gray-700" };
                return (
                  <tr key={c.id}>
                    <td className="py-3">
                      <Link to={`/campanhas/${c.id}`} className="text-gray-800 dark:text-white/90 hover:text-brand-500 font-medium">
                        {c.name}
                      </Link>
                    </td>
                    <td className="py-3 text-center">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${s.className}`}>{s.label}</span>
                    </td>
                    <td className="py-3 text-right text-gray-700 dark:text-gray-300">{c.participants}</td>
                    <td className="py-3 text-right text-gray-700 dark:text-gray-300">{c.rewardsTotal}</td>
                    <td className="py-3 text-right text-gray-700 dark:text-gray-300">{c.rewardsRedeemed}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────
function RecentRewardsList({ items }: { items: DashboardStats["recentRewards"] }) {
  return (
    <div className="p-5 bg-white rounded-2xl shadow-sm dark:bg-gray-800/50 dark:border dark:border-gray-700">
      <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">Últimos prêmios gerados</h3>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Nenhum prêmio gerado ainda. Quando seus clientes participarem, vão aparecer aqui.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((r) => {
            const s = STATUS_LABEL[r.status] ?? { label: r.status, className: "bg-gray-100 text-gray-700" };
            return (
              <div key={r.id} className="flex items-start gap-3 pb-3 border-b border-gray-100 dark:border-gray-700 last:border-0 last:pb-0">
                <div className="w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center text-lg shrink-0">
                  🎁
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium text-gray-800 dark:text-white/90 truncate">{r.description}</span>
                    <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full shrink-0 ${s.className}`}>
                      {s.label}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {r.campaignName} · {new Date(r.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
