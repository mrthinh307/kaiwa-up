import type { Metadata } from "next";

import { Noto_Sans_JP, Space_Grotesk } from "next/font/google";

import { ThemeProvider } from "@/components/common/theme/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/providers/auth-provider";

import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin", "latin-ext", "vietnamese"],
  display: "swap",
});

const notoSansJp = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  weight: "variable",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "KaiwaUp — Build Japanese Conversation Reflexes",
  description:
    "Practice Japanese listening, pronunciation, and natural responses with Dual Shadowing, Dictation, 3-Second Reflex, and AI-guided conversations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${notoSansJp.variable} h-full scroll-smooth antialiased`}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning className="flex min-h-full flex-col">
        <ThemeProvider>
          <AuthProvider>
            {children}
            <Toaster position="top-right" />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
