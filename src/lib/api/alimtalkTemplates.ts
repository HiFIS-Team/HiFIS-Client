import { apiFetch } from "./client";

// 알림톡 템플릿 — (지점 × trigger_type) 별로 발송 ON/OFF.
// 본문 편집·조건 필터는 추후 단계에서 같은 모델 위에 확장.
export interface AlimtalkTemplate {
  id: string;
  branch_id: string;
  trigger_type: string;
  is_enabled: boolean;
  updated_at: string;
}

// GET /admin/alimtalk-templates?branch_id=... — 그 지점의 모든 트리거 row.
// SUPER_ADMIN 은 branch_id 필수. FC 는 토큰 기준 본인 지점만.
export function getAlimtalkTemplates(
  branchId?: string,
): Promise<AlimtalkTemplate[]> {
  const path = branchId
    ? `/admin/alimtalk-templates?branch_id=${encodeURIComponent(branchId)}`
    : "/admin/alimtalk-templates";
  return apiFetch<AlimtalkTemplate[]>(path, { auth: true });
}

// PATCH /admin/alimtalk-templates/{id} — 토글.
export function updateAlimtalkTemplate(
  id: string,
  body: { is_enabled: boolean },
): Promise<AlimtalkTemplate> {
  return apiFetch<AlimtalkTemplate>(
    `/admin/alimtalk-templates/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      auth: true,
      body,
    },
  );
}
