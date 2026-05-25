import {
  CUSTOMER_FIELD_META,
  DEFAULT_CUSTOMER_FORM,
  type CustomerFormField,
} from "../../api/campaigns";

interface Props {
  value: CustomerFormField[];
  onChange: (next: CustomerFormField[]) => void;
}

/**
 * Editor da configuração de campos do formulário de cadastro do cliente final.
 * Cada campo tem 2 toggles: "exibir" e "obrigatório".
 * Phone é sempre habilitado (identificador único do cliente no tenant).
 */
export default function CustomerFormConfigEditor({ value, onChange }: Props) {
  // Normaliza o value (preenche campos faltantes a partir do default)
  const normalized: CustomerFormField[] = DEFAULT_CUSTOMER_FORM.map((def) => {
    const found = value?.find((v) => v.key === def.key);
    return found ?? def;
  });

  function updateField(key: string, patch: Partial<CustomerFormField>) {
    const next = normalized.map((f) => (f.key === key ? { ...f, ...patch } : f));
    onChange(next);
  }

  return (
    <div className="space-y-2">
      {normalized.map((field) => {
        const meta = CUSTOMER_FIELD_META[field.key] ?? { label: field.key, icon: "📋" };
        const isPhone = field.key === "phone";

        return (
          <div
            key={field.key}
            className={`p-4 rounded-xl border transition ${
              field.enabled
                ? "bg-white border-gray-200 dark:bg-gray-900 dark:border-gray-700"
                : "bg-gray-50 border-gray-200 dark:bg-gray-800/30 dark:border-gray-700 opacity-70"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{meta.icon}</span>
              <div className="flex-1">
                <div className="font-medium text-gray-800 dark:text-white/90">{meta.label}</div>
                {isPhone && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Identificação única do cliente — sempre habilitado
                  </div>
                )}
              </div>

              {/* Toggle exibir */}
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={field.enabled}
                  disabled={isPhone}
                  onChange={(e) =>
                    updateField(field.key, {
                      enabled: e.target.checked,
                      required: e.target.checked ? field.required : false,
                    })
                  }
                  className="w-4 h-4 rounded text-brand-500 focus:ring-brand-500 disabled:opacity-50"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Exibir</span>
              </label>

              {/* Toggle obrigatório (só se exibido) */}
              <label className={`inline-flex items-center gap-2 ${field.enabled ? "cursor-pointer" : "opacity-40"}`}>
                <input
                  type="checkbox"
                  checked={field.required}
                  disabled={!field.enabled || isPhone}
                  onChange={(e) => updateField(field.key, { required: e.target.checked })}
                  className="w-4 h-4 rounded text-error-500 focus:ring-error-500 disabled:opacity-50"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Obrigatório</span>
              </label>
            </div>
          </div>
        );
      })}

      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        💡 Esses campos vão aparecer no cadastro do cliente quando ele escanear o QR Code dessa campanha.
      </p>
    </div>
  );
}
