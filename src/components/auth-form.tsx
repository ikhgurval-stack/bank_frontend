"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Check, Eye, EyeOff } from "lucide-react";
import { register, errorMessage } from "@/lib/api";
import { money } from "@/lib/format";
import type { Registration } from "@/lib/types";
import { Brand } from "./brand";
import { ThemeSwitcher } from "./theme-switcher";
import { useAuth } from "./providers";
import { ErrorNotice } from "./feedback";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const isRegister = mode === "register";
  const { user, signIn } = useAuth();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Registration | null>(null);
  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const username = String(fields.get("username") || "").trim();
    const fullName = String(fields.get("fullName") || "").trim();
    const password = String(fields.get("password") || "");
    const confirmPassword = String(fields.get("confirmPassword") || "");
    if (isRegister && (fullName.length < 2 || fullName.length > 120)) {
      setError("Овог, нэрээ 2–120 тэмдэгтээр оруулна уу.");
      return;
    }
    if (!username || !password) {
      setError("Нэвтрэх нэр, нууц үгээ оруулна уу.");
      return;
    }
    if (
      isRegister &&
      (!/^[A-Za-z0-9_]{3,50}$/.test(username) ||
        password.length < 8 ||
        password.length > 72)
    ) {
      setError("Нэвтрэх нэр 3–50, нууц үг 8–72 тэмдэгттэй байх ёстой.");
      return;
    }
    if (isRegister && password !== confirmPassword) {
      setError("Нууц үгнүүд таарахгүй байна.");
      return;
    }
    // BCrypt has a byte limit as well as the controller's character limit.
    if (isRegister && new TextEncoder().encode(password).length > 72) {
      setError(
        "Нууц үг хэт урт байна. Кирилл болон тусгай тэмдэгт ашигласан бол богиносгоно уу.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (isRegister) {
        setResult(
          await register({ fullName, username, password, confirmPassword }),
        );
        form.reset();
      } else {
        await signIn(username, password);
        router.replace("/dashboard");
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.05fr]">
      <aside className="relative hidden flex-col justify-between bg-[#10213B] p-12 text-white lg:flex xl:p-16">
        <div className="text-xs font-medium tracking-[0.2em] text-blue-200">
          MNT FLOW / БАНКНЫ ДЕМО
        </div>
        <div className="max-w-lg">
          <div
            aria-hidden="true"
            className="mb-10 flex size-20 items-center justify-center rounded-3xl border border-white/20"
          >
            <ArrowRight className="size-10 -rotate-45 text-blue-300" />
          </div>
          <h1 className="text-5xl font-semibold leading-[1.2] tracking-tight">
            Мөнгөө удирдах
            <br />
            <span className="text-blue-300">энгийн орон зай.</span>
          </h1>
          <p className="mt-7 max-w-sm text-base leading-7 text-slate-300">
            Дансаа хянаж, шилжүүлэг хийж, гүйлгээ бүрээ нэг дороос хараарай.
          </p>
          <div className="mt-12 grid grid-cols-3 gap-4 border-t border-white/15 pt-6 text-sm text-slate-300">
            <span>Миний данс</span>
            <span>Шилжүүлэг</span>
            <span>Гүйлгээний түүх</span>
          </div>
        </div>
      </aside>
      <div className="flex flex-col px-5 py-6 sm:px-12">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Brand />
          <ThemeSwitcher />
        </header>
        <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-14">
          {result ? (
            <div className="space-y-6">
              <span className="flex size-14 items-center justify-center rounded-full bg-success/10 text-success">
                <Check size={26} />
              </span>
              <div>
                <h1 className="page-title">Бүртгэл амжилттай!</h1>
                <p className="page-description">
                  Таны анхны туршилтын данс нээгдлээ.
                </p>
              </div>
              <div className="panel space-y-3 p-5">
                <p className="text-xs text-muted-foreground">Дансны дугаар</p>
                <p className="break-all font-mono text-lg">
                  {result.accountNumber}
                </p>
                <p className="text-xl font-semibold">{money(result.balance)}</p>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                Анхны дансанд 1,000,000 MNT туршилтын мөнгө олгоно. Шилжүүлэг
                хийхийн тулд нэвтэрнэ үү.
              </p>
              <Button asChild className="w-full">
                <Link href="/login">
                  Нэвтрэх
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          ) : (
            <>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
                {isRegister ? "ЭХНИЙ АЛХАМ" : "ТАВТАЙ МОРИЛ"}
              </p>
              <h1 className="page-title">
                {isRegister ? "Бүртгэл үүсгэх" : "Эргэн уулзахад таатай байна"}
              </h1>
              <p className="page-description mb-8">
                {isRegister
                  ? "Өөрийн туршилтын дансаа нээгээд эхлээрэй."
                  : "Дансаа удирдахын тулд нэвтэрнэ үү."}
              </p>
              <form onSubmit={submit} className="space-y-5" noValidate>
                {error && <ErrorNotice message={error} />}
                {isRegister && (
                  <div>
                    <label htmlFor="fullName" className="field-label">
                      Овог, нэр
                    </label>
                    <Input
                      id="fullName"
                      name="fullName"
                      autoComplete="name"
                      minLength={2}
                      maxLength={120}
                      required
                      placeholder="Овог, нэрээ оруулна уу"
                    />
                  </div>
                )}
                <div>
                  <label htmlFor="username" className="field-label">
                    Хэрэглэгчийн нэр
                  </label>
                  <Input
                    id="username"
                    name="username"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    maxLength={50}
                    required
                    placeholder="Нэвтрэх нэрээ оруулна уу"
                    aria-describedby={isRegister ? "username-hint" : undefined}
                  />
                  {isRegister && (
                    <p
                      id="username-hint"
                      className="mt-2 text-xs text-muted-foreground"
                    >
                      3–50 латин үсэг, тоо эсвэл доогуур зураас.
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="password" className="field-label">
                    Нууц үг
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={visible ? "text" : "password"}
                      autoComplete={
                        isRegister ? "new-password" : "current-password"
                      }
                      required
                      maxLength={72}
                      className="pr-12"
                      placeholder={
                        isRegister ? "8–72 тэмдэгт" : "Нууц үгээ оруулна уу"
                      }
                    />
                    <button
                      type="button"
                      aria-label={visible ? "Нууц үг нуух" : "Нууц үг харах"}
                      aria-pressed={visible}
                      onClick={() => setVisible(!visible)}
                      className="absolute right-1 top-1 rounded-lg p-3 text-muted-foreground"
                    >
                      {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                {isRegister && (
                  <div>
                    <label htmlFor="confirmPassword" className="field-label">
                      Нууц үг давтах
                    </label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={visible ? "text" : "password"}
                      autoComplete="new-password"
                      maxLength={72}
                      required
                      placeholder="Нууц үгээ дахин оруулна уу"
                    />
                  </div>
                )}
                <Button className="w-full" disabled={busy} type="submit">
                  {busy
                    ? "Түр хүлээнэ үү…"
                    : isRegister
                      ? "Бүртгүүлэх"
                      : "Нэвтрэх"}
                  <ArrowRight />
                </Button>
              </form>
              <p className="mt-7 text-center text-sm text-muted-foreground">
                {isRegister ? "Бүртгэлтэй юу?" : "Шинэ хэрэглэгч үү?"}{" "}
                <Link
                  className="ml-1 font-semibold text-primary hover:underline"
                  href={isRegister ? "/login" : "/register"}
                >
                  {isRegister ? "Нэвтрэх" : "Бүртгүүлэх"}
                </Link>
              </p>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
