/**
 * Lê um File, redimensiona pra caber em maxDim x maxDim e devolve uma data URL JPEG.
 * Pra evitar payloads gigantes no banco (JSONB) ao armazenar imagens inline.
 */
export async function readAndResizeImage(
  file: File,
  maxDim = 256,
  quality = 0.85,
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Arquivo precisa ser uma imagem"));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Imagem inválida"));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ratio = Math.min(maxDim / img.width, maxDim / img.height, 1);
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas indisponível"));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // PNG preserva transparência (logos), JPEG é menor (fotos).
        // Usa PNG quando o arquivo original era png/transparente.
        const mime = file.type === "image/png" ? "image/png" : "image/jpeg";
        const dataUrl = canvas.toDataURL(mime, mime === "image/jpeg" ? quality : undefined);
        resolve(dataUrl);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/** Tamanho aproximado de uma data URL em KB. */
export function estimateDataUrlKB(dataUrl: string): number {
  // base64 expande ~33% sobre os bytes binários
  const head = dataUrl.indexOf(",");
  const base64Length = head >= 0 ? dataUrl.length - head - 1 : dataUrl.length;
  return Math.round((base64Length * 0.75) / 1024);
}
