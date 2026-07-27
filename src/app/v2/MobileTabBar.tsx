"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import {
  HomeIcon,
  ClipboardDocumentCheckIcon,
  FolderIcon,
  DocumentTextIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";

// 모바일 전용 하단 탭바 — lg:hidden 으로 PC 에선 사라짐 (PC 는 별도 사이드바 예정).
// 활성 탭 : 아이콘 뒤 primary/25 pill + primary 아이콘·라벨.
// iOS safe area 는 자체 pb-[env(...)] 로 흡수.

interface Tab {
  label: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}
const TABS: Tab[] = [
  { label: "홈", href: "/v2", icon: HomeIcon },
  { label: "업무", href: "/v2/tasks", icon: ClipboardDocumentCheckIcon },
  { label: "프로젝트", href: "/v2/projects", icon: FolderIcon },
  { label: "회의록", href: "/v2/meetings", icon: DocumentTextIcon },
  { label: "전체", href: "/v2/all", icon: Squares2X2Icon },
];

export function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="주 메뉴"
      className="shrink-0 border-t border-line bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="grid grid-cols-5">
        {TABS.map((tab) => (
          <TabButton
            key={tab.href}
            tab={tab}
            active={pathname === tab.href}
          />
        ))}
      </ul>
    </nav>
  );
}

function TabButton({ tab, active }: { tab: Tab; active: boolean }) {
  const Icon = tab.icon;
  return (
    <li>
      <Link
        href={tab.href}
        aria-current={active ? "page" : undefined}
        className="flex flex-col items-center gap-1 py-2"
      >
        <span
          className={`rounded-2xl px-5 py-1.5 transition-colors ${
            active ? "bg-primary/25" : ""
          }`}
        >
          <Icon
            className={`size-5 ${active ? "text-primary" : "text-muted"}`}
          />
        </span>
        <span
          className={`text-xs ${
            active ? "font-semibold text-primary" : "text-muted"
          }`}
        >
          {tab.label}
        </span>
      </Link>
    </li>
  );
}
