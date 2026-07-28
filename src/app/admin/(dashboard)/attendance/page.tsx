"use client";

import { useMemo, useState, type ComponentType, type SVGProps } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowPathIcon,
  CalendarIcon,
  ChevronDownIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  QueueListIcon,
} from "@heroicons/react/24/outline";
import { getMe } from "@/lib/api/auth";
import { getV2ErrorMessage } from "@/lib/api/v2/client";
import {
  cancelLeave,
  formatCheckTime,
  formatWorkDuration,
  leaveTypeLabel,
  listAttendance,
  listLeaves,
  parseDateParts,
  scanAttendance,
  type AttendanceOut,
  type LeaveRequestOut,
  type LeaveStatus,
  type LeaveType,
} from "@/lib/api/v2/attendance";
import { PageTitle } from "../PageTitle";
import { LeaveRequestDialog } from "./LeaveRequestDialog";

// 근태 · 월차 — GET /attendance?month · GET /leaves?employeeId=me · POST /attendance/scan · POST /leaves.
// 월 선택 : 상단 select. 통계는 그 월 기준 근무일 · 평균 근무시간 · 사용한 휴가(승인) · 승인 대기(내 것).

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// 최근 12개월 옵션.
function monthOptions(): { key: string; label: string }[] {
  const now = new Date();
  const list: { key: string; label: string }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
    list.push({ key, label });
  }
  return list;
}

export default function AttendancePage() {
  const [month, setMonth] = useState<string>(currentMonthKey());
  const [leaveOpen, setLeaveOpen] = useState(false);
  const queryClient = useQueryClient();

  const meQuery = useQuery({ queryKey: ["admin", "me"], queryFn: getMe });
  const meId = meQuery.data?.id ?? null;

  const attendanceQuery = useQuery({
    queryKey: ["v2", "attendance", { employeeId: meId, month }] as const,
    queryFn: () =>
      listAttendance({ employeeId: meId ?? undefined, month }),
    enabled: !!meId,
  });
  const records = attendanceQuery.data ?? [];

  const leavesQuery = useQuery({
    queryKey: ["v2", "leaves", { employeeId: meId }] as const,
    queryFn: () => listLeaves({ employeeId: meId ?? undefined }),
    enabled: !!meId,
  });
  const leaves = leavesQuery.data ?? [];

  const scanMutation = useMutation({
    mutationFn: () => scanAttendance({}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "attendance"] });
    },
  });

  // 오늘 근태 (스캔 버튼 라벨 결정용).
  const todayKey = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);
  const todayRecord = records.find((r) => r.date === todayKey);
  const scanLabel = !todayRecord
    ? "출근하기"
    : !todayRecord.checkOut
      ? "퇴근하기"
      : "재퇴근";

  // 통계.
  const stats = useMemo(() => {
    const worked = records.filter((r) => r.checkIn != null).length;
    const withHours = records.filter((r) => r.workMinutes != null);
    const avgMinutes =
      withHours.length > 0
        ? withHours.reduce((sum, r) => sum + (r.workMinutes ?? 0), 0) /
          withHours.length
        : 0;
    const usedLeaves = leaves
      .filter((l) => l.status === "APPROVED")
      .reduce((sum, l) => sum + l.days, 0);
    const pendingLeaves = leaves.filter((l) => l.status === "PENDING").length;
    return {
      workedDays: worked,
      avgWork: formatWorkDuration(Math.round(avgMinutes)),
      usedLeaves,
      pendingLeaves,
    };
  }, [records, leaves]);

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["v2", "attendance"] });
    queryClient.invalidateQueries({ queryKey: ["v2", "leaves"] });
  }

  return (
    <div>
      <PageTitle title="근태 · 월차" />

      {/* 상단 */}
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
            onClick={refresh}
            aria-label="새로고침"
            className="rounded-full border border-line p-2 text-muted transition-colors hover:bg-card-hover hover:text-fg"
          >
            <ArrowPathIcon
              className={`size-4 ${attendanceQuery.isFetching ? "animate-spin" : ""}`}
            />
          </button>
          <MonthSelect value={month} onChange={setMonth} />
          <button
            type="button"
            onClick={() => scanMutation.mutate()}
            disabled={scanMutation.isPending}
            className="flex items-center gap-1 rounded-md border border-emerald-400/60 bg-emerald-500/25 px-3 py-2 text-sm font-semibold text-emerald-300 shadow-lg shadow-emerald-500/20 transition-colors hover:bg-emerald-500/35 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ClockIcon className="size-4" />
            {scanMutation.isPending ? "…" : scanLabel}
          </button>
          <button
            type="button"
            onClick={() => setLeaveOpen(true)}
            className="flex items-center gap-1 rounded-md border border-primary bg-primary/25 px-3 py-2 text-sm font-semibold text-primary shadow-lg shadow-primary/20 transition-colors hover:bg-primary/35"
          >
            <PlusIcon className="size-4" />
            휴가 신청
          </button>
        </div>
      </div>

      {scanMutation.isError && (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          <ExclamationTriangleIcon className="size-4 shrink-0" />
          <span>{getV2ErrorMessage(scanMutation.error)}</span>
        </div>
      )}

      {/* 통계 4 카드 */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label={`${month} 근무일`}
          value={`${stats.workedDays}일`}
          icon={CalendarIcon}
          tone="primary"
        />
        <StatCard
          label="평균 근무시간"
          value={stats.avgWork}
          icon={ClockIcon}
          tone="emerald"
        />
        <StatCard
          label="사용한 휴가"
          value={`${stats.usedLeaves}일`}
          icon={QueueListIcon}
          tone="amber"
        />
        <StatCard
          label="승인 대기"
          value={`${stats.pendingLeaves}건`}
          icon={ClockIcon}
          tone="violet"
        />
      </div>

      {/* 본문 */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecordsCard
            month={month}
            records={records}
            isLoading={attendanceQuery.isLoading || !meId}
            isError={attendanceQuery.isError}
            error={attendanceQuery.error}
          />
        </div>
        <div>
          <LeavesCard
            leaves={leaves}
            isLoading={leavesQuery.isLoading || !meId}
            isError={leavesQuery.isError}
            error={leavesQuery.error}
            onChanged={() =>
              queryClient.invalidateQueries({ queryKey: ["v2", "leaves"] })
            }
          />
        </div>
      </div>

      <LeaveRequestDialog
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ["v2", "leaves"] });
          setLeaveOpen(false);
        }}
      />
    </div>
  );
}

// ─────────────── MonthSelect ───────────────

function MonthSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const opts = monthOptions();
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-md border border-line bg-card-hover px-3 py-2 pr-9 text-sm font-semibold text-fg focus:border-primary focus:outline-none"
      >
        {opts.map((o) => (
          <option key={o.key} value={o.key}>
            {o.label}
          </option>
        ))}
      </select>
      <CalendarIcon className="pointer-events-none absolute top-1/2 left-2.5 hidden size-4 -translate-y-1/2 text-muted" />
      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted" />
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
        <div
          className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${t.bg}`}
        >
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

function RecordsCard({
  month,
  records,
  isLoading,
  isError,
  error,
}: {
  month: string;
  records: AttendanceOut[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-card">
      <div className="px-6 pt-5 pb-4">
        <h2 className="text-base font-bold text-fg">{month} 출퇴근 기록</h2>
        <p className="mt-1 text-xs text-muted">총 {records.length}일 기록</p>
      </div>
      <div className="grid grid-cols-[1fr_1fr_1fr_1fr] border-y border-line px-6 py-3 text-xs font-semibold text-muted">
        <span>일자</span>
        <span>출근</span>
        <span>퇴근</span>
        <span className="text-right">근무시간</span>
      </div>
      {isLoading ? (
        <ul className="divide-y divide-line">
          {[0, 1, 2, 3, 4].map((i) => (
            <li key={i} className="animate-pulse px-6 py-4">
              <div className="h-4 w-1/3 rounded bg-card-hover" />
            </li>
          ))}
        </ul>
      ) : isError ? (
        <div className="px-6 py-10 text-center text-sm text-red-300">
          {getV2ErrorMessage(error)}
        </div>
      ) : records.length === 0 ? (
        <div className="px-6 py-10 text-center text-sm text-muted">
          이번 달 기록이 없어요.
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {records.map((r) => {
            const parts = parseDateParts(r.date);
            return (
              <li
                key={r.id}
                className="grid grid-cols-[1fr_1fr_1fr_1fr] items-center px-6 py-3 text-sm"
              >
                <div>
                  <p className="font-semibold tabular-nums text-fg">
                    {parts.md}
                  </p>
                  <p className="text-xs text-muted">{parts.dow}</p>
                </div>
                <span className="tabular-nums text-muted">
                  {formatCheckTime(r.checkIn)}
                </span>
                <span className="tabular-nums text-muted">
                  {formatCheckTime(r.checkOut)}
                </span>
                <span className="text-right font-semibold tabular-nums text-fg">
                  {formatWorkDuration(r.workMinutes)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─────────────── LeavesCard ───────────────

function LeavesCard({
  leaves,
  isLoading,
  isError,
  error,
  onChanged,
}: {
  leaves: LeaveRequestOut[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onChanged: () => void;
}) {
  return (
    <div className="rounded-lg border border-line bg-card">
      <div className="px-6 pt-5 pb-4">
        <h2 className="text-base font-bold text-fg">내 휴가 신청</h2>
        <p className="mt-1 text-xs text-muted">
          최근 신청 {leaves.length}건
        </p>
      </div>
      {isLoading ? (
        <div className="space-y-3 border-t border-line px-6 py-5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-md border border-line"
            />
          ))}
        </div>
      ) : isError ? (
        <div className="border-t border-line px-6 py-10 text-center text-sm text-red-300">
          {getV2ErrorMessage(error)}
        </div>
      ) : leaves.length === 0 ? (
        <div className="border-t border-line px-6 py-10 text-center text-sm text-muted">
          신청 이력이 없어요.
        </div>
      ) : (
        <ul className="space-y-3 border-t border-line px-6 py-5">
          {leaves.map((v) => (
            <LeaveItem key={v.id} leave={v} onChanged={onChanged} />
          ))}
        </ul>
      )}
    </div>
  );
}

const LEAVE_TYPE_DOT: Record<LeaveType, string> = {
  ANNUAL: "bg-primary",
  HALF: "bg-violet-400",
  SICK: "bg-red-400",
  FIELD: "bg-emerald-400",
  ETC: "bg-slate-400",
};

function LeaveItem({
  leave,
  onChanged,
}: {
  leave: LeaveRequestOut;
  onChanged: () => void;
}) {
  const cancelMutation = useMutation({
    mutationFn: () => cancelLeave(leave.id),
    onSuccess: () => onChanged(),
  });
  const canCancel = leave.status === "PENDING";
  const dateRange =
    leave.startDate === leave.endDate
      ? leave.startDate
      : `${leave.startDate} ~ ${leave.endDate}`;

  return (
    <li className="rounded-md border border-line p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`size-1.5 rounded-full ${LEAVE_TYPE_DOT[leave.type]}`}
          />
          <span className="text-sm font-semibold text-fg">
            {leaveTypeLabel(leave.type)}
          </span>
          <span className="text-xs text-muted">· {leave.days}일</span>
        </div>
        <LeaveStatusChip status={leave.status} />
      </div>
      <p className="mt-2 text-xs tabular-nums text-muted">{dateRange}</p>
      {leave.reason && <p className="mt-1 text-sm text-fg">{leave.reason}</p>}
      {leave.status === "REJECTED" && leave.rejectReason && (
        <p className="mt-1 text-xs text-red-300">
          반려 사유 : {leave.rejectReason}
        </p>
      )}
      {canCancel && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => {
              if (!confirm("이 휴가 신청을 취소할까요?")) return;
              cancelMutation.mutate();
            }}
            disabled={cancelMutation.isPending}
            className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold text-muted transition-colors hover:bg-card-hover hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
          >
            {cancelMutation.isPending ? "취소 중…" : "취소"}
          </button>
        </div>
      )}
      {cancelMutation.isError && (
        <p className="mt-2 rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1 text-xs text-red-300">
          {getV2ErrorMessage(cancelMutation.error)}
        </p>
      )}
    </li>
  );
}

function LeaveStatusChip({ status }: { status: LeaveStatus }) {
  const cls =
    status === "APPROVED"
      ? "bg-emerald-500/15 text-emerald-400"
      : status === "PENDING"
        ? "bg-amber-500/15 text-amber-400"
        : status === "REJECTED"
          ? "bg-red-500/15 text-red-400"
          : "bg-card-hover text-muted";
  const label =
    status === "APPROVED"
      ? "승인"
      : status === "PENDING"
        ? "대기"
        : status === "REJECTED"
          ? "반려"
          : "취소";
  return (
    <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}
