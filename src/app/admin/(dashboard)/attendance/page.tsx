"use client";

import type { ComponentType, SVGProps } from "react";
import {
  ArrowPathIcon,
  CalendarIcon,
  ChevronDownIcon,
  ClockIcon,
  PlusIcon,
  QueueListIcon,
} from "@heroicons/react/24/outline";
import { PageTitle } from "../PageTitle";

// 근태·월차 페이지 — 월별 출퇴근 기록 + 휴가 신청 조회.
// mock 데이터. 근태 API 미구현 (근무일·출퇴근·휴가 CRUD 모두 다음 스텝).

// ─────────────── mock ───────────────
interface AttendanceRecord {
  date: string; // "07-01"
  dow: string; // "수"
  checkIn: string; // "오전 09:07"
  checkOut: string; // "오후 05:30"
  hours: string; // "8h 23m"
}
const RECORDS: AttendanceRecord[] = [
  { date: "07-01", dow: "수", checkIn: "오전 09:07", checkOut: "오후 05:30", hours: "8h 23m" },
  { date: "07-02", dow: "목", checkIn: "오전 09:03", checkOut: "오후 06:07", hours: "9h 4m" },
  { date: "07-03", dow: "금", checkIn: "오전 09:10", checkOut: "오후 06:08", hours: "8h 58m" },
  { date: "07-06", dow: "월", checkIn: "오전 09:09", checkOut: "오후 05:30", hours: "8h 21m" },
  { date: "07-07", dow: "화", checkIn: "오전 09:05", checkOut: "오후 06:12", hours: "9h 7m" },
  { date: "07-08", dow: "수", checkIn: "오전 09:01", checkOut: "오후 06:13", hours: "9h 12m" },
  { date: "07-09", dow: "목", checkIn: "오전 09:08", checkOut: "오후 06:14", hours: "9h 6m" },
  { date: "07-10", dow: "금", checkIn: "오전 09:04", checkOut: "오후 08:15", hours: "11h 11m" },
  { date: "07-13", dow: "월", checkIn: "오전 09:03", checkOut: "오후 06:06", hours: "9h 3m" },
  { date: "07-14", dow: "화", checkIn: "오전 09:10", checkOut: "오후 06:07", hours: "8h 57m" },
  { date: "07-15", dow: "수", checkIn: "오전 09:02", checkOut: "오후 06:09", hours: "9h 7m" },
  { date: "07-16", dow: "목", checkIn: "오전 09:06", checkOut: "오후 06:15", hours: "9h 9m" },
  { date: "07-17", dow: "금", checkIn: "오전 09:11", checkOut: "오후 06:04", hours: "8h 53m" },
  { date: "07-20", dow: "월", checkIn: "오전 09:00", checkOut: "오후 06:20", hours: "9h 20m" },
  { date: "07-21", dow: "화", checkIn: "오전 09:05", checkOut: "오후 06:10", hours: "9h 5m" },
  { date: "07-22", dow: "수", checkIn: "오전 09:12", checkOut: "오후 06:18", hours: "9h 6m" },
  { date: "07-23", dow: "목", checkIn: "오전 09:08", checkOut: "오후 06:03", hours: "8h 55m" },
  { date: "07-24", dow: "금", checkIn: "오전 09:04", checkOut: "오후 06:22", hours: "9h 18m" },
  { date: "07-27", dow: "월", checkIn: "오전 09:07", checkOut: "오후 06:11", hours: "9h 4m" },
  { date: "07-28", dow: "화", checkIn: "오전 09:03", checkOut: "오후 06:19", hours: "9h 16m" },
];

type LeaveType = "연차" | "반차";
type LeaveStatus = "승인" | "대기";
interface Leave {
  type: LeaveType;
  days: number;
  dateRange: string;
  reason: string;
  status: LeaveStatus;
  dot: string;
}
const LEAVES: Leave[] = [
  {
    type: "연차",
    days: 1,
    dateRange: "2026-07-14",
    reason: "개인 사유",
    status: "승인",
    dot: "bg-primary",
  },
  {
    type: "반차",
    days: 1,
    dateRange: "2026-08-04",
    reason: "병원 진료 (오후)",
    status: "대기",
    dot: "bg-violet-400",
  },
  {
    type: "연차",
    days: 3,
    dateRange: "2026-08-18 ~ 2026-08-20",
    reason: "여름 휴가",
    status: "대기",
    dot: "bg-primary",
  },
];

// ─────────────── page ───────────────

export default function AttendancePage() {
  return (
    <div>
      <PageTitle title="근태 · 월차" />

      {/* 상단 : 좌 페이지 제목·부제, 우 컨트롤 */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-fg">
            근태 · 월차
          </h1>
          <p className="mt-1 text-sm text-muted">
            월별 출퇴근 기록과 휴가 신청을 관리합니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-label="새로고침"
            className="rounded-full border border-line p-2 text-muted transition-colors hover:bg-card-hover hover:text-fg"
          >
            <ArrowPathIcon className="size-4" />
          </button>
          <button
            type="button"
            className="flex items-center gap-2 rounded-md border border-line bg-card-hover px-3 py-2 text-sm font-semibold text-fg hover:bg-line"
          >
            <CalendarIcon className="size-4 text-muted" />
            2026년 7월
            <ChevronDownIcon className="size-4 text-muted" />
          </button>
          <button
            type="button"
            className="flex items-center gap-1 rounded-md border border-primary bg-primary/25 px-3 py-2 text-sm font-semibold text-primary shadow-lg shadow-primary/20 transition-colors hover:bg-primary/35"
          >
            <PlusIcon className="size-4" />
            휴가 신청
          </button>
        </div>
      </div>

      {/* 통계 4 카드 */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="2026-07 근무일"
          value="19일"
          icon={CalendarIcon}
          tone="primary"
        />
        <StatCard
          label="평균 근무시간"
          value="9h 16m"
          icon={ClockIcon}
          tone="emerald"
        />
        <StatCard
          label="사용한 휴가"
          value="1일"
          icon={QueueListIcon}
          tone="amber"
        />
        <StatCard
          label="승인 대기"
          value="2건"
          icon={ClockIcon}
          tone="violet"
        />
      </div>

      {/* 본문 : 좌 출퇴근 기록 (2/3), 우 휴가 신청 (1/3) */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecordsCard />
        </div>
        <div>
          <LeavesCard />
        </div>
      </div>
    </div>
  );
}

// ─────────────── StatCard ───────────────

type StatTone = "primary" | "emerald" | "amber" | "violet";
const STAT_TONE: Record<StatTone, { bg: string; text: string }> = {
  primary: { bg: "bg-primary/15", text: "text-primary" },
  emerald: { bg: "bg-emerald-500/15", text: "text-emerald-400" },
  amber: { bg: "bg-amber-500/15", text: "text-amber-400" },
  violet: { bg: "bg-violet-500/15", text: "text-violet-400" },
};

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  tone: StatTone;
}) {
  const t = STAT_TONE[tone];
  return (
    <div className="rounded-lg border border-line bg-card p-5">
      <div className="flex items-center gap-4">
        <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${t.bg}`}>
          <Icon className={`size-6 ${t.text}`} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm text-muted">{label}</p>
          <p className="mt-0.5 text-2xl font-black tracking-tighter text-fg tabular-nums">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────── RecordsCard ───────────────

function RecordsCard() {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-card">
      <div className="px-6 pt-5 pb-4">
        <h2 className="text-base font-bold text-fg">2026-07 출퇴근 기록</h2>
        <p className="mt-1 text-xs text-muted">총 {RECORDS.length}일 기록</p>
      </div>
      {/* 컬럼 헤더 */}
      <div className="grid grid-cols-[1fr_1fr_1fr_1fr] border-y border-line px-6 py-3 text-xs font-semibold text-muted">
        <span>일자</span>
        <span>출근</span>
        <span>퇴근</span>
        <span className="text-right">근무시간</span>
      </div>
      <ul className="divide-y divide-line">
        {RECORDS.map((r) => (
          <li
            key={r.date}
            className="grid grid-cols-[1fr_1fr_1fr_1fr] items-center px-6 py-3 text-sm"
          >
            <div>
              <p className="font-semibold tabular-nums text-fg">{r.date}</p>
              <p className="text-xs text-muted">{r.dow}</p>
            </div>
            <span className="tabular-nums text-muted">{r.checkIn}</span>
            <span className="tabular-nums text-muted">{r.checkOut}</span>
            <span className="text-right font-semibold tabular-nums text-fg">
              {r.hours}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─────────────── LeavesCard ───────────────

function LeavesCard() {
  return (
    <div className="rounded-lg border border-line bg-card">
      <div className="px-6 pt-5 pb-4">
        <h2 className="text-base font-bold text-fg">내 휴가 신청</h2>
        <p className="mt-1 text-xs text-muted">최근 신청 {LEAVES.length}건</p>
      </div>
      <ul className="space-y-3 border-t border-line px-6 py-5">
        {LEAVES.map((v, i) => (
          <li key={i} className="rounded-md border border-line p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`size-1.5 rounded-full ${v.dot}`} />
                <span className="text-sm font-semibold text-fg">{v.type}</span>
                <span className="text-xs text-muted">· {v.days}일</span>
              </div>
              <LeaveStatusChip status={v.status} />
            </div>
            <p className="mt-2 text-xs tabular-nums text-muted">
              {v.dateRange}
            </p>
            <p className="mt-1 text-sm text-fg">{v.reason}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LeaveStatusChip({ status }: { status: LeaveStatus }) {
  const cls =
    status === "승인"
      ? "bg-emerald-500/15 text-emerald-400"
      : "bg-amber-500/15 text-amber-400";
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-xs font-semibold ${cls}`}
    >
      {status}
    </span>
  );
}
