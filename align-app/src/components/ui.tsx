import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";

/** Page-level wrapper: centered column, matches DESIGN.md §2.3 whitespace rule. */
export function PageShell({
  children,
  width = "md",
}: {
  children: ReactNode;
  width?: "sm" | "md" | "lg";
}) {
  const maxWidth = { sm: "max-w-md", md: "max-w-2xl", lg: "max-w-3xl" }[width];
  return <main className={`${maxWidth} mx-auto w-full px-4 py-10 sm:py-16`}>{children}</main>;
}

export function PageTitle({ children }: { children: ReactNode }) {
  return <h1 className="text-h1 font-semibold text-text-primary">{children}</h1>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-h2 font-medium text-text-primary">{children}</h2>;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-md border border-border-default bg-bg-surface p-6 shadow-card ${className}`}>
      {children}
    </div>
  );
}

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-sm px-4 py-2 text-body-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-primary-green text-bg-surface hover:bg-primary-green-dark cursor-pointer",
  secondary:
    "border border-border-default bg-bg-surface text-text-primary hover:bg-bg-surface-sunken cursor-pointer",
  danger:
    "border border-status-gap text-status-gap hover:bg-status-gap-tint cursor-pointer",
  ghost: "text-text-secondary hover:text-text-primary cursor-pointer",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button className={`${buttonBase} ${buttonVariants[variant]} ${className}`} {...props} />;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-body-sm font-medium text-text-primary">
      {label}
      {children}
    </label>
  );
}

const fieldInputBase =
  "w-full rounded-sm border border-border-default bg-bg-surface px-3 py-2 text-body text-text-primary placeholder:text-text-disabled focus:border-border-strong focus:outline-none disabled:cursor-not-allowed disabled:bg-bg-surface-sunken disabled:text-text-disabled";

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${fieldInputBase} ${className}`} />;
}

export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${fieldInputBase} ${className}`} />;
}

/** Inline error/caution text — used for form errors, not a full alert banner. */
export function ErrorText({ children }: { children: ReactNode }) {
  return <p className="text-body-sm text-status-gap">{children}</p>;
}

/** Neutral, non-judgmental notice — per DESIGN.md UX Rule 4.3 ("จุดที่ยังไม่มีข้อมูล", ไม่ใช่ "ผิดพลาด"). */
export function InfoNote({ children }: { children: ReactNode }) {
  return <p className="text-body-sm text-text-secondary">{children}</p>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-border-default bg-bg-surface px-6 py-10 text-center text-body-sm text-text-secondary">
      {children}
    </div>
  );
}

/** Curriculum-year tag — DESIGN.md §2.1, must appear anywhere a CLO/PLO/course shows up. */
export function CurriculumTag({ id }: { id: string }) {
  const style =
    id === "2565"
      ? "text-curriculum-2565 bg-curriculum-2565-tint"
      : id === "2570"
        ? "text-curriculum-2570 bg-curriculum-2570-tint"
        : "text-status-info bg-bg-surface-sunken";
  return (
    <span className={`inline-flex items-center rounded-sm px-2 py-0.5 font-mono text-caption font-medium ${style}`}>
      {id === "2565" || id === "2570" ? `หลักสูตร ${id}` : id}
    </span>
  );
}

type AccountStatus = "pending" | "approved" | "rejected";

const statusBadgeStyle: Record<AccountStatus, string> = {
  pending: "border border-border-default text-status-info bg-bg-surface-sunken",
  approved: "text-status-confirmed bg-primary-green-tint",
  rejected: "text-status-gap bg-status-gap-tint",
};

export function StatusBadge({ status, label }: { status: AccountStatus; label: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-sm px-2 py-0.5 text-caption font-medium ${statusBadgeStyle[status]}`}
    >
      {label}
    </span>
  );
}

export function TextLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a href={href} className="text-primary-green underline underline-offset-2 hover:text-primary-green-dark">
      {children}
    </a>
  );
}
