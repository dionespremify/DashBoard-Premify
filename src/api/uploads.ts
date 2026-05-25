import { apiClient } from "./client";

export type UploadCategory = "branding" | "prizes" | "misc";

export interface UploadResponse {
  url: string;          // URL absoluta (https://localhost:44389/uploads/...)
  path: string;         // Caminho relativo (/uploads/...)
  category: UploadCategory;
  size: number;
  contentType: string;
}

/**
 * Envia um arquivo de imagem pro servidor. Retorna a URL absoluta pronta pra usar em <img src>.
 * Backend salva em wwwroot/uploads/tenant_{id}/{category}/{guid}.{ext}.
 */
export async function uploadImage(
  file: File,
  category: UploadCategory = "misc",
): Promise<UploadResponse> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await apiClient.post<UploadResponse>(`/uploads?category=${category}`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}
