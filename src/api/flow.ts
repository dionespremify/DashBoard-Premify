import { apiClient } from "./client";

/**
 * Lê o JSON do fluxo da campanha. Retorna string (não parseada) pra
 * preservar formatação se possível.
 */
export async function getCampaignFlow(campaignId: number): Promise<string> {
  const { data } = await apiClient.get(`/campaigns/${campaignId}/flow`, {
    responseType: "text",
    transformResponse: (v) => v, // não tenta parsear
  });
  return typeof data === "string" ? data : JSON.stringify(data, null, 2);
}

/**
 * Salva o JSON do fluxo. Aceita string (JSON serializado) — backend valida.
 */
export async function updateCampaignFlow(campaignId: number, json: string): Promise<void> {
  // axios + Content-Type explícito pra mandar como objeto JSON
  await apiClient.put(`/campaigns/${campaignId}/flow`, JSON.parse(json), {
    headers: { "Content-Type": "application/json" },
  });
}
