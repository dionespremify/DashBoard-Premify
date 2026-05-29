import { useMemo, useRef, useState } from "react";

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
}

export default function CouponCard({ config, rewardCode, buttonColor, tenantName }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  // Extrai partes do código (formato C:participationId:ABC12345 → mostra só ABC12345)
  const shortCode = useMemo(() => {
    if (!rewardCode) return null;
    return rewardCode.split(":").pop() ?? rewardCode;
  }, [rewardCode]);

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
      // fallback: ignora
    }
  }

  function handleDownload() {
    // Renderiza o card como imagem PNG e baixa.
    if (!cardRef.current) return;

    const card = cardRef.current;
    const w = 600;
    const h = 900;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const drawCard = () => {
      // Background
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, w, h);

      // Se tem imagem do cupom, desenha como fundo
      if (config.coupon_image_url) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          // Cover
          const ratio = Math.max(w / img.width, h / img.height);
          const drawW = img.width * ratio;
          const drawH = img.height * ratio;
          ctx.drawImage(img, (w - drawW) / 2, (h - drawH) / 2, drawW, drawH);
          // Overlay escuro pra legibilidade
          ctx.fillStyle = "rgba(0,0,0,0.55)";
          ctx.fillRect(0, 0, w, h);
          drawOverlayContent();
          saveImage();
        };
        img.onerror = () => {
          drawOverlayContent();
          saveImage();
        };
        img.src = config.coupon_image_url;
      } else {
        drawOverlayContent();
        saveImage();
      }
    };

    const drawOverlayContent = () => {
      // Header tenant name
      ctx.fillStyle = "white";
      ctx.font = "bold 38px -apple-system, Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(tenantName, w / 2, 100);

      // Discount big
      ctx.font = "bold 96px -apple-system, Segoe UI, Roboto, sans-serif";
      ctx.fillStyle = buttonColor;
      ctx.fillText(discountLabel, w / 2, 280);

      // Code box
      ctx.fillStyle = "white";
      const codeBoxY = 360;
      ctx.fillRect(60, codeBoxY, w - 120, 130);

      ctx.fillStyle = "#111827";
      ctx.font = "16px -apple-system, Segoe UI, Roboto, sans-serif";
      ctx.fillText("Código do cupom", w / 2, codeBoxY + 35);

      ctx.fillStyle = buttonColor;
      ctx.font = "bold 56px monospace";
      ctx.fillText(shortCode ?? "—", w / 2, codeBoxY + 100);

      // Info
      ctx.fillStyle = "white";
      ctx.font = "20px -apple-system, Segoe UI, Roboto, sans-serif";
      ctx.fillText(`Válido até ${validUntil}`, w / 2, 560);
      if (minValueLabel) {
        ctx.fillText(`Compra mínima: ${minValueLabel}`, w / 2, 600);
      }
      ctx.font = "18px -apple-system, Segoe UI, Roboto, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fillText("Apresente esse código no caixa", w / 2, h - 80);
      ctx.fillText("na sua próxima visita", w / 2, h - 50);
    };

    const saveImage = () => {
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `cupom-${shortCode ?? "voucher"}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }, "image/png");
    };

    void card; // suppress unused
    drawCard();
  }

  return (
    <div
      ref={cardRef}
      className="rounded-2xl overflow-hidden shadow-2xl border border-white/20 relative"
      style={{
        background: config.coupon_image_url
          ? `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.75)), url(${config.coupon_image_url}) center/cover`
          : "linear-gradient(135deg, #1f2937 0%, #111827 100%)",
        minHeight: 360,
      }}
    >
      <div className="p-6 text-center text-white">
        <div className="text-xs uppercase tracking-widest opacity-70 mb-1">Seu cupom</div>
        <div className="text-2xl font-bold mb-5">{tenantName}</div>

        <div
          className="text-5xl font-extrabold mb-5 drop-shadow-lg"
          style={{ color: buttonColor }}
        >
          {discountLabel}
        </div>

        {shortCode ? (
          <div className="bg-white rounded-xl p-4 mb-4 shadow-lg">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              Código do cupom
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
