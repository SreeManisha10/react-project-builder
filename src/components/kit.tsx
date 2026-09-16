/**
 * Shared UI kit.
 *
 * Every button, modal, panel, table and form control in the CRM comes from
 * here, so the same element always looks and behaves identically. No page
 * should hand-roll its own styling.
 */
import { type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/* ---------------------------------- Button --------------------------------- */

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const VARIANT: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  secondary: "border border-border-strong text-foreground hover:bg-foreground/5",
  ghost: "text-muted hover:bg-foreground/5",
  danger: "border border-danger/30 text-danger hover:bg-danger/10",
};

const SIZE: Record<Size, string> = {
  sm: "px-2.5 py-1 text-[12px]",
  md: "px-4 py-2 text-[13px]",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...props}
    />
  );
}

export function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Close"
      className="grid size-7 shrink-0 place-items-center rounded-lg border border-border text-muted transition-colors hover:bg-foreground/5"
    >
      ✕
    </button>
  );
}

/* ---------------------------------- Panel ---------------------------------- */

export function Panel({
  title,
  meta,
  toolbar,
  children,
  className,
  delay = 0,
}: {
  title?: string;
  meta?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <section
      className={cn("glass animate-rise rounded-2xl p-4", className)}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {(title || toolbar || meta) && (
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
          <div className="flex items-baseline gap-3">
            {title && <h2 className="text-[14px] font-semibold tracking-tight">{title}</h2>}
            {meta && <span className="font-mono text-[11px] text-muted">{meta}</span>}
          </div>
          {toolbar && <div className="flex flex-wrap items-center gap-2">{toolbar}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  children,
  delay = 0,
}: {
  label: string;
  value: ReactNode;
  children?: ReactNode;
  delay?: number;
}) {
  return (
    <div className="glass animate-rise rounded-2xl p-4" style={delay ? { animationDelay: `${delay}ms` } : undefined}>
      <div className="font-mono text-[10px] uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-2 text-3xl font-bold tracking-tight">{value}</div>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

/* ------------------------------- Form controls ------------------------------ */

export function Label({ children }: { children: ReactNode }) {
  return <span className="font-mono text-[10px] uppercase tracking-wide text-faint">{children}</span>;
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("field", className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn("field", className)} {...props}>
      {children}
    </select>
  );
}

/** Compact filter control used in panel toolbars. */
export function FilterSelect({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "rounded-lg border border-border bg-surface/70 px-2.5 py-1.5 text-[12px] text-muted transition-colors hover:bg-foreground/5",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function FormField({
  label,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn("block", className)}>
      <Label>{label}</Label>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <span className="mt-1 block text-[11px] text-danger">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-[11px] text-faint">{hint}</span>
      ) : null}
    </label>
  );
}

/* --------------------------------- Overlays -------------------------------- */

export function Modal({
  eyebrow,
  title,
  onClose,
  footer,
  children,
  as = "div",
  onSubmit,
}: {
  eyebrow: string;
  title: string;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
  as?: "div" | "form";
  onSubmit?: (e: React.FormEvent) => void;
}) {
  const Body = as as "div";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-[2px]" onClick={onClose} />
      <Body
        {...(as === "form" ? ({ onSubmit } as Record<string, unknown>) : {})}
        className="glass relative max-h-[90vh] w-full max-w-lg animate-rise overflow-y-auto rounded-2xl p-5"
      >
        <OverlayHeader eyebrow={eyebrow} title={title} onClose={onClose} />
        {children}
        {footer && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
      </Body>
    </div>
  );
}

export function Drawer({
  eyebrow,
  title,
  subtitle,
  onClose,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-[2px]" onClick={onClose} />
      <aside className="glass absolute right-0 top-0 flex h-full w-full max-w-[400px] animate-slide flex-col overflow-y-auto rounded-l-2xl p-5">
        <OverlayHeader eyebrow={eyebrow} title={title} subtitle={subtitle} onClose={onClose} />
        {children}
      </aside>
    </div>
  );
}

function OverlayHeader({
  eyebrow,
  title,
  subtitle,
  onClose,
}: {
  eyebrow: string;
  title: string;
  subtitle?: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="font-mono text-[10px] uppercase tracking-wide text-muted">{eyebrow}</div>
        <div className="mt-1 truncate text-lg font-bold tracking-tight">{title}</div>
        {subtitle && <div className="font-mono text-[11px] text-faint">{subtitle}</div>}
      </div>
      <CloseButton onClick={onClose} />
    </div>
  );
}

export function SubHeading({ children }: { children: ReactNode }) {
  return <div className="font-mono text-[10px] uppercase tracking-wide text-faint">{children}</div>;
}

/* ---------------------------------- Table ---------------------------------- */

export function Table({ columns, children, minWidth = 720 }: { columns: string[]; children: ReactNode; minWidth?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[13px]" style={{ minWidth }}>
        <thead>
          <tr className="font-mono text-[10px] uppercase tracking-wide text-faint">
            {columns.map((c, i) => (
              <th
                key={c}
                className={cn(
                  "border-b border-border py-2 font-medium",
                  i === 0 ? "pr-3" : i === columns.length - 1 ? "pl-2 text-right" : "px-2",
                )}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Row({ onClick, children }: { onClick?: () => void; children: ReactNode }) {
  return (
    <tr
      onClick={onClick}
      className={cn("transition-colors hover:bg-primary/5", onClick && "cursor-pointer")}
    >
      {children}
    </tr>
  );
}

export function Cell({
  children,
  align = "left",
  mono,
  muted,
  tone,
}: {
  children: ReactNode;
  align?: "left" | "right";
  mono?: boolean;
  muted?: boolean;
  tone?: "danger" | "success";
}) {
  return (
    <td
      className={cn(
        "border-b border-border/60 px-2 py-3 first:pr-3 first:pl-0 last:pl-2 last:pr-0",
        align === "right" && "text-right",
        mono && "font-mono text-[12px]",
        muted && "text-muted",
        tone === "danger" && "text-danger",
        tone === "success" && "text-success",
      )}
    >
      {children}
    </td>
  );
}

/* --------------------------------- Pagination ------------------------------- */

export function Pagination({
  page,
  pages,
  onChange,
  summary,
}: {
  page: number;
  pages: number;
  onChange: (p: number) => void;
  summary: string;
}) {
  return (
    <div className="flex items-center justify-between pt-3 font-mono text-[11px] text-faint">
      <span>{summary}</span>
      <div className="flex gap-1">
        <button
          onClick={() => onChange(Math.max(1, page - 1))}
          className="rounded border border-border px-2 py-1 transition-colors hover:bg-foreground/5"
          aria-label="Previous page"
        >
          ‹
        </button>
        {Array.from({ length: pages }).map((_, i) => (
          <button
            key={i}
            onClick={() => onChange(i + 1)}
            className={cn(
              "rounded px-2 py-1 transition-colors",
              page === i + 1 ? "bg-foreground/5 text-foreground" : "border border-border hover:bg-foreground/5",
            )}
          >
            {i + 1}
          </button>
        ))}
        <button
          onClick={() => onChange(Math.min(pages, page + 1))}
          className="rounded border border-border px-2 py-1 transition-colors hover:bg-foreground/5"
          aria-label="Next page"
        >
          ›
        </button>
      </div>
    </div>
  );
}
