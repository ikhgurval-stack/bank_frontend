"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  ChevronDown,
  CreditCard,
  LayoutGrid,
  LogOut,
  History,
} from "lucide-react";
import { useAuth } from "./providers";
import { Brand } from "./brand";
import { ThemeSwitcher } from "./theme-switcher";
import { ErrorNotice, Loading } from "./feedback";
import { errorMessage } from "@/lib/api";
import { Button } from "./ui/button";
const links = [
  { href: "/dashboard", label: "Тойм", Icon: LayoutGrid },
  { href: "/accounts", label: "Миний данс", Icon: CreditCard },
  { href: "/transfer", label: "Шилжүүлэг", Icon: ArrowUpRight },
  { href: "/history", label: "Гүйлгээний түүх", Icon: History },
];
export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading, error, restore, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [logoutError, setLogoutError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!loading && !user && !error) router.replace("/login");
  }, [loading, user, error, router]);
  async function exit() {
    setBusy(true);
    setLogoutError("");
    try {
      await signOut();
      router.replace("/login");
    } catch (e) {
      setLogoutError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <Loading />;
  if (error)
    return (
      <main className="mx-auto max-w-lg p-8">
        <Brand />
        <div className="mt-8">
          <ErrorNotice message={error} retry={() => void restore()} />
        </div>
      </main>
    );
  if (!user) return <Loading />;
  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-card focus:p-4"
      >
        Үндсэн хэсэг рүү очих
      </a>
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r bg-card px-6 py-8 lg:flex">
        <Link href="/dashboard" aria-label="MNT Flow нүүр">
          <Brand />
        </Link>
        <p className="mb-3 mt-12 px-3 text-[10px] font-bold tracking-widest text-muted-foreground">
          МИНИЙ БАНК
        </p>
        <nav className="space-y-2">
          {links.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-3.5 text-sm font-medium ${pathname === href ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
            >
              <Icon size={19} />
              {label}
            </Link>
          ))}
        </nav>

        <p className="mt-5 px-1 text-xs text-muted-foreground">
          MNT Flow · Банкны демо
        </p>
      </aside>
      <div className="lg:pl-64">
        <header className="flex min-h-22 items-center justify-between gap-3 border-b bg-card px-4 sm:px-8 lg:px-10">
          <div className="lg:hidden">
            <Link href="/dashboard">
              <Brand />
            </Link>
          </div>
          <p className="hidden text-sm text-muted-foreground lg:block">
            Миний банк <span className="mx-3 text-border">/</span>
            <span className="font-medium text-foreground">
              {links.find((link) => link.href === pathname)?.label}
            </span>
          </p>
          <div className="flex items-center gap-2 sm:gap-5">
            <div className="hidden sm:block">
              <ThemeSwitcher />
            </div>
            <details className="relative">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl p-2 hover:bg-accent">
                <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {user.username.slice(0, 2).toUpperCase()}
                </span>
                <span className="hidden max-w-36 truncate text-sm font-semibold md:block">
                  {user.username}
                </span>
                <ChevronDown size={14} />
              </summary>
              <div className="absolute right-0 z-40 mt-2 w-60 rounded-xl border bg-card p-3 shadow-lg">
                <p className="mb-3 truncate px-2 text-sm">{user.username}</p>
                <div className="mb-3 sm:hidden">
                  <ThemeSwitcher />
                </div>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  disabled={busy}
                  onClick={exit}
                >
                  <LogOut />
                  {busy ? "Гарч байна…" : "Системээс гарах"}
                </Button>
              </div>
            </details>
          </div>
        </header>
        <main
          id="main"
          className="mx-auto max-w-7xl px-4 pb-28 pt-7 sm:px-8 lg:px-10 lg:pb-10"
        >
          {logoutError && (
            <div className="mb-5">
              <ErrorNotice message={logoutError} />
            </div>
          )}
          {children}
        </main>
      </div>
      <nav
        aria-label="Үндсэн цэс"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {links.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={pathname === href ? "page" : undefined}
            className={`flex min-h-19 flex-col items-center justify-center gap-1.5 px-1 text-center text-[10px] font-medium ${pathname === href ? "text-primary" : "text-muted-foreground"}`}
          >
            <Icon size={21} />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
