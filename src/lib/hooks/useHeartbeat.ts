"use client";

import { useEffect } from "react";
import { postHeartbeat } from "@/lib/api/auth";
import { getAccessToken } from "@/lib/api/tokenStore";

// 60초마다 /admin/me/heartbeat ping — 백엔드가 5분 threshold 로 is_online 판단.
// 마운트 시 즉시 한 번 호출해 SUPER_ADMIN 목록에 바로 반영되게 한다.
const HEARTBEAT_INTERVAL_MS = 60_000;

// 어드민 대시보드 셸(layout)에서 한 번 호출. 토큰이 없으면 ping 자체를 skip.
// 실패는 조용히 삼킨다 — 토큰 만료면 apiFetch 가 refresh 시도하고, 그것도 실패면 다음 tick.
export function useHeartbeat(): void {
  useEffect(() => {
    function ping() {
      if (!getAccessToken()) return;
      postHeartbeat().catch(() => {});
    }
    ping();
    const id = setInterval(ping, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);
}
