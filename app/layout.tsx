import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BetaFeedbackWidget from "@/components/layout/BetaFeedbackWidget";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { currentUser } from "@/lib/auth";
import AnnouncementBanner from "@/components/layout/AnnouncementBanner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "🪄 CurriculumCraft AI — Magical NaCCA Lesson Forge",
  
  description:
    "AI-powered instructional design platform for Ghanaian JHS teachers. Transform NaCCA curriculum standards into complete lesson materials instantly.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider user={user ? { ...user, createdAt: user.createdAt.toISOString() } : null}>
        <Navbar />
        <main>{children}</main>
        <Footer />
        <AnnouncementBanner />
        <BetaFeedbackWidget />
        {/* Errors and small confirmations. Finished generations get their own
            card (components/lesson/GeneratedNotice) instead of a toast. */}
        <Toaster
          position="top-center"
          toastOptions={{
            className:
              "!rounded-xl !border !border-gray-200 !bg-white !text-gray-900 !shadow-lg dark:!border-gray-700 dark:!bg-gray-900 dark:!text-gray-100",
          }}
        />
        <Analytics />
        </AuthProvider>
      </body>
    </html>
  );
}