import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "MNT Flow · Банкны туршилтын систем",
    template: "%s · MNT Flow",
  },
  description:
    "Туршилтын данс, шилжүүлэг, гүйлгээний түүх — суралцахад зориулсан банк.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="mn" suppressHydrationWarning>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
