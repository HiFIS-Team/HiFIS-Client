import { apiV2Fetch } from "./client";

// /projects — backend-api.md §9.
// status 는 서버 파생 (progress + due).
// PATCH : ADMIN·MANAGER·작성자 = 전체 · 담당자 = progress 만 · 그 외 = 403.
// DELETE : ADMIN·MANAGER 또는 작성자.

export type ProjectStatus = "WAITING" | "IN_PROGRESS" | "DONE" | "MISSED";

export interface ProjectOut {
  id: string;
  title: string;
  purpose: string;
  steps: string;
  due: string; // ISO
  progress: number;
  assigneeIds: string[];
  extensionReason?: string | null;
  status: ProjectStatus;
  createdById: string;
  createdAt: string; // ISO
}

export interface ProjectCreate {
  title: string;
  purpose?: string;
  steps?: string;
  due: string; // ISO
  progress?: number;
  assigneeIds?: string[];
}

export interface ProjectUpdate {
  title?: string;
  purpose?: string;
  steps?: string;
  due?: string;
  progress?: number;
  assigneeIds?: string[];
  extensionReason?: string;
}

export interface ListProjectsParams {
  status?: ProjectStatus;
  assigneeId?: string;
  q?: string;
}

export function listProjects(
  params: ListProjectsParams = {},
): Promise<ProjectOut[]> {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.assigneeId) qs.set("assigneeId", params.assigneeId);
  if (params.q) qs.set("q", params.q);
  const query = qs.toString();
  return apiV2Fetch<ProjectOut[]>(`/projects${query ? `?${query}` : ""}`, {
    auth: true,
  });
}

export function getProject(id: string): Promise<ProjectOut> {
  return apiV2Fetch<ProjectOut>(`/projects/${id}`, { auth: true });
}

export function createProject(payload: ProjectCreate): Promise<ProjectOut> {
  return apiV2Fetch<ProjectOut>(`/projects`, {
    method: "POST",
    body: payload,
    auth: true,
  });
}

export function updateProject(
  id: string,
  payload: ProjectUpdate,
): Promise<ProjectOut> {
  return apiV2Fetch<ProjectOut>(`/projects/${id}`, {
    method: "PATCH",
    body: payload,
    auth: true,
  });
}

export function deleteProject(id: string): Promise<void> {
  return apiV2Fetch<void>(`/projects/${id}`, {
    method: "DELETE",
    auth: true,
  });
}

// ─────────────── 기한 변경 요청 (EXTENSION · OVERDUE) ───────────────

export type ProjectRequestType = "EXTENSION" | "OVERDUE";
export type ProjectRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface ProjectRequestOut {
  id: string;
  projectId: string;
  type: ProjectRequestType;
  newDue: string;
  reason: string;
  status: ProjectRequestStatus;
  requestedById: string;
  decidedById?: string | null;
  decidedAt?: string | null;
  rejectReason?: string | null;
  createdAt: string;
}

export interface ProjectRequestCreate {
  type: ProjectRequestType;
  newDue: string; // ISO
  reason: string;
}

export function createProjectRequest(
  projectId: string,
  payload: ProjectRequestCreate,
): Promise<ProjectRequestOut> {
  return apiV2Fetch<ProjectRequestOut>(`/projects/${projectId}/requests`, {
    method: "POST",
    body: payload,
    auth: true,
  });
}

// ─────────────── 라벨 매핑 ───────────────

const STATUS_LABEL: Record<ProjectStatus, string> = {
  WAITING: "대기",
  IN_PROGRESS: "진행중",
  DONE: "완료",
  MISSED: "누락",
};
export function statusLabel(s: ProjectStatus): string {
  return STATUS_LABEL[s] ?? s;
}

// D-day 계산 : today 기준 due 까지의 남은 일수 (음수 = 지남).
export function computeDday(dueIso: string, today: Date): number {
  const due = new Date(dueIso);
  if (Number.isNaN(due.getTime())) return 0;
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const d = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  return Math.floor((d.getTime() - t.getTime()) / 86_400_000);
}
