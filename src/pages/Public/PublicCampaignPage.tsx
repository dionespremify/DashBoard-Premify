import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useParams } from "react-router";
import CampaignMobilePage, {
  type CampaignBranding,
  type CampaignDisplay,
} from "../../components/gamification/CampaignMobilePage";
import type { PrizeDefinition } from "../../components/prizes/PrizePoolEditor";
import {
  extractPrizeIdFromCode,
  getCustomerParticipations,
  getCustomerRewards,
  getPublicCampaign,
  joinPublicCampaign,
  registerPublicCustomer,
  requestLoginCode,
  verifyLoginCode,
  type PublicCampaign,
  type PublicParticipation,
  type PublicReward,
} from "../../api/publicApi";
import { submitSurvey } from "../../api/surveys";
import SurveyForm from "../../components/gamification/SurveyForm";
import { extractApiError } from "../../api/client";
import PageMeta from "../../components/common/PageMeta";

const PHONE_STORAGE_KEY = "premify_customer_phone";

type AuthPhase = "choose" | "register" | "login_email" | "login_code";

export default function PublicCampaignPage() {
  const { slug, campaignId: campaignIdParam } = useParams<{ slug: string; campaignId: string }>();
  const campaignId = campaignIdParam ? parseInt(campaignIdParam, 10) : NaN;

  const [campaign, setCampaign] = useState<PublicCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [phone, setPhone] = useState(() => localStorage.getItem(PHONE_STORAGE_KEY) ?? "");
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [registered, setRegistered] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Auth state machine
  const [authPhase, setAuthPhase] = useState<AuthPhase>("choose");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginCode, setLoginCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);

  // Survey state — mostrada após auth, antes de liberar a mecânica
  const [surveyShown, setSurveyShown] = useState(false);
  const [surveySubmitting, setSurveySubmitting] = useState(false);
  const [bonusMessage, setBonusMessage] = useState<string | null>(null);

  const [rewards, setRewards] = useState<PublicReward[]>([]);
  const [participations, setParticipations] = useState<PublicParticipation[]>([]);
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

  async function handleSurveySubmit(answers: Record<string, unknown>) {
    if (!slug || !phone) return;
    setSurveySubmitting(true);
    try {
      const res = await submitSurvey({
        tenantSlug: slug,
        phone,
        campaignId,
        answers,
      });
      if (res.bonusMessage) setBonusMessage(res.bonusMessage);
      // Recarrega rewards (pode ter ganhado bônus)
      await refreshRewards();
    } catch (err) {
      console.warn("Erro ao submeter survey:", err);
    } finally {
      setSurveySubmitting(false);
      setSurveyShown(true); // marca como exibida, libera mecânica
    }
  }

  function handleSurveySkip() {
    setSurveyShown(true);
  }

  async function refreshRewards() {
    if (!slug || !phone) return;
    try {
      const list = await getCustomerRewards(slug, phone);
      setRewards(list);
    } catch (err) {
      console.warn("Erro ao buscar rewards:", err);
    }
    try {
      const parts = await getCustomerParticipations(slug, phone);
      setParticipations(parts);
    } catch { /* ignora */ }
  }

  async function handleRequestCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting || !slug) return;
    if (!loginEmail.trim()) {
      setError("Digite seu email");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await requestLoginCode(slug, loginEmail.trim());
      setCodeSent(true);
      setAuthPhase("login_code");
    } catch (err) {
      setError(extractApiError(err, "Não foi possível enviar o código"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting || !slug) return;
    if (!loginCode.trim()) {
      setError("Digite o código que recebeu por email");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await verifyLoginCode(slug, loginEmail.trim(), loginCode.trim());
      try {
        await joinPublicCampaign({ tenantSlug: slug, phone: result.phone, campaignId });
      } catch {
        /* ignora se já participou ou se campanha não tá ativa */
      }
      // Carrega rewards + participations ANTES de liberar a roleta/stamps
      try {
        const list = await getCustomerRewards(slug, result.phone);
        setRewards(list);
      } catch { /* segue */ }
      try {
        const parts = await getCustomerParticipations(slug, result.phone);
        setParticipations(parts);
      } catch { /* segue */ }
      localStorage.setItem(PHONE_STORAGE_KEY, result.phone);
      setPhone(result.phone);
      setRegistered(true);
    } catch (err) {
      setError(extractApiError(err, "Código inválido ou expirado"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting || !slug) return;

    const fields = campaign?.customerFormConfig ?? [];

    // Valida campos obrigatórios
    const phoneValue = (formValues.phone ?? phone).trim();
    if (!phoneValue) {
      setError("Digite seu telefone");
      return;
    }
    for (const f of fields) {
      if (!f.enabled || !f.required) continue;
      if (f.key === "phone") continue;
      const v = (formValues[f.key] ?? "").trim();
      if (!v) {
        setError(`Preencha o campo "${f.key}"`);
        return;
      }
    }

    setSubmitting(true);
    setError(null);
    try {
      const emailValue = formValues.email?.trim();

      await registerPublicCustomer({
        tenantSlug: slug,
        phone: phoneValue,
        name: formValues.name?.trim() || undefined,
        email: emailValue || undefined,
        birthdate: formValues.birthdate?.trim() || undefined,
        gender: formValues.gender?.trim() || undefined,
        cpfCnpj: formValues.cpf_cnpj?.trim() || undefined,
        address: formValues.address?.trim() || undefined,
      });

      // Se forneceu email, exige verificação via código antes de liberar a roleta.
      if (emailValue) {
        await requestLoginCode(slug, emailValue);
        setLoginEmail(emailValue);
        setCodeSent(true);
        setAuthPhase("login_code");
        return;
      }

      // Sem email: já joina e libera direto.
      try {
        await joinPublicCampaign({ tenantSlug: slug, phone: phoneValue, campaignId });
      } catch {
        // ignora "campanha não ativa" — usuário ainda pode ver rewards anteriores
      }
      try {
        const list = await getCustomerRewards(slug, phoneValue);
        setRewards(list);
      } catch { /* segue */ }
      try {
        const parts = await getCustomerParticipations(slug, phoneValue);
        setParticipations(parts);
      } catch { /* segue */ }
      localStorage.setItem(PHONE_STORAGE_KEY, phoneValue);
      setPhone(phoneValue);
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
      wheelTheme: campaign.tenant.wheelTheme,
    };
  }, [campaign]);

  const display: CampaignDisplay | null = useMemo(() => {
    if (!campaign) return null;
    // Pega progresso atual do cliente nesta campanha (se já participou)
    const part = participations.find((p) => p.campaignId === campaign.id);
    return {
      id: campaign.id,
      name: campaign.name,
      description: campaign.description,
      status: campaign.status,
      mechanics: campaign.mechanics.map((m) => {
        const progressEntry = part?.progress.find((p) => p.mechanicType === m.type);
        return {
          type: m.type,
          config: m.config as CampaignDisplay["mechanics"][number]["config"],
          currentProgress: progressEntry?.progress,
        };
      }),
    };
  }, [campaign, participations]);

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
  const survey = campaign?.surveyConfig;
  const surveyEnabled = !!survey?.enabled && (survey?.questions?.length ?? 0) > 0;
  const showSurvey = registered && surveyEnabled && !surveyShown;
  const mechanicLocked = !registered || showSurvey;

  // Slot abaixo do wheel
  const formFields = (campaign?.customerFormConfig ?? []).filter((f) => f.enabled);
  const buttonColor = branding.buttonColor || "#FF6B35";

  const bottomSlot = showSurvey && survey ? (
    <SurveyForm
      config={{
        enabled: survey.enabled,
        bonus: survey.bonus,
        title: survey.title,
        subtitle: survey.subtitle,
        questions: survey.questions,
      }}
      buttonColor={branding.buttonColor || "#FF6B35"}
      onSubmit={handleSurveySubmit}
      onSkip={handleSurveySkip}
      submitting={surveySubmitting}
    />
  ) : !registered ? (
    authPhase === "choose" ? (
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 space-y-3">
        <p className="text-sm font-medium text-center mb-3">Pra participar, escolha:</p>
        <button
          type="button"
          onClick={() => { setError(null); setAuthPhase("register"); }}
          className="w-full h-12 rounded-lg font-semibold shadow"
          style={{ backgroundColor: buttonColor, color: "white" }}
        >
          ✨ Criar cadastro
        </button>
        <button
          type="button"
          onClick={() => { setError(null); setAuthPhase("login_email"); }}
          className="w-full h-12 rounded-lg font-semibold bg-white/20 border border-white/40 text-white hover:bg-white/30"
        >
          🔑 Já tenho cadastro
        </button>
      </div>
    ) : authPhase === "register" ? (
      <form onSubmit={handleRegister} className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 space-y-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-medium">Cadastre-se pra participar</p>
          <button
            type="button"
            onClick={() => { setError(null); setAuthPhase("choose"); }}
            className="text-xs underline opacity-80 hover:opacity-100"
          >
            ← Voltar
          </button>
        </div>
        {formFields.map((f) => (
          <DynamicFormField
            key={f.key}
            fieldKey={f.key}
            required={f.required}
            value={f.key === "phone" ? (formValues.phone ?? phone) : (formValues[f.key] ?? "")}
            onChange={(v) => {
              setFormValues((prev) => ({ ...prev, [f.key]: v }));
              if (f.key === "phone") setPhone(v);
            }}
          />
        ))}
        {error && <p className="text-sm text-red-200">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full h-11 rounded-lg font-semibold disabled:opacity-50"
          style={{ backgroundColor: buttonColor, color: "white" }}
        >
          {submitting ? "Cadastrando…" : "Participar"}
        </button>
      </form>
    ) : authPhase === "login_email" ? (
      <form onSubmit={handleRequestCode} className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 space-y-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-medium">Entre com seu email</p>
          <button
            type="button"
            onClick={() => { setError(null); setAuthPhase("choose"); }}
            className="text-xs underline opacity-80 hover:opacity-100"
          >
            ← Voltar
          </button>
        </div>
        <p className="text-xs opacity-80">Vamos te enviar um código de 6 dígitos no seu email.</p>
        <input
          type="email"
          placeholder="seu@email.com"
          value={loginEmail}
          onChange={(e) => setLoginEmail(e.target.value)}
          className="w-full h-11 px-4 rounded-lg bg-white/90 text-gray-900 placeholder:text-gray-500"
          autoFocus
        />
        {error && <p className="text-sm text-red-200">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full h-11 rounded-lg font-semibold disabled:opacity-50"
          style={{ backgroundColor: buttonColor, color: "white" }}
        >
          {submitting ? "Enviando…" : "Enviar código"}
        </button>
      </form>
    ) : (
      <form onSubmit={handleVerifyCode} className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 space-y-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-medium">Digite o código</p>
          <button
            type="button"
            onClick={() => { setError(null); setLoginCode(""); setAuthPhase("login_email"); }}
            className="text-xs underline opacity-80 hover:opacity-100"
          >
            ← Trocar email
          </button>
        </div>
        {codeSent && (
          <p className="text-xs opacity-80">
            Enviamos um código de 6 dígitos para <span className="font-semibold">{loginEmail}</span>. Válido por 5 minutos.
          </p>
        )}
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="000000"
          value={loginCode}
          onChange={(e) => setLoginCode(e.target.value.replace(/\D/g, ""))}
          className="w-full h-14 px-4 rounded-lg bg-white/90 text-gray-900 placeholder:text-gray-400 text-2xl text-center font-mono tracking-[0.5em]"
          autoFocus
        />
        {error && <p className="text-sm text-red-200">{error}</p>}
        <button
          type="submit"
          disabled={submitting || loginCode.length < 4}
          className="w-full h-11 rounded-lg font-semibold disabled:opacity-50"
          style={{ backgroundColor: buttonColor, color: "white" }}
        >
          {submitting ? "Validando…" : "Validar e entrar"}
        </button>
      </form>
    )
  ) : pendingReward && !revealingReward ? (
    // Quando tem prêmio pendente, o botão da própria roleta já dispara o reveal — não precisa de card extra.
    null
  ) : revealingReward ? (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 text-center">
      <p className="text-sm opacity-80 mb-1">Código do seu prêmio</p>
      <p className="font-mono text-xl font-bold tracking-wider">{revealingReward.code.split(":").pop()}</p>
      <p className="text-xs opacity-70 mt-2">Apresente esse código no caixa pra resgatar</p>
    </div>
  ) : bonusMessage ? (
    <div className="bg-yellow-300/20 backdrop-blur-md border border-yellow-300/40 rounded-2xl p-5 text-center">
      <p className="text-sm font-bold">{bonusMessage}</p>
      <p className="text-xs opacity-80 mt-1">Toque na roleta acima pra ver seu prêmio</p>
    </div>
  ) : (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 text-center">
      <p className="text-sm">Volte em breve! Novos prêmios aparecem aqui 🎁</p>
    </div>
  );

  return (
    <>
      <PageMeta title={`${campaign.name} | ${campaign.tenant.name}`} description={campaign.description ?? ""} />
      <div className="min-h-screen w-full">
        <CampaignMobilePage
          branding={branding}
          campaign={display}
          interactive={!!pendingReward && !revealingReward}
          onCtaClick={() => pendingReward && startReveal(pendingReward)}
          ctaLabel={pendingReward ? "🎁 Girar a roleta!" : "Girar a roleta!"}
          hideMechanic={mechanicLocked}
          autoSpinOnMount={revealingReward !== null}
          winningPrizeIndex={winningIndex}
          rewardCode={revealingReward?.code}
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

// ─────────────────────────────────────────────────
// Campo dinâmico baseado na config do tenant
// ─────────────────────────────────────────────────
const FIELD_META: Record<string, { label: string; placeholder: string; type: string }> = {
  phone: { label: "Telefone", placeholder: "Seu telefone", type: "tel" },
  name: { label: "Nome", placeholder: "Seu nome", type: "text" },
  email: { label: "Email", placeholder: "seu@email.com", type: "email" },
  birthdate: { label: "Data de nascimento", placeholder: "", type: "date" },
  gender: { label: "Gênero", placeholder: "", type: "select" },
  cpf_cnpj: { label: "CPF / CNPJ", placeholder: "Somente números", type: "text" },
  address: { label: "Endereço", placeholder: "Rua, número, bairro, cidade", type: "textarea" },
};

function DynamicFormField({
  fieldKey,
  required,
  value,
  onChange,
}: {
  fieldKey: string;
  required: boolean;
  value: string;
  onChange: (v: string) => void;
}) {
  const meta = FIELD_META[fieldKey] ?? { label: fieldKey, placeholder: "", type: "text" };
  const placeholder = `${meta.placeholder}${required ? "" : " (opcional)"}`;
  const baseClass = "w-full px-4 rounded-lg bg-white/90 text-gray-900 placeholder:text-gray-500";

  if (meta.type === "select" && fieldKey === "gender") {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`h-11 ${baseClass}`}
      >
        <option value="">{required ? "Selecione o gênero" : "Gênero (opcional)"}</option>
        <option value="female">Feminino</option>
        <option value="male">Masculino</option>
        <option value="other">Outro</option>
        <option value="prefer_not_say">Prefiro não dizer</option>
      </select>
    );
  }

  if (meta.type === "textarea") {
    return (
      <textarea
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className={`py-2 ${baseClass} resize-none`}
      />
    );
  }

  return (
    <input
      type={meta.type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`h-11 ${baseClass}`}
    />
  );
}
