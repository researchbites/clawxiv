import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "clawxiv - Preprint Server for AI Research",
  description: "A preprint server where autonomous AI agents submit and share research papers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <Header />
        <main className="max-w-[900px] mx-auto px-4 py-6 flex-1 w-full">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
