import { apiClient } from "./client";

export type Role = "owner" | "admin" | "manager" | "viewer";

export interface UserListItem {
  id: number;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string | null;
  isActive: boolean;
  createdAt: string;
  isSelf: boolean;
}

export interface PendingInvitation {
  id: number;
  name: string;
  email: string;
  role: Role;
  expiresAt: string;
  createdAt: string;
  invitedByName: string;
}

export interface UsersListResponse {
  users: UserListItem[];
  pendingInvitations: PendingInvitation[];
  maxUsers: number;
  usedSlots: number;
}

export interface InviteUserRequest {
  name: string;
  email: string;
  role: Role;
}

export interface UpdateUserRequest {
  role?: Role;
  isActive?: boolean;
}

export interface MeResponse {
  id: number;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string | null;
  permissions: string[];
}

export async function listUsers(): Promise<UsersListResponse> {
  const { data } = await apiClient.get<UsersListResponse>("/users");
  return data;
}

export async function inviteUser(payload: InviteUserRequest): Promise<PendingInvitation> {
  const { data } = await apiClient.post<PendingInvitation>("/users/invite", payload);
  return data;
}

export async function updateUser(id: number, payload: UpdateUserRequest): Promise<UserListItem> {
  const { data } = await apiClient.put<UserListItem>(`/users/${id}`, payload);
  return data;
}

export async function revokeInvitation(id: number): Promise<void> {
  await apiClient.delete(`/users/invitations/${id}`);
}

export async function getMe(): Promise<MeResponse> {
  const { data } = await apiClient.get<MeResponse>("/users/me");
  return data;
}

// ─── Labels e helpers ────────────────────────────────────────────
export const ROLE_LABELS: Record<Role, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  manager: "Gerente",
  viewer: "Consulta",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  owner: "Tudo — incluindo gerenciar usuários e deletar o estabelecimento.",
  admin: "Gerencia usuários, plano, campanhas e personalização.",
  manager: "Cria/edita campanhas, aprova resgates e personaliza.",
  viewer: "Só consulta dashboards e relatórios.",
};

export const PERMISSIONS = {
  ManageUsers: "users.manage",
  DeleteTenant: "tenant.delete",
  ManageBilling: "billing.manage",
  ManageCampaigns: "campaigns.manage",
  ApproveRewards: "rewards.approve",
  ManageBranding: "branding.manage",
  ViewDashboard: "dashboard.view",
} as const;
