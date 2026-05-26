import { useRef, useState } from "react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";

interface Props {
  slug: string;
  tenantName: string;
}

/**
 * QR Code único do estabelecimento. Aponta pra /p/{slug} que lista todas
 * as campanhas ativas. Cliente escaneia uma vez e participa de qualquer campanha.
 */
export default function TenantQRCodeCard({ slug, tenantName }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const url = `${window.location.origin}/p/${slug}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copie o link:", url);
    }
  }

  function downloadPng() {
    const canvas = canvasRef.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `qrcode-${slug}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  function printQr() {
    const printWindow = window.open("", "_blank", "width=600,height=800");
    if (!printWindow) return;

    const svgEl = document.getElementById("tenant-qr-print-svg");
    if (!svgEl) return;
    const svgMarkup = svgEl.outerHTML;

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>QR Code — ${tenantName}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 48px; text-align: center; }
            .qr-wrap { display: inline-block; padding: 20px; background: white; border: 2px solid #111; border-radius: 12px; }
            .qr-wrap svg { display: block; width: 360px; height: 360px; }
            h1 { font-size: 26px; margin: 28px 0 6px; }
            h2 { font-size: 16px; margin: 0 0 24px; color: #555; font-weight: 500; }
            p { color: #444; max-width: 420px; margin: 8px auto; font-size: 14px; }
            .cta { background: #FF6B35; color: white; padding: 10px 18px; border-radius: 999px; font-weight: 700; display: inline-block; margin-top: 16px; }
            .url { font-family: monospace; font-size: 11px; color: #999; margin-top: 24px; word-break: break-all; }
            @media print { body { padding: 24px; } }
          </style>
        </head>
        <body>
          <h1>${tenantName}</h1>
          <h2>Participe das nossas promoções 🎁</h2>
          <div class="qr-wrap">${svgMarkup}</div>
          <p style="margin-top: 28px; font-size: 18px; font-weight: 600;">📱 Escaneie com a câmera do celular</p>
          <p>e participe de todas as nossas campanhas ativas</p>
          <div class="url">${url}</div>
          <script>
            window.onload = () => { setTimeout(() => { window.print(); }, 300); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  return (
    <div className="p-6 bg-white rounded-2xl shadow-sm dark:bg-gray-800/50 dark:border dark:border-gray-700">
      <div className="mb-4">
        <h2 className="text-lg font-medium text-gray-800 dark:text-white/90 flex items-center gap-2">
          📱 QR Code do estabelecimento
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          <strong>Imprima uma vez e use sempre.</strong> O cliente escaneia esse QR e vê todas as suas
          campanhas ativas — você não precisa imprimir um novo a cada promoção.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* QR visível (SVG) */}
        <div className="bg-white p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 shrink-0">
          <QRCodeSVG id="tenant-qr-print-svg" value={url} size={180} fgColor="#111827" level="M" />
        </div>

        {/* Canvas oculto, usado pro download em PNG */}
        <div ref={canvasRef} className="hidden">
          <QRCodeCanvas value={url} size={500} fgColor="#111827" level="M" />
        </div>

        <div className="flex-1 w-full">
          <div className="flex items-center gap-2 mb-3 p-2 bg-gray-50 rounded-lg dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
            <code className="flex-1 text-xs font-mono text-gray-700 dark:text-gray-300 truncate">{url}</code>
            <button
              type="button"
              onClick={copyLink}
              className="px-3 h-8 text-xs font-medium text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/10 rounded shrink-0"
            >
              {copied ? "✓ Copiado" : "Copiar"}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={downloadPng}
              className="px-4 h-10 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg"
            >
              ⬇ Baixar PNG
            </button>
            <button
              type="button"
              onClick={printQr}
              className="px-4 h-10 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
            >
              🖨 Imprimir
            </button>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 h-10 inline-flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
            >
              ↗ Abrir
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
