import { useEffect, useState, type FormEvent } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import Button from "../../components/ui/button/Button";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import CampaignMobilePage, {
  type CampaignBranding,
  type CampaignDisplay,
} from "../../components/gamification/CampaignMobilePage";
import { getBranding, updateBranding, type Branding } from "../../api/branding";
import { extractApiError } from "../../api/client";
import { listCampaigns, type Campaign } from "../../api/campaigns";

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

            <div className="grid gap-4">
              <div>
                <Label>URL do logo</Label>
                <Input
                  placeholder="https://exemplo.com/logo.png"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Use uma imagem quadrada (PNG/JPG, ~300×300px). Sugestão: hospede em imgur, cloudinary, ou seu próprio servidor.
                </p>
              </div>
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
              <Label>URL da imagem de fundo</Label>
              <Input
                placeholder="https://exemplo.com/background.jpg"
                value={backgroundImageUrl}
                onChange={(e) => setBackgroundImageUrl(e.target.value)}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Sobreposição escura é aplicada automaticamente pra texto ficar legível.
              </p>
            </div>
          </div>

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
