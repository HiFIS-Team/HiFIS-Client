import { apiFetch } from "./client";
import type { SystemConfig, SystemConfigUpdate } from "./types";

// GET /admin/system-config — 전역 알림톡 마스터 토글 (SUPER_ADMIN 전용).
// 지점별 messaging_enabled 와 AND 동작 — 둘 다 true 여야 발송.
export function getSystemConfig(): Promise<SystemConfig> {
  return apiFetch<SystemConfig>("/admin/system-config", { auth: true });
}

// PATCH /admin/system-config — 마스터 토글 변경 (SUPER_ADMIN 전용).
// 비상 정지 성격이라 즉시 반영.
export function updateSystemConfig(
  payload: SystemConfigUpdate,
): Promise<SystemConfig> {
  return apiFetch<SystemConfig>("/admin/system-config", {
    method: "PATCH",
    body: payload,
    auth: true,
  });
}
