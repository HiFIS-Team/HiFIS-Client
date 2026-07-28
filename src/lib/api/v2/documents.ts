import { apiV2Fetch } from "./client";

// /folders · /documents — backend-api.md §9.
// scope · space 는 자유 문자열 (프론트에서 정한 값 그대로 저장).
// 편집 · 삭제 : ADMIN 또는 작성자/업로더.

// ─────────────── Folder ───────────────

export interface FolderOut {
  id: string;
  name: string;
  scope: string;
  space: string;
  parentId: string | null;
  createdById: string;
}

export interface FolderCreate {
  name: string;
  scope: string;
  space: string;
  parentId?: string | null;
}

export interface FolderUpdate {
  name?: string;
}

export interface ListFoldersParams {
  space?: string;
  scope?: string;
}

export function listFolders(
  params: ListFoldersParams = {},
): Promise<FolderOut[]> {
  const qs = new URLSearchParams();
  if (params.space) qs.set("space", params.space);
  if (params.scope) qs.set("scope", params.scope);
  const query = qs.toString();
  return apiV2Fetch<FolderOut[]>(`/folders${query ? `?${query}` : ""}`, {
    auth: true,
  });
}

export function createFolder(payload: FolderCreate): Promise<FolderOut> {
  return apiV2Fetch<FolderOut>(`/folders`, {
    method: "POST",
    body: payload,
    auth: true,
  });
}

export function updateFolder(
  id: string,
  payload: FolderUpdate,
): Promise<FolderOut> {
  return apiV2Fetch<FolderOut>(`/folders/${id}`, {
    method: "PATCH",
    body: payload,
    auth: true,
  });
}

export function deleteFolder(id: string): Promise<void> {
  return apiV2Fetch<void>(`/folders/${id}`, {
    method: "DELETE",
    auth: true,
  });
}

// ─────────────── Document ───────────────

export interface DocumentOut {
  id: string;
  name: string;
  ext: string;
  sizeBytes: number;
  url: string; // 백엔드가 서명 후 리턴하는 URL
  scope: string;
  space: string;
  folderId: string | null;
  tags: string[];
  desc: string | null;
  uploaderId: string;
}

export interface DocumentUpdate {
  name?: string;
  desc?: string;
}

export interface ListDocumentsParams {
  space?: string;
  scope?: string;
  folderId?: string;
  q?: string;
}

export function listDocuments(
  params: ListDocumentsParams = {},
): Promise<DocumentOut[]> {
  const qs = new URLSearchParams();
  if (params.space) qs.set("space", params.space);
  if (params.scope) qs.set("scope", params.scope);
  if (params.folderId) qs.set("folderId", params.folderId);
  if (params.q) qs.set("q", params.q);
  const query = qs.toString();
  return apiV2Fetch<DocumentOut[]>(
    `/documents${query ? `?${query}` : ""}`,
    { auth: true },
  );
}

export interface UploadDocumentParams {
  file: File;
  scope: string;
  space: string;
  folderId?: string | null;
  name?: string;
  desc?: string;
  tags?: string[];
}

// 멀티파트 업로드 — apiV2Fetch 가 FormData 감지하면 Content-Type 자동 처리.
export function uploadDocument(
  params: UploadDocumentParams,
): Promise<DocumentOut> {
  const fd = new FormData();
  fd.append("file", params.file);
  fd.append("scope", params.scope);
  fd.append("space", params.space);
  if (params.folderId) fd.append("folderId", params.folderId);
  if (params.name) fd.append("name", params.name);
  if (params.desc) fd.append("desc", params.desc);
  if (params.tags && params.tags.length > 0)
    fd.append("tags", params.tags.join(","));
  return apiV2Fetch<DocumentOut>(`/documents`, {
    method: "POST",
    body: fd,
    auth: true,
  });
}

export function updateDocument(
  id: string,
  payload: DocumentUpdate,
): Promise<DocumentOut> {
  return apiV2Fetch<DocumentOut>(`/documents/${id}`, {
    method: "PATCH",
    body: payload,
    auth: true,
  });
}

export function deleteDocument(id: string): Promise<void> {
  return apiV2Fetch<void>(`/documents/${id}`, {
    method: "DELETE",
    auth: true,
  });
}

// 다운로드 URL 은 백엔드 base URL + /documents/{id}/download.
// Authorization 헤더가 필요하므로 <a href> 로 직접 열 순 없음 → fetch 로 blob 받아 트리거.
export async function downloadDocument(doc: DocumentOut): Promise<void> {
  const base =
    process.env.NEXT_PUBLIC_API_V2_BASE_URL ?? "http://localhost:8001";
  // apiV2Fetch 는 JSON 파싱을 시도해서 바이너리엔 부적합. fetch 직접 사용 + Authorization 첨부.
  const { getAccessToken } = await import("./tokenStore");
  const token = getAccessToken();
  const res = await fetch(`${base}/documents/${doc.id}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`다운로드 실패 (${res.status})`);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = doc.name.endsWith(`.${doc.ext}`)
    ? doc.name
    : `${doc.name}.${doc.ext}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}
