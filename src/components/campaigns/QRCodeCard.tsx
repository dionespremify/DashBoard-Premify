import { useRef, useState } from "react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";

interface Props {
  url: string;
  tenantName: string;
  campaignName: string;
  /** Cor do QR code (default preto) */
  fgColor?: string;
}

/**
 * Cartão com QR Code da campanha + ações.
 * Renderiza um QR SVG na tela e um Canvas oculto (pra exportar PNG).
 */
export default function QRCodeCard({ url, tenantName, campaignName, fgColor = "#111827" }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback se clipboard falhar
      window.prompt("Copie o link:", url);
    }
  }

  function downloadPng() {
    const canvas = canvasRef.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `qrcode-${campaignName.toLowerCase().replace(/\s+/g, "-")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  function printQr() {
    // Abre uma nova janela com layout limpo só pro QR + texto
    const printWindow = window.open("", "_blank", "width=600,height=800");
    if (!printWindow) return;

    const svgEl = document.getElementById("qr-print-svg");
    if (!svgEl) return;
    const svgMarkup = svgEl.outerHTML;

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>QR Code — ${campaignName}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 48px; text-align: center; }
            .qr-wrap { display: inline-block; padding: 20px; background: white; border: 2px solid #111; border-radius: 12px; }
            .qr-wrap svg { display: block; width: 320px; height: 320px; }
            h1 { font-size: 22px; margin: 32px 0 8px; }
            h2 { font-size: 18px; margin: 0 0 24px; color: #555; font-weight: 500; }
            p { color: #666; max-width: 400px; margin: 0 auto; }
            .url { font-family: monospace; font-size: 11px; color: #999; margin-top: 16px; word-break: break-all; }
            @media print { body { padding: 24px; } }
          </style>
        </head>
        <body>
          <h1>${tenantName}</h1>
          <h2>${campaignName}</h2>
          <div class="qr-wrap">${svgMarkup}</div>
          <p style="margin-top: 24px;">📱 Escaneie com a câmera do celular para participar!</p>
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
    <div className="p-4 sm:p-6 bg-white rounded-2xl shadow-sm dark:bg-gray-800/50 dark:border dark:border-gray-700">
      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* QR visível (SVG) */}
        <div className="bg-white p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 shrink-0">
          <QRCodeSVG id="qr-print-svg" value={url} size={180} fgColor={fgColor} level="M" />
        </div>

        {/* Canvas oculto, usado pro download em PNG */}
        <div ref={canvasRef} className="hidden">
          <QRCodeCanvas value={url} size={400} fgColor={fgColor} level="M" />
        </div>

        <div className="flex-1 w-full">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-1">
            🎯 Compartilhe sua campanha
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Imprima esse QR Code ou exiba num tablet em cima da mesa. O cliente escaneia e participa.
          </p>

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
              ↗ Abrir tela do cliente
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
