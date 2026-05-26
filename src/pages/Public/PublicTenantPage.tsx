import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import { getTenantActiveCampaigns, type TenantCampaignsListResponse } from "../../api/publicApi";
import { extractApiError } from "../../api/client";
import PageMeta from "../../components/common/PageMeta";

export default function PublicTenantPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<TenantCampaignsListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let active = true;
    (async () => {
      try {
        const res = await getTenantActiveCampaigns(slug);
        if (!active) return;
        setData(res);
      } catch (err) {
        if (active) setError(extractApiError(err, "Erro ao carregar campanhas"));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [slug]);

  // Se só tem 1 campanha → redireciona direto
  if (data && data.campaigns.length === 1) {
    return <Navigate to={`/p/${slug}/c/${data.campaigns[0].id}`} replace />;
  }

  const tenant = data?.tenant;
  const bg = tenant?.backgroundColor || "#1a1a2e";
  const button = tenant?.buttonColor || "#FF6B35";

  const containerStyle: React.CSSProperties = {
    backgroundColor: bg,
    backgroundImage: tenant?.backgroundImageUrl ? `url("${tenant.backgroundImageUrl}")` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };

  return (
    <>
      <PageMeta title={`${tenant?.name ?? "Estabelecimento"} | Premify`} description="Escolha uma campanha pra participar." />
      <div className="min-h-screen w-full text-white px-4 py-8" style={containerStyle}>
        <div className="max-w-md mx-auto">
          {/* Cabeçalho com logo + nome */}
          <div className="flex flex-col items-center text-center mb-8">
            {tenant?.logoUrl ? (
              <img
                src={tenant.logoUrl}
                alt={tenant.name}
                className="w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover mb-4 shadow-lg ring-2 ring-white/20"
              />
            ) : (
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-white/10 flex items-center justify-center text-5xl mb-4 shadow-lg ring-2 ring-white/20">
                🎁
              </div>
            )}
            <h1 className="text-2xl sm:text-3xl font-bold drop-shadow-md">{tenant?.name ?? "Premify"}</h1>
            <p className="text-sm opacity-80 mt-2">Escolha uma campanha pra participar</p>
          </div>

          {loading && (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 text-center">
              Carregando campanhas…
            </div>
          )}

          {error && (
            <div className="bg-error-500/20 border border-error-500/40 rounded-2xl p-4 text-center text-sm">
              ⚠️ {error}
            </div>
          )}

          {!loading && data && data.campaigns.length === 0 && (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center">
              <div className="text-5xl mb-3">⏳</div>
              <h2 className="text-lg font-semibold mb-1">Nenhuma campanha ativa</h2>
              <p className="text-sm opacity-80">
                Volte em breve! Quando {tenant?.name ?? "o estabelecimento"} lançar uma promoção,
                ela aparece aqui.
              </p>
            </div>
          )}

          {!loading && data && data.campaigns.length >= 2 && (
            <div className="space-y-3">
              {data.campaigns.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => navigate(`/p/${slug}/c/${c.id}`)}
                  className="w-full text-left bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 hover:bg-white/20 active:scale-[0.98] transition shadow-lg"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0" style={{ backgroundColor: button }}>
                      🎯
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold leading-tight mb-0.5">{c.name}</h3>
                      {c.description && (
                        <p className="text-sm opacity-80 line-clamp-2">{c.description}</p>
                      )}
                      {c.endsAt && (
                        <p className="text-xs opacity-60 mt-2">
                          Termina em {new Date(c.endsAt).toLocaleDateString("pt-BR")}
                        </p>
                      )}
                    </div>
                    <div className="text-2xl opacity-60 self-center">→</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="mt-8 text-center text-xs opacity-60">
            Powered by <span className="font-semibold">Premify</span>
          </div>
        </div>
      </div>
    </>
  );
}
