"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CheckIcon, PlusIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { getMe } from "@/lib/api/auth";
import { useToast } from "@/providers/ToastProvider";
import { timeAgo } from "@/lib/format";
import { PageTitle } from "../../PageTitle";

// 환경정비 항목 — 빨래 / 청소 두 그룹.
// 백엔드 연결 전 프론트만 — 로그는 메모리 useState. 새로고침 시 초기화.
// 색은 border + bg-primary/5 같은 opacity highlight 위주로 짜서 다크 테마 전환
// (흰 → 어둠) 시 자연스럽게 따라오게 한다.
const TASK_GROUPS: {
  label: string;
  tasks: { id: string; label: string }[];
}[] = [
  {
    label: "빨래",
    tasks: [
      { id: "wash", label: "세탁" },
      { id: "dry", label: "건조기" },
      { id: "fold", label: "빨래 정리" },
      { id: "collect", label: "빨래 수거" },
    ],
  },
  {
    label: "청소",
    tasks: [
      { id: "zone", label: "구역청소" },
      { id: "corridor", label: "복도청소" },
      { id: "balcony", label: "베란다청소" },
      { id: "male-locker", label: "남탈 청소" },
      { id: "female-locker", label: "여탈 청소" },
      { id: "trash", label: "쓰레기통 비우기" },
      { id: "supplies", label: "비품 관리" },
    ],
  },
];

type TaskLog = {
  id: string;
  taskId: string; // 표준 항목은 위 정의된 id, 기타는 "custom:{label}"
  taskLabel: string;
  userName: string;
  timestamp: number;
  isCustom?: boolean;
};

function startOfTodayMs(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export default function StaffFacilityCarePage() {
  const meQuery = useQuery({ queryKey: ["admin", "me"], queryFn: getMe });
  const myName = meQuery.data?.name ?? "";
  const toast = useToast();

  const [logs, setLogs] = useState<TaskLog[]>([]);
  const [customOpen, setCustomOpen] = useState(false);
  const [customInput, setCustomInput] = useState("");

  function recordLog(taskId: string, taskLabel: string, isCustom = false) {
    if (!myName) return;
    const newLog: TaskLog = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`,
      taskId,
      taskLabel,
      userName: myName,
      timestamp: Date.now(),
      isCustom,
    };
    setLogs((prev) => [newLog, ...prev]);
    toast.success(`${taskLabel} 완료를 기록했어요.`);
  }

  function submitCustom() {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    recordLog(`custom:${trimmed}`, trimmed, true);
    setCustomInput("");
    setCustomOpen(false);
  }

  // 카드별 오늘 카운트
  function todayCountFor(taskId: string): number {
    const t0 = startOfTodayMs();
    return logs.filter((l) => l.taskId === taskId && l.timestamp >= t0).length;
  }

  const t0 = startOfTodayMs();
  const todayLogs = logs.filter((l) => l.timestamp >= t0);
  const myTodayCount = todayLogs.filter((l) => l.userName === myName).length;

  return (
    <div>
      <PageTitle title="환경 정비" />

      {/* 헤더 — GBX 톤 (font-black + tracking-tighter). 아이콘은 SparklesIcon 으로
          청결 / 정돈 뉘앙스. 카운트는 진행률 대신 누적 (회전 작업도 자연스러움). */}
      <h1 className="mt-4 flex items-center gap-2 text-2xl font-black tracking-tighter text-gray-900">
        <SparklesIcon className="size-6 text-primary" />
        환경 정비
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        오늘{" "}
        <span className="font-semibold text-gray-900 tabular-nums">
          {todayLogs.length}건
        </span>
        {" · "}
        내가 한 일{" "}
        <span className="font-semibold text-primary tabular-nums">
          {myTodayCount}개
        </span>
      </p>

      {/* 카드 그리드 — 그룹별. 한 번 탭 = 즉시 기록 (카톡 대비 5배+ 빠름).
          카드 상태 :
            - 안 함     : border-gray-200 + bg-white (default surface)
            - 오늘 했음 : border-gray-200 + bg-gray-50 (subtle 채움)
            - 방금(30분): border-primary/30 + bg-primary/5 (강조)
          색은 모두 opacity 기반이라 다크 테마 전환 시 그대로 따라옴. */}
      <div className="mt-6 space-y-6">
        {TASK_GROUPS.map((group) => (
          <section key={group.label}>
            <h2 className="px-1 text-xs font-bold tracking-tight text-gray-500 uppercase">
              {group.label}
            </h2>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {group.tasks.map((task) => {
                const count = todayCountFor(task.id);
                return (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => recordLog(task.id, task.label)}
                    disabled={!myName}
                    className={`flex items-center justify-between gap-1.5 rounded-xl border p-3 text-left transition-colors disabled:opacity-50 ${
                      count > 0
                        ? "border-gray-200 bg-gray-50"
                        : "border-gray-200 bg-white hover:bg-gray-50"
                    }`}
                  >
                    <p className="text-sm font-semibold text-gray-900">
                      {task.label}
                    </p>
                    {count > 0 && (
                      <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-primary">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        {/* 기타 업무 — 정해진 12개 외 자유 입력 (정수기 청소 같은 일회성) */}
        <section>
          <button
            type="button"
            onClick={() => setCustomOpen(true)}
            disabled={!myName}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50"
          >
            <PlusIcon className="size-4" />
            기타 업무 직접 입력
          </button>
        </section>
      </div>

      {/* 오늘의 일지 — 카톡 채팅방 톤을 빌리되 정렬·검색 가능한 구조로.
          시간 역순. 빈 상태는 점선 박스로 가볍게. */}
      <section className="mt-8">
        <h2 className="px-1 text-xs font-bold tracking-tight text-gray-500 uppercase">
          오늘의 일지
        </h2>
        {todayLogs.length === 0 ? (
          <p className="mt-2 rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400">
            아직 기록이 없어요.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
            {todayLogs.map((log) => (
              <li key={log.id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <CheckIcon className="size-4 text-primary" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {log.taskLabel}
                  </p>
                  <p className="text-xs text-gray-500">{log.userName}</p>
                </div>
                <span className="shrink-0 text-xs text-gray-400">
                  {timeAgo(new Date(log.timestamp).toISOString())}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 기타 업무 입력 다이얼로그 */}
      {customOpen && (
        <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6 py-10">
          <div className="animate-dialog-in flex w-full max-w-md flex-col rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-bold text-gray-900">기타 업무 입력</h3>
            <p className="mt-1 text-xs text-gray-500">예: 정수기 청소, 거울 닦기</p>
            <input
              type="text"
              autoFocus
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitCustom();
              }}
              placeholder="한 줄로 적어주세요"
              className="mt-3 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setCustomOpen(false);
                  setCustomInput("");
                }}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={submitCustom}
                disabled={!customInput.trim()}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
              >
                등록
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
