import { apiFetch } from "./client";

// 본문에 박을 수 있는 변수 한 개 (백엔드 AlimtalkVariable).
export interface AlimtalkVariable {
  key: string; // placeholder 키 (예: "name")
  label: string; // 한국어 라벨 (예: "회원 이름")
}

// 알림톡 템플릿 — trigger_type 단일 PK 글로벌.
// SUPER_ADMIN 전용 (백엔드 require_super_admin).
// body=null 이면 코드 디폴트(default_body) 사용.
export interface AlimtalkTemplate {
  id: string;
  trigger_type: string;
  is_enabled: boolean;
  body: string | null; // 어드민 수정 본문 — null 이면 default_body
  default_body: string; // 코드 디폴트 (참고/복원용)
  variables: AlimtalkVariable[]; // 이 트리거에서 본문에 쓸 수 있는 변수
  updated_at: string;
}

// GET /admin/alimtalk-templates — 모든 트리거 row.
export function getAlimtalkTemplates(): Promise<AlimtalkTemplate[]> {
  return apiFetch<AlimtalkTemplate[]>("/admin/alimtalk-templates", {
    auth: true,
  });
}

// PATCH /admin/alimtalk-templates/{id} — is_enabled / body 부분 수정.
// body="" 또는 null 보내면 백엔드가 디폴트 복원.
export function updateAlimtalkTemplate(
  id: string,
  body: { is_enabled?: boolean; body?: string | null },
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
