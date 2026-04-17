import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import { AppSidebar } from "@/components/app-sidebar";
import { CommandPalette } from "@/components/command-palette";
import { AuthProvider } from "@/lib/auth-context";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "Drug Store – Patient History",
  description: "Patient lookup and history",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable}`}>
      <body className="min-h-screen bg-surface text-on_surface font-inter antialiased">
        <AuthProvider>
          <CommandPalette />
          <div className="flex min-h-screen">
            <AppSidebar />
            <main className="flex-1 overflow-auto p-12 lg:p-16">{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
