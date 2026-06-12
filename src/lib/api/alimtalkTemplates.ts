import { apiFetch } from "./client";

// 본문에 박을 수 있는 변수 한 개 (백엔드 AlimtalkVariable).
export interface AlimtalkVariable {
  key: string; // placeholder 키 (예: "name")
  label: string; // 한국어 라벨 (예: "회원 이름")
}

// 알림톡 템플릿 — (branch_id, trigger_type) 복합 키. 지점마다 독립 row.
// 모든 어드민(SUPER_ADMIN / FC) 사용 가능. FC 는 본인 지점만, SUPER_ADMIN 은 글로벌 셀렉터 지점.
// body=null 이면 코드 디폴트(default_body) 사용.
//
// header_template / footer_template :
//   본문 보기/수정 UI 에서 "본문 앞뒤로 자동 붙는 부분" 형태 안내용.
//   {name} {branch_name} 같은 placeholder 그대로 (미치환).
//   안부 트리거는 footer_template=null (푸터 없음).
export interface AlimtalkTemplate {
  id: string;
  trigger_type: string;
  is_enabled: boolean;
  body: string | null; // 어드민 수정 본문 — null 이면 default_body
  default_body: string; // 코드 디폴트 (참고/복원용)
  header_template: string; // 본문 앞 헤더 raw (placeholder 형태)
  footer_template: string | null; // 본문 뒤 푸터 raw (안부 트리거면 null)
  variables: AlimtalkVariable[]; // 이 트리거에서 본문에 쓸 수 있는 변수
  updated_at: string;
}

// GET /admin/alimtalk-templates?branch_id=... — 해당 지점의 트리거 row 들.
// SUPER_ADMIN 은 branch_id 명시 필수. FC 는 본인 지점 자동(미지정 시 백엔드가 채움).
export function getAlimtalkTemplates(
  branchId?: string,
): Promise<AlimtalkTemplate[]> {
  const qs = branchId ? `?branch_id=${encodeURIComponent(branchId)}` : "";
  return apiFetch<AlimtalkTemplate[]>(`/admin/alimtalk-templates${qs}`, {
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

// POST /admin/alimtalk-templates/{id}/preview — 헤더+본문+푸터 전체 미리보기.
// body 미입력 시 DB 본문(없으면 코드 디폴트) 사용. branch_id 미입력 시 첫 지점.
export function previewAlimtalkTemplate(
  id: string,
  payload: { body?: string | null; branch_id?: string | null },
): Promise<{ preview: string }> {
  return apiFetch<{ preview: string }>(
    `/admin/alimtalk-templates/${encodeURIComponent(id)}/preview`,
    {
      method: "POST",
      auth: true,
      body: payload,
    },
  );
}
