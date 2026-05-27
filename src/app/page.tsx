"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// 루트 `/` — PWA 시작점. 관리자 로그인으로 보낸다.
// 회원/PT 신청은 매장 QR (/register?branch_id=...), 예약은 네이버 플레이스 링크
// (/reserve?branch_id=...) 로 진입하므로 루트에 노출할 진입점이 따로 없다.
export default function HomePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/login");
  }, [router]);
  return null;
}
