import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Button from "../ui/button/Button";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import { getBranding, updateBranding, type Branding, type WheelTheme, type GamificationType } from "../../api/branding";
import { extractApiError } from "../../api/client";
import { uploadImage } from "../../api/uploads";
import GamificationTypeSelector from "./GamificationTypeSelector";

const THEME_OPTIONS: { value: WheelTheme; label: string; icon: string; description: string }[] = [
  { value: "classic", label: "Clássico", icon: "⚪", description: "Simples e elegante" },
  { value: "vegas", label: "Las Vegas", icon: "🎰", description: "Com luzes piscando, estilo cassino" },
  { value: "neon", label: "Neon", icon: "💜", description: "Visual futurista com glow" },
];

interface Props {
  /** Chama toda vez que o branding é salvo com sucesso. Usado pelo parent pra refrescar previews/abas dependentes. */
  onSaved?: (branding: Branding) => void;
  /** Chama a cada alteração no form (antes de salvar) — pra preview ao vivo. */
  onDraftChange?: (draft: Branding) => void;
  /** Mostra aviso de "afeta todas as campanhas" no topo do form. */
  showGlobalWarning?: boolean;
  /** Esconde o botão "Salvar personalização" — útil quando o parent controla o save. */
  hideSaveButton?: boolean;
  /**
   * Esconde o seletor de tipo de gamificação (roleta/raspadinha/penalty/etc).
   * Usado em blueprints que têm layout próprio (cartão fidelidade, cashback) —
   * a gamificação só faz sentido pra prêmios instantâneos (reward_timing="instant").
   */
  hideGamificationType?: boolean;
}

export default function BrandingForm({ onSaved, onDraftChange, showGlobalWarning, hideSaveButton, hideGamificationType }: Props) {
  const [branding, setBranding] = useState<Branding | null>(null);
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

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const b = await getBranding();
        if (!active) return;
        setBranding(b);
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

  // Emite o "draft" ao parent a cada mudança — pra preview ao vivo refletir sem salvar.
  useEffect(() => {
    if (loading) return;
    onDraftChange?.({
      tenantSlug: branding?.tenantSlug ?? "",
      tenantName: branding?.tenantName ?? "",
      logoUrl: logoUrl || null,
      backgroundColor: backgroundColor || null,
      backgroundImageUrl: backgroundImageUrl || null,
      buttonColor: buttonColor || null,
      wheelTheme,
      gamificationType,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, logoUrl, backgroundColor, backgroundImageUrl, buttonColor, wheelTheme, gamificationType]);

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
      setBranding(b);
      setSuccess("Personalização salva! Suas campanhas já refletem essas mudanças.");
      onSaved?.(b);
    } catch (err) {
      setError(extractApiError(err, "Erro ao salvar"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Carregando…</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {showGlobalWarning && (
        <div className="p-3 text-sm rounded-lg bg-warning-50 text-warning-700 border border-warning-200 dark:bg-warning-500/10 dark:text-warning-300 dark:border-warning-500/30">
          ⚠️ Estas configurações são <strong>globais</strong> — alterações aqui afetam <em>todas</em>
          as suas campanhas, não só esta.
        </div>
      )}

      {!hideGamificationType && (
        <div className="p-4 sm:p-6 bg-white rounded-2xl shadow-sm dark:bg-gray-800/50 dark:border dark:border-gray-700">
          <h2 className="mb-1 text-lg font-medium text-gray-800 dark:text-white/90">Tipo de gamificação</h2>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            Define como o cliente final vai descobrir o prêmio. Os campos da campanha se adaptam ao tipo.
          </p>
          <GamificationTypeSelector value={gamificationType} onChange={setGamificationType} />
        </div>
      )}

      <div className="p-4 sm:p-6 bg-white rounded-2xl shadow-sm dark:bg-gray-800/50 dark:border dark:border-gray-700">
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

      <div className="p-4 sm:p-6 bg-white rounded-2xl shadow-sm dark:bg-gray-800/50 dark:border dark:border-gray-700">
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

      <div className="p-4 sm:p-6 bg-white rounded-2xl shadow-sm dark:bg-gray-800/50 dark:border dark:border-gray-700">
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

      {gamificationType === "wheel" && !hideGamificationType && (
        <div className="p-4 sm:p-6 bg-white rounded-2xl shadow-sm dark:bg-gray-800/50 dark:border dark:border-gray-700">
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

      {!hideSaveButton && (
        <div className="flex justify-end">
          <Button disabled={saving}>{saving ? "Salvando…" : "Salvar personalização"}</Button>
        </div>
      )}

      {/* Branding atual exposto pro parent (preview) via callback opcional */}
      <input type="hidden" data-branding-state="true" value={branding?.tenantSlug ?? ""} />
    </form>
  );
}

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
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">✓ Imagem salva no servidor</div>
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

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />

      {hint && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
      {error && <p className="mt-2 text-xs text-error-500">{error}</p>}
    </div>
  );
}
