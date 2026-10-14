"use client";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
const subscribe = () => () => {};
export function ThemeSwitcher() {
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const { theme, setTheme } = useTheme();
  return (
    <div
      className="inline-flex rounded-xl border bg-card p-1"
      role="group"
      aria-label="Дэлгэцийн өнгө"
    >
      {[
        { value: "light", label: "Цайвар", Icon: Sun },
        { value: "dark", label: "Бараан", Icon: Moon },
        { value: "system", label: "Системийн", Icon: Monitor },
      ].map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          title={label}
          aria-label={`${label} горим`}
          aria-pressed={mounted && theme === value}
          onClick={() => setTheme(value)}
          className={`rounded-lg p-2.5 transition-colors ${mounted && theme === value ? "bg-accent text-primary" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Icon size={16} />
        </button>
      ))}
    </div>
  );
}
