"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { PageTitle } from "../PageTitle";
import { ScheduleEventDialog } from "./ScheduleEventDialog";

// 일정 페이지 — 큰 월별 달력.
// 상단 컨트롤은 카드 밖 : 좌 페이지 제목·부제, 우 월/주 토글 · 좌우 이동 · 연월 · 일정 추가.
// 데이터는 mock. API 는 나중에 붙임 (일정 CRUD + 반복 규칙 + 뷰 필터 전사/팀/개인).

const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"];

// 이벤트 색 팔레트 — 하나의 tone 로 dot 과 시간 텍스트 색을 동시에 파생.
type EventTone = "primary" | "orange" | "emerald" | "pink" | "sky" | "yellow";
const TONE: Record<EventTone, { dot: string; text: string }> = {
  primary: { dot: "bg-primary", text: "text-primary" },
  orange: { dot: "bg-orange-400", text: "text-orange-400" },
  emerald: { dot: "bg-emerald-400", text: "text-emerald-400" },
  pink: { dot: "bg-pink-400", text: "text-pink-400" },
  sky: { dot: "bg-sky-400", text: "text-sky-400" },
  yellow: { dot: "bg-yellow-400", text: "text-yellow-400" },
};

interface EventItem {
  label: string;
  time: string;
  tone: EventTone;
}
const MOCK_EVENTS: Record<string, EventItem[]> = {
  "2026-7-28": [
    { label: "🚀 스프린트 킥오프", time: "10:00", tone: "orange" },
    { label: "🎨 디자인 리뷰 — v2 홈", time: "14:00", tone: "primary" },
  ],
  "2026-7-29": [
    { label: "📊 전사 OKR 공유", time: "11:00", tone: "emerald" },
  ],
  "2026-7-30": [
    { label: "☕ 1:1 (이앨리스 ↔ …)", time: "15:00", tone: "orange" },
  ],
  "2026-7-31": [
    { label: "🎯 프로덕트 데모 — 베타", time: "13:00", tone: "pink" },
  ],
};

function keyOf(d: Date) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
function eventsForDate(d: Date): EventItem[] {
  return MOCK_EVENTS[keyOf(d)] ?? [];
}
function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// 해당 월의 달력 그리드에 표시할 42일 (6주 × 7일). 이전·다음 달 일부 포함하되
// out-of-month 셀은 렌더 시 빈 셀로 처리 (숫자·이벤트 숨김).
function buildMonthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export default function SchedulePage() {
  // 오늘 (mount 후 세팅) — hydration mismatch 방지.
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => setToday(new Date()), []);

  // 보고 있는 달. 오늘 세팅되면 그 달로 초기화.
  const [viewYear, setViewYear] = useState(2026);
  const [viewMonth, setViewMonth] = useState(6);
  useEffect(() => {
    if (today) {
      setViewYear(today.getFullYear());
      setViewMonth(today.getMonth());
    }
  }, [today]);

  // 뷰 모드 — 지금은 월 뷰만 실제 렌더. 주 뷰는 다음 스텝에서 붙임 (토글 UI 만 먼저).
  const [viewMode, setViewMode] = useState<"month" | "week">("month");

  // 일정 추가 모달 open state
  const [addOpen, setAddOpen] = useState(false);

  const days = useMemo(
    () => buildMonthGrid(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  function prevMonth() {
    const d = new Date(viewYear, viewMonth - 1, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }
  function nextMonth() {
    const d = new Date(viewYear, viewMonth + 1, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  return (
    <div>
      <PageTitle title="일정관리" />

      {/* 상단 : 카드 밖. 좌 페이지 제목·부제, 우 컨트롤 그룹. */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-fg">
            일정관리
          </h1>
          <p className="mt-1 text-sm text-muted">
            전사/팀/개인 일정을 월별로 관리합니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* 월/주 토글 (주 뷰는 다음 스텝) */}
          <div className="inline-flex rounded-md border border-line p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("month")}
              className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                viewMode === "month"
                  ? "bg-card-hover text-fg"
                  : "text-muted hover:text-fg"
              }`}
            >
              월
            </button>
            <button
              type="button"
              onClick={() => setViewMode("week")}
              className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                viewMode === "week"
                  ? "bg-card-hover text-fg"
                  : "text-muted hover:text-fg"
              }`}
            >
              주
            </button>
          </div>

          {/* 이전 달 — 독립 버튼 */}
          <button
            type="button"
            onClick={prevMonth}
            aria-label="이전 달"
            className="rounded-md border border-line p-2 text-muted transition-colors hover:bg-card-hover hover:text-fg"
          >
            <ChevronLeftIcon className="size-4" />
          </button>

          {/* 연월 텍스트 */}
          <span className="min-w-[7ch] text-center text-sm font-semibold text-fg tabular-nums">
            {viewYear}년 {viewMonth + 1}월
          </span>

          {/* 다음 달 */}
          <button
            type="button"
            onClick={nextMonth}
            aria-label="다음 달"
            className="rounded-md border border-line p-2 text-muted transition-colors hover:bg-card-hover hover:text-fg"
          >
            <ChevronRightIcon className="size-4" />
          </button>

          {/* 일정 추가 */}
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1 rounded-md border border-primary bg-primary/25 px-3 py-2 text-sm font-semibold text-primary shadow-lg shadow-primary/20 transition-colors hover:bg-primary/35"
          >
            <PlusIcon className="size-4" />
            일정 추가
          </button>
        </div>
      </div>

      {/* 달력 카드 */}
      <div className="mt-6 overflow-hidden rounded-lg border border-line bg-card">
        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 border-b border-line py-3 text-center text-xs font-semibold">
          {WEEKDAY_KO.map((w, i) => (
            <span
              key={w}
              className={
                i === 0
                  ? "text-red-400"
                  : i === 6
                    ? "text-sky-400"
                    : "text-muted"
              }
            >
              {w}
            </span>
          ))}
        </div>

        {/* 날짜 그리드 6×7 — gap-px + bg-line 로 얇은 격자선 표현 */}
        <div className="grid grid-cols-7 gap-px bg-line">
          {days.map((d, i) => (
            <DayCell
              key={i}
              date={d}
              inMonth={d.getMonth() === viewMonth}
              isToday={today ? isSameDay(d, today) : false}
            />
          ))}
        </div>
      </div>

      <ScheduleEventDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
      />
    </div>
  );
}

function DayCell({
  date,
  inMonth,
  isToday,
}: {
  date: Date;
  inMonth: boolean;
  isToday: boolean;
}) {
  const dow = date.getDay();
  const events = inMonth ? eventsForDate(date) : [];
  return (
    <div className="min-h-20 bg-card p-2 transition-colors hover:bg-card-hover sm:min-h-24">
      {inMonth && (
        <>
          {isToday ? (
            <span className="inline-flex size-6 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
              {date.getDate()}
            </span>
          ) : (
            <span
              className={`inline-block px-1 text-sm tabular-nums ${
                dow === 0
                  ? "text-red-400"
                  : dow === 6
                    ? "text-sky-400"
                    : "text-fg"
              }`}
            >
              {date.getDate()}
            </span>
          )}
          <div className="mt-2 space-y-1">
            {events.map((e, i) => (
              <EventPill key={i} event={e} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function EventPill({ event }: { event: EventItem }) {
  const tone = TONE[event.tone];
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-line bg-card-hover px-2 py-1 text-xs">
      <span className={`size-1.5 shrink-0 rounded-full ${tone.dot}`} />
      <span className="flex-1 truncate text-fg">{event.label}</span>
      <span className={`shrink-0 tabular-nums ${tone.text}`}>{event.time}</span>
    </div>
  );
}
