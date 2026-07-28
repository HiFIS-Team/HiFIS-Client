import { apiV2Fetch } from "./client";

// /events — backend-api.md §9.
// from · to 는 ISO datetime, scope 는 자유 문자열.

export interface EventOut {
  id: string;
  title: string;
  startAt: string; // ISO
  endAt: string; // ISO
  category: string;
  scope: string;
  color: string;
  memo: string | null;
  ownerId: string;
  createdAt: string;
}

export interface ListEventsParams {
  from?: string; // ISO
  to?: string; // ISO
  scope?: string;
}

export function listEvents(
  params: ListEventsParams = {},
): Promise<EventOut[]> {
  const qs = new URLSearchParams();
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  if (params.scope) qs.set("scope", params.scope);
  const query = qs.toString();
  return apiV2Fetch<EventOut[]>(`/events${query ? `?${query}` : ""}`, {
    auth: true,
  });
}
