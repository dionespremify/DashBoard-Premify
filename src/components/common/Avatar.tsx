interface Props {
  name?: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

/**
 * Avatar circular com fallback para iniciais quando não há imagem.
 * As cores do background são derivadas do nome (estável).
 */
export default function Avatar({ name = "", avatarUrl, size = "md", className = "" }: Props) {
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-11 h-11 text-sm",
    lg: "w-20 h-20 text-2xl",
    xl: "w-32 h-32 text-4xl",
  }[size];

  if (avatarUrl) {
    return (
      <span className={`inline-flex rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 ${sizeClasses} ${className}`}>
        <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
      </span>
    );
  }

  const initials = getInitials(name);
  const bgColor = getColorFromName(name);

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-semibold text-white shadow-sm ${sizeClasses} ${className}`}
      style={{ backgroundColor: bgColor }}
      title={name}
    >
      {initials || "?"}
    </span>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Paleta de cores estável baseada em hash simples do nome
const COLORS = [
  "#F44336", "#E91E63", "#9C27B0", "#673AB7", "#3F51B5",
  "#2196F3", "#03A9F4", "#00BCD4", "#009688", "#4CAF50",
  "#FF9800", "#FF5722", "#795548", "#607D8B",
];

function getColorFromName(name: string): string {
  if (!name) return COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return COLORS[Math.abs(hash) % COLORS.length];
}
