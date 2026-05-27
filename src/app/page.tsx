"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getKioskBranchId } from "@/lib/branch";

// 루트 `/` — PWA 시작점.
// 키오스크 태블릿(localStorage 의 kiosk_branch_id 가 있는 디바이스) → /kiosk
// 그 외(관리자 폰 등) → /admin/login
export default function HomePage() {
  const router = useRouter();
  useEffect(() => {
    const isKioskDevice = getKioskBranchId() !== null;
    router.replace(isKioskDevice ? "/kiosk" : "/admin/login");
  }, [router]);
  return null;
}
