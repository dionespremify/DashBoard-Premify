import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import Button from "../../components/ui/button/Button";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import CampaignMobilePage, {
  type CampaignBranding,
  type CampaignDisplay,
} from "../../components/gamification/CampaignMobilePage";
import { getBranding, updateBranding, type Branding, type WheelTheme, type GamificationType } from "../../api/branding";
import { extractApiError } from "../../api/client";
import { listCampaigns, type Campaign } from "../../api/campaigns";
import { uploadImage } from "../../api/uploads";

const THEME_OPTIONS: { value: WheelTheme; label: string; icon: string; description: string }[] = [
  { value: "classic", label: "Clássico", icon: "⚪", description: "Simples e elegante" },
  { value: "vegas", label: "Las Vegas", icon: "🎰", description: "Com luzes piscando, estilo cassino" },
  { value: "neon", label: "Neon", icon: "💜", description: "Visual futurista com glow" },
];

const GAMIFICATION_OPTIONS: {
  value: GamificationType;
  label: string;
  icon: string;
  tag?: string;
  description: string;
  available: boolean;
}[] = [
  {
    value: "wheel",
    label: "Roleta",
    icon: "🎡",
    description: "O cliente gira a roleta e descobre o prêmio na hora.",
    available: true,
  },
  {
    value: "scratch",
    label: "Raspadinha",
    icon: "🎟️",
    description: "O cliente raspa a área cinza com o dedo e revela o prêmio.",
    available: true,
  },
  {
    value: "box",
    label: "Caixa surpresa",
    icon: "📦",
    tag: "em breve",
    description: "Abrindo uma caixa misteriosa com animação 3D.",
    available: false,
  },
];

const DEMO_CAMPAIGN: CampaignDisplay = {
  name: "Roleta da Sorte (demo)",
  description: "Gire a roleta a cada compra e ganhe um prêmio na hora!",
  mechanics: [
    {
      type: "wheel",
      config: {
        everyone_wins: true,
        prizes: [
          { id: "demo1", label: "Caipirinha grátis", type: "item", icon: "🍹", color: "#FFB300" },
          { id: "demo2", label: "5% OFF", type: "discount_percent", value: 5, icon: "💸", color: "#42A5F5" },
          { id: "demo3", label: "10% OFF", type: "discount_percent", value: 10, icon: "💸", color: "#66BB6A" },
          { id: "demo4", label: "Brinde", type: "item", icon: "🎁", color: "#EF5350" },
        ],
      },
    },
  ],
};

export default function BrandingPage() {
  const [branding, setBrandingState] = useState<Branding | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [logoUrl, setLogoUrl] = useState("");
  const [backgroundColor, setBackgroundColor] = useState("#1a1a2e");
  const [backgroundImageUrl, setBackgroundImageUrl] = useState("");
  const [buttonColor, setButtonColor] = useState("#FF6B35");
  const [wheelTheme, setWheelTheme] = useState<WheelTheme>("classic");
  const [gamificationType, setGamificationType] = useState<GamificationType>("wheel");

  // Pega 1 campanha real (se houver) pra preview, senão demo
  const [previewCampaign, setPreviewCampaign] = useState<CampaignDisplay>(DEMO_CAMPAIGN);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const b = await getBranding();
        if (!active) return;
        setBrandingState(b);
        if (b.logoUrl) setLogoUrl(b.logoUrl);
        if (b.backgroundColor) setBackgroundColor(b.backgroundColor);
        if (b.backgroundImageUrl) setBackgroundImageUrl(b.backgroundImageUrl);
        if (b.buttonColor) setButtonColor(b.buttonColor);
        setWheelTheme(b.wheelTheme ?? "classic");
        setGamificationType(b.gamificationType ?? "wheel");
      } catch (err) {
        if (active) setError(extractApiError(err, "Erro ao carregar branding"));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    // Tenta usar a campanha mais recente com wheel pra preview
    let active = true;
    (async () => {
      try {
        const list = await listCampaigns();
        if (!active) return;
        const wheelCamp = list.find((c) => c.mechanics.some((m) => m.type === "wheel"));
        if (wheelCamp) {
          setPreviewCampaign(toDisplay(wheelCamp));
        }
      } catch {
        /* mantém demo */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const b = await updateBranding({
        logoUrl: logoUrl || null,
        backgroundColor: backgroundColor || null,
        backgroundImageUrl: backgroundImageUrl || null,
        buttonColor: buttonColor || null,
        wheelTheme,
        gamificationType,
      });
      setBrandingState(b);
      setSuccess("Personalização salva! Suas campanhas já refletem essas mudanças.");
    } catch (err) {
      setError(extractApiError(err, "Erro ao salvar"));
    } finally {
      setSaving(false);
    }
  }

  // Preview usa os valores DO FORM (não os salvos) — feedback ao vivo
  const previewBranding: CampaignBranding = {
    tenantSlug: branding?.tenantSlug,
    tenantName: branding?.tenantName ?? "Seu negócio",
    logoUrl: logoUrl || null,
    backgroundColor,
    backgroundImageUrl: backgroundImageUrl || null,
    buttonColor,
    wheelTheme,
    gamificationType,
  };

  if (loading) {
    return (
      <>
        <PageBreadcrumb pageTitle="Personalização" />
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">Carregando…</div>
      </>
    );
  }

  return (
    <>
      <PageMeta title="Personalização | Premify" description="Customize o visual do seu site white-label." />
      <PageBreadcrumb pageTitle="Personalização" />

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="p-6 bg-white rounded-2xl shadow-sm dark:bg-gray-800/50 dark:border dark:border-gray-700">
            <h2 className="mb-4 text-lg font-medium text-gray-800 dark:text-white/90">Marca</h2>

            <div>
              <Label>Logo do estabelecimento</Label>
              <BrandingImageUpload
                value={logoUrl}
                onChange={setLogoUrl}
                maxDim={300}
                hint="Imagem quadrada (PNG ou JPG). Recomendado ~300×300px."
                buttonLabel="📷 Enviar logo"
                aspectClass="w-32 h-32"
              />
            </div>
          </div>

          <div className="p-6 bg-white rounded-2xl shadow-sm dark:bg-gray-800/50 dark:border dark:border-gray-700">
            <h2 className="mb-4 text-lg font-medium text-gray-800 dark:text-white/90">Cores</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Cor de fundo</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="w-14 h-11 rounded cursor-pointer border border-gray-300 dark:border-gray-700"
                  />
                  <Input value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} />
                </div>
              </div>

              <div>
                <Label>Cor dos botões</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={buttonColor}
                    onChange={(e) => setButtonColor(e.target.value)}
                    className="w-14 h-11 rounded cursor-pointer border border-gray-300 dark:border-gray-700"
                  />
                  <Input value={buttonColor} onChange={(e) => setButtonColor(e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-white rounded-2xl shadow-sm dark:bg-gray-800/50 dark:border dark:border-gray-700">
            <h2 className="mb-4 text-lg font-medium text-gray-800 dark:text-white/90">Imagem de fundo (opcional)</h2>

            <div>
              <Label>Imagem de fundo da página do cliente</Label>
              <BrandingImageUpload
                value={backgroundImageUrl}
                onChange={setBackgroundImageUrl}
                maxDim={1024}
                hint="Imagem retrato (mais alta que larga). Sobreposição escura é aplicada automaticamente pra legibilidade."
                buttonLabel="🖼 Enviar imagem de fundo"
                aspectClass="w-full aspect-[9/16] max-h-72"
              />
            </div>
          </div>

          <div className="p-6 bg-white rounded-2xl shadow-sm dark:bg-gray-800/50 dark:border dark:border-gray-700">
            <h2 className="mb-1 text-lg font-medium text-gray-800 dark:text-white/90">Tipo de gamificação</h2>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              Define como o cliente final vai descobrir o prêmio. Os prêmios e as regras
              continuam configurados na campanha — só a apresentação visual muda.
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
              {GAMIFICATION_OPTIONS.map((g) => {
                const selected = gamificationType === g.value;
                return (
                  <button
                    type="button"
                    key={g.value}
                    disabled={!g.available}
                    onClick={() => g.available && setGamificationType(g.value)}
                    className={`relative p-4 text-left rounded-xl border-2 transition ${
                      !g.available
                        ? "bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed dark:bg-gray-800 dark:border-gray-700"
                        : selected
                          ? "bg-brand-50 border-brand-500 dark:bg-brand-500/10 dark:border-brand-400 shadow-sm"
                          : "bg-white border-gray-200 hover:border-brand-300 dark:bg-gray-900 dark:border-gray-700 dark:hover:border-brand-500"
                    }`}
                  >
                    {selected && g.available && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-brand-500 text-white text-xs flex items-center justify-center font-bold">
                        ✓
                      </div>
                    )}
                    {g.tag && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide rounded-full bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                        {g.tag}
                      </div>
                    )}
                    <div className="text-4xl mb-2">{g.icon}</div>
                    <div className="font-semibold text-sm text-gray-800 dark:text-white/90 mb-1">{g.label}</div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{g.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {gamificationType === "wheel" && (
          <div className="p-6 bg-white rounded-2xl shadow-sm dark:bg-gray-800/50 dark:border dark:border-gray-700">
            <h2 className="mb-1 text-lg font-medium text-gray-800 dark:text-white/90">Estilo da roleta</h2>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              Aplicado a todas as suas campanhas de roleta.
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
              {THEME_OPTIONS.map((t) => {
                const selected = wheelTheme === t.value;
                return (
                  <button
                    type="button"
                    key={t.value}
                    onClick={() => setWheelTheme(t.value)}
                    className={`p-4 text-left rounded-xl border transition ${
                      selected
                        ? "bg-brand-50 border-brand-500 dark:bg-brand-500/10 dark:border-brand-400"
                        : "bg-white border-gray-200 hover:border-gray-300 dark:bg-gray-900 dark:border-gray-700"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">{t.icon}</span>
                      <span className="font-medium text-sm text-gray-800 dark:text-white/90">{t.label}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
          )}

          {error && (
            <div className="p-3 text-sm rounded-lg bg-error-50 text-error-700 border border-error-200 dark:bg-error-500/10 dark:text-error-300 dark:border-error-500/30">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 text-sm rounded-lg bg-success-50 text-success-700 border border-success-200 dark:bg-success-500/10 dark:text-success-300 dark:border-success-500/30">
              {success}
            </div>
          )}

          <div className="flex justify-end">
            <Button disabled={saving}>{saving ? "Salvando…" : "Salvar personalização"}</Button>
          </div>
        </form>

        {/* Preview */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            👁 Pré-visualização (ao vivo)
          </div>
          <div className="overflow-hidden rounded-[2.5rem] border-[10px] border-gray-800 dark:border-gray-700 shadow-2xl bg-black" style={{ aspectRatio: "9/16", maxHeight: "70vh" }}>
            <div className="w-full h-full overflow-auto">
              <CampaignMobilePage
                branding={previewBranding}
                campaign={previewCampaign}
                interactive={false}
                demoMode
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-center text-gray-500 dark:text-gray-400">
            Assim seu cliente vai ver a campanha no celular dele.
          </p>
        </div>
      </div>
    </>
  );
}

function toDisplay(c: Campaign): CampaignDisplay {
  return {
    id: c.id,
    name: c.name,
    description: c.description,
    status: c.status,
    mechanics: c.mechanics.map((m) => ({
      type: m.type,
      config: m.config as CampaignDisplay["mechanics"][number]["config"],
    })),
  };
}

// ─────────────────────────────────────────────────
// Componente de upload de imagem do branding
// Envia o arquivo pro servidor (não armazena base64).
// ─────────────────────────────────────────────────
function BrandingImageUpload({
  value,
  onChange,
  hint,
  buttonLabel,
}: {
  value: string;
  onChange: (url: string) => void;
  maxDim?: number;
  hint?: string;
  buttonLabel: string;
  aspectClass?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const res = await uploadImage(file, "branding");
      onChange(res.url);
    } catch (err) {
      setError(extractApiError(err, "Erro ao enviar imagem"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div>
      {value ? (
        <div className="flex items-center gap-4 p-3 border border-gray-200 rounded-lg dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-900 shrink-0 border border-gray-300 dark:border-gray-700">
            <img src={value} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
              ✓ Imagem salva no servidor
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-3 h-9 text-xs text-brand-600 hover:text-brand-700 border border-brand-300 rounded disabled:opacity-50"
              >
                {uploading ? "Enviando…" : "Trocar"}
              </button>
              <button
                type="button"
                onClick={() => onChange("")}
                className="px-3 h-9 text-xs text-error-500 hover:text-error-700 border border-error-300 rounded"
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
          className="w-full p-6 text-sm font-medium text-brand-600 bg-brand-50 rounded-xl border-2 border-dashed border-brand-300 hover:bg-brand-100 dark:bg-brand-500/10 dark:border-brand-500/40 dark:text-brand-300 dark:hover:bg-brand-500/20 disabled:opacity-50"
        >
          {uploading ? "Enviando arquivo…" : buttonLabel}
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />

      {hint && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
      {error && <p className="mt-2 text-xs text-error-500">{error}</p>}
    </div>
  );
}
