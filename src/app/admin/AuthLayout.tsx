import type { ReactNode } from "react";

// 관리자 인증 화면 공통 레이아웃 — 회색 배경에 중앙 카드.
export function AuthLayout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6 py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-center text-2xl font-bold text-gray-900">{title}</h1>
        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}
