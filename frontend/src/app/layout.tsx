import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TopNav } from "@/components/layout/TopNav";
import { Providers } from "./Providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FLASH - Agentic Wallet Platform",
  description: "Autonomous AI agents controlling wallets securely on Stellar. Intent-based execution, zero private key exposure.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-dark-900 text-slate-100`}>
        <Providers>
          <TopNav />
          <main className="flex-1">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
