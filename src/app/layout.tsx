import type { Metadata, Viewport } from "next";
import "./globals.css";
import { QueryProvider } from "@/providers/QueryProvider";
import { ToastProvider } from "@/providers/ToastProvider";

export const metadata: Metadata = {
  title: "HiFIS",
  description: "피트니스스타 회원가입·PT 신청·예약",
  // iOS 홈 화면 추가 시 아이콘 아래 표시될 이름
  appleWebApp: {
    title: "HiFIS",
    capable: true,
    statusBarStyle: "default",
  },
  // PWA·iOS 홈 화면 아이콘
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: { url: "/icons/icon-180.png", sizes: "180x180", type: "image/png" },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
  // 안드로이드 크롬 : 키보드가 뜨면 layout viewport 를 키보드 위 영역으로 축소.
  // 이게 없으면 fixed inset-0 컨테이너(어드민 셸 · 사내톡 dialog 등) 가 화면 밖으로
  // 밀리며 위로 잘리는 현상이 생김 (input 창이 화면 밖으로 사라진 것처럼 보임).
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full antialiased">
        <QueryProvider>
          <ToastProvider>{children}</ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
