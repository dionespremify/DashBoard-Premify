import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { uploadImage } from "../../api/uploads";
import { extractApiError } from "../../api/client";

export interface PrizeQuota {
  limit: number;
  period: "daily" | "weekly" | "monthly" | "total";
}

export interface PrizeDefinition {
  id: string;
  label: string;
  type: "item" | "discount_percent" | "discount_fixed" | "try_again" | "custom";
  value?: number | string;
  icon?: string;
  imageUrl?: string;
  color?: string;
  quota?: PrizeQuota | null;
  weight?: number;
  /** Quantas fatias da roleta este prêmio ocupa. Default 1. Permite balancear o visual. */
  slices?: number;
}

const TYPE_OPTIONS = [
  { value: "item", label: "Brinde / item grátis" },
  { value: "discount_percent", label: "Desconto %" },
  { value: "discount_fixed", label: "Desconto R$ (em centavos)" },
  { value: "try_again", label: "Tente novamente" },
  { value: "custom", label: "Personalizado (texto livre)" },
];

const PERIOD_OPTIONS = [
  { value: "daily", label: "por dia" },
  { value: "weekly", label: "por semana" },
  { value: "monthly", label: "por mês" },
  { value: "total", label: "no total" },
];

const DEFAULT_COLORS = ["#FFB300", "#42A5F5", "#66BB6A", "#EF5350", "#AB47BC", "#26A69A", "#FFA726", "#5C6BC0"];

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function PrizePoolEditor({
  value,
  onChange,
  everyoneWins,
}: {
  value: PrizeDefinition[];
  onChange: (next: PrizeDefinition[]) => void;
  everyoneWins: boolean;
}) {
  const prizes = useMemo(() => (Array.isArray(value) ? value : []), [value]);

  function updatePrize(idx: number, patch: Partial<PrizeDefinition>) {
    const next = prizes.map((p, i) => (i === idx ? { ...p, ...patch } : p));
    onChange(next);
  }

  function removePrize(idx: number) {
    onChange(prizes.filter((_, i) => i !== idx));
  }

  function addPrize() {
    const color = DEFAULT_COLORS[prizes.length % DEFAULT_COLORS.length];
    onChange([
      ...prizes,
      {
        id: makeId(),
        label: "Novo prêmio",
        type: "item",
        icon: "🎁",
        color,
        quota: null,
        slices: 1,
      },
    ]);
  }

  function setQuota(idx: number, kind: "unlimited" | "limited") {
    if (kind === "unlimited") {
      updatePrize(idx, { quota: null });
    } else {
      updatePrize(idx, { quota: { limit: 10, period: "daily" } });
    }
  }

  // Estimativa em linguagem natural
  const estimate = useMemo(() => buildEstimate(prizes, everyoneWins), [prizes, everyoneWins]);

  // Porcentagem real de cada prêmio considerando os pesos.
  // Só calcula quando pelo menos um prêmio tem weight manual definido — senão não dá pra prever
  // (backend usa quota_restante como peso e isso muda em tempo real).
  const chancePercents = useMemo<(number | null)[]>(() => {
    const anyManual = prizes.some((p) => typeof p.weight === "number");
    if (!anyManual) return prizes.map(() => null);
    const totalWeight = prizes.reduce((sum, p) => sum + (typeof p.weight === "number" ? p.weight : 0), 0);
    if (totalWeight <= 0) return prizes.map(() => null);
    return prizes.map((p) => {
      if (typeof p.weight !== "number") return null;
      return Math.round((p.weight / totalWeight) * 1000) / 10;
    });
  }, [prizes]);

  return (
    <div className="space-y-3">
      {prizes.map((prize, idx) => {
        const quotaIsLimited = !!prize.quota && prize.quota.limit > 0;
        const slicesCount = Math.max(1, prize.slices ?? 1);
        return (
          <div
            key={prize.id || idx}
            className="p-4 bg-white border rounded-xl border-gray-200 dark:bg-gray-900 dark:border-gray-700"
          >
            <div className="grid gap-3 md:grid-cols-[80px_1fr_180px_auto] md:items-start">
              {/* Preview visual: imagem OU cor+ícone */}
              <div className="flex flex-col items-center gap-1">
                <div
                  className="w-16 h-16 rounded-lg border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center overflow-hidden"
                  style={{ backgroundColor: prize.color ?? "#FFB300" }}
                >
                  {prize.imageUrl ? (
                    <img src={prize.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl">{prize.icon ?? "🎁"}</span>
                  )}
                </div>
                <div className="flex gap-1">
                  <input
                    type="color"
                    value={prize.color ?? "#FFB300"}
                    onChange={(e) => updatePrize(idx, { color: e.target.value })}
                    className="w-7 h-7 rounded cursor-pointer border-0"
                    title="Cor da fatia"
                  />
                  <input
                    type="text"
                    value={prize.icon ?? ""}
                    onChange={(e) => updatePrize(idx, { icon: e.target.value })}
                    className="w-7 h-7 text-center text-sm border border-gray-200 rounded dark:border-gray-700 dark:bg-gray-800"
                    maxLength={2}
                    title="Ícone (emoji)"
                  />
                </div>
              </div>

              {/* Label + tipo + valor + imagem URL + slices */}
              <div className="grid gap-2">
                <input
                  type="text"
                  value={prize.label}
                  onChange={(e) => updatePrize(idx, { label: e.target.value })}
                  className="h-10 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:[color-scheme:dark]"
                  placeholder="Nome do prêmio (ex: Caipirinha grátis)"
                />
                <div className="grid grid-cols-[1fr_120px] gap-2">
                  <select
                    value={prize.type}
                    onChange={(e) => updatePrize(idx, { type: e.target.value as PrizeDefinition["type"] })}
                    className="h-10 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:[color-scheme:dark]"
                  >
                    {TYPE_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value} className="bg-white text-gray-900 dark:bg-gray-900 dark:text-white">
                        {t.label}
                      </option>
                    ))}
                  </select>
                  {(prize.type === "discount_percent" || prize.type === "discount_fixed") && (
                    <input
                      type="number"
                      min="0"
                      value={(prize.value as number) ?? ""}
                      onChange={(e) =>
                        updatePrize(idx, { value: e.target.value ? parseInt(e.target.value, 10) : undefined })
                      }
                      placeholder={prize.type === "discount_percent" ? "%" : "centavos"}
                      className="h-10 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:[color-scheme:dark]"
                    />
                  )}
                </div>

                <ImageUploadField
                  value={prize.imageUrl}
                  onChange={(v) => updatePrize(idx, { imageUrl: v })}
                />

                <div className="flex items-center gap-3 p-3 rounded-lg bg-brand-50 border border-brand-200 dark:bg-brand-500/10 dark:border-brand-500/30">
                  <span className="text-base">🎡</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-800 dark:text-white/90">
                      Aparece em {slicesCount} {slicesCount === 1 ? "fatia" : "fatias"} da roleta
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Apenas visual — não muda as chances de sair. Use pra encher a roleta sem duplicar o prêmio.
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => updatePrize(idx, { slices: Math.max(1, slicesCount - 1) })}
                      disabled={slicesCount <= 1}
                      className="w-9 h-9 rounded-lg font-bold text-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      −
                    </button>
                    <span className="w-10 text-center font-bold text-lg text-brand-600 dark:text-brand-300">
                      {slicesCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => updatePrize(idx, { slices: Math.min(12, slicesCount + 1) })}
                      disabled={slicesCount >= 12}
                      className="w-9 h-9 rounded-lg font-bold text-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Quota + peso (mesma coluna do grid) */}
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1 text-xs cursor-pointer text-gray-700 dark:text-gray-300">
                    <input
                      type="radio"
                      checked={!quotaIsLimited}
                      onChange={() => setQuota(idx, "unlimited")}
                    />
                    Ilimitado
                  </label>
                  <label className="inline-flex items-center gap-1 text-xs cursor-pointer text-gray-700 dark:text-gray-300">
                    <input
                      type="radio"
                      checked={quotaIsLimited}
                      onChange={() => setQuota(idx, "limited")}
                    />
                    Limitar
                  </label>
                </div>
                {quotaIsLimited && (
                  <div className="grid grid-cols-[80px_1fr] gap-1">
                    <input
                      type="number"
                      min="1"
                      value={prize.quota!.limit}
                      onChange={(e) =>
                        updatePrize(idx, {
                          quota: { ...prize.quota!, limit: parseInt(e.target.value || "1", 10) },
                        })
                      }
                      className="h-9 px-2 text-sm border border-gray-300 rounded bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:[color-scheme:dark]"
                    />
                    <select
                      value={prize.quota!.period}
                      onChange={(e) =>
                        updatePrize(idx, {
                          quota: { ...prize.quota!, period: e.target.value as PrizeQuota["period"] },
                        })
                      }
                      className="h-9 px-2 text-sm border border-gray-300 rounded bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:[color-scheme:dark]"
                    >
                      {PERIOD_OPTIONS.map((p) => (
                        <option key={p.value} value={p.value} className="bg-white text-gray-900 dark:bg-gray-900 dark:text-white">
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                </div>

                {/* Peso / chance */}
                <div className="grid gap-1 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <label className="text-xs text-gray-600 dark:text-gray-400">Chance (peso)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="auto"
                      value={prize.weight ?? ""}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const next = raw === "" ? undefined : Math.max(0, parseInt(raw, 10) || 0);
                        updatePrize(idx, { weight: next });
                      }}
                      className="w-20 h-9 px-2 text-sm border border-gray-300 rounded bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:[color-scheme:dark]"
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {chancePercents[idx] != null
                        ? `≈ ${chancePercents[idx]}%`
                        : "automático"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Remover */}
              <button
                type="button"
                onClick={() => removePrize(idx)}
                className="px-3 h-10 text-sm text-error-500 hover:text-error-700"
                title="Remover prêmio"
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={addPrize}
        className="w-full p-3 text-sm font-medium text-brand-600 bg-brand-50 rounded-xl border-2 border-dashed border-brand-300 hover:bg-brand-100 dark:bg-brand-500/10 dark:border-brand-500/40 dark:text-brand-300 dark:hover:bg-brand-500/20"
      >
        + Adicionar prêmio
      </button>

      {/* Estimativa */}
      {prizes.length > 0 && (
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 dark:bg-gray-900/50 dark:border-gray-700">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            📊 Como vai funcionar
          </div>
          <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
            {estimate.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────
// Upload de imagem inline (data URL)
// ─────────────────────────────────────────────────
function ImageUploadField({
  value,
  onChange,
}: {
  value?: string;
  onChange: (v: string | undefined) => void;
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
      const res = await uploadImage(file, "prizes");
      onChange(res.url);
    } catch (err) {
      setError(extractApiError(err, "Erro ao enviar imagem"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  if (value) {
    return (
      <div className="flex items-center gap-3 p-2 border border-gray-200 rounded-lg dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <img src={value} alt="" className="w-12 h-12 object-cover rounded" />
        <div className="flex-1 text-xs text-gray-600 dark:text-gray-400">
          ✓ Imagem carregada
        </div>
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="px-3 h-8 text-xs text-error-500 hover:text-error-700 border border-error-300 rounded"
        >
          Remover
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-3 h-8 text-xs text-brand-500 hover:text-brand-700 border border-brand-300 rounded"
        >
          Trocar
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
        />
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="w-full h-10 px-3 text-sm text-gray-600 dark:text-gray-300 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
      >
        {uploading ? "Processando…" : "📷 Adicionar foto do prêmio (opcional)"}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />
      {error && <p className="mt-1 text-xs text-error-500">{error}</p>}
    </div>
  );
}

function buildEstimate(prizes: PrizeDefinition[], everyoneWins: boolean): string[] {
  if (prizes.length === 0) return [];

  const limited = prizes.filter((p) => p.quota && p.quota.limit > 0 && p.type !== "try_again");
  const unlimited = prizes.filter((p) => (!p.quota || p.quota.limit <= 0) && p.type !== "try_again");
  const tryAgain = prizes.filter((p) => p.type === "try_again");

  const lines: string[] = [];

  for (const p of limited) {
    const period =
      p.quota!.period === "daily"
        ? "por dia"
        : p.quota!.period === "weekly"
          ? "por semana"
          : p.quota!.period === "monthly"
            ? "por mês"
            : "no total";
    lines.push(`• Até ${p.quota!.limit} clientes ganham "${p.label}" ${period}`);
  }

  if (unlimited.length === 0) {
    if (limited.length > 0) {
      if (everyoneWins) {
        lines.push("⚠️ Sem prêmios ilimitados — depois de esgotar a quota, alguns clientes podem não ganhar nada.");
      } else {
        lines.push("• Depois de esgotar as quotas, o cliente cai em 'tente novamente'");
      }
    }
  } else {
    const share = Math.floor(100 / unlimited.length);
    const labels = unlimited.map((p) => `"${p.label}"`).join(", ");
    lines.push(`• Demais clientes (ilimitado): ~${share}% de chance cada entre ${labels}`);
  }

  if (tryAgain.length > 0 && !everyoneWins) {
    lines.push("• Alguns clientes podem cair em 'tente novamente'");
  }

  return lines;
}
