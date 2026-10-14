import { AppShell } from "@/components/app-shell";
export default function BankLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
