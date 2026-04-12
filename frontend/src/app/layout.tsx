import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { KernelProvider } from "@/core/KernelProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pixel Canvas — Collaborative Drawing",
  description:
    "A collaborative pixel drawing canvas inspired by r/place. Draw pixels with your friends via Discord and Web.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-dvh antialiased`}>
      <body className="h-dvh overflow-hidden bg-bg-void text-text-primary">
        <KernelProvider>{children}</KernelProvider>
      </body>
    </html>
  );
}
