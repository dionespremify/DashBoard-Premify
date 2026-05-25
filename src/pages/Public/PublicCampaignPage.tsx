import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useParams } from "react-router";
import CampaignMobilePage, {
  type CampaignBranding,
  type CampaignDisplay,
} from "../../components/gamification/CampaignMobilePage";
import type { PrizeDefinition } from "../../components/prizes/PrizePoolEditor";
import {
  extractPrizeIdFromCode,
  getCustomerRewards,
  getPublicCampaign,
  joinPublicCampaign,
  registerPublicCustomer,
  type PublicCampaign,
  type PublicReward,
} from "../../api/publicApi";
import { extractApiError } from "../../api/client";
import PageMeta from "../../components/common/PageMeta";

const PHONE_STORAGE_KEY = "premify_customer_phone";

export default function PublicCampaignPage() {
  const { slug, campaignId: campaignIdParam } = useParams<{ slug: string; campaignId: string }>();
  const campaignId = campaignIdParam ? parseInt(campaignIdParam, 10) : NaN;

  const [campaign, setCampaign] = useState<PublicCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [phone, setPhone] = useState(() => localStorage.getItem(PHONE_STORAGE_KEY) ?? "");
  const [name, setName] = useState("");
  const [registered, setRegistered] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [rewards, setRewards] = useState<PublicReward[]>([]);
  const [revealingReward, setRevealingReward] = useState<PublicReward | null>(null);
  const [winningIndex, setWinningIndex] = useState<number | undefined>(undefined);

  // Carrega campanha
  useEffect(() => {
    if (!slug || isNaN(campaignId)) return;
    let active = true;
    (async () => {
      try {
        const c = await getPublicCampaign(slug, campaignId);
        if (active) setCampaign(c);
      } catch (err) {
        if (active) setError(extractApiError(err, "Erro ao carregar campanha"));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [slug, campaignId]);

  // Se já tem phone salvo, tenta carregar rewards
  useEffect(() => {
    if (!slug || !phone || !registered) return;
    refreshRewards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, phone, registered]);

  async function refreshRewards() {
    if (!slug || !phone) return;
    try {
      const list = await getCustomerRewards(slug, phone);
      setRewards(list);
    } catch (err) {
      console.warn("Erro ao buscar rewards:", err);
    }
  }

  async function handleRegister(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting || !slug) return;
    if (!phone.trim()) {
      setError("Digite seu telefone");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await registerPublicCustomer({
        tenantSlug: slug,
        phone: phone.trim(),
        name: name.trim() || undefined,
      });
      try {
        await joinPublicCampaign({ tenantSlug: slug, phone: phone.trim(), campaignId });
      } catch {
        // ignora "campanha não ativa" — usuário ainda pode ver rewards anteriores
      }
      localStorage.setItem(PHONE_STORAGE_KEY, phone.trim());
      setRegistered(true);
    } catch (err) {
      setError(extractApiError(err, "Erro ao cadastrar"));
    } finally {
      setSubmitting(false);
    }
  }

  function startReveal(reward: PublicReward) {
    if (!campaign) return;
    const prizeId = extractPrizeIdFromCode(reward.code);
    const wheelMech = campaign.mechanics.find((m) => m.type === "wheel");
    const prizes = ((wheelMech?.config as { prizes?: PrizeDefinition[] } | undefined)?.prizes ?? []).filter(
      (p) => p.type !== "try_again",
    );
    const idx = prizeId ? prizes.findIndex((p) => p.id === prizeId) : -1;
    if (idx < 0) return;
    setRevealingReward(reward);
    setWinningIndex(idx);
  }

  const branding: CampaignBranding = useMemo(() => {
    if (!campaign) return {};
    return {
      tenantSlug: campaign.tenant.slug,
      tenantName: campaign.tenant.name,
      logoUrl: campaign.tenant.logoUrl,
      backgroundColor: campaign.tenant.backgroundColor,
      backgroundImageUrl: campaign.tenant.backgroundImageUrl,
      buttonColor: campaign.tenant.buttonColor,
    };
  }, [campaign]);

  const display: CampaignDisplay | null = useMemo(() => {
    if (!campaign) return null;
    return {
      id: campaign.id,
      name: campaign.name,
      description: campaign.description,
      status: campaign.status,
      mechanics: campaign.mechanics.map((m) => ({
        type: m.type,
        config: m.config as CampaignDisplay["mechanics"][number]["config"],
      })),
    };
  }, [campaign]);

  if (loading) {
    return <FullScreenMessage>Carregando…</FullScreenMessage>;
  }

  if (error && !campaign) {
    return <FullScreenMessage>{error}</FullScreenMessage>;
  }

  if (!campaign || !display) {
    return <FullScreenMessage>Campanha não encontrada</FullScreenMessage>;
  }

  const pendingReward = rewards.find((r) => r.status === "pending");

  // Slot abaixo do wheel
  const bottomSlot = !registered ? (
    <form onSubmit={handleRegister} className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 space-y-3">
      <p className="text-sm font-medium text-center">Cadastre-se pra participar</p>
      <input
        type="tel"
        placeholder="Seu telefone (somente números)"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="w-full h-11 px-4 rounded-lg bg-white/90 text-gray-900 placeholder:text-gray-500"
      />
      <input
        type="text"
        placeholder="Seu nome (opcional)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full h-11 px-4 rounded-lg bg-white/90 text-gray-900 placeholder:text-gray-500"
      />
      {error && <p className="text-sm text-red-200">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full h-11 rounded-lg font-semibold disabled:opacity-50"
        style={{ backgroundColor: branding.buttonColor || "#FF6B35", color: "white" }}
      >
        {submitting ? "Cadastrando…" : "Participar"}
      </button>
    </form>
  ) : pendingReward && !revealingReward ? (
    <div className="bg-yellow-400/20 backdrop-blur-md border border-yellow-300/40 rounded-2xl p-5 text-center">
      <div className="text-3xl mb-2">🎁</div>
      <p className="font-bold mb-1">Você tem um prêmio pra revelar!</p>
      <button
        type="button"
        onClick={() => startReveal(pendingReward)}
        className="mt-2 px-6 py-2.5 rounded-lg font-semibold"
        style={{ backgroundColor: branding.buttonColor || "#FF6B35", color: "white" }}
      >
        Toque pra revelar
      </button>
    </div>
  ) : revealingReward ? (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 text-center">
      <p className="text-sm opacity-80 mb-1">Código do seu prêmio</p>
      <p className="font-mono text-xl font-bold tracking-wider">{revealingReward.code.split(":").pop()}</p>
      <p className="text-xs opacity-70 mt-2">Apresente esse código no caixa pra resgatar</p>
    </div>
  ) : (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 text-center">
      <p className="text-sm">Você está participando! Faça uma compra para girar a roleta 🎡</p>
    </div>
  );

  return (
    <>
      <PageMeta title={`${campaign.name} | ${campaign.tenant.name}`} description={campaign.description ?? ""} />
      <div className="min-h-screen w-full" style={{ backgroundColor: branding.backgroundColor || "#1a1a2e" }}>
        <CampaignMobilePage
          branding={branding}
          campaign={display}
          interactive={false}
          autoSpinOnMount={revealingReward !== null}
          winningPrizeIndex={winningIndex}
          bottomSlot={bottomSlot}
        />
      </div>
    </>
  );
}

function FullScreenMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-900 text-white p-6 text-center">
      {children}
    </div>
  );
}
