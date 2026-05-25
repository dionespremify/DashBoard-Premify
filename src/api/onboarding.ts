import { apiClient } from "./client";

export interface Segment {
  code: string;
  label: string;
  icon?: string | null;
}

export interface TenantProfile {
  segmentCode?: string | null;
  isFranchise: boolean;
  unitsCountDeclared: number;
  audienceAgeRange?: string | null;
  audienceGenderFocus?: string | null;
  audienceOrientation?: string | null;
  averageTicketCents?: number | null;
  peakDays?: string[] | null;
  peakHours?: string | null;
}

export interface OnboardingStatus {
  isCompleted: boolean;
  completedAt?: string | null;
  profile?: TenantProfile | null;
}

export interface CompleteProfileRequest {
  segmentCode: string;
  isFranchise: boolean;
  unitsCountDeclared: number;
  audienceAgeRange?: string;
  audienceGenderFocus?: string;
  audienceOrientation?: string;
  averageTicketCents?: number;
  peakDays?: string[];
  peakHours?: string;
}

export async function listSegments(): Promise<Segment[]> {
  const { data } = await apiClient.get<Segment[]>("/onboarding/segments");
  return data;
}

export async function getOnboardingStatus(): Promise<OnboardingStatus> {
  const { data } = await apiClient.get<OnboardingStatus>("/onboarding/status");
  return data;
}

export async function completeProfile(payload: CompleteProfileRequest): Promise<OnboardingStatus> {
  const { data } = await apiClient.post<OnboardingStatus>("/onboarding/profile", payload);
  return data;
}
