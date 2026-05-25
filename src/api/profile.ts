import { apiClient } from "./client";

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
  tenantId: number;
  tenantName: string;
  tenantSlug: string;
  createdAt: string;
}

export interface UpdateProfileRequest {
  name: string;
  email: string;
  avatarUrl?: string | null;
}

export async function getMyProfile(): Promise<UserProfile> {
  const { data } = await apiClient.get<UserProfile>("/me");
  return data;
}

export async function updateMyProfile(payload: UpdateProfileRequest): Promise<UserProfile> {
  const { data } = await apiClient.put<UserProfile>("/me", payload);
  return data;
}
