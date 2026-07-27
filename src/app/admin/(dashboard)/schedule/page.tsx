"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { PageTitle } from "../PageTitle";

// 일정 페이지 — 큰 월별 달력.
// 데이터는 mock. API 는 나중에 붙임 (일정 CRUD + 반복 규칙).

const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"];

// mock 이벤트 : YYYY-M-D → 이벤트 배열. accent 는 tailwind bg 클래스.
interface EventItem {
  label: string;
  time?: string;
  accent: string;
}
const MOCK_EVENTS: Record<string, EventItem[]> = {
  "2026-7-27": [
    { label: "팀 주간회의", time: "10:00", accent: "bg-primary" },
    { label: "본사 방문", time: "14:00", accent: "bg-yellow-400" },
  ],
  "2026-7-28": [{ label: "신입 오리엔테이션", time: "16:00", accent: "bg-sky-400" }],
  "2026-7-30": [{ label: "월간 결산", accent: "bg-pink-400" }],
  "2026-8-3": [{ label: "PT 세미나", time: "13:00", accent: "bg-primary" }],
};

function eventsForDate(d: Date): EventItem[] {
  const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  return MOCK_EVENTS[key] ?? [];
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// 해당 월의 달력 그리드에 표시할 42일 (6주 × 7일). 이전·다음 달 일부 포함.
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

  // 보고 있는 달 (오늘 세팅되면 그 달로 초기화). 이전/다음 화살표로 이동.
  const [viewYear, setViewYear] = useState(2026);
  const [viewMonth, setViewMonth] = useState(6); // 0-index (6 = 7월)
  useEffect(() => {
    if (today) {
      setViewYear(today.getFullYear());
      setViewMonth(today.getMonth());
    }
  }, [today]);

  const [selected, setSelected] = useState<Date | null>(null);

  const days = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

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

  const selectedEvents = selected ? eventsForDate(selected) : [];

  return (
    <div>
      <PageTitle title="일정" />

      <div className="rounded-lg border border-line bg-card p-6">
        {/* 헤더 : 좌 연월 · 우 좌우 이동 */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black tracking-tighter text-fg">
            {viewYear}년 {viewMonth + 1}월
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={prevMonth}
              aria-label="이전 달"
              className="rounded-md p-1.5 text-muted transition-colors hover:bg-card-hover hover:text-fg"
            >
              <ChevronLeftIcon className="size-5" />
            </button>
            <button
              type="button"
              onClick={nextMonth}
              aria-label="다음 달"
              className="rounded-md p-1.5 text-muted transition-colors hover:bg-card-hover hover:text-fg"
            >
              <ChevronRightIcon className="size-5" />
            </button>
          </div>
        </div>

        {/* 요일 헤더 */}
        <div className="mt-4 grid grid-cols-7 border-b border-line pb-2 text-center text-xs font-semibold">
          {WEEKDAY_KO.map((w, i) => (
            <span
              key={w}
              className={
                i === 0 ? "text-red-400" : i === 6 ? "text-sky-400" : "text-muted"
              }
            >
              {w}
            </span>
          ))}
        </div>

        {/* 날짜 그리드 6×7 */}
        <div className="mt-2 grid grid-cols-7 gap-px overflow-hidden rounded-md border border-line bg-line">
          {days.map((d, i) => {
            const inMonth = d.getMonth() === viewMonth;
            const isToday = today ? isSameDay(d, today) : false;
            const isSelected = selected ? isSameDay(d, selected) : false;
            const events = eventsForDate(d);
            const dow = d.getDay();
            return (
              <button
                key={i}
                type="button"
                onClick={() => setSelected(d)}
                className={`flex min-h-[5rem] flex-col items-start gap-1 bg-card p-2 text-left transition-colors hover:bg-card-hover sm:min-h-[6rem] ${
                  isSelected ? "ring-2 ring-inset ring-primary" : ""
                }`}
              >
                <span
                  className={`inline-flex size-6 items-center justify-center rounded-full text-sm tabular-nums ${
                    isToday
                      ? "bg-primary font-bold text-white"
                      : !inMonth
                        ? "text-muted/50"
                        : dow === 0
                          ? "text-red-400"
                          : dow === 6
                            ? "text-sky-400"
                            : "text-fg"
                  }`}
                >
                  {d.getDate()}
                </span>
                {/* 이벤트 : 앞 2개는 라벨, 초과는 +N */}
                <div className="flex w-full flex-col gap-0.5 overflow-hidden">
                  {events.slice(0, 2).map((e, j) => (
                    <span
                      key={j}
                      className={`truncate rounded px-1 py-px text-[10px] font-medium text-white ${e.accent}`}
                    >
                      {e.time ? `${e.time} ${e.label}` : e.label}
                    </span>
                  ))}
                  {events.length > 2 && (
                    <span className="text-[10px] font-semibold text-muted">
                      +{events.length - 2}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* 선택된 날짜 이벤트 리스트 */}
        {selected && (
          <div className="mt-6 border-t border-line pt-5">
            <p className="text-sm font-bold text-fg">
              {selected.getMonth() + 1}월 {selected.getDate()}일 (
              {WEEKDAY_KO[selected.getDay()]})
            </p>
            {selectedEvents.length === 0 ? (
              <p className="mt-3 text-sm text-muted">등록된 일정이 없어요.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {selectedEvents.map((e, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-3 rounded-md border border-line bg-card-hover px-3 py-2 text-sm"
                  >
                    <span className={`size-2 shrink-0 rounded-full ${e.accent}`} />
                    {e.time && (
                      <span className="font-semibold tabular-nums text-fg">
                        {e.time}
                      </span>
                    )}
                    <span className="text-fg">{e.label}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
