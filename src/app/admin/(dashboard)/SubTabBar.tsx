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
    <>
      {/* 헤더(h-12) 바로 아래 fixed 로 viewport 에 고정. 스크롤·오버스크롤에
          영향 안 받게 헤더와 동일한 패턴. lg:hidden 이라 PC 영향 없음. */}
      <nav
        aria-label="하위 페이지"
        className="fixed inset-x-0 top-12 z-10 flex h-12 gap-4 overflow-x-auto border-b border-line bg-card px-4 lg:hidden"
      >
        {items.map((sub) => {
          const active =
            pathname === sub.href || pathname.startsWith(sub.href + "/");
          return (
            <Link
              key={sub.href}
              href={sub.href}
              className={`relative flex shrink-0 items-center text-[15px] font-semibold tracking-tight transition-colors ${
                active ? "text-fg" : "text-muted hover:text-fg"
              }`}
            >
              {sub.label}
              {/* 활성 밑줄 — 글자 폭에 정확히 맞고 살짝 두꺼움(2.5px) 으로 또렷 */}
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute inset-x-0 -bottom-px h-[2.5px] rounded-full bg-fg transition-opacity ${
                  active ? "opacity-100" : "opacity-0"
                }`}
              />
            </Link>
          );
        })}
      </nav>
      {/* fixed 라 flow 에서 빠지니 main 이 그 자리만큼 더 밀려 내려가도록 스페이서. */}
      <div aria-hidden className="h-12 lg:hidden" />
    </>
  );
}
