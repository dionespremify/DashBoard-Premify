import type { Role } from "../api/users";
import { PERMISSIONS } from "../api/users";

/**
 * Espelho da matriz de permissões do backend (API_Premify.Authorization.Permissions).
 * Se mudar uma, lembrar de sincronizar a outra.
 * Source of truth: backend retornou no /users/me também.
 */
export const ROLE_PERMISSIONS: Record<Role, Set<string>> = {
  owner: new Set([
    PERMISSIONS.ManageUsers,
    PERMISSIONS.DeleteTenant,
    PERMISSIONS.ManageBilling,
    PERMISSIONS.ManageCampaigns,
    PERMISSIONS.ApproveRewards,
    PERMISSIONS.ManageBranding,
    PERMISSIONS.ViewDashboard,
  ]),
  admin: new Set([
    PERMISSIONS.ManageUsers,
    PERMISSIONS.ManageBilling,
    PERMISSIONS.ManageCampaigns,
    PERMISSIONS.ApproveRewards,
    PERMISSIONS.ManageBranding,
    PERMISSIONS.ViewDashboard,
  ]),
  manager: new Set([
    PERMISSIONS.ManageCampaigns,
    PERMISSIONS.ApproveRewards,
    PERMISSIONS.ManageBranding,
    PERMISSIONS.ViewDashboard,
  ]),
  viewer: new Set([PERMISSIONS.ViewDashboard]),
};

export function hasPermission(role: string | undefined | null, permission: string): boolean {
  if (!role) return false;
  const set = ROLE_PERMISSIONS[role as Role];
  // Compatibilidade com usuários legados de role "operator" → mapeia pra manager
  if (!set && role === "operator") {
    return ROLE_PERMISSIONS.manager.has(permission);
  }
  return set?.has(permission) ?? false;
}
