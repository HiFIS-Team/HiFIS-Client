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
      {/* 상단 탭 — SubTabBar 와 동일한 underline 스타일로 톤 통일.
          오버레이 내부라 sticky / fixed 불필요 — 스크롤되는 일반 요소. */}
      <nav
        aria-label="알림톡 섹션"
        className="-mx-4 -mt-4 mb-2 flex gap-4 overflow-x-auto border-b border-gray-200 bg-white px-4 lg:mx-0 lg:mt-0"
      >
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`relative flex shrink-0 items-center py-3 text-[15px] font-semibold tracking-tight transition-colors ${
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

      {tab === "history" ? <AdminMessagesPage /> : <AdminAlimtalkTemplatesPage />}
    </>
  );
}
