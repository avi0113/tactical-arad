import type { Metadata } from "next";
import { Frank_Ruhl_Libre, Heebo } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import { OpsProvider } from "@/components/OpsProvider";
import "./globals.css";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-heebo",
  display: "swap",
});

const frank = Frank_Ruhl_Libre({
  subsets: ["hebrew", "latin"],
  weight: ["700"],
  variable: "--font-frank",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ערד · ניהול משימות מבצעיות",
  description: "מאגר משימות מוכנות מראש, ורשימת פעולות נדרשות לכל אירוע",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} ${frank.variable}`}>
      <body className="font-sans antialiased">
        <OpsProvider>
          <AppShell>{children}</AppShell>
        </OpsProvider>
      </body>
    </html>
  );
}
