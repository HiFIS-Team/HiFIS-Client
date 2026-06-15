"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { findActiveTab } from "./MobileTabBar";
import { useBranch } from "@/providers/BranchProvider";

// 모바일 헤더 아래 가로 한 줄 서브탭. 활성 탭의 서브 페이지들을 노출.
// 서브탭이 1개 이하면(예: 홈 그룹) 자체적으로 비표시.
// 옵션이 화면 폭을 넘으면 가로 스크롤로 자연스럽게 폴백.
// PC 는 lg:hidden — 기존 사이드바가 위치 안내를 담당.
export function SubTabBar() {
  const pathname = usePathname();
  const { isSuper } = useBranch();
  const tab = findActiveTab(pathname);
  if (!tab || tab.subTabs.length <= 1) return null;

  // FC 는 superOnly 항목 자동 숨김 (예: 지점 관리).
  const items = tab.subTabs.filter((s) => !s.superOnly || isSuper);
  if (items.length <= 1) return null;

  return (
    <nav
      aria-label="하위 페이지"
      className="sticky top-[44px] z-10 flex gap-4 overflow-x-auto border-b border-gray-200 bg-white px-4 lg:hidden"
    >
      {items.map((sub) => {
        const active =
          pathname === sub.href || pathname.startsWith(sub.href + "/");
        return (
          <Link
            key={sub.href}
            href={sub.href}
            className={`relative shrink-0 py-3 text-[15px] font-semibold tracking-tight transition-colors ${
              active ? "text-gray-900" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {sub.label}
            {/* 활성 밑줄 — 글자 폭에 정확히 맞고 살짝 두꺼움(2.5px) 으로 또렷 */}
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute inset-x-0 -bottom-px h-[2.5px] rounded-full bg-gray-900 transition-opacity ${
                active ? "opacity-100" : "opacity-0"
              }`}
            />
          </Link>
        );
      })}
    </nav>
  );
}
