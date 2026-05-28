import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import { getInvitation, acceptInvitation, type InvitationDetails } from "../../api/invitations";
import { ROLE_LABELS } from "../../api/users";
import { extractApiError } from "../../api/client";

export default function AcceptInvitationPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!token) return;
      try {
        const inv = await getInvitation(token);
        if (active) setInvitation(inv);
      } catch (err) {
        if (active) setError(extractApiError(err, "Convite inválido"));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [token]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting || !token) return;
    setError(null);
    if (password.length < 8) {
      setError("Senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não conferem.");
      return;
    }
    setSubmitting(true);
    try {
      await acceptInvitation(token, password);
      setDone(true);
      setTimeout(() => navigate("/signin", { replace: true }), 2000);
    } catch (err) {
      setError(extractApiError(err, "Erro ao aceitar convite"));
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageMeta title="Aceitar convite | Premify" description="Defina sua senha pra acessar o estabelecimento no Premify." />
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">Premify</h1>
          </div>

          {loading && (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">Validando convite…</div>
          )}

          {!loading && error && !invitation && (
            <div className="text-center space-y-4">
              <div className="p-4 text-sm rounded-lg bg-error-50 text-error-700 border border-error-200 dark:bg-error-500/10 dark:text-error-300 dark:border-error-500/30">
                {error}
              </div>
              <button
                type="button"
                onClick={() => navigate("/signin")}
                className="text-sm text-brand-600 hover:underline dark:text-brand-400"
              >
                Ir pro login
              </button>
            </div>
          )}

          {!loading && invitation && done && (
            <div className="text-center space-y-3">
              <div className="text-4xl">🎉</div>
              <h2 className="text-lg font-medium text-gray-800 dark:text-white/90">Tudo certo!</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Conta criada. Redirecionando pro login…
              </p>
            </div>
          )}

          {!loading && invitation && !done && (
            <>
              <div className="mb-6 text-center">
                <h2 className="text-lg font-medium text-gray-800 dark:text-white/90">
                  Olá, {invitation.name}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Você foi convidado pra acessar <strong>{invitation.tenantName}</strong> como{" "}
                  <strong>{ROLE_LABELS[invitation.role] ?? invitation.role}</strong>.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-2.5 text-sm rounded-lg bg-error-50 text-error-700 border border-error-200 dark:bg-error-500/10 dark:text-error-300 dark:border-error-500/30">
                    {error}
                  </div>
                )}

                <div>
                  <Label>Email</Label>
                  <Input value={invitation.email} disabled />
                </div>
                <div>
                  <Label>Defina sua senha *</Label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    autoComplete="new-password"
                    className="w-full h-11 px-4 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <Label>Confirme a senha *</Label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a senha"
                    autoComplete="new-password"
                    className="w-full h-11 px-4 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <Button disabled={submitting} className="w-full">
                  {submitting ? "Criando conta…" : "Criar conta e aceitar convite"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
}
