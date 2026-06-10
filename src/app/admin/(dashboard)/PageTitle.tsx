"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { NAV_ICONS } from "./navIcons";
import { usePageTitle } from "./PageTitleProvider";

// 페이지 제목 — 현재 경로를 navIcons 에서 찾아 같은 아이콘을 자동 표시한다.
// 사이드바 아이콘과 동일해서 "여기가 어디인지" 시각적으로 일관되게 알려준다.
//
// PC(lg+) 에선 헤더 좌측에 같은 제목을 띄우므로 자기 자리에선 hidden.
// 컨텍스트(usePageTitle) 를 통해 헤더가 제목을 받아간다.
export function PageTitle({ title }: { title: string }) {
  const pathname = usePathname();
  const { setTitle } = usePageTitle();
  useEffect(() => {
    setTitle(title);
    return () => setTitle("");
  }, [title, setTitle]);

  // 정확 일치 우선, 없으면 prefix 매칭 (서브 경로 대비, /admin 은 정확 일치만)
  let Icon = NAV_ICONS[pathname];
  if (!Icon) {
    for (const [key, candidate] of Object.entries(NAV_ICONS)) {
      if (key !== "/admin" && pathname.startsWith(key)) {
        Icon = candidate;
        break;
      }
    }
  }
  return (
    <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 lg:hidden">
      {Icon && <Icon className="size-6 text-primary" />}
      {title}
    </h1>
  );
}
