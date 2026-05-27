import type { ReactNode } from "react";

// 관리자 인증 화면 공통 레이아웃 — 회색 배경에 카드.
// 평소: 중앙 정렬 (기존 동작 유지).
// 모바일·태블릿(lg 미만, < 1024px) 에서만 텍스트 인풋 포커스 시 상단으로 이동:
//   → 소프트 키보드가 화면을 가려 입력칸이 안 보이는 문제 대응
//   → PC(lg+) 에선 키보드가 화면을 안 가리니 시프트 없음
//   → has-[input:focus] 로 좁혀 (링크·버튼·체크박스 제외) 하단 링크 클릭 시
//     레이아웃이 흔들려 내비게이션 실패하던 문제도 해결
// 컨테이너 높이는 dvh(동적 뷰포트) — 모바일 키보드 영역 반영
// 상단에 HiFIS 로고 + 제목.
export function AuthLayout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-gray-50 px-6 py-12 max-lg:has-[input:not([type=checkbox]):focus]:items-start">
      <div className="w-full max-w-sm">
        <div className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/icon-192.png"
            alt=""
            aria-hidden="true"
            className="mx-auto size-14"
          />
          <h1 className="mt-4 text-2xl font-bold text-gray-900">{title}</h1>
        </div>
        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}
