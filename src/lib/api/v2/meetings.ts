import { apiV2Fetch } from "./client";

// GET /meetings · GET/POST/PATCH/DELETE /meetings/{id} — backend-api.md §9.
// blocks 는 자유 JSON (tiptap ProseMirror doc 형태로 저장).

export type MeetingScope = "COMPANY" | "PROJECT" | "PEOPLE";

// 프론트 표기용 라벨.
const SCOPE_LABEL: Record<MeetingScope, string> = {
  COMPANY: "전사",
  PROJECT: "프로젝트",
  PEOPLE: "특정 인원",
};
export function scopeLabel(s: MeetingScope): string {
  return SCOPE_LABEL[s] ?? s;
}

export interface ReactionAgg {
  emoji: string;
  employeeIds: string[];
}

export interface MeetingOut {
  id: string;
  title: string;
  blocks: unknown[]; // tiptap ProseMirror doc content (`doc.content` 배열 또는 자유 JSON)
  scope: MeetingScope;
  attendeeIds: string[];
  projectId?: string | null;
  authorId: string;
  meetingAt: string; // ISO
  createdAt: string; // ISO
  reactions: ReactionAgg[];
}

export interface MeetingCreate {
  title: string;
  blocks: unknown[];
  scope: MeetingScope;
  attendeeIds?: string[];
  projectId?: string | null;
  meetingAt: string; // ISO
}

export interface MeetingUpdate {
  title?: string;
  blocks?: unknown[];
  scope?: MeetingScope;
  attendeeIds?: string[];
  projectId?: string | null;
  meetingAt?: string;
}

export interface ListMeetingsParams {
  scope?: MeetingScope;
  q?: string;
  sort?: "meetingAt"; // "meetingAt" = 오름차순, 미지정 = 최신순 (백엔드 기본).
}

export function listMeetings(
  params: ListMeetingsParams = {},
): Promise<MeetingOut[]> {
  const qs = new URLSearchParams();
  if (params.scope) qs.set("scope", params.scope);
  if (params.q) qs.set("q", params.q);
  if (params.sort) qs.set("sort", params.sort);
  const query = qs.toString();
  return apiV2Fetch<MeetingOut[]>(`/meetings${query ? `?${query}` : ""}`, {
    auth: true,
  });
}

export function getMeeting(id: string): Promise<MeetingOut> {
  return apiV2Fetch<MeetingOut>(`/meetings/${id}`, { auth: true });
}

export function createMeeting(payload: MeetingCreate): Promise<MeetingOut> {
  return apiV2Fetch<MeetingOut>(`/meetings`, {
    method: "POST",
    body: payload,
    auth: true,
  });
}

export function updateMeeting(
  id: string,
  payload: MeetingUpdate,
): Promise<MeetingOut> {
  return apiV2Fetch<MeetingOut>(`/meetings/${id}`, {
    method: "PATCH",
    body: payload,
    auth: true,
  });
}

export function deleteMeeting(id: string): Promise<void> {
  return apiV2Fetch<void>(`/meetings/${id}`, {
    method: "DELETE",
    auth: true,
  });
}
