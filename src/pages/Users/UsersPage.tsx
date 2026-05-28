import { useEffect, useMemo, useState, type FormEvent } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import Button from "../../components/ui/button/Button";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import {
  listUsers,
  inviteUser,
  updateUser,
  revokeInvitation,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  type Role,
  type UsersListResponse,
  type UserListItem,
  type PendingInvitation,
} from "../../api/users";
import { extractApiError } from "../../api/client";

export default function UsersPage() {
  const [data, setData] = useState<UsersListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);

  async function reload() {
    try {
      const resp = await listUsers();
      setData(resp);
    } catch (err) {
      setError(extractApiError(err, "Erro ao carregar usuários"));
    }
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const resp = await listUsers();
        if (active) setData(resp);
      } catch (err) {
        if (active) setError(extractApiError(err, "Erro ao carregar usuários"));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const slotsRemaining = data ? data.maxUsers - data.usedSlots : 0;
  const cantInvite = data ? data.usedSlots >= data.maxUsers : false;

  async function handleUpdateRole(user: UserListItem, newRole: Role) {
    setError(null);
    setSuccess(null);
    try {
      await updateUser(user.id, { role: newRole });
      setSuccess(`Perfil de ${user.name} alterado pra ${ROLE_LABELS[newRole]}`);
      await reload();
    } catch (err) {
      setError(extractApiError(err, "Erro ao alterar perfil"));
    }
  }

  async function handleToggleActive(user: UserListItem) {
    setError(null);
    setSuccess(null);
    const action = user.isActive ? "desativar" : "reativar";
    if (!confirm(`Tem certeza que quer ${action} ${user.name}?`)) return;
    try {
      await updateUser(user.id, { isActive: !user.isActive });
      setSuccess(`${user.name} ${user.isActive ? "desativado" : "reativado"}`);
      await reload();
    } catch (err) {
      setError(extractApiError(err, "Erro ao atualizar usuário"));
    }
  }

  async function handleRevoke(invitation: PendingInvitation) {
    setError(null);
    setSuccess(null);
    if (!confirm(`Cancelar convite enviado pra ${invitation.email}?`)) return;
    try {
      await revokeInvitation(invitation.id);
      setSuccess(`Convite pra ${invitation.email} cancelado`);
      await reload();
    } catch (err) {
      setError(extractApiError(err, "Erro ao cancelar convite"));
    }
  }

  if (loading) {
    return (
      <>
        <PageBreadcrumb pageTitle="Usuários" />
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">Carregando…</div>
      </>
    );
  }

  return (
    <>
      <PageMeta title="Usuários | Premify" description="Gerencie os usuários do estabelecimento e suas permissões." />
      <PageBreadcrumb pageTitle="Usuários e permissões" />

      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header com slots + botão */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-white rounded-2xl shadow-sm dark:bg-gray-800/50 dark:border dark:border-gray-700">
          <div>
            <h2 className="text-lg font-medium text-gray-800 dark:text-white/90">Equipe</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {data?.usedSlots ?? 0} de {data?.maxUsers ?? 0} usuários do seu plano.
              {slotsRemaining > 0 && ` ${slotsRemaining} vaga${slotsRemaining > 1 ? "s" : ""} disponível${slotsRemaining > 1 ? "is" : ""}.`}
            </p>
          </div>
          <Button onClick={() => setShowInviteModal(true)} disabled={cantInvite}>
            {cantInvite ? "Limite do plano atingido" : "+ Convidar usuário"}
          </Button>
        </div>

        {/* Mensagens */}
        {error && (
          <div className="p-3 text-sm rounded-lg bg-error-50 text-error-700 border border-error-200 dark:bg-error-500/10 dark:text-error-300 dark:border-error-500/30">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 text-sm rounded-lg bg-success-50 text-success-700 border border-success-200 dark:bg-success-500/10 dark:text-success-300 dark:border-success-500/30">
            {success}
          </div>
        )}

        {/* Lista de usuários */}
        <section className="bg-white rounded-2xl shadow-sm dark:bg-gray-800/50 dark:border dark:border-gray-700">
          <h3 className="px-6 pt-5 pb-2 text-base font-medium text-gray-800 dark:text-white/90">
            Usuários ativos
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-3 font-medium">Nome</th>
                  <th className="px-6 py-3 font-medium">Email</th>
                  <th className="px-6 py-3 font-medium">Perfil</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {(data?.users ?? []).map((u) => (
                  <tr key={u.id} className="border-b border-gray-100 dark:border-gray-700/50 last:border-0">
                    <td className="px-6 py-4 text-gray-800 dark:text-gray-100">
                      {u.name}
                      {u.isSelf && <span className="ml-2 text-xs text-gray-400">(você)</span>}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{u.email}</td>
                    <td className="px-6 py-4">
                      {u.isSelf ? (
                        <span className="text-gray-600 dark:text-gray-300">{ROLE_LABELS[u.role] ?? u.role}</span>
                      ) : (
                        <RoleSelect
                          value={u.role}
                          onChange={(r) => handleUpdateRole(u, r)}
                        />
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full ${
                        u.isActive
                          ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-300"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                      }`}>
                        {u.isActive ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!u.isSelf && (
                        <button
                          type="button"
                          onClick={() => handleToggleActive(u)}
                          className="text-xs font-medium text-error-600 hover:underline dark:text-error-400"
                        >
                          {u.isActive ? "Desativar" : "Reativar"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Convites pendentes */}
        {(data?.pendingInvitations.length ?? 0) > 0 && (
          <section className="bg-white rounded-2xl shadow-sm dark:bg-gray-800/50 dark:border dark:border-gray-700">
            <h3 className="px-6 pt-5 pb-2 text-base font-medium text-gray-800 dark:text-white/90">
              Convites pendentes
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-3 font-medium">Nome</th>
                    <th className="px-6 py-3 font-medium">Email</th>
                    <th className="px-6 py-3 font-medium">Perfil</th>
                    <th className="px-6 py-3 font-medium">Expira em</th>
                    <th className="px-6 py-3 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {data!.pendingInvitations.map((inv) => (
                    <tr key={inv.id} className="border-b border-gray-100 dark:border-gray-700/50 last:border-0">
                      <td className="px-6 py-4 text-gray-800 dark:text-gray-100">{inv.name}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{inv.email}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{ROLE_LABELS[inv.role] ?? inv.role}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                        {new Date(inv.expiresAt).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleRevoke(inv)}
                          className="text-xs font-medium text-error-600 hover:underline dark:text-error-400"
                        >
                          Cancelar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {showInviteModal && (
        <InviteModal
          onClose={() => setShowInviteModal(false)}
          onInvited={async (msg) => {
            setShowInviteModal(false);
            setSuccess(msg);
            setError(null);
            await reload();
          }}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// Select de role com tooltip explicativo
// ─────────────────────────────────────────────────────────────────
function RoleSelect({ value, onChange }: { value: Role; onChange: (v: Role) => void }) {
  const roles: Role[] = ["owner", "admin", "manager", "viewer"];
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as Role)}
      title={ROLE_DESCRIPTIONS[value]}
      className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-800 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
    >
      {roles.map((r) => (
        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
      ))}
    </select>
  );
}

// ─────────────────────────────────────────────────────────────────
// Modal de convite
// ─────────────────────────────────────────────────────────────────
function InviteModal({
  onClose,
  onInvited,
}: {
  onClose: () => void;
  onInvited: (successMessage: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("manager");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const description = useMemo(() => ROLE_DESCRIPTIONS[role], [role]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending) return;
    setError(null);
    if (!name.trim() || !email.trim()) {
      setError("Preencha nome e email");
      return;
    }
    setSending(true);
    try {
      await inviteUser({ name: name.trim(), email: email.trim(), role });
      onInvited(`Convite enviado pra ${email.trim()}`);
    } catch (err) {
      setError(extractApiError(err, "Erro ao enviar convite"));
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <h2 className="text-lg font-medium text-gray-800 dark:text-white/90">Convidar usuário</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Um email vai ser enviado com link pra ativar a conta. O link expira em 7 dias.
          </p>

          {error && (
            <div className="p-2.5 text-sm rounded-lg bg-error-50 text-error-700 border border-error-200 dark:bg-error-500/10 dark:text-error-300 dark:border-error-500/30">
              {error}
            </div>
          )}

          <div>
            <Label>Nome *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Maria Silva" />
          </div>
          <div>
            <Label>Email *</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="maria@empresa.com" />
          </div>
          <div>
            <Label>Perfil *</Label>
            <RoleSelect value={role} onChange={setRole} />
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{description}</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={sending}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100"
            >
              Cancelar
            </button>
            <Button disabled={sending}>{sending ? "Enviando…" : "Enviar convite"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
