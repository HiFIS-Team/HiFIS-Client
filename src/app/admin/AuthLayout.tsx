import type { ReactNode } from "react";

// 관리자 인증 화면 공통 레이아웃 — 회색 배경에 카드.
// 중앙 정렬 + min-h-dvh(동적 뷰포트) 만 사용.
//   → 모바일 키보드 열림: dvh 가 키보드 영역만큼 줄어들어 카드가 자연히 위로 올라감
//   → iOS Safari 의 자체 auto-scroll 이 포커스된 input 을 시야로 가져옴
//   → CSS 로 추가 시프트를 주면 iOS auto-scroll 과 겹쳐 과도하게 올라가고,
//     transform 은 iOS 에서 caret 따라가는 데 lag 있음
// 상단에 HiFIS 로고 + 제목.
export function AuthLayout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-gray-50 px-6 py-12">
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
