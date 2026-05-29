import { forwardRef, useMemo, useRef, useState } from "react";

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
  const svgRef = useRef<SVGSVGElement>(null);

  const shortCode = useMemo(() => {
    if (rewardCode) return rewardCode.split(":").pop() ?? rewardCode;
    if (demoMode) return "VIP10";
    return null;
  }, [rewardCode, demoMode]);

  const { percentLabel, fixedLabel, discountLabel } = useMemo(() => {
    const percent = Number(config.discount_percent ?? 0);
    const fixed = Number(config.discount_fixed_cents ?? 0);
    if (percent > 0)
      return {
        percentLabel: `${percent}%`,
        fixedLabel: null as string | null,
        discountLabel: `${percent}% OFF`,
      };
    if (fixed > 0) {
      const f = `R$ ${(fixed / 100).toFixed(2).replace(".", ",")}`;
      return { percentLabel: null, fixedLabel: f, discountLabel: `${f} OFF` };
    }
    return { percentLabel: "—", fixedLabel: null, discountLabel: "Desconto" };
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

    if (config.coupon_image_url) {
      // Arte customizada do admin: baixa a arte + banner com código embaixo
      await downloadCustomVoucher(
        config.coupon_image_url,
        shortCode,
        buttonColor,
        validUntil,
        minValueLabel,
      );
    } else {
      // Voucher padrão: serializa o SVG e converte pra PNG
      if (!svgRef.current) return;
      await downloadSvgAsPng(svgRef.current, `voucher-${shortCode}.png`);
    }
  }

  // ─────────────────────────────────────────────────
  // Quando admin subiu arte: voucher = arte + código sobreposto
  // ─────────────────────────────────────────────────
  if (config.coupon_image_url) {
    return (
      <div className="rounded-2xl overflow-hidden shadow-2xl bg-black">
        <div className="relative">
          <img src={config.coupon_image_url} alt="Voucher" className="w-full block" />
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
        <CouponActions
          shortCode={shortCode}
          copied={copied}
          buttonColor={buttonColor}
          onCopy={handleCopy}
          onDownload={handleDownload}
        />
        <div className="bg-black/60 text-center py-2 text-[11px] text-white/70">
          ✅ Válido até {validUntil}
          {minValueLabel && ` · 💰 Mín. ${minValueLabel}`}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────
  // Voucher PADRÃO (procedural via SVG) — cupom estilo "1ª compra"
  // Aspecto horizontal, borda tracejada, lado esquerdo texto + código,
  // lado direito área colorida com desconto + barcode.
  // ─────────────────────────────────────────────────
  return (
    <div className="rounded-2xl overflow-hidden shadow-2xl bg-white">
      <DefaultVoucherSvg
        ref={svgRef}
        tenantName={tenantName}
        shortCode={shortCode}
        demoMode={demoMode}
        percentLabel={percentLabel}
        fixedLabel={fixedLabel}
        discountLabel={discountLabel}
        minValueLabel={minValueLabel}
        validUntil={validUntil}
        brandColor={buttonColor}
      />
      <CouponActions
        shortCode={shortCode}
        copied={copied}
        buttonColor={buttonColor}
        onCopy={handleCopy}
        onDownload={handleDownload}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────
function CouponActions({
  shortCode,
  copied,
  buttonColor,
  onCopy,
  onDownload,
}: {
  shortCode: string | null;
  copied: boolean;
  buttonColor: string;
  onCopy: () => void;
  onDownload: () => void;
}) {
  if (!shortCode) return null;
  return (
    <div className="p-3 flex flex-col sm:flex-row gap-2 bg-gray-50 border-t border-gray-200">
      <button
        type="button"
        onClick={onCopy}
        className="flex-1 h-10 text-xs font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 rounded-lg"
      >
        {copied ? "✓ Código copiado" : "📋 Copiar código"}
      </button>
      <button
        type="button"
        onClick={onDownload}
        className="flex-1 h-10 text-xs font-semibold text-white rounded-lg shadow"
        style={{ backgroundColor: buttonColor }}
      >
        ⬇ Baixar voucher
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Voucher SVG padrão (procedural)
// ─────────────────────────────────────────────────
interface SvgProps {
  tenantName: string;
  shortCode: string | null;
  demoMode: boolean;
  percentLabel: string | null;
  fixedLabel: string | null;
  discountLabel: string;
  minValueLabel: string | null;
  validUntil: string;
  brandColor: string;
}

const DefaultVoucherSvg = forwardRef<SVGSVGElement, SvgProps>(function DefaultVoucherSvg(
  props,
  ref,
) {
  const {
    tenantName,
    shortCode,
    demoMode,
    percentLabel,
    fixedLabel,
    discountLabel,
    minValueLabel,
    validUntil,
    brandColor,
  } = props;

  {
    // Layout: 960x460 (proporção próxima do modelo de cupom horizontal)
    const W = 960;
    const H = 460;
    const rightW = 320;
    const leftW = W - rightW;

    // Barcode procedural (linhas verticais com larguras pseudo-random baseadas no código)
    const barcodeBars = useMemo(() => {
      const seed = (shortCode ?? "PREVIEW").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
      const bars: { x: number; w: number }[] = [];
      let x = 0;
      let s = seed;
      while (x < 240) {
        s = (s * 9301 + 49297) % 233280;
        const w = 2 + (s % 6);
        bars.push({ x, w });
        x += w + 2 + ((s >> 3) % 3);
      }
      return bars;
    }, [shortCode]);

    return (
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: "block", width: "100%", height: "auto" }}
      >
        {/* Background branco */}
        <rect x="0" y="0" width={W} height={H} fill="#ffffff" />

        {/* Lado esquerdo: texto */}
        <g>
          <text
            x="50"
            y="115"
            fontFamily="-apple-system, Segoe UI, Roboto, Arial, sans-serif"
            fontWeight="800"
            fontSize="62"
            fill="#111827"
          >
            CUPOM
          </text>
          <text
            x="50"
            y="185"
            fontFamily="-apple-system, Segoe UI, Roboto, Arial, sans-serif"
            fontWeight="800"
            fontSize="48"
            fill="#111827"
          >
            {truncate(tenantName.toUpperCase(), 16)}
          </text>

          <text
            x={leftW / 2}
            y="250"
            textAnchor="middle"
            fontFamily="-apple-system, Segoe UI, Roboto, Arial, sans-serif"
            fontWeight="400"
            fontSize="22"
            fill="#374151"
          >
            Utilize o cupom
          </text>

          {/* Código em destaque */}
          <text
            x={leftW / 2}
            y="310"
            textAnchor="middle"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            fontWeight="800"
            fontSize="44"
            fill="#111827"
            letterSpacing="6"
          >
            {shortCode ? `"${shortCode}"` : "—"}
          </text>

          {minValueLabel && (
            <text
              x={leftW / 2}
              y="365"
              textAnchor="middle"
              fontFamily="-apple-system, Segoe UI, Roboto, Arial, sans-serif"
              fontWeight="500"
              fontSize="20"
              fill="#374151"
            >
              nas compras a partir de {minValueLabel}
            </text>
          )}

          <text
            x={leftW / 2}
            y={minValueLabel ? 395 : 365}
            textAnchor="middle"
            fontFamily="-apple-system, Segoe UI, Roboto, Arial, sans-serif"
            fontWeight="400"
            fontSize="16"
            fill="#6b7280"
          >
            Válido até {validUntil}
            {demoMode ? "  ·  (preview)" : ""}
          </text>
        </g>

        {/* Lado direito: bloco colorido com desconto + barcode */}
        <rect x={leftW} y="0" width={rightW} height={H} fill={brandColor} />

        <text
          x={leftW + rightW / 2}
          y="80"
          textAnchor="middle"
          fontFamily="-apple-system, Segoe UI, Roboto, Arial, sans-serif"
          fontWeight="700"
          fontSize="26"
          fill="#ffffff"
          letterSpacing="8"
        >
          DESCONTO
        </text>

        {/* Número grande do desconto */}
        {percentLabel ? (
          <>
            <text
              x={leftW + rightW / 2}
              y="200"
              textAnchor="middle"
              fontFamily="-apple-system, Segoe UI, Roboto, Arial, sans-serif"
              fontWeight="900"
              fontSize="110"
              fill="#ffffff"
            >
              {percentLabel}
            </text>
            <text
              x={leftW + rightW / 2}
              y="275"
              textAnchor="middle"
              fontFamily="-apple-system, Segoe UI, Roboto, Arial, sans-serif"
              fontWeight="900"
              fontSize="64"
              fill="#ffffff"
            >
              OFF
            </text>
          </>
        ) : (
          <text
            x={leftW + rightW / 2}
            y="230"
            textAnchor="middle"
            fontFamily="-apple-system, Segoe UI, Roboto, Arial, sans-serif"
            fontWeight="900"
            fontSize="58"
            fill="#ffffff"
          >
            {fixedLabel ?? discountLabel}
          </text>
        )}

        {/* Barcode procedural */}
        <g transform={`translate(${leftW + 40}, 350)`}>
          {barcodeBars.map((b, i) => (
            <rect key={i} x={b.x} y="0" width={b.w} height="55" fill="#ffffff" />
          ))}
          <text
            x="120"
            y="78"
            textAnchor="middle"
            fontFamily="ui-monospace, monospace"
            fontSize="11"
            fill="#ffffff"
            letterSpacing="2"
          >
            {(shortCode ?? "PREVIEW").padEnd(12, "0").slice(0, 12)}
          </text>
        </g>

        {/* Borda tracejada (estilo cupom) */}
        <rect
          x="6"
          y="6"
          width={W - 12}
          height={H - 12}
          fill="none"
          stroke="#9ca3af"
          strokeWidth="2"
          strokeDasharray="12 8"
          rx="14"
        />

        {/* Linha tracejada vertical separando lados (efeito picotado) */}
        <line
          x1={leftW}
          y1="20"
          x2={leftW}
          y2={H - 20}
          stroke="#ffffff"
          strokeWidth="2"
          strokeDasharray="6 6"
        />
      </svg>
    );
  }
});

function truncate(s: string, max: number) {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

// ─────────────────────────────────────────────────
// Helpers de download
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

async function downloadCustomVoucher(
  imageUrl: string,
  shortCode: string,
  brandColor: string,
  validUntil: string,
  minValueLabel: string | null,
) {
  const w = 1080;
  const h = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const img = await loadImage(imageUrl);
  const r = Math.min(w / img.width, h / img.height);
  const dw = img.width * r;
  const dh = img.height * r;
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);

  // Banner com código no rodapé
  const bannerH = 200;
  const y = h - bannerH - 30;
  ctx.fillStyle = "rgba(255,255,255,0.97)";
  ctx.fillRect(30, y, w - 60, bannerH);

  ctx.textAlign = "center";
  ctx.fillStyle = "#6b7280";
  ctx.font = "bold 22px -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.fillText("CÓDIGO DO CUPOM", w / 2, y + 50);
  ctx.fillStyle = brandColor;
  ctx.font = "bold 90px monospace";
  ctx.fillText(shortCode, w / 2, y + 135);
  ctx.fillStyle = "#374151";
  ctx.font = "18px -apple-system, Segoe UI, Roboto, sans-serif";
  const info = minValueLabel
    ? `Válido até ${validUntil}  ·  Compra mínima ${minValueLabel}`
    : `Válido até ${validUntil}`;
  ctx.fillText(info, w / 2, y + 175);

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

async function downloadSvgAsPng(svg: SVGSVGElement, filename: string) {
  const xml = new XMLSerializer().serializeToString(svg);
  const svg64 = btoa(unescape(encodeURIComponent(xml)));
  const url = `data:image/svg+xml;base64,${svg64}`;

  const img = await loadImage(url);
  const scale = 2;
  const w = img.width || 960;
  const h = img.height || 460;
  const canvas = document.createElement("canvas");
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  canvas.toBlob((blob) => {
    if (!blob) return;
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(u);
  }, "image/png");
}
