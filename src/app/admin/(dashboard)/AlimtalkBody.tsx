"use client";

import { useState } from "react";
import AdminMessagesPage from "./messages/page";
import AdminAlimtalkTemplatesPage from "./alimtalk-templates/page";

// 모바일 헤더 종이비행기 아이콘 ("메시지") 으로 진입하는 오버레이 본문.
// 상단 탭으로 이력 / 관리 전환 — 양쪽 페이지 컴포넌트를 그대로 마운트.
// 각각의 PageTitle / 필터 / 다이얼로그 모두 페이지 컴포넌트 안에서 자체 관리.
// (코드상 alimtalk 식별자는 백엔드 도메인 용어 그대로 유지)
type Tab = "history" | "templates";

const TABS: { key: Tab; label: string }[] = [
  { key: "history", label: "이력" },
  { key: "templates", label: "관리" },
];

export function AlimtalkBody() {
  const [tab, setTab] = useState<Tab>("history");
  return (
    <>
      {/* 상단 탭 — MobileSubPage 의 overflow-y-auto 컨테이너 (px-4 py-4) 안에서
          헤더(h-12) 바로 아래에 박힘. -mx-4 -mt-4 로 컨테이너 padding 좌·상단을
          상쇄해 가장자리까지. sticky 오프셋(-top-4)도 컨테이너 padding 만큼 끌어
          올려야 sticky 위치 = padding-box-y=-16 = container-y=0 → 16px 갭 제거. */}
      <nav
        aria-label="메시지 섹션"
        className="sticky -top-4 z-10 -mx-4 -mt-4 mb-2 flex h-12 gap-4 overflow-x-auto border-b border-gray-200 bg-white px-4 lg:static lg:mx-0 lg:mt-0"
      >
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`relative flex shrink-0 items-center text-[15px] font-semibold tracking-tight transition-colors ${
                active ? "text-gray-900" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {t.label}
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute inset-x-0 -bottom-px h-[2.5px] rounded-full bg-gray-900 transition-opacity ${
                  active ? "opacity-100" : "opacity-0"
                }`}
              />
            </button>
          );
        })}
      </nav>

      {/* 탭 전환 시 깜빡임 완화 — tab key 로 wrapping div remount → animate-fade-in
          재실행 (opacity 0 → 1). layout 의 페이지 전환과 동일 패턴. */}
      <div key={tab} className="animate-fade-in">
        {tab === "history" ? (
          <AdminMessagesPage />
        ) : (
          <AdminAlimtalkTemplatesPage />
        )}
      </div>
    </>
  );
}
