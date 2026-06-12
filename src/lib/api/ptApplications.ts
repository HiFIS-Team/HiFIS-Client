import { apiFetch } from "./client";
import type {
  Page,
  PTApplication,
  PTApplicationCreate,
  PTApplicationReRegister,
  PTApplicationUpdate,
} from "./types";

// POST /pt-applications — PT 신청 (공개).
// signature / faceImage 중 하나라도 있으면 multipart, 없으면 JSON.
// 다짐 지점만 서명, 첨단점만 face_image 추가 (지점별 분기는 폼에서).
export function createPtApplication(args: {
  payload: PTApplicationCreate;
  signature?: Blob | null;
  faceImage?: Blob | null;
}): Promise<PTApplication> {
  if (args.signature || args.faceImage) {
    const fd = new FormData();
    fd.append("payload", JSON.stringify(args.payload));
    if (args.signature)
      fd.append("signature", args.signature, "signature.png");
    if (args.faceImage) fd.append("face_image", args.faceImage, "face.jpg");
    return apiFetch<PTApplication>("/pt-applications", {
      method: "POST",
      body: fd,
    });
  }
  return apiFetch<PTApplication>("/pt-applications", {
    method: "POST",
    body: args.payload,
  });
}

// POST /pt-applications/re-register — PT 재등록 (공개), 신규와 동일한 분기.
export function reRegisterPtApplication(args: {
  payload: PTApplicationReRegister;
  signature?: Blob | null;
  faceImage?: Blob | null;
}): Promise<PTApplication> {
  if (args.signature || args.faceImage) {
    const fd = new FormData();
    fd.append("payload", JSON.stringify(args.payload));
    if (args.signature)
      fd.append("signature", args.signature, "signature.png");
    if (args.faceImage) fd.append("face_image", args.faceImage, "face.jpg");
    return apiFetch<PTApplication>("/pt-applications/re-register", {
      method: "POST",
      body: fd,
    });
  }
  return apiFetch<PTApplication>("/pt-applications/re-register", {
    method: "POST",
    body: args.payload,
  });
}

// GET /admin/pt-applications — PT 신청 목록 (관리자, 페이지네이션)
// 응답은 Page<PTApplication> envelope. 카운트·차트 등 집계는 /admin/dashboard/summary 사용.
export function getAdminPtApplications(opts: {
  branchId?: string;
  name?: string;
  phone?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<Page<PTApplication>> {
  const params = new URLSearchParams();
  if (opts.branchId) params.set("branch_id", opts.branchId);
  if (opts.name) params.set("name", opts.name);
  if (opts.phone) params.set("phone", opts.phone);
  if (opts.page) params.set("page", String(opts.page));
  if (opts.pageSize) params.set("page_size", String(opts.pageSize));
  const qs = params.toString();
  return apiFetch<Page<PTApplication>>(
    `/admin/pt-applications${qs ? `?${qs}` : ""}`,
    { auth: true },
  );
}

// GET /admin/pt-applications/{id} — PT 신청 1건 조회 (알림 클릭 자동 상세 오픈)
export function getAdminPtApplication(id: string): Promise<PTApplication> {
  return apiFetch<PTApplication>(`/admin/pt-applications/${id}`, {
    auth: true,
  });
}

// DELETE /admin/pt-applications/{id} — PT 신청 삭제 (관리자)
export function deletePtApplication(id: string): Promise<void> {
  return apiFetch<void>(`/admin/pt-applications/${id}`, {
    method: "DELETE",
    auth: true,
  });
}

// PATCH /admin/pt-applications/{id} — PT 신청 정보 수정 (관리자)
export function updatePtApplication(
  id: string,
  payload: PTApplicationUpdate,
): Promise<PTApplication> {
  return apiFetch<PTApplication>(`/admin/pt-applications/${id}`, {
    method: "PATCH",
    body: payload,
    auth: true,
  });
}
