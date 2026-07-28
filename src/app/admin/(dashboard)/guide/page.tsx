"use client";

import { useRouter } from "next/navigation";
import { AppGuide } from "./AppGuide";

// /admin/guide — 앱 가이드 라우트. 사이드바 "앱 가이드" 로 언제든 다시 볼 수 있음.
// 첫 로그인 자동 노출은 layout 의 flag 체크가 담당 (여기는 재방문 경로).
export default function GuidePage() {
  const router = useRouter();
  return <AppGuide onClose={() => router.back()} />;
}
