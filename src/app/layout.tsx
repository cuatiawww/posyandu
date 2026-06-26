import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";

const roboto = Roboto({
  weight: ['300', '400', '500', '600', '700', '800'],
  subsets: ["latin"],
  variable: "--font-roboto",
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Dashboard Posyandu - Kemenkes RI",
  description: "Dashboard Tatakelola Kegiatan dan Kader Posyandu Kementerian Kesehatan Republik Indonesia",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${roboto.variable} font-roboto antialiased`}>
        <AppShell>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
