import { apiClient } from "./client";

export interface Branding {
  tenantSlug: string;
  tenantName: string;
  logoUrl?: string | null;
  backgroundColor?: string | null;
  backgroundImageUrl?: string | null;
  buttonColor?: string | null;
}

export interface UpdateBrandingRequest {
  logoUrl?: string | null;
  backgroundColor?: string | null;
  backgroundImageUrl?: string | null;
  buttonColor?: string | null;
}

export async function getBranding(): Promise<Branding> {
  const { data } = await apiClient.get<Branding>("/branding");
  return data;
}

export async function updateBranding(payload: UpdateBrandingRequest): Promise<Branding> {
  const { data } = await apiClient.put<Branding>("/branding", payload);
  return data;
}
