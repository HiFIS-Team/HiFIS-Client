import { apiV2Fetch } from "./client";

// 사내톡 — backend-api.md §9.
// REST 는 방 관리 · 히스토리 · 전송(영속). 실시간 수신은 WS /ws/chat (이 모듈 밖).

export interface ReactionAgg {
  emoji: string;
  employeeIds: string[];
}

export interface MessageOut {
  id: string;
  roomId: string;
  senderId: string;
  body: string;
  attachments: string[];
  reactions: ReactionAgg[];
  createdAt: string; // ISO
}

export interface ChatRoomOut {
  id: string;
  name: string | null;
  isGroup: boolean;
  ownerId: string;
  memberIds: string[];
  lastMessage: MessageOut | null;
  unreadCount: number;
  updatedAt: string;
}

export interface ChatRoomCreate {
  memberIds: string[]; // 나 제외 상대. 서버가 나 포함.
  name?: string;
  isGroup?: boolean;
}

export interface MessageCreate {
  body: string;
  attachments?: string[];
}

// 방 목록 (내 방만, 최근 활동 순).
export function listRooms(): Promise<ChatRoomOut[]> {
  return apiV2Fetch<ChatRoomOut[]>(`/chat/rooms`, { auth: true });
}

// 방 생성. 1:1 DM 은 중복 방지 (같은 상대면 기존 재사용).
export function createRoom(payload: ChatRoomCreate): Promise<ChatRoomOut> {
  return apiV2Fetch<ChatRoomOut>(`/chat/rooms`, {
    method: "POST",
    body: payload,
    auth: true,
  });
}

export interface ListMessagesParams {
  before?: string; // ISO 커서
  limit?: number; // ≤100
}

// 히스토리 — 오래된→최신 순으로 옴.
export function listMessages(
  roomId: string,
  params: ListMessagesParams = {},
): Promise<MessageOut[]> {
  const qs = new URLSearchParams();
  if (params.before) qs.set("before", params.before);
  if (params.limit) qs.set("limit", String(params.limit));
  const query = qs.toString();
  return apiV2Fetch<MessageOut[]>(
    `/chat/rooms/${roomId}/messages${query ? `?${query}` : ""}`,
    { auth: true },
  );
}

export function sendMessage(
  roomId: string,
  payload: MessageCreate,
): Promise<MessageOut> {
  return apiV2Fetch<MessageOut>(`/chat/rooms/${roomId}/messages`, {
    method: "POST",
    body: payload,
    auth: true,
  });
}

// 내 읽음 위치 갱신. unread 0 으로.
export function markRoomRead(roomId: string): Promise<void> {
  return apiV2Fetch<void>(`/chat/rooms/${roomId}/read`, {
    method: "POST",
    auth: true,
  });
}
