import type { ButtonHTMLAttributes } from "react";

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-[#244bd0] disabled:bg-accent/50",
  secondary: "bg-white text-ink border border-line hover:bg-gray-50 disabled:text-muted",
  ghost: "text-ink hover:bg-black/5 disabled:text-muted",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

export function Button({
  variant = "secondary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed",
        VARIANTS[variant],
        className,
      )}
    />
  );
}

export function Avatar({ name, color, size = 28 }: { name: string; color: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ background: color, width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials}
    </span>
  );
}

const ROLE_STYLES = {
  owner: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  editor: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  viewer: "bg-amber-50 text-amber-800 ring-amber-200",
} as const;

export function RoleBadge({ role }: { role: keyof typeof ROLE_STYLES }) {
  const label = { owner: "Owner", editor: "Can edit", viewer: "View only" }[role];
  return (
    <span className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", ROLE_STYLES[role])}>
      {label}
    </span>
  );
}

export function Alert({ children, onDismiss }: { children: React.ReactNode; onDismiss?: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
      <span className="flex-1">{children}</span>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="text-red-600 hover:text-red-900" aria-label="Dismiss">
          ×
        </button>
      )}
    </div>
  );
}

export function formatRelative(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 45) return "just now";
  if (diff < 3600) return `${Math.round(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)} h ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
