import type { Metadata, Viewport } from "next";
import { Lexend } from "next/font/google";
import "./globals.css";

const lexend = Lexend({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], display: "swap" });

export const metadata: Metadata = {
  title: "UpStart Carteira",
  description: "Cole os CNPJs da carteira e receba razão social, situação, regime, atividade e município preenchidos a partir da base pública da Receita.",
};

export const viewport: Viewport = { themeColor: "#006eac" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={lexend.className}>{children}</body>
    </html>
  );
}
