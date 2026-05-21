import type { Metadata, Viewport } from "next";
import "./globals.css";
import { QueryProvider } from "@/providers/QueryProvider";

export const metadata: Metadata = {
  title: "피트니스스타",
  description: "피트니스스타 회원가입·PT 신청·예약",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full antialiased">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
