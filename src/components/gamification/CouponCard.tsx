import { useMemo, useState } from "react";

interface CouponConfig {
  discount_percent?: number | string;
  discount_fixed_cents?: number | string;
  valid_days?: number | string;
  min_value_cents?: number | string;
  coupon_image_url?: string;
  product_name?: string;
}

interface Props {
  config: CouponConfig;
  /** Código do reward gerado (formato "C:participationId:CODE" — pega só a parte final). */
  rewardCode?: string;
  buttonColor: string;
  tenantName: string;
  /** Em preview do admin, mostra um código fake pra ilustrar como vai aparecer. */
  demoMode?: boolean;
}

export default function CouponCard({
  config,
  rewardCode,
  buttonColor,
  tenantName,
  demoMode = false,
}: Props) {
  const [copied, setCopied] = useState(false);

  // Extrai parte final do código (formato C:participationId:ABC12345 → ABC12345).
  // Em preview, usa código fake.
  const shortCode = useMemo(() => {
    if (rewardCode) return rewardCode.split(":").pop() ?? rewardCode;
    if (demoMode) return "DEMO1234";
    return null;
  }, [rewardCode, demoMode]);

  const discountLabel = useMemo(() => {
    const percent = Number(config.discount_percent ?? 0);
    const fixed = Number(config.discount_fixed_cents ?? 0);
    if (percent > 0) return `${percent}% OFF`;
    if (fixed > 0) return `R$ ${(fixed / 100).toFixed(2).replace(".", ",")} OFF`;
    return "Desconto";
  }, [config]);

  const minValueLabel = useMemo(() => {
    const cents = Number(config.min_value_cents ?? 0);
    if (cents <= 0) return null;
    return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
  }, [config]);

  const validUntil = useMemo(() => {
    const days = Number(config.valid_days ?? 30);
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toLocaleDateString("pt-BR");
  }, [config]);

  async function handleCopy() {
    if (!shortCode) return;
    try {
      await navigator.clipboard.writeText(shortCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignora */
    }
  }

  async function handleDownload() {
    if (!shortCode) return;

    // Estratégia: se tem arte, baixa a arte original + código sobreposto.
    // Sem arte, gera um card limpo.
    const w = 1080;
    const h = 1080;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (config.coupon_image_url) {
      const img = await loadImage(config.coupon_image_url);
      // Renderiza arte preservando proporção (contain) centralizada
      const r = Math.min(w / img.width, h / img.height);
      const dw = img.width * r;
      const dh = img.height * r;
      const dx = (w - dw) / 2;
      const dy = (h - dh) / 2;
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, dx, dy, dw, dh);
    } else {
      // Sem arte: card padrão
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "#1f2937");
      grad.addColorStop(1, "#111827");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      ctx.font = "bold 56px -apple-system, Segoe UI, Roboto, sans-serif";
      ctx.fillText(tenantName, w / 2, 180);

      ctx.fillStyle = buttonColor;
      ctx.font = "bold 130px -apple-system, Segoe UI, Roboto, sans-serif";
      ctx.fillText(discountLabel, w / 2, 380);
    }

    // Sobrepõe banner com código no canto inferior (em qualquer caso)
    drawCodeBanner(ctx, w, h, shortCode, buttonColor, validUntil, minValueLabel);

    // Salva
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `voucher-${shortCode}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  // ─────────────────────────────────────────────────
  // Quando admin subiu arte: voucher = arte + código sobreposto
  // ─────────────────────────────────────────────────
  if (config.coupon_image_url) {
    return (
      <div className="rounded-2xl overflow-hidden shadow-2xl bg-black">
        <div className="relative">
          {/* Arte do voucher (proporção natural) */}
          <img
            src={config.coupon_image_url}
            alt="Voucher"
            className="w-full block"
          />

          {/* Código sobreposto na parte inferior */}
          {shortCode && (
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <div className="bg-white/95 backdrop-blur rounded-xl px-4 py-3 shadow-lg text-center">
                <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-0.5">
                  {demoMode ? "Código (exemplo)" : "Seu código"}
                </div>
                <div
                  className="font-mono text-2xl font-extrabold tracking-[0.2em]"
                  style={{ color: buttonColor }}
                >
                  {shortCode}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Ações abaixo do voucher */}
        <div className="p-3 flex flex-col sm:flex-row gap-2 bg-black/40">
          {shortCode && (
            <button
              type="button"
              onClick={handleCopy}
              className="flex-1 h-10 text-xs font-semibold text-gray-900 bg-white hover:bg-gray-100 rounded-lg"
            >
              {copied ? "✓ Código copiado" : "📋 Copiar código"}
            </button>
          )}
          {shortCode && (
            <button
              type="button"
              onClick={handleDownload}
              className="flex-1 h-10 text-xs font-semibold text-white rounded-lg"
              style={{ backgroundColor: buttonColor }}
            >
              ⬇ Baixar voucher
            </button>
          )}
        </div>

        {/* Footer info */}
        <div className="bg-black/60 text-center py-2 text-[11px] text-white/70">
          ✅ Válido até {validUntil}
          {minValueLabel && ` · 💰 Mín. ${minValueLabel}`}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────
  // Sem arte: card padrão (fallback bonito)
  // ─────────────────────────────────────────────────
  return (
    <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-gradient-to-br from-gray-800 to-gray-900">
      <div className="p-6 text-center text-white">
        <div className="text-xs uppercase tracking-widest opacity-70 mb-1">Seu cupom</div>
        <div className="text-2xl font-bold mb-5">{tenantName}</div>

        <div className="text-5xl font-extrabold mb-5" style={{ color: buttonColor }}>
          {discountLabel}
        </div>

        {shortCode ? (
          <div className="bg-white rounded-xl p-4 mb-4 shadow-lg">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              {demoMode ? "Código (exemplo)" : "Código do cupom"}
            </div>
            <div
              className="font-mono text-3xl font-bold tracking-widest mb-2"
              style={{ color: buttonColor }}
            >
              {shortCode}
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="text-xs font-medium text-gray-600 hover:text-gray-800"
            >
              {copied ? "✓ Copiado!" : "📋 Copiar código"}
            </button>
          </div>
        ) : (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 mb-4 text-sm opacity-80">
            Cadastre-se pra gerar seu cupom único.
          </div>
        )}

        <div className="space-y-1 text-sm opacity-90 mb-5">
          <div>✅ Válido até {validUntil}</div>
          {minValueLabel && <div>💰 Compra mínima: {minValueLabel}</div>}
        </div>

        <p className="text-xs opacity-80 leading-relaxed">
          Apresente esse código no caixa<br />
          na sua próxima visita.
        </p>

        {shortCode && (
          <button
            type="button"
            onClick={handleDownload}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-white text-sm shadow"
            style={{ backgroundColor: buttonColor }}
          >
            ⬇ Baixar voucher
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function drawCodeBanner(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  code: string,
  brandColor: string,
  validUntil: string,
  minValueLabel: string | null,
) {
  // Banner branco no rodapé com código grande
  const bannerH = 220;
  const padding = 40;
  const y = h - bannerH - padding;

  // Sombra
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(padding, y + 10, w - padding * 2, bannerH);

  // Banner
  ctx.fillStyle = "rgba(255,255,255,0.97)";
  ctx.fillRect(padding, y, w - padding * 2, bannerH);

  ctx.textAlign = "center";

  // Label
  ctx.fillStyle = "#6b7280";
  ctx.font = "bold 22px -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.fillText("CÓDIGO DO CUPOM", w / 2, y + 50);

  // Código
  ctx.fillStyle = brandColor;
  ctx.font = "bold 96px monospace";
  ctx.fillText(code, w / 2, y + 140);

  // Info adicional
  ctx.fillStyle = "#374151";
  ctx.font = "20px -apple-system, Segoe UI, Roboto, sans-serif";
  const infoLine = minValueLabel
    ? `Válido até ${validUntil}  ·  Compra mínima ${minValueLabel}`
    : `Válido até ${validUntil}`;
  ctx.fillText(infoLine, w / 2, y + 190);
}
