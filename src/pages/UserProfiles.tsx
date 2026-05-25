import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import Avatar from "../components/common/Avatar";
import Button from "../components/ui/button/Button";
import Label from "../components/form/Label";
import Input from "../components/form/input/InputField";
import { getMyProfile, updateMyProfile, type UserProfile } from "../api/profile";
import { uploadImage } from "../api/uploads";
import { extractApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function UserProfiles() {
  const { updateUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const p = await getMyProfile();
        if (!active) return;
        setProfile(p);
        setName(p.name);
        setEmail(p.email);
        setAvatarUrl(p.avatarUrl ?? null);
      } catch (err) {
        if (active) setError(extractApiError(err, "Erro ao carregar perfil"));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const res = await uploadImage(file, "misc");
      setAvatarUrl(res.url);
    } catch (err) {
      setError(extractApiError(err, "Erro ao enviar imagem"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;
    if (!name.trim() || !email.trim()) {
      setError("Nome e email são obrigatórios");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await updateMyProfile({ name: name.trim(), email: email.trim(), avatarUrl });
      setProfile(updated);
      // Atualiza AuthContext pra header/sidebar refletirem na hora
      updateUser({
        name: updated.name,
        email: updated.email,
        avatarUrl: updated.avatarUrl,
      });
      setSuccess("Perfil atualizado!");
    } catch (err) {
      setError(extractApiError(err, "Erro ao salvar"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <>
        <PageBreadcrumb pageTitle="Meu perfil" />
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">Carregando…</div>
      </>
    );
  }

  return (
    <>
      <PageMeta title="Meu perfil | Premify" description="Configure seus dados de conta no Premify." />
      <PageBreadcrumb pageTitle="Meu perfil" />

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
        {/* Avatar + identidade */}
        <div className="p-6 bg-white rounded-2xl shadow-sm dark:bg-gray-800/50 dark:border dark:border-gray-700">
          <h2 className="mb-4 text-lg font-medium text-gray-800 dark:text-white/90">Sua foto</h2>
          <div className="flex items-center gap-5">
            <Avatar name={name} avatarUrl={avatarUrl} size="xl" />
            <div className="flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {avatarUrl ? "✓ Foto carregada" : "Use uma foto sua (PNG ou JPG)."}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="px-4 h-10 text-sm font-medium text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/10 border border-brand-300 rounded-lg disabled:opacity-50"
                >
                  {uploading ? "Enviando…" : avatarUrl ? "Trocar foto" : "📷 Enviar foto"}
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl(null)}
                    className="px-4 h-10 text-sm font-medium text-error-600 hover:bg-error-50 dark:hover:bg-error-500/10 border border-error-300 rounded-lg"
                  >
                    Remover
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFile}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* Dados pessoais */}
        <div className="p-6 bg-white rounded-2xl shadow-sm dark:bg-gray-800/50 dark:border dark:border-gray-700">
          <h2 className="mb-4 text-lg font-medium text-gray-800 dark:text-white/90">Dados pessoais</h2>
          <div className="grid gap-4">
            <div>
              <Label>
                Nome <span className="text-error-500">*</span>
              </Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>
                Email <span className="text-error-500">*</span>
              </Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Conta + tenant */}
        {profile && (
          <div className="p-6 bg-white rounded-2xl shadow-sm dark:bg-gray-800/50 dark:border dark:border-gray-700">
            <h2 className="mb-4 text-lg font-medium text-gray-800 dark:text-white/90">Sua conta</h2>
            <div className="grid gap-3 text-sm">
              <Row label="Estabelecimento" value={profile.tenantName} />
              <Row label="Slug" value={profile.tenantSlug} mono />
              <Row label="Função" value={profile.role} />
              <Row label="Membro desde" value={new Date(profile.createdAt).toLocaleDateString("pt-BR")} />
            </div>
          </div>
        )}

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

        <div className="flex justify-end">
          <Button disabled={saving}>{saving ? "Salvando…" : "Salvar alterações"}</Button>
        </div>
      </form>
    </>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className={`text-gray-800 dark:text-white/90 ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}
