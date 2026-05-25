import { apiClient } from "./client";

export interface SignupRequest {
  restaurantName: string;
  name: string;
  email: string;
  password: string;
  document?: string;
  phone?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  expiration: string;
  userId: number;
  name: string;
  email: string;
  role: string;
  tenantId: number;
  tenantSlug: string;
  tenantName: string;
  tenantStatus: string;
  trialEndsAt?: string | null;
}

export async function login(payload: LoginRequest): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/auth/login", payload);
  return data;
}

export async function signup(payload: SignupRequest): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/auth/signup", payload);
  return data;
}
