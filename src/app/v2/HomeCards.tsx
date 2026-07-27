"use client";

import { useEffect, useState } from "react";

// v2 홈 하단 카드 3장 — 바코드 · 인사 · 오늘 근무.
// 지금은 mock. 나중에 API 붙일 때 각 카드 별 컴포넌트로 분리.
// 시간·날짜 갱신 필요 → client component. hydration mismatch 방지 위해
// 시간 표기는 mount 후에만 렌더 (초기엔 placeholder 문자).

const WEEKDAY = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
function formatDate(d: Date) {
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAY[d.getDay()]}`;
}
function greetingForHour(h: number) {
  if (h < 5) return "좋은 밤이에요";
  if (h < 12) return "좋은 아침이에요";
  if (h < 18) return "좋은 오후예요";
  return "좋은 저녁이에요";
}

// 바코드 placeholder — 폭 factor 배열. 화면 폭에 flex 비율로 스트레치.
// 나중에 실제 라이브러리(jsbarcode 등) 로 교체.
const BAR_WIDTHS = [
  2, 1, 3, 1, 2, 1, 2, 3, 1, 1, 2, 3, 1, 2, 1, 3, 2, 1, 1, 2,
  3, 1, 2, 1, 2, 3, 1, 1, 3, 2, 1, 2, 1, 3, 1, 2, 3, 1, 2, 1,
  1, 3, 2, 1, 2, 3, 1, 2, 1, 3, 2, 1, 3, 1, 2, 1, 2, 3, 1, 1,
];

export function HomeCards({ name = "은후" }: { name?: string }) {
  return (
    <div className="space-y-4 p-4">
      <BarcodeCard />
      <GreetingCard name={name} />
      <AttendanceCard />
    </div>
  );
}

function BarcodeCard() {
  return (
    <div className="rounded-2xl bg-white p-4">
      <div className="flex h-14 items-stretch gap-[1.5px]" aria-label="바코드">
        {BAR_WIDTHS.map((w, i) => (
          <div key={i} className="bg-black" style={{ flex: `${w} 0 0` }} />
        ))}
      </div>
    </div>
  );
}

function GreetingCard({ name }: { name: string }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    // 분 단위 갱신 — 날짜·시간대 인사 바뀔 때만 필요
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const dateText = now ? formatDate(now) : "";
  const greeting = now ? greetingForHour(now.getHours()) : "";

  return (
    <div className="rounded-2xl bg-card p-5">
      {/* placeholder   : mount 전에도 높이 유지 (레이아웃 흔들림 방지) */}
      <p className="text-xs text-muted">{dateText || " "}</p>
      <h2 className="mt-2 text-2xl leading-[1.2] font-black tracking-tighter text-fg">
        <span className="bg-gradient-to-r from-primary via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
          {name}님,
        </span>
        <br />
        {greeting || " "} <span aria-hidden>👋</span>
      </h2>
    </div>
  );
}

function AttendanceCard() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const clock = now
    ? [
        String(now.getHours()).padStart(2, "0"),
        String(now.getMinutes()).padStart(2, "0"),
        String(now.getSeconds()).padStart(2, "0"),
      ].join(" : ")
    : "-- : -- : --";

  // 근무 시간 · 출퇴근 : 지금은 모두 미출근 상태 mock
  const percent = 0;
  const checkedIn = "--:--";
  const checkedOut = "--:--";

  return (
    <div className="rounded-2xl bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">오늘 근무</p>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-muted">
          미출근
        </span>
      </div>
      <p className="mt-2 text-4xl font-black tracking-tighter text-fg tabular-nums">
        {clock}
      </p>

      {/* 프로그레스 바 — 06:20 ~ 18:20 근무 구간, 현재 진행률 */}
      <div className="mt-6 h-0.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-sm">
        <span className="text-muted tabular-nums">06:20</span>
        <span className="font-semibold text-primary">{percent}%</span>
        <span className="text-muted tabular-nums">18:20</span>
      </div>

      <div className="mt-6 flex items-center justify-between text-sm">
        <div className="flex items-center gap-3">
          <span className="text-muted">출근</span>
          <span className="text-fg tabular-nums">{checkedIn}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-muted">퇴근</span>
          <span className="text-fg tabular-nums">{checkedOut}</span>
        </div>
      </div>
    </div>
  );
}
