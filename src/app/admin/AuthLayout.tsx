import type { ComponentType, ReactNode } from "react";
import { LockClosedIcon } from "@heroicons/react/24/outline";

// 관리자 인증 화면 공통 레이아웃 — 회색 배경에 중앙 카드.
// 상단에 작은 violet 아이콘 칩으로 화면별 맥락 단서 (기본은 자물쇠).
export function AuthLayout({
  title,
  icon: Icon = LockClosedIcon,
  children,
}: {
  title: string;
  icon?: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-violet-50 text-primary">
            <Icon className="size-6" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">{title}</h1>
        </div>
        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}
