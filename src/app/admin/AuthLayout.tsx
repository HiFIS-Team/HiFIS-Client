import type { ComponentType, ReactNode } from "react";
import { LockClosedIcon } from "@heroicons/react/24/outline";

// 관리자 인증 화면 공통 레이아웃 — 회색 배경에 카드.
// 평소: 중앙 정렬 (기존 동작 유지).
// 인풋 포커스 시: 상단으로 이동 (focus-within:items-start)
//   → 모바일 키보드가 올라와도 입력칸이 가리지 않음
// 컨테이너 높이는 dvh(동적 뷰포트) — 모바일 키보드 영역 반영
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
    <main className="flex min-h-dvh items-center justify-center bg-gray-50 px-6 py-12 focus-within:items-start">
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
