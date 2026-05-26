"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { getMe } from "@/lib/api/auth";
import { getAccessToken } from "@/lib/api/tokenStore";
import { Sidebar } from "./Sidebar";

// 관리자 대시보드 셸 — 로그인 확인 후 사이드바 + 본문.
export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();

  // 로그인한 관리자 정보 (사이드바 권한 분기 + 본문 페이지에서 캐시 재사용)
  const meQuery = useQuery({
    queryKey: ["admin", "me"],
    queryFn: getMe,
    retry: false,
  });

  // 토큰이 아예 없으면 즉시 로그인 화면으로
  useEffect(() => {
    if (!getAccessToken()) router.replace("/admin/login");
  }, [router]);

  // getMe 실패(토큰 만료·무효) → 로그인 화면으로
  useEffect(() => {
    if (meQuery.isError) router.replace("/admin/login");
  }, [meQuery.isError, router]);

  if (meQuery.isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-sm text-gray-500">
        <ArrowPathIcon className="size-6 animate-spin text-gray-400" />
        불러오는 중…
      </div>
    );
  }
  if (!meQuery.data) return null;

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar admin={meQuery.data} />
      <main className="flex-1 px-8 py-10">{children}</main>
    </div>
  );
}
