import { apiFetch } from "./client";

// 알림톡 템플릿 — trigger_type 별로 발송 ON/OFF.
// 본문 편집·조건 필터는 추후 단계에서 같은 모델 위에 확장.
export interface AlimtalkTemplate {
  id: string;
  trigger_type: string;
  is_enabled: boolean;
  updated_at: string;
}

// GET /admin/alimtalk-templates — trigger_type 별 row 목록.
export function getAlimtalkTemplates(): Promise<AlimtalkTemplate[]> {
  return apiFetch<AlimtalkTemplate[]>("/admin/alimtalk-templates", {
    auth: true,
  });
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
