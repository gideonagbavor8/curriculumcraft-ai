import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CurriculumCraft AI — Ghana NaCCA Lesson Builder",
  description:
    "AI-powered instructional design platform for Ghanaian JHS teachers. Transform NaCCA curriculum standards into complete lesson materials instantly.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Navbar />
        <main>{children}</main>
        <Footer />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--color-background-primary)",
              border: "1px solid var(--color-border-tertiary)",
              color: "var(--color-text-primary)",
            },
          }}
        />
      </body>
    </html>
  );
}