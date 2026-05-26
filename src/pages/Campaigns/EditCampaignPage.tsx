import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useNavigate, useParams, Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import Button from "../../components/ui/button/Button";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import { extractApiError } from "../../api/client";
import { DEFAULT_CUSTOMER_FORM, getCampaign, updateCampaign, type Campaign, type CustomerFormField, type ParticipationLimitConfig } from "../../api/campaigns";
import ParticipationLimitEditor from "../../components/campaigns/ParticipationLimitEditor";
import { getBranding, type Branding } from "../../api/branding";
import BrandingForm from "../../components/branding/BrandingForm";
import type { WizardDimensionQuestion } from "../../api/wizard";
import PrizePoolEditor, { type PrizeDefinition } from "../../components/prizes/PrizePoolEditor";
import Tabs from "../../components/common/Tabs";
import { uploadImage } from "../../api/uploads";
import CustomerFormConfigEditor from "../../components/campaigns/CustomerFormConfigEditor";
import SurveyConfigEditor from "../../components/campaigns/SurveyConfigEditor";
import { DEFAULT_SURVEY_CONFIG, type SurveyConfig } from "../../api/surveys";
import CampaignMobilePage, {
  type CampaignBranding,
  type CampaignDisplay,
} from "../../components/gamification/CampaignMobilePage";

export default function EditCampaignPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [dimensioning, setDimensioning] = useState<Record<string, unknown>>({});
  const [customerFormConfig, setCustomerFormConfig] = useState<CustomerFormField[]>(DEFAULT_CUSTOMER_FORM);
  const [surveyConfig, setSurveyConfig] = useState<SurveyConfig>(DEFAULT_SURVEY_CONFIG);
  const [participationLimit, setParticipationLimit] = useState<ParticipationLimitConfig>({ enabled: false });
  const [branding, setBranding] = useState<Branding | null>(null);
  // Draft do branding (não salvo) — usado pelo preview pra refletir mudanças em tempo real.
  const [brandingDraft, setBrandingDraft] = useState<Branding | null>(null);

  useEffect(() => {
    getBranding().then(setBranding).catch(() => setBranding(null));
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!id) return;
      try {
        const c = await getCampaign(parseInt(id, 10));
        if (!active) return;
        setCampaign(c);
        setName(c.name);
        setDescription(c.description ?? "");
        setStartsAt(c.startsAt.slice(0, 10));
        setEndsAt(c.endsAt ? c.endsAt.slice(0, 10) : "");

        // Carrega valores atuais do mechanics[0].config como dimensioning
        const primary = c.mechanics[0];
        if (primary?.config && typeof primary.config === "object") {
          setDimensioning(primary.config as Record<string, unknown>);
        }
        if (c.customerFormConfig && c.customerFormConfig.length > 0) {
          setCustomerFormConfig(c.customerFormConfig);
        }
        if (c.surveyConfig) {
          setSurveyConfig(c.surveyConfig);
        }
        if (c.participationLimit) {
          setParticipationLimit({
            enabled: c.participationLimit.enabled,
            period: c.participationLimit.period ?? "total",
            count: c.participationLimit.count ?? 1,
          });
        }
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

  const dimensionQuestions = useMemo<WizardDimensionQuestion[]>(() => {
    const list = campaign?.blueprint?.dimensionQuestions;
    if (!Array.isArray(list)) return [];
    // BlueprintDimensionQuestion já é compatível em estrutura com WizardDimensionQuestion
    return list as unknown as WizardDimensionQuestion[];
  }, [campaign]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving || !campaign) return;
    if (!name.trim()) {
      setError("Dê um nome pra campanha");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      // Se o limite estiver ativo, forçamos CPF como required no formulário.
      const finalFormConfig = participationLimit.enabled
        ? ensureCpfRequired(customerFormConfig)
        : customerFormConfig;

      await updateCampaign(campaign.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        startsAt: new Date(startsAt + "T00:00:00").toISOString(),
        endsAt: endsAt ? new Date(endsAt + "T23:59:59").toISOString() : undefined,
        dimensioning,
        customerFormConfig: finalFormConfig,
        surveyConfig,
        participationLimit,
      });
      navigate(`/campanhas/${campaign.id}`, { replace: true });
    } catch (err) {
      setError(extractApiError(err, "Erro ao salvar"));
    } finally {
      setSaving(false);
    }
  }


  if (loading) {
    return (
      <>
        <PageBreadcrumb pageTitle="Editar campanha" />
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">Carregando…</div>
      </>
    );
  }

  if (!campaign) {
    return (
      <>
        <PageBreadcrumb pageTitle="Editar campanha" />
        <div className="p-8 text-center">
          <p className="mb-4 text-gray-500 dark:text-gray-400">{error ?? "Campanha não encontrada"}</p>
          <Link to="/campanhas">
            <Button>Voltar pra lista</Button>
          </Link>
        </div>
      </>
    );
  }

  // Preview usa o draft (ao vivo) quando disponível, com fallback no salvo.
  const previewSource = brandingDraft ?? branding;
  const previewBranding: CampaignBranding = {
    tenantSlug: previewSource?.tenantSlug,
    tenantName: previewSource?.tenantName ?? "Seu negócio",
    logoUrl: previewSource?.logoUrl,
    backgroundColor: previewSource?.backgroundColor ?? "#1a1a2e",
    backgroundImageUrl: previewSource?.backgroundImageUrl,
    buttonColor: previewSource?.buttonColor ?? "#FF6B35",
    wheelTheme: previewSource?.wheelTheme ?? "vegas",
    gamificationType: previewSource?.gamificationType ?? "wheel",
  };

  const previewDisplay: CampaignDisplay = {
    id: campaign.id,
    name: name || campaign.name,
    description: description || campaign.description,
    mechanics: campaign.mechanics.map((m) => ({
      type: m.type,
      config: dimensioning as CampaignDisplay["mechanics"][number]["config"],
    })),
  };


  const formTab = (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-5">
        <div className="p-6 bg-white rounded-2xl shadow-sm dark:bg-gray-800/50 dark:border dark:border-gray-700">
          <h2 className="mb-4 text-lg font-medium text-gray-800 dark:text-white/90">Informações básicas</h2>
          <div className="space-y-4">
            <div>
              <Label>
                Nome da campanha <span className="text-error-500">*</span>
              </Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div>
              <Label>Descrição (opcional)</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Início</Label>
                <Input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
              </div>
              <div>
                <Label>Fim (opcional)</Label>
                <Input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {dimensionQuestions.length > 0 ? (
          <div className="p-6 bg-white rounded-2xl shadow-sm dark:bg-gray-800/50 dark:border dark:border-gray-700">
            <h2 className="mb-4 text-lg font-medium text-gray-800 dark:text-white/90">Configuração da mecânica</h2>
            <div className="space-y-5">
              {dimensionQuestions.map((q) => (
                <DimensionInput
                  key={q.key}
                  question={q}
                  value={dimensioning[q.key]}
                  onChange={(v) => setDimensioning((d) => ({ ...d, [q.key]: v }))}
                  siblings={dimensioning}
                  gamificationType={branding?.gamificationType ?? "wheel"}
                />
              ))}
            </div>
          </div>
        ) : campaign.blueprintCode ? (
          <div className="p-6 bg-warning-50 rounded-2xl border border-warning-200 dark:bg-warning-500/10 dark:border-warning-500/30">
            <h2 className="mb-2 text-lg font-medium text-warning-700 dark:text-warning-300">
              ⚠️ Configuração da mecânica não carregou
            </h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              A API não está retornando os campos de personalização da mecânica. Provável causa: o backend não foi reiniciado depois das últimas mudanças.
            </p>
            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc pl-5">
              <li>Pare o backend no Visual Studio (Shift+F5)</li>
              <li>Suba de novo (F5)</li>
              <li>Volte aqui e recarregue (Ctrl+R)</li>
            </ul>
            <details className="mt-3 text-xs text-gray-600 dark:text-gray-400">
              <summary className="cursor-pointer">Debug</summary>
              <pre className="mt-2 p-2 bg-white/50 dark:bg-gray-900/50 rounded text-xs overflow-x-auto">
{JSON.stringify({ blueprintCode: campaign.blueprintCode, hasBlueprint: !!campaign.blueprint, dimensionQuestions: campaign.blueprint?.dimensionQuestions }, null, 2)}
              </pre>
            </details>
          </div>
        ) : null}

        {error && (
          <div className="p-3 text-sm rounded-lg bg-error-50 text-error-700 border border-error-200 dark:bg-error-500/10 dark:text-error-300 dark:border-error-500/30">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between">
          <Link
            to={`/campanhas/${campaign.id}`}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            ← Cancelar
          </Link>
          <Button disabled={saving}>{saving ? "Salvando…" : "Salvar alterações"}</Button>
        </div>
      </form>
  );

  return (
    <>
      <PageMeta title={`Editar ${campaign.name} | Premify`} description="Edite os detalhes da campanha." />
      <PageBreadcrumb pageTitle={`Editar: ${campaign.name}`} />

      <div className="max-w-4xl mx-auto">
        <Tabs
          tabs={[
            {
              key: "branding",
              label: "Personalização",
              icon: "🎨",
              content: (
                <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                  <BrandingForm
                    onSaved={setBranding}
                    onDraftChange={setBrandingDraft}
                    showGlobalWarning
                  />
                  <div className="lg:sticky lg:top-4 lg:self-start">
                    <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      👁 Pré-visualização (ao vivo)
                    </div>
                    <div
                      className="overflow-hidden rounded-[2.5rem] border-[10px] border-gray-800 dark:border-gray-700 shadow-2xl bg-black"
                      style={{ aspectRatio: "9/16", maxHeight: "70vh" }}
                    >
                      <div className="w-full h-full overflow-auto">
                        <CampaignMobilePage
                          branding={previewBranding}
                          campaign={previewDisplay}
                          interactive={false}
                          demoMode
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ),
            },
            { key: "config", label: "Configuração", icon: "⚙️", content: formTab },
            {
              key: "form",
              label: "Cadastro do cliente",
              icon: "📝",
              content: (
                <div className="max-w-3xl mx-auto">
                  <div className="p-6 bg-white rounded-2xl shadow-sm dark:bg-gray-800/50 dark:border dark:border-gray-700">
                    <h2 className="mb-1 text-lg font-medium text-gray-800 dark:text-white/90">
                      Campos do formulário de participação
                    </h2>
                    <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
                      Defina quais dados o cliente precisa preencher pra entrar nessa campanha.
                    </p>
                    <CustomerFormConfigEditor
                      value={customerFormConfig}
                      onChange={setCustomerFormConfig}
                    />
                  </div>
                </div>
              ),
            },
            {
              key: "survey",
              label: "Pesquisa",
              icon: "📊",
              content: (
                <div className="max-w-3xl mx-auto">
                  <div className="p-6 bg-white rounded-2xl shadow-sm dark:bg-gray-800/50 dark:border dark:border-gray-700">
                    <h2 className="mb-1 text-lg font-medium text-gray-800 dark:text-white/90">
                      Pesquisa de satisfação
                    </h2>
                    <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
                      Opcional. Mostra após o cadastro, antes da roleta. Você decide se quem responder ganha bônus.
                    </p>
                    <SurveyConfigEditor value={surveyConfig} onChange={setSurveyConfig} />
                  </div>
                </div>
              ),
            },
            {
              key: "limit",
              label: "Limite",
              icon: "🚦",
              content: (
                <div className="max-w-3xl mx-auto">
                  <ParticipationLimitEditor value={participationLimit} onChange={setParticipationLimit} />
                </div>
              ),
            },
          ]}
        />
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────
// Componente DimensionInput espelhado do WizardPage
// (mesmas regras: prize_pool, boolean, select, text, date, percent, int, money)
// ─────────────────────────────────────────────────
function DimensionInput({
  question,
  value,
  onChange,
  siblings,
  gamificationType,
}: {
  question: WizardDimensionQuestion;
  value: unknown;
  onChange: (v: unknown) => void;
  siblings?: Record<string, unknown>;
  gamificationType?: "wheel" | "scratch" | "box";
}) {
  const placeholder = question.placeholder ?? "";

  if (question.type === "prize_pool") {
    return (
      <div>
        <Label>{question.label}</Label>
        <PrizePoolEditor
          value={(value as PrizeDefinition[]) ?? []}
          onChange={(next) => onChange(next)}
          everyoneWins={(siblings?.everyone_wins as boolean) ?? true}
          gamificationType={gamificationType}
        />
      </div>
    );
  }

  if (question.type === "image") {
    return (
      <EditSingleImageInput
        label={question.label}
        placeholder={placeholder}
        value={(value as string) ?? ""}
        onChange={(v) => onChange(v)}
      />
    );
  }

  if (question.type === "boolean") {
    const checked = value === true || value === "true";
    return (
      <div>
        <Label>{question.label}</Label>
        <label className="flex items-center gap-3 p-3 border rounded-lg border-gray-200 dark:border-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="w-4 h-4 rounded text-brand-500 focus:ring-brand-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {checked ? "Sim" : "Não"} {placeholder && `— ${placeholder}`}
          </span>
        </label>
      </div>
    );
  }

  if (question.type === "select") {
    const options = question.options ?? [];
    const current = (value as string) ?? "";
    return (
      <div>
        <Label>{question.label}</Label>
        <div className="grid gap-2 sm:grid-cols-3">
          {options.map((opt) => {
            const selected = current === opt.value;
            return (
              <button
                type="button"
                key={opt.value}
                onClick={() => onChange(opt.value)}
                className={`p-3 text-left rounded-lg border transition ${
                  selected
                    ? "bg-brand-50 border-brand-500 dark:bg-brand-500/10 dark:border-brand-400"
                    : "bg-white border-gray-200 hover:border-gray-300 dark:bg-gray-900 dark:border-gray-700"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {opt.icon && <span className="text-lg">{opt.icon}</span>}
                  <span className="font-medium text-sm text-gray-800 dark:text-white/90">{opt.label}</span>
                </div>
                {opt.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">{opt.description}</p>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (question.type === "text") {
    return (
      <div>
        <Label>{question.label}</Label>
        <Input placeholder={placeholder} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
      </div>
    );
  }

  if (question.type === "date") {
    return (
      <div>
        <Label>{question.label}</Label>
        <Input type="date" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
      </div>
    );
  }

  if (question.type === "percent" || question.type === "int") {
    return (
      <div>
        <Label>
          {question.label}
          {question.type === "percent" && <span className="text-gray-400 ml-1">(%)</span>}
        </Label>
        <Input
          type="number"
          min={question.min !== undefined ? String(question.min) : undefined}
          max={question.max !== undefined ? String(question.max) : undefined}
          value={(value as number)?.toString() ?? ""}
          onChange={(e) => onChange(e.target.value ? parseInt(e.target.value, 10) : "")}
        />
      </div>
    );
  }

  if (question.type === "money") {
    return (
      <div>
        <Label>
          {question.label} <span className="text-gray-400 ml-1">(em centavos)</span>
        </Label>
        <Input
          type="number"
          min="0"
          placeholder={placeholder || "ex: 1500 = R$ 15,00"}
          value={(value as number)?.toString() ?? ""}
          onChange={(e) => onChange(e.target.value ? parseInt(e.target.value, 10) : "")}
        />
      </div>
    );
  }

  return (
    <div>
      <Label>{question.label}</Label>
      <Input placeholder={placeholder} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function EditSingleImageInput({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const res = await uploadImage(file, "misc");
      onChange(res.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar imagem");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div>
      <Label>{label}</Label>
      {value ? (
        <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-900 shrink-0 border border-gray-300 dark:border-gray-700">
            <img src={value} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">✓ Imagem salva no servidor</div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-3 h-8 text-xs text-brand-600 hover:text-brand-700 border border-brand-300 rounded disabled:opacity-50"
              >
                {uploading ? "Enviando…" : "Trocar"}
              </button>
              <button
                type="button"
                onClick={() => onChange("")}
                className="px-3 h-8 text-xs text-error-500 hover:text-error-700 border border-error-300 rounded"
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full p-4 text-sm font-medium text-brand-600 bg-brand-50 rounded-xl border-2 border-dashed border-brand-300 hover:bg-brand-100 dark:bg-brand-500/10 dark:border-brand-500/40 dark:text-brand-300 disabled:opacity-50"
        >
          {uploading ? "Enviando…" : "📷 Enviar imagem"}
        </button>
      )}
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      {placeholder && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{placeholder}</p>}
      {error && <p className="mt-1 text-xs text-error-500">{error}</p>}
    </div>
  );
}

function ensureCpfRequired(fields: CustomerFormField[]): CustomerFormField[] {
  const copy = fields.map((f) => ({ ...f }));
  const cpf = copy.find((f) => f.key === "cpf_cnpj");
  if (cpf) {
    cpf.enabled = true;
    cpf.required = true;
  } else {
    copy.push({ key: "cpf_cnpj", enabled: true, required: true });
  }
  return copy;
}
