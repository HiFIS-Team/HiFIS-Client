"use client";

import { useQuery } from "@tanstack/react-query";
import { getMe } from "@/lib/api/auth";

// 관리자 대시보드 홈 — 진입 화면.
export default function AdminDashboardPage() {
  // 레이아웃에서 이미 불러온 ["admin","me"] 캐시를 그대로 사용
  const meQuery = useQuery({
    queryKey: ["admin", "me"],
    queryFn: getMe,
    retry: false,
  });
  const name = meQuery.data?.name ?? "";

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
      <p className="mt-2 text-gray-600">
        {name ? `${name}님, 환영합니다. ` : ""}
        왼쪽 메뉴에서 작업을 선택하세요.
      </p>
    </div>
  );
}
