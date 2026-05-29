import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import Button from "../../components/ui/button/Button";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import {
  nextWizardStep,
  startWizard,
  type WizardAnswers,
  type WizardDimensionQuestion,
  type WizardRecommendation,
  type WizardStepResponse,
} from "../../api/wizard";
import { createCampaign, DEFAULT_CUSTOMER_FORM, type CustomerFormField } from "../../api/campaigns";
import { extractApiError } from "../../api/client";
import PrizePoolEditor, { type PrizeDefinition } from "../../components/prizes/PrizePoolEditor";
import { uploadImage } from "../../api/uploads";
import Tabs from "../../components/common/Tabs";
import CustomerFormConfigEditor from "../../components/campaigns/CustomerFormConfigEditor";
import SurveyConfigEditor from "../../components/campaigns/SurveyConfigEditor";
import { DEFAULT_SURVEY_CONFIG, type SurveyConfig } from "../../api/surveys";
import CampaignMobilePage, {
  type CampaignBranding,
  type CampaignDisplay,
} from "../../components/gamification/CampaignMobilePage";
import { getBranding, updateBranding, type Branding } from "../../api/branding";
import BrandingForm from "../../components/branding/BrandingForm";

type Phase = "loading" | "question" | "recommendation" | "no_match" | "creating";

export default function WizardPage() {
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>("loading");
  const [step, setStep] = useState<WizardStepResponse | null>(null);
  const [answers, setAnswers] = useState<WizardAnswers>({});
  const [history, setHistory] = useState<WizardStepResponse[]>([]);
  const [error, setError] = useState<string | null>(null);

  // dimensioning + metadata
  const [dimensioning, setDimensioning] = useState<Record<string, unknown>>({});
  const [campaignName, setCampaignName] = useState("");
  const [startsAt, setStartsAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [endsAt, setEndsAt] = useState("");
  const [activateImmediately, setActivateImmediately] = useState(true);
  const [customerFormConfig, setCustomerFormConfig] = useState<CustomerFormField[]>(DEFAULT_CUSTOMER_FORM);
  const [surveyConfig, setSurveyConfig] = useState<SurveyConfig>(DEFAULT_SURVEY_CONFIG);

  // branding pro preview (versão salva) + draft com mudanças não salvas
  const [branding, setBranding] = useState<Branding | null>(null);
  const [brandingDraft, setBrandingDraft] = useState<Branding | null>(null);
  useEffect(() => {
    getBranding().then(setBranding).catch(() => setBranding(null));
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const first = await startWizard();
        if (!active) return;
        applyStep(first);
      } catch (err) {
        if (active) {
          setError(extractApiError(err, "Erro ao iniciar o wizard"));
          setPhase("no_match");
        }
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyStep(s: WizardStepResponse) {
    setStep(s);
    if (s.type === "question") {
      setPhase("question");
    } else if (s.type === "recommendation") {
      setPhase("recommendation");
      if (s.recommendation) {
        setCampaignName(s.recommendation.label);
        // Pré-popula defaults das dimension_questions
        const defaults: Record<string, unknown> = {};
        s.recommendation.dimensionQuestions.forEach((q) => {
          if (q.default !== undefined && q.default !== null) defaults[q.key] = q.default;
        });
        setDimensioning(defaults);
      }
    } else {
      setPhase("no_match");
    }
  }

  async function answerQuestion(key: string) {
    if (!step?.question) return;
    const dimension = step.question.dimension;
    const nextAnswers: WizardAnswers = { ...answers, [dimension]: key };
    setAnswers(nextAnswers);
    setHistory((h) => [...h, step]);
    setPhase("loading");
    try {
      const next = await nextWizardStep(nextAnswers);
      applyStep(next);
    } catch (err) {
      setError(extractApiError(err, "Erro ao avançar wizard"));
      setPhase("no_match");
    }
  }

  function goBack() {
    const last = history[history.length - 1];
    if (!last) return;
    // Remove a última resposta
    if (last.question) {
      const dim = last.question.dimension;
      const { [dim]: _removed, ...rest } = answers;
      void _removed;
      setAnswers(rest);
    }
    setHistory((h) => h.slice(0, -1));
    setStep(last);
    setPhase(last.type === "question" ? "question" : "recommendation");
    setError(null);
  }

  function restart() {
    setAnswers({});
    setHistory([]);
    setStep(null);
    setError(null);
    setDimensioning({});
    setCampaignName("");
    setPhase("loading");
    (async () => {
      try {
        const first = await startWizard();
        applyStep(first);
      } catch (err) {
        setError(extractApiError(err, "Erro ao reiniciar"));
        setPhase("no_match");
      }
    })();
  }

  async function handleCreate() {
    if (!step?.recommendation) return;
    if (!campaignName.trim()) {
      setError("Dê um nome para a campanha");
      return;
    }
    // Valida dimension_questions obrigatórias (sem valor)
    const missing = step.recommendation.dimensionQuestions.find((q) => {
      const v = dimensioning[q.key];
      if (q.type === "boolean") return false; // false é resposta válida
      if (q.type === "prize_pool") return !Array.isArray(v) || v.length === 0;
      return v === undefined || v === null || v === "";
    });
    if (missing) {
      setError(`Preencha o campo "${missing.label}"`);
      return;
    }

    setPhase("creating");
    setError(null);
    try {
      // 1. Salva personalização (branding) se houve mudança no draft
      if (brandingDraft) {
        const updatedBranding = await updateBranding({
          logoUrl: brandingDraft.logoUrl ?? null,
          backgroundColor: brandingDraft.backgroundColor ?? null,
          backgroundImageUrl: brandingDraft.backgroundImageUrl ?? null,
          buttonColor: brandingDraft.buttonColor ?? null,
          wheelTheme: brandingDraft.wheelTheme ?? null,
          gamificationType: brandingDraft.gamificationType ?? null,
        });
        setBranding(updatedBranding);
      }

      // 2. Cria a campanha
      const created = await createCampaign({
        blueprintCode: step.recommendation.blueprintCode,
        name: campaignName.trim(),
        startsAt: new Date(startsAt + "T00:00:00").toISOString(),
        endsAt: endsAt ? new Date(endsAt + "T23:59:59").toISOString() : undefined,
        wizardAnswers: answers,
        dimensioning,
        customerFormConfig,
        surveyConfig,
        activateImmediately,
      });
      navigate(`/campanhas/${created.id}`, { replace: true });
    } catch (err) {
      setError(extractApiError(err, "Erro ao criar campanha"));
      setPhase("recommendation");
    }
  }

  return (
    <>
      <PageMeta title="Nova campanha | Premify" description="Crie uma nova campanha guiada pelo wizard." />
      <PageBreadcrumb pageTitle="Nova campanha" />

      <div className="max-w-3xl mx-auto">
        {phase === "loading" && (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">Carregando…</div>
        )}

        {phase === "question" && step?.question && (
          <WizardQuestionView
            question={step.question}
            onAnswer={answerQuestion}
            onBack={history.length > 0 ? goBack : undefined}
            stepIndex={history.length + 1}
          />
        )}

        {phase === "recommendation" && step?.recommendation && (
          <>
            {/* Barra de ações fixa — visível em todas as abas */}
            <div className="sticky top-0 z-10 -mx-2 mb-4 px-2 py-3 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-2">
              <Button
                variant="outline"
                onClick={() => (history.length > 0 ? goBack() : restart())}
              >
                <span className="hidden sm:inline">← Voltar</span>
                <span className="sm:hidden">←</span>
              </Button>
              <Button onClick={handleCreate} disabled={!campaignName.trim()}>
                {campaignName.trim() ? (
                  <>
                    <span className="hidden sm:inline">💾 Criar campanha</span>
                    <span className="sm:hidden">💾 Criar</span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">Dê um nome na aba Configuração</span>
                    <span className="sm:hidden">Falta o nome</span>
                  </>
                )}
              </Button>
            </div>
            {error && (
              <div className="mb-4 p-3 text-sm rounded-lg bg-error-50 text-error-700 border border-error-200 dark:bg-error-500/10 dark:text-error-300 dark:border-error-500/30">
                {error}
              </div>
            )}
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
                      hideSaveButton
                    />
                    <div className="lg:sticky lg:top-4 lg:self-start">
                      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        👁 Pré-visualização (ao vivo)
                      </div>
                      <WizardPreviewPanel
                        recommendation={step.recommendation}
                        dimensioning={dimensioning}
                        campaignName={campaignName}
                        branding={brandingDraft ?? branding}
                      />
                    </div>
                  </div>
                ),
              },
              {
                key: "config",
                label: "Configuração",
                icon: "⚙️",
                content: (
                  <WizardRecommendationView
                    recommendation={step.recommendation}
                    dimensioning={dimensioning}
                    onDimensioningChange={(key, value) => setDimensioning((d) => ({ ...d, [key]: value }))}
                    campaignName={campaignName}
                    onCampaignNameChange={setCampaignName}
                    startsAt={startsAt}
                    onStartsAtChange={setStartsAt}
                    endsAt={endsAt}
                    onEndsAtChange={setEndsAt}
                    activateImmediately={activateImmediately}
                    onActivateImmediatelyChange={setActivateImmediately}
                    onCreate={handleCreate}
                    onBack={history.length > 0 ? goBack : undefined}
                    onRestart={restart}
                    creating={false}
                    gamificationType={(brandingDraft ?? branding)?.gamificationType ?? "wheel"}
                  />
                ),
              },
              {
                key: "form",
                label: "Cadastro do cliente",
                icon: "📝",
                content: (
                  <div className="p-4 sm:p-6 bg-white rounded-2xl shadow-sm dark:bg-gray-800/50 dark:border dark:border-gray-700">
                    <h2 className="mb-1 text-lg font-medium text-gray-800 dark:text-white/90">
                      Campos do formulário de participação
                    </h2>
                    <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
                      Defina quais dados o cliente vai preencher pra entrar nessa campanha.
                    </p>
                    <CustomerFormConfigEditor
                      value={customerFormConfig}
                      onChange={setCustomerFormConfig}
                    />
                  </div>
                ),
              },
              {
                key: "survey",
                label: "Pesquisa",
                icon: "📊",
                content: (
                  <div className="p-4 sm:p-6 bg-white rounded-2xl shadow-sm dark:bg-gray-800/50 dark:border dark:border-gray-700">
                    <h2 className="mb-1 text-lg font-medium text-gray-800 dark:text-white/90">
                      Pesquisa de satisfação
                    </h2>
                    <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
                      Opcional. Mostra após o cadastro, antes da roleta. Você decide se quem responder ganha bônus.
                    </p>
                    <SurveyConfigEditor value={surveyConfig} onChange={setSurveyConfig} />
                  </div>
                ),
              },
              {
                key: "preview",
                label: "Preview",
                icon: "👁",
                content: (
                  <WizardPreviewPanel
                    recommendation={step.recommendation}
                    dimensioning={dimensioning}
                    campaignName={campaignName}
                    branding={brandingDraft ?? branding}
                  />
                ),
              },
            ]}
          />
          </>
        )}

        {phase === "creating" && (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">Criando campanha…</div>
        )}

        {phase === "no_match" && (
          <WizardNoMatchView
            message={step?.message ?? error ?? "Algo deu errado."}
            onRetry={restart}
          />
        )}

        {error && phase !== "no_match" && (
          <div className="mt-4 p-3 text-sm rounded-lg bg-error-50 text-error-700 border border-error-200 dark:bg-error-500/10 dark:text-error-300 dark:border-error-500/30">
            {error}
          </div>
        )}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────
// View: Pergunta do decision tree
// ─────────────────────────────────────────────────
function WizardQuestionView({
  question,
  onAnswer,
  onBack,
  stepIndex,
}: {
  question: NonNullable<WizardStepResponse["question"]>;
  onAnswer: (key: string) => void;
  onBack?: () => void;
  stepIndex: number;
}) {
  return (
    <div className="p-4 sm:p-6 bg-white rounded-2xl shadow-sm dark:bg-gray-800/50 dark:border dark:border-gray-700">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-brand-500 dark:text-brand-400">
        Passo {stepIndex}
      </div>
      <h2 className="mb-2 text-xl font-semibold text-gray-800 dark:text-white/90 sm:text-2xl">
        {question.questionText}
      </h2>
      {question.subtitle && (
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">{question.subtitle}</p>
      )}

      <div className="grid gap-3 sm:grid-cols-1">
        {question.options.map((opt) => (
          <button
            type="button"
            key={opt.key}
            onClick={() => onAnswer(opt.key)}
            className="flex items-start gap-4 p-4 text-left transition border rounded-xl bg-white border-gray-200 hover:border-brand-400 hover:bg-brand-50/30 dark:bg-gray-900 dark:border-gray-700 dark:hover:border-brand-400 dark:hover:bg-brand-500/5"
          >
            {opt.icon && <span className="text-2xl shrink-0">{opt.icon}</span>}
            <div className="flex-1">
              <div className="font-medium text-gray-800 dark:text-white/90">{opt.label}</div>
              {opt.description && (
                <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">{opt.description}</div>
              )}
            </div>
          </button>
        ))}
      </div>

      {onBack && (
        <div className="mt-6">
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            ← Voltar
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────
// View: Recomendação + dimensionamento
// ─────────────────────────────────────────────────
function WizardRecommendationView({
  recommendation,
  dimensioning,
  onDimensioningChange,
  campaignName,
  onCampaignNameChange,
  startsAt,
  onStartsAtChange,
  endsAt,
  onEndsAtChange,
  activateImmediately,
  onActivateImmediatelyChange,
  onCreate,
  onBack,
  onRestart,
  creating,
  gamificationType,
}: {
  recommendation: WizardRecommendation;
  dimensioning: Record<string, unknown>;
  onDimensioningChange: (key: string, value: unknown) => void;
  campaignName: string;
  onCampaignNameChange: (v: string) => void;
  startsAt: string;
  onStartsAtChange: (v: string) => void;
  endsAt: string;
  onEndsAtChange: (v: string) => void;
  activateImmediately: boolean;
  onActivateImmediatelyChange: (v: boolean) => void;
  onCreate: () => void;
  onBack?: () => void;
  onRestart: () => void;
  creating: boolean;
  gamificationType?: "wheel" | "scratch" | "box";
}) {
  return (
    <div className="space-y-6">
      {/* Card da recomendação */}
      <div className="p-6 bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-200 dark:from-brand-500/10 dark:to-gray-800/50 dark:border-brand-500/30">
        <div className="flex items-start gap-4">
          {recommendation.icon && <span className="text-4xl">{recommendation.icon}</span>}
          <div className="flex-1">
            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-brand-600 dark:text-brand-400">
              Recomendação para o seu negócio
            </div>
            <h2 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              {recommendation.label}
            </h2>
            {recommendation.description && (
              <p className="text-sm text-gray-600 dark:text-gray-300">{recommendation.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Dimensionamento */}
      <div className="p-4 sm:p-6 bg-white rounded-2xl shadow-sm dark:bg-gray-800/50 dark:border dark:border-gray-700">
        <h3 className="mb-4 text-lg font-medium text-gray-800 dark:text-white/90">
          Configure os detalhes
        </h3>

        <div className="grid gap-4">
          <div>
            <Label>
              Nome da campanha <span className="text-error-500">*</span>
            </Label>
            <Input
              placeholder="ex: Cartão Fidelidade do Bar do Zé"
              value={campaignName}
              onChange={(e) => onCampaignNameChange(e.target.value)}
            />
          </div>

          {recommendation.dimensionQuestions.map((q) => (
            <DimensionInput
              key={q.key}
              question={q}
              value={dimensioning[q.key]}
              onChange={(v) => onDimensioningChange(q.key, v)}
              siblings={dimensioning}
              gamificationType={gamificationType ?? "wheel"}
            />
          ))}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Início da campanha</Label>
              <Input type="date" value={startsAt} onChange={(e) => onStartsAtChange(e.target.value)} />
            </div>
            <div>
              <Label>Fim (opcional)</Label>
              <Input type="date" value={endsAt} onChange={(e) => onEndsAtChange(e.target.value)} />
            </div>
          </div>

          <label className="inline-flex items-center gap-2 cursor-pointer mt-2">
            <input
              type="checkbox"
              checked={activateImmediately}
              onChange={(e) => onActivateImmediatelyChange(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Ativar imediatamente após criar</span>
          </label>
        </div>
      </div>

      {/* Ações */}
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              ← Voltar
            </button>
          )}
          <button
            type="button"
            onClick={onRestart}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            Refazer wizard
          </button>
        </div>
        <Button onClick={onCreate} disabled={creating}>
          {creating ? "Criando…" : "Criar campanha"}
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Input dinâmico por tipo de pergunta
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
      <SingleImageInput
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
                  <span className="font-medium text-sm text-gray-800 dark:text-white/90">
                    {opt.label}
                  </span>
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
        <Input
          placeholder={placeholder}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }

  if (question.type === "date") {
    return (
      <div>
        <Label>{question.label}</Label>
        <Input
          type="date"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }

  if (question.type === "percent" || question.type === "int") {
    const min = question.min !== undefined ? String(question.min) : undefined;
    const max = question.max !== undefined ? String(question.max) : undefined;
    return (
      <div>
        <Label>
          {question.label}
          {question.type === "percent" && <span className="text-gray-400 ml-1">(%)</span>}
        </Label>
        <Input
          type="number"
          min={min}
          max={max}
          value={(value as number)?.toString() ?? ""}
          onChange={(e) => onChange(e.target.value ? parseInt(e.target.value, 10) : "")}
        />
      </div>
    );
  }

  if (question.type === "money") {
    // Aceita reais; ao salvar, o WizardPage não converte — quem submete já fala em centavos.
    // Aqui mantemos centavos pra simplicidade (compatível com config_template).
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

  // fallback
  return (
    <div>
      <Label>{question.label}</Label>
      <Input
        placeholder={placeholder}
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────
// Input de imagem única (upload pro servidor)
// ─────────────────────────────────────────────────
function SingleImageInput({
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

// ─────────────────────────────────────────────────
// Preview da campanha (frame de celular com CampaignMobilePage)
// Renderiza o que está em dimensioning como se a campanha já existisse.
// ─────────────────────────────────────────────────
function WizardPreviewPanel({
  recommendation,
  dimensioning,
  campaignName,
  branding,
}: {
  recommendation: { mechanics: { type: string }[]; label: string; description?: string | null };
  dimensioning: Record<string, unknown>;
  campaignName: string;
  branding: Branding | null;
}) {
  const previewBranding: CampaignBranding = {
    tenantSlug: branding?.tenantSlug,
    tenantName: branding?.tenantName ?? "Seu negócio",
    logoUrl: branding?.logoUrl,
    backgroundColor: branding?.backgroundColor ?? "#1a1a2e",
    backgroundImageUrl: branding?.backgroundImageUrl,
    buttonColor: branding?.buttonColor ?? "#FF6B35",
    wheelTheme: branding?.wheelTheme ?? "vegas",
    gamificationType: branding?.gamificationType ?? "wheel",
  };

  const display: CampaignDisplay = {
    name: campaignName || recommendation.label,
    description: recommendation.description,
    mechanics: recommendation.mechanics.map((m) => ({
      type: m.type,
      config: dimensioning as CampaignDisplay["mechanics"][number]["config"],
    })),
  };

  return (
    <div className="flex justify-center py-2">
      <div
        key={previewBranding.gamificationType ?? "wheel"}
        className="overflow-hidden rounded-[2.5rem] border-[10px] border-gray-800 dark:border-gray-700 shadow-2xl bg-black"
        style={{ aspectRatio: "9/16", maxHeight: "75vh", width: "min(380px, 100%)" }}
      >
        <div className="w-full h-full overflow-auto">
          <CampaignMobilePage
            key={previewBranding.gamificationType ?? "wheel"}
            branding={previewBranding}
            campaign={display}
            interactive={false}
            demoMode
          />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// View: estado de erro / sem match
// Decide a ação certa baseado no motivo do erro.
// ─────────────────────────────────────────────────
function WizardNoMatchView({ message, onRetry }: { message: string; onRetry: () => void }) {
  const lower = message.toLowerCase();
  const needsOnboarding = lower.includes("onboarding");

  return (
    <div className="p-8 text-center bg-white rounded-2xl shadow-sm dark:bg-gray-800/50 dark:border dark:border-gray-700">
      <div className="mb-4 text-4xl">{needsOnboarding ? "📋" : "⚠️"}</div>
      <h2 className="mb-2 text-lg font-medium text-gray-800 dark:text-white/90">
        {needsOnboarding ? "Falta completar o perfil do seu negócio" : "Não foi possível iniciar o wizard"}
      </h2>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">{message}</p>

      <div className="flex items-center justify-center gap-3">
        {needsOnboarding ? (
          <Link to="/onboarding">
            <Button>Concluir onboarding</Button>
          </Link>
        ) : (
          <Button onClick={onRetry}>Tentar novamente</Button>
        )}
        <Link to="/campanhas">
          <button
            type="button"
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            Voltar para campanhas
          </button>
        </Link>
      </div>
    </div>
  );
}
