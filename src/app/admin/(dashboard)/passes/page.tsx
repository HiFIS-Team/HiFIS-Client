"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// 상품 4 종 (회원권 / 수강권 / 락커 / 운동복) 이 각 sub-route 로 분리되면서
// /admin/passes 는 기본 진입점으로만 — 회원권 페이지로 클라이언트 사이드 리다이렉트.
// 사이드바 "상품 관리" 링크 / 외부 북마크 모두 이 경로를 거쳐도 정상 동작.
export default function AdminPassesPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/passes/membership");
  }, [router]);
  return null;
}
