"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CheckIcon, PlusIcon } from "@heroicons/react/24/outline";
import { getMe } from "@/lib/api/auth";
import { useToast } from "@/providers/ToastProvider";
import { formatWon, timeAgo } from "@/lib/format";
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
  // 비품 관리 한정 — 시킨 것 + 금액. 기록 시 모달에서 받음.
  supplyItem?: string;
  supplyAmount?: number;
};

// 비품 관리 항목 id — 특수 처리 (모달 입력)
const SUPPLIES_TASK_ID = "supplies";

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
  // 비품 관리 입력 모달 — 시킨 것 + 금액
  const [supplyOpen, setSupplyOpen] = useState(false);
  const [supplyItem, setSupplyItem] = useState("");
  const [supplyAmount, setSupplyAmount] = useState("");

  function recordLog(
    taskId: string,
    taskLabel: string,
    extras?: { isCustom?: boolean; supplyItem?: string; supplyAmount?: number },
  ) {
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
      isCustom: extras?.isCustom,
      supplyItem: extras?.supplyItem,
      supplyAmount: extras?.supplyAmount,
    };
    setLogs((prev) => [newLog, ...prev]);
    toast.success(`${taskLabel} 완료를 기록했어요.`);
  }

  // 카드 탭 — 비품 관리는 모달 열기, 그 외는 즉시 기록.
  function handleCardClick(taskId: string, taskLabel: string) {
    if (taskId === SUPPLIES_TASK_ID) {
      setSupplyOpen(true);
      return;
    }
    recordLog(taskId, taskLabel);
  }

  function submitCustom() {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    recordLog(`custom:${trimmed}`, trimmed, { isCustom: true });
    setCustomInput("");
    setCustomOpen(false);
  }

  function submitSupply() {
    // 빈값 허용 — 시킬 게 없어서 확인만 한 케이스. trim·NaN 처리해 빈 값은 undefined.
    const item = supplyItem.trim() || undefined;
    const parsed = parseInt(supplyAmount, 10);
    const amount =
      Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
    recordLog(SUPPLIES_TASK_ID, "비품 관리", {
      supplyItem: item,
      supplyAmount: amount,
    });
    setSupplyItem("");
    setSupplyAmount("");
    setSupplyOpen(false);
  }

  // 카드별 오늘 카운트
  function todayCountFor(taskId: string): number {
    const t0 = startOfTodayMs();
    return logs.filter((l) => l.taskId === taskId && l.timestamp >= t0).length;
  }

  const t0 = startOfTodayMs();
  const todayLogs = logs.filter((l) => l.timestamp >= t0);
  const myTodayCount = todayLogs.filter((l) => l.userName === myName).length;

  // 일지 필터 — "all" 오늘 전체 / "mine" 내가 한 것만. 카운트 클릭으로 전환.
  const [feedFilter, setFeedFilter] = useState<"all" | "mine">("all");
  const filteredFeed =
    feedFilter === "mine"
      ? todayLogs.filter((l) => l.userName === myName)
      : todayLogs;

  return (
    <div>
      <PageTitle title="환경 정비" />

      {/* 카드 그리드 — 그룹별. 한 번 탭 = 즉시 기록 (카톡 대비 5배+ 빠름).
          카드 상태 :
            - 안 함     : border-gray-200 + bg-white (default surface)
            - 오늘 했음 : border-gray-200 + bg-gray-50 (subtle 채움)
            - 방금(30분): border-primary/30 + bg-primary/5 (강조)
          색은 모두 opacity 기반이라 다크 테마 전환 시 그대로 따라옴.
          카운트는 아래 "오늘의 일지" 줄로 옮겨 한 줄에 같이 노출. */}
      <div className="mt-2 space-y-6">
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
                    onClick={() => handleCardClick(task.id, task.label)}
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
          시간 역순. 빈 상태는 점선 박스로 가볍게.
          헤더 우측 카운트는 클릭으로 일지 필터 전환 — 오늘 N건 (전체) / 내가
          한 일 M개 (본인만). 활성 카운트는 font-semibold 로 강조. */}
      <section className="mt-8">
        <div className="flex items-baseline justify-between gap-2 px-1">
          <h2 className="text-xs font-bold tracking-tight text-gray-500 uppercase">
            오늘의 일지
          </h2>
          <p className="text-xs text-gray-500">
            <button
              type="button"
              onClick={() => setFeedFilter("all")}
              className={`tabular-nums transition-colors ${
                feedFilter === "all"
                  ? "font-semibold text-gray-900"
                  : "hover:text-gray-700"
              }`}
            >
              오늘 {todayLogs.length}건
            </button>
            {" · "}
            <button
              type="button"
              onClick={() => setFeedFilter("mine")}
              className={`tabular-nums transition-colors ${
                feedFilter === "mine"
                  ? "font-semibold text-primary"
                  : "hover:text-gray-700"
              }`}
            >
              내가 한 일 {myTodayCount}개
            </button>
          </p>
        </div>
        {filteredFeed.length === 0 ? (
          <p className="mt-2 rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400">
            {feedFilter === "mine"
              ? "오늘 내가 한 기록이 없어요."
              : "아직 기록이 없어요."}
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
            {filteredFeed.map((log) => (
              <li key={log.id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <CheckIcon className="size-4 text-primary" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {log.taskLabel}
                    {log.supplyItem && (
                      <span className="text-gray-500"> · {log.supplyItem}</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    {log.userName}
                    {typeof log.supplyAmount === "number" && (
                      <span className="ml-1 font-medium text-primary">
                        {formatWon(log.supplyAmount)}
                      </span>
                    )}
                  </p>
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

      {/* 비품 관리 입력 다이얼로그 — 시킨 것 + 금액. 두 값 다 있어야 등록 활성. */}
      {supplyOpen && (
        <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6 py-10">
          <div className="animate-dialog-in flex w-full max-w-md flex-col rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-bold text-gray-900">비품 관리</h3>
            <p className="mt-1 text-xs text-gray-500">
              시킬 게 없어서 확인만 한 거면 빈 칸으로 둬도 돼요. 시킨 게 있으면
              품목·금액을 같이 적어주세요.
            </p>

            <label className="mt-4 block text-xs font-semibold text-gray-700">
              시킨 것
            </label>
            <input
              type="text"
              autoFocus
              value={supplyItem}
              onChange={(e) => setSupplyItem(e.target.value)}
              placeholder="예: A4 용지, 운동복, 수건"
              className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none"
            />

            <label className="mt-4 block text-xs font-semibold text-gray-700">
              금액 (원)
            </label>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={supplyAmount}
              onChange={(e) => setSupplyAmount(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitSupply();
              }}
              placeholder="예: 30000"
              className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none"
            />

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setSupplyOpen(false);
                  setSupplyItem("");
                  setSupplyAmount("");
                }}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={submitSupply}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
              >
                제출
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
