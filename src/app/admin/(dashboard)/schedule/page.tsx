"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { PageTitle } from "../PageTitle";
import { ScheduleEventDialog } from "./ScheduleEventDialog";

// 일정 페이지 — 월/주 두 뷰. mock 데이터. API 는 다음 스텝 (CRUD + 반복 + 공유 필터).

const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"];
const WEEKDAY_KO_LONG = [
  "일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일",
];

// 이벤트 색 팔레트 — dot·시간·세로바 색을 하나의 tone 로 파생.
type EventTone = "primary" | "orange" | "emerald" | "pink" | "sky" | "yellow";
const TONE: Record<EventTone, { dot: string; text: string; bar: string }> = {
  primary: { dot: "bg-primary", text: "text-primary", bar: "bg-primary" },
  orange: { dot: "bg-orange-400", text: "text-orange-400", bar: "bg-orange-400" },
  emerald: { dot: "bg-emerald-400", text: "text-emerald-400", bar: "bg-emerald-400" },
  pink: { dot: "bg-pink-400", text: "text-pink-400", bar: "bg-pink-400" },
  sky: { dot: "bg-sky-400", text: "text-sky-400", bar: "bg-sky-400" },
  yellow: { dot: "bg-yellow-400", text: "text-yellow-400", bar: "bg-yellow-400" },
};

interface EventItem {
  label: string;
  // "HH:MM" 24시. 표시 시 formatAMPM 으로 오전/오후 변환.
  time: string;
  endTime: string;
  tone: EventTone;
}
const MOCK_EVENTS: Record<string, EventItem[]> = {
  "2026-7-28": [
    { label: "🚀 스프린트 킥오프 — Sprint 12", time: "10:00", endTime: "11:00", tone: "orange" },
    { label: "🎨 디자인 리뷰 — v2.1 컬러 토큰", time: "14:00", endTime: "15:00", tone: "primary" },
  ],
  "2026-7-29": [
    { label: "📊 전사 OKR 공유", time: "11:00", endTime: "12:00", tone: "emerald" },
  ],
  "2026-7-30": [
    { label: "☕ 1:1 (이앨리스 ↔ 김데모)", time: "15:00", endTime: "16:00", tone: "yellow" },
  ],
  "2026-7-31": [
    { label: "🎯 프로덕트 데모 — 베타 v2", time: "13:00", endTime: "14:00", tone: "pink" },
  ],
  "2026-8-1": [
    { label: "🥚 스프린트 회고", time: "16:00", endTime: "17:00", tone: "sky" },
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
// "10:00" → "오전 10:00" / "14:30" → "오후 02:30"
function formatAMPM(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(":");
  const h = Number(hStr);
  const isPM = h >= 12;
  const hh12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${isPM ? "오후" : "오전"} ${String(hh12).padStart(2, "0")}:${mStr}`;
}

// 월 뷰 : 해당 월 첫날 기준 42일 (6주 × 7일). out-of-month 는 빈 셀.
function buildMonthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}
// 주 뷰 : 기준 날짜가 포함된 주의 일요일부터 7일.
function buildWeekGrid(base: Date): Date[] {
  const start = new Date(base);
  start.setDate(base.getDate() - base.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export default function SchedulePage() {
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => setToday(new Date()), []);

  // 보고 있는 기준 날짜 하나로 월/주 뷰 공유. 오늘 세팅 후 그 날로 초기화.
  const [viewDate, setViewDate] = useState<Date>(new Date(2026, 6, 28));
  useEffect(() => {
    if (today) setViewDate(today);
  }, [today]);

  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [addOpen, setAddOpen] = useState(false);

  const monthDays = useMemo(
    () => buildMonthGrid(viewDate.getFullYear(), viewDate.getMonth()),
    [viewDate],
  );
  const weekDays = useMemo(() => buildWeekGrid(viewDate), [viewDate]);

  function shift(dir: -1 | 1) {
    const d = new Date(viewDate);
    if (viewMode === "month") d.setMonth(d.getMonth() + dir);
    else d.setDate(d.getDate() + 7 * dir);
    setViewDate(d);
  }

  // 헤더 라벨 : 월 뷰 = "YYYY년 M월", 주 뷰 = "M. D - M. D"
  const headerLabel =
    viewMode === "month"
      ? `${viewDate.getFullYear()}년 ${viewDate.getMonth() + 1}월`
      : `${weekDays[0].getMonth() + 1}. ${weekDays[0].getDate()} - ${weekDays[6].getMonth() + 1}. ${weekDays[6].getDate()}`;

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

          <button
            type="button"
            onClick={() => shift(-1)}
            aria-label={viewMode === "month" ? "이전 달" : "이전 주"}
            className="rounded-md border border-line p-2 text-muted transition-colors hover:bg-card-hover hover:text-fg"
          >
            <ChevronLeftIcon className="size-4" />
          </button>

          <span className="min-w-[7ch] text-center text-sm font-semibold text-fg tabular-nums">
            {headerLabel}
          </span>

          <button
            type="button"
            onClick={() => shift(1)}
            aria-label={viewMode === "month" ? "다음 달" : "다음 주"}
            className="rounded-md border border-line p-2 text-muted transition-colors hover:bg-card-hover hover:text-fg"
          >
            <ChevronRightIcon className="size-4" />
          </button>

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

      {/* 달력 카드 — 뷰 모드에 따라 MonthView / WeekView */}
      <div className="mt-6 overflow-hidden rounded-lg border border-line bg-card">
        {viewMode === "month" ? (
          <MonthView
            days={monthDays}
            viewMonth={viewDate.getMonth()}
            today={today}
          />
        ) : (
          <WeekView days={weekDays} today={today} />
        )}
      </div>

      <ScheduleEventDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
      />
    </div>
  );
}

// ─────────────────────────────  MONTH VIEW ─────────────────────────────

function MonthView({
  days,
  viewMonth,
  today,
}: {
  days: Date[];
  viewMonth: number;
  today: Date | null;
}) {
  return (
    <>
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
    </>
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
              <MonthEventPill key={i} event={e} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function MonthEventPill({ event }: { event: EventItem }) {
  const tone = TONE[event.tone];
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-line bg-card-hover px-2 py-1 text-xs">
      <span className={`size-1.5 shrink-0 rounded-full ${tone.dot}`} />
      <span className="flex-1 truncate text-fg">{event.label}</span>
      <span className={`shrink-0 tabular-nums ${tone.text}`}>{event.time}</span>
    </div>
  );
}

// ─────────────────────────────  WEEK VIEW ─────────────────────────────

function WeekView({
  days,
  today,
}: {
  days: Date[];
  today: Date | null;
}) {
  return (
    <ul className="divide-y divide-line">
      {days.map((d, i) => (
        <DayRow
          key={i}
          date={d}
          isToday={today ? isSameDay(d, today) : false}
        />
      ))}
    </ul>
  );
}

function DayRow({ date, isToday }: { date: Date; isToday: boolean }) {
  const dow = date.getDay();
  const events = eventsForDate(date);
  const dayColor =
    dow === 0 ? "text-red-400" : dow === 6 ? "text-sky-400" : "text-fg";
  return (
    <li className="px-6 py-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isToday ? (
            <span className="inline-flex size-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-white tabular-nums">
              {date.getDate()}
            </span>
          ) : (
            <span className={`text-sm font-semibold tabular-nums ${dayColor}`}>
              {date.getDate()}
            </span>
          )}
          <span
            className={`text-sm font-semibold ${
              isToday ? "text-fg" : dayColor
            }`}
          >
            {WEEKDAY_KO_LONG[dow]}
          </span>
        </div>
        {events.length > 0 && (
          <span className="text-xs text-muted">{events.length}건</span>
        )}
      </div>

      {events.length === 0 ? (
        <p className="mt-3 pl-10 text-sm text-muted">일정 없어요</p>
      ) : (
        <ul className="mt-3 space-y-3 pl-10">
          {events.map((e, i) => (
            <WeekEventRow key={i} event={e} />
          ))}
        </ul>
      )}
    </li>
  );
}

function WeekEventRow({ event }: { event: EventItem }) {
  const tone = TONE[event.tone];
  return (
    <li className="flex gap-3">
      <span className={`w-0.5 shrink-0 rounded-full ${tone.bar}`} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-fg">{event.label}</p>
        <p className="mt-0.5 text-xs tabular-nums text-muted">
          {formatAMPM(event.time)} – {formatAMPM(event.endTime)}
        </p>
      </div>
    </li>
  );
}
