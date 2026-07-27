"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  ClipboardDocumentCheckIcon,
  FolderIcon,
  DocumentTextIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import {
  HomeIcon as HomeSolidIcon,
  ClipboardDocumentCheckIcon as ClipboardSolidIcon,
  FolderIcon as FolderSolidIcon,
  DocumentTextIcon as DocumentSolidIcon,
  Squares2X2Icon as Squares2X2SolidIcon,
} from "@heroicons/react/24/solid";
import type { ComponentType } from "react";

// 모바일 하단 5탭 — 각 탭이 여러 페이지를 묶는 그룹.
// v2 재편으로 회원/상품/통계 계열 제거. 새 5탭 : 홈 · 업무 · 프로젝트 · 회의록 · 전체.
// "전체" 는 사이드바 18개를 앱 그리드 형태로 노출하는 화면 (미개발).
// 활성 탭 판정: 현재 pathname 이 그 탭의 routes 중 하나로 시작하면 활성.
// PC(lg+) 에선 lg:hidden 으로 숨고 사이드바가 보임.

export interface SubTabDef {
  href: string;
  label: string;
  // SUPER_ADMIN 만 보이는 항목. FC 는 자동 숨김.
  superOnly?: boolean;
}

export interface TabDef {
  href: string; // 탭 누르면 이동할 기본 경로
  label: string;
  icon: ComponentType<{ className?: string }>;
  iconActive: ComponentType<{ className?: string }>;
  routes: string[]; // 이 탭에 포함되는 경로들 (활성 판정용)
  // 그룹 안 서브 페이지 — 1 개 이하면 SubTabBar 자체 비표시.
  subTabs: SubTabDef[];
}

export const TABS: TabDef[] = [
  {
    href: "/admin",
    label: "홈",
    icon: HomeIcon,
    iconActive: HomeSolidIcon,
    routes: ["/admin"],
    subTabs: [],
  },
  {
    href: "/admin/tasks",
    label: "업무",
    icon: ClipboardDocumentCheckIcon,
    iconActive: ClipboardSolidIcon,
    routes: ["/admin/tasks"],
    subTabs: [],
  },
  {
    href: "/admin/projects",
    label: "프로젝트",
    icon: FolderIcon,
    iconActive: FolderSolidIcon,
    routes: ["/admin/projects"],
    subTabs: [],
  },
  {
    href: "/admin/meetings",
    label: "회의록",
    icon: DocumentTextIcon,
    iconActive: DocumentSolidIcon,
    routes: ["/admin/meetings"],
    subTabs: [],
  },
  {
    href: "/admin/all",
    label: "전체",
    icon: Squares2X2Icon,
    iconActive: Squares2X2SolidIcon,
    routes: ["/admin/all"],
    subTabs: [],
  },
];

// 현재 pathname 으로 어느 탭에 속해 있는지 찾음 (그룹 활성 판정과 동일 규칙).
export function findActiveTab(pathname: string): TabDef | undefined {
  return TABS.find((tab) => {
    if (tab.href === "/admin") return pathname === "/admin";
    return tab.routes.some(
      (r) => pathname === r || pathname.startsWith(r + "/"),
    );
  });
}

function isActive(pathname: string, tab: TabDef): boolean {
  // 홈은 정확 일치만 — 다른 경로가 "/admin" 으로 시작해서 홈이 같이 켜지는 걸 막음.
  if (tab.href === "/admin") return pathname === "/admin";
  return tab.routes.some(
    (r) => pathname === r || pathname.startsWith(r + "/"),
  );
}

export function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="주요 탭"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {TABS.map((tab) => {
        const active = isActive(pathname, tab);
        const Icon = active ? tab.iconActive : tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-col items-center gap-0.5 py-2 text-xs font-medium ${
              active ? "text-fg" : "text-muted"
            }`}
          >
            <Icon className="size-6" />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
