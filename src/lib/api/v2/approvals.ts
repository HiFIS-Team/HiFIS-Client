import { apiV2Fetch } from "./client";

// 전자결재 — backend-api.md §9.5.
// box 파라미터 필수 : mine (내가 올린 것) · inbox (내 결재 차례).
// 순차 결재선 · 부수효과 : 다음 결재자/신청자에게 자동 알림.

export type ApprovalStatus =
  | "IN_PROGRESS"
  | "APPROVED"
  | "REJECTED"
  | "WITHDRAWN";
export type ApprovalStepStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface ApprovalStep {
  approverId: string;
  status: ApprovalStepStatus;
  comment: string | null;
  actedAt: string | null; // ISO
}

export interface ApprovalComment {
  authorId: string;
  body: string;
  createdAt: string;
}

export interface ApprovalOut {
  id: string;
  kind: string;
  title: string;
  content: string;
  amount: number | null;
  startDate: string | null; // "YYYY-MM-DD"
  endDate: string | null;
  place: string | null;
  requesterId: string;
  approverIds: string[];
  steps: ApprovalStep[];
  status: ApprovalStatus;
  currentApproverId: string | null;
  comments: ApprovalComment[];
  createdAt: string;
}

export interface ApprovalCreate {
  kind: string;
  title: string;
  content: string;
  amount?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  place?: string | null;
  approverIds: string[]; // 최소 1명
}

export interface ApprovalAction {
  comment?: string;
}

export interface CommentCreate {
  body: string;
}

export type ApprovalBox = "mine" | "inbox";

export function listApprovals(box: ApprovalBox): Promise<ApprovalOut[]> {
  return apiV2Fetch<ApprovalOut[]>(`/approvals?box=${box}`, { auth: true });
}

export function getApproval(id: string): Promise<ApprovalOut> {
  return apiV2Fetch<ApprovalOut>(`/approvals/${id}`, { auth: true });
}

export function createApproval(payload: ApprovalCreate): Promise<ApprovalOut> {
  return apiV2Fetch<ApprovalOut>(`/approvals`, {
    method: "POST",
    body: payload,
    auth: true,
  });
}

export function approveApproval(
  id: string,
  payload: ApprovalAction = {},
): Promise<ApprovalOut> {
  return apiV2Fetch<ApprovalOut>(`/approvals/${id}/approve`, {
    method: "POST",
    body: payload,
    auth: true,
  });
}

export function rejectApproval(
  id: string,
  payload: ApprovalAction = {},
): Promise<ApprovalOut> {
  return apiV2Fetch<ApprovalOut>(`/approvals/${id}/reject`, {
    method: "POST",
    body: payload,
    auth: true,
  });
}

export function withdrawApproval(id: string): Promise<ApprovalOut> {
  return apiV2Fetch<ApprovalOut>(`/approvals/${id}/withdraw`, {
    method: "POST",
    auth: true,
  });
}

export function commentApproval(
  id: string,
  payload: CommentCreate,
): Promise<ApprovalOut> {
  return apiV2Fetch<ApprovalOut>(`/approvals/${id}/comments`, {
    method: "POST",
    body: payload,
    auth: true,
  });
}

// ─────────────── 라벨 매핑 ───────────────

export function statusLabel(s: ApprovalStatus): string {
  switch (s) {
    case "IN_PROGRESS":
      return "진행 중";
    case "APPROVED":
      return "승인 완료";
    case "REJECTED":
      return "반려";
    case "WITHDRAWN":
      return "회수";
  }
}

export function stepStatusLabel(s: ApprovalStepStatus): string {
  switch (s) {
    case "PENDING":
      return "대기";
    case "APPROVED":
      return "승인";
    case "REJECTED":
      return "반려";
  }
}
