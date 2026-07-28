"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getAccessToken } from "./tokenStore";
import type { ChatRoomOut, MessageOut } from "./chat";

// 사내톡 실시간 WS — 수신만 담당 (전송은 REST 유지, UX 명확).
//
// 서버 → 클라 프레임:
//   { type: "message", roomId, message: MessageOut } — 새 메시지 (발신자 본인도 에코)
//   { type: "typing",  roomId, employeeId, isTyping }
//   { type: "read",    roomId, employeeId, lastReadAt }
//
// WS URL : NEXT_PUBLIC_API_V2_WS_URL 우선, 없으면 base 로부터 파생.
//   base 가 절대 URL (http://…) → ws://…/ws/chat
//   base 가 프록시 경로 (/api-v2) → window.origin + base + /ws/chat
//   dev 서버가 WS 프록시 안 하면 명시적 env 로 지정 권장.

function computeWsUrl(): string | null {
  if (typeof window === "undefined") return null;
  const explicit = process.env.NEXT_PUBLIC_API_V2_WS_URL;
  if (explicit) return explicit;
  const base =
    process.env.NEXT_PUBLIC_API_V2_BASE_URL ?? "http://localhost:8001";
  if (base.startsWith("/")) {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.host}${base}/ws/chat`;
  }
  try {
    const url = new URL(base);
    const proto = url.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${url.host}/ws/chat`;
  } catch {
    return null;
  }
}

interface UseChatWsResult {
  connected: boolean;
  // roomId → 타이핑 중인 employeeId 집합.
  typingByRoom: Map<string, Set<string>>;
  // roomId → employeeId → lastReadAt ISO (남의 읽음 위치).
  readsByRoom: Map<string, Map<string, string>>;
  // WS 로 send. 연결 안 되어 있으면 false 리턴 (호출측에서 REST 폴백 가능).
  send: (frame: object) => boolean;
}

// ChatFab 이 mount 되어 있는 동안 WS 유지. 언마운트 시 정리.
// 재연결 : exponential backoff (1s → 2s → 4s … 최대 30s). 4401 이면 재시도 안 함.
export function useChatWs(enabled: boolean): UseChatWsResult {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);
  const [typingByRoom, setTypingByRoom] = useState<
    Map<string, Set<string>>
  >(() => new Map());
  const [readsByRoom, setReadsByRoom] = useState<
    Map<string, Map<string, string>>
  >(() => new Map());
  const wsRef = useRef<WebSocket | null>(null);
  const attemptRef = useRef(0);
  const stopRef = useRef(false);
  const typingTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  useEffect(() => {
    if (!enabled) return;
    stopRef.current = false;

    function connect() {
      if (stopRef.current) return;
      const token = getAccessToken();
      if (!token) {
        // 토큰 아직 없음 → 잠시 후 재시도.
        const t = setTimeout(connect, 2_000);
        return () => clearTimeout(t);
      }
      const url = computeWsUrl();
      if (!url) return;
      let ws: WebSocket;
      try {
        ws = new WebSocket(`${url}?token=${encodeURIComponent(token)}`);
      } catch {
        scheduleReconnect();
        return;
      }
      wsRef.current = ws;

      ws.addEventListener("open", () => {
        attemptRef.current = 0;
        setConnected(true);
      });

      ws.addEventListener("message", (ev) => {
        try {
          const data = JSON.parse(ev.data);
          handleFrame(data);
        } catch {
          // 파싱 실패 무시
        }
      });

      ws.addEventListener("close", (ev) => {
        setConnected(false);
        wsRef.current = null;
        if (ev.code === 4401) {
          // 인증 실패 — 재시도해도 소용 없음.
          stopRef.current = true;
          return;
        }
        scheduleReconnect();
      });

      ws.addEventListener("error", () => {
        // close 가 곧 이어짐. 별도 처리 불필요.
      });
    }

    function scheduleReconnect() {
      if (stopRef.current) return;
      const attempt = attemptRef.current;
      attemptRef.current = attempt + 1;
      const delay = Math.min(30_000, 1_000 * 2 ** attempt);
      setTimeout(connect, delay);
    }

    function handleFrame(data: {
      type?: string;
      roomId?: string;
      message?: MessageOut;
      employeeId?: string;
      isTyping?: boolean;
      lastReadAt?: string;
    }) {
      if (data.type === "message" && data.roomId && data.message) {
        const roomId = data.roomId;
        const message = data.message;
        // messages 캐시에 append.
        queryClient.setQueryData<MessageOut[] | undefined>(
          ["v2", "chat", "messages", roomId],
          (prev) => {
            if (!prev) return prev;
            if (prev.some((m) => m.id === message.id)) return prev;
            return [...prev, message];
          },
        );
        // rooms 캐시에서 lastMessage/updatedAt/unreadCount 갱신.
        queryClient.setQueryData<ChatRoomOut[] | undefined>(
          ["v2", "chat", "rooms"],
          (prev) => {
            if (!prev) return prev;
            return prev.map((r) => {
              if (r.id !== roomId) return r;
              return {
                ...r,
                lastMessage: message,
                updatedAt: message.createdAt,
                // 발신자가 본인이면 unread 는 유지, 아니면 +1
                // (본인 판단은 여기서 어려워서 안전하게 무효화 → refetch)
              };
            });
          },
        );
        // rooms 는 정확한 unread 갱신을 위해 살짝 지연 후 invalidate.
        queryClient.invalidateQueries({ queryKey: ["v2", "chat", "rooms"] });
      } else if (data.type === "typing" && data.roomId && data.employeeId) {
        const roomId = data.roomId;
        const employeeId = data.employeeId;
        setTypingByRoom((prev) => {
          const next = new Map(prev);
          const set = new Set(next.get(roomId) ?? []);
          if (data.isTyping) set.add(employeeId);
          else set.delete(employeeId);
          next.set(roomId, set);
          return next;
        });
        // 3초 후 자동 clear (서버가 stop 안 보내는 경우 안전망).
        if (data.isTyping) {
          const key = `${roomId}:${employeeId}`;
          const existing = typingTimersRef.current.get(key);
          if (existing) clearTimeout(existing);
          const t = setTimeout(() => {
            setTypingByRoom((prev) => {
              const next = new Map(prev);
              const set = new Set(next.get(roomId) ?? []);
              set.delete(employeeId);
              next.set(roomId, set);
              return next;
            });
            typingTimersRef.current.delete(key);
          }, 3_000);
          typingTimersRef.current.set(key, t);
        }
      } else if (
        data.type === "read" &&
        data.roomId &&
        data.employeeId &&
        data.lastReadAt
      ) {
        const roomId = data.roomId;
        const employeeId = data.employeeId;
        const lastReadAt = data.lastReadAt;
        setReadsByRoom((prev) => {
          const next = new Map(prev);
          const inner = new Map(next.get(roomId) ?? new Map());
          inner.set(employeeId, lastReadAt);
          next.set(roomId, inner);
          return next;
        });
      }
    }

    connect();
    return () => {
      stopRef.current = true;
      // 남은 timer 정리
      for (const t of typingTimersRef.current.values()) clearTimeout(t);
      typingTimersRef.current.clear();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [enabled, queryClient]);

  const send = useMemo(
    () =>
      function send(frame: object): boolean {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) return false;
        try {
          ws.send(JSON.stringify(frame));
          return true;
        } catch {
          return false;
        }
      },
    [],
  );

  return { connected, typingByRoom, readsByRoom, send };
}
