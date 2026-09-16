import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import avatar from "@/assets/avatar-sales-manager.jpg";
import { useCrm } from "@/lib/crm/store";
import { isOverdue } from "@/lib/crm/format";

const NAV = [
  { to: "/", label: "Dashboard" },
  { to: "/leads", label: "Leads" },
  { to: "/properties", label: "Properties" },
  { to: "/bookings", label: "Bookings" },
] as const;

function LoginScreen() {
  const { signIn, data } = useCrm();
  const [email, setEmail] = useState("arjun@harborview.in");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await signIn(email);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={submit} className="glass w-full max-w-sm animate-rise rounded-2xl p-6">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-lg bg-primary font-mono text-xs font-medium text-primary-foreground">
            HV
          </div>
          <div className="leading-tight">
            <div className="text-[13px] font-semibold tracking-tight">Harborview</div>
            <div className="font-mono text-[10px] text-muted">CRM · Internal</div>
          </div>
        </div>
        <h1 className="mt-5 text-xl font-bold tracking-tight">Sign in</h1>
        <p className="mt-1 text-[12px] text-muted">Use a demo account below to enter the workspace.</p>

        <label className="mt-5 block font-mono text-[10px] uppercase tracking-wide text-faint" htmlFor="email">
          Work email
        </label>
        <input
          id="email"
          className="field mt-1.5"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@harborview.in"
          autoComplete="email"
        />
        {err && <p className="mt-2 text-[12px] text-danger">{err}</p>}

        <button
          type="submit"
          disabled={busy}
          className="mt-4 w-full rounded-lg bg-primary py-2 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Continue"}
        </button>

        <div className="mt-5 space-y-1.5">
          {(data?.users ?? []).map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => setEmail(u.email)}
              className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-left text-[12px] transition-colors hover:bg-foreground/5"
            >
              <span>{u.name}</span>
              <span className="font-mono text-[10px] text-muted">{u.role}</span>
            </button>
          ))}
        </div>
      </form>
    </div>
  );
}

export function AppShell({
  eyebrow,
  title,
  actions,
  children,
}: {
  eyebrow: string;
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { user, authReady, data, signOut } = useCrm();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (!authReady) return <div className="min-h-screen" />;
  if (!user) return <LoginScreen />;

  const overdue = (data?.leads ?? []).filter((l) => isOverdue(l.followUpDate)).length;

  return (
    <div className="relative min-h-screen animate-fade text-foreground">
      <div className="mx-auto flex max-w-[1400px] gap-6 p-4 md:p-6">
        <aside className="glass sticky top-6 hidden h-[calc(100vh-3rem)] w-60 shrink-0 flex-col rounded-2xl p-4 lg:flex">
          <div className="flex items-center gap-2.5 px-2 pb-5 pt-1">
            <div className="grid size-8 place-items-center rounded-lg bg-primary font-mono text-xs font-medium text-primary-foreground">
              HV
            </div>
            <div className="leading-tight">
              <div className="text-[13px] font-semibold tracking-tight">Harborview</div>
              <div className="font-mono text-[10px] text-muted">CRM · Internal</div>
            </div>
          </div>
          <nav className="flex flex-col gap-0.5 text-[13px] font-medium">
            {NAV.map((item) => {
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={
                    active
                      ? "flex items-center gap-2.5 rounded-lg bg-primary/10 px-3 py-2 text-foreground"
                      : "flex items-center gap-2.5 rounded-lg px-3 py-2 text-muted transition-colors hover:bg-foreground/5 hover:text-foreground"
                  }
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {overdue > 0 && (
            <div className="mt-6 rounded-xl bg-warn/10 p-3 ring-1 ring-warn/20">
              <div className="font-mono text-[10px] uppercase tracking-wide text-warn">{overdue} overdue</div>
              <div className="mt-1 text-[12px] text-foreground">follow-ups need action today</div>
            </div>
          )}

          <div className="mt-auto flex items-center gap-2.5 rounded-xl bg-foreground/5 p-2.5">
            <img src={avatar} alt="" className="size-8 rounded-md object-cover" />
            <div className="min-w-0 leading-tight">
              <div className="truncate text-[12px] font-medium">{user.name}</div>
              <div className="font-mono text-[10px] text-muted">{user.role}</div>
            </div>
            <button
              onClick={signOut}
              className="ml-auto rounded-md border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted transition-colors hover:bg-foreground/5"
            >
              exit
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="flex flex-wrap items-center justify-between gap-3 pb-5">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">{eyebrow}</div>
              <h1 className="text-balance text-2xl font-bold tracking-tight">{title}</h1>
            </div>
            <div className="flex items-center gap-2">{actions}</div>
          </header>

          <nav className="mb-4 flex gap-1.5 overflow-x-auto lg:hidden">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={
                  pathname === item.to
                    ? "rounded-lg bg-primary/10 px-3 py-1.5 text-[12px] font-medium"
                    : "rounded-lg border border-border px-3 py-1.5 text-[12px] text-muted"
                }
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {children}
        </main>
      </div>
    </div>
  );
}
