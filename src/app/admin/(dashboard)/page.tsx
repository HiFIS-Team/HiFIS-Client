"use client";

import { PageTitle } from "./PageTitle";
import Link from "next/link";
import { useEffect, useMemo, useState, type ComponentType, type SVGProps } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRightIcon,
  BanknotesIcon,
  HandRaisedIcon,
  CalendarIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  DocumentTextIcon,
  FolderIcon,
  MegaphoneIcon,
  TrophyIcon,
} from "@heroicons/react/24/outline";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { getMe } from "@/lib/api/auth";
import { getV2ErrorMessage } from "@/lib/api/v2/client";
import {
  formatCheckTime,
  listAttendance,
  scanAttendance,
} from "@/lib/api/v2/attendance";
import { getMe as getMeV2 } from "@/lib/api/v2/auth";
import { listEvents } from "@/lib/api/v2/events";
import {
  computeDday,
  listProjects,
  type ProjectOut,
} from "@/lib/api/v2/projects";


export default function AdminDashboardPage() {
  const meQuery = useQuery({
    queryKey: ["admin", "me"],
    queryFn: getMe,
    retry: false,
  });
  const name = meQuery.data?.name ?? "";

  return (
    <div>
      <PageTitle title="대시보드" />
      {/* 홈 인사말 — 카드 안 두 줄 (오늘 날짜 kicker + 한 줄 인사).
          이름에만 그라데이션 — 단색 보라 위에 한 군데 포인트. */}
      <div className="rounded-lg border border-line bg-card px-6 py-5">
        <GreetingDate />
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-black tracking-tighter text-fg">
          <span>안녕하세요</span>
          <span className="bg-gradient-to-r from-primary via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            {name ? `${name}님!` : "환영합니다!"}
          </span>
          <HandRaisedIcon className="size-6 text-primary" />
        </h1>
      </div>

      <div className="mt-2">
        <AttendanceCard />
      </div>

      <div className="mt-2">
        <AppShortcutCard />
      </div>

      {/* 일정 · 프로젝트 : 모바일 세로, PC 는 양옆 2열. */}
      <div className="mt-2 grid grid-cols-1 gap-2 lg:grid-cols-2">
        <ScheduleCard />
        <ProjectsCard />
      </div>

    </div>
  );
}

// 홈 인사말 위 kicker — "7월 27일 월요일" 형식.
// hydration mismatch 방지 : mount 후에만 실제 날짜 표시, 초기엔 nbsp 로 높이 유지.
const WEEKDAY_KO = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
function GreetingDate() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    // 분 단위 갱신 — 자정 넘어가면 자동 반영
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  const text = now
    ? `${now.getMonth() + 1}월 ${now.getDate()}일 ${WEEKDAY_KO[now.getDay()]}`
    : " ";
  return <p className="text-xs text-muted">{text}</p>;
}

// 오늘 근무 카드 — 실시간 시계 + 근무 시간 진행률 + 출퇴근 버튼.
// shiftStart/End 는 v2 me 에서 로드. 미설정이면 진행률 계산 skip.
// 오늘 attendance 는 listAttendance(month=이번달) 결과에서 오늘 date 로 필터.
function AttendanceCard() {
  const [now, setNow] = useState<Date | null>(null);
  const queryClient = useQueryClient();
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const meV2Query = useQuery({
    queryKey: ["v2", "me"] as const,
    queryFn: getMeV2,
  });
  const meId = meV2Query.data?.id ?? null;
  const shiftStart = meV2Query.data?.shiftStart; // "HH:MM"
  const shiftEnd = meV2Query.data?.shiftEnd;

  const monthKey = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, []);
  const todayKey = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const attendanceQuery = useQuery({
    queryKey: ["v2", "attendance", { employeeId: meId, month: monthKey }] as const,
    queryFn: () =>
      listAttendance({ employeeId: meId ?? undefined, month: monthKey }),
    enabled: !!meId,
  });
  const today = attendanceQuery.data?.find((r) => r.date === todayKey) ?? null;

  const scanMutation = useMutation({
    mutationFn: () => scanAttendance({}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "attendance"] });
    },
  });

  const clock = now
    ? [
        String(now.getHours()).padStart(2, "0"),
        String(now.getMinutes()).padStart(2, "0"),
        String(now.getSeconds()).padStart(2, "0"),
      ].join(" : ")
    : "-- : -- : --";

  // 진행률 계산 — shiftStart~shiftEnd 사이의 현재 위치.
  const percent = useMemo(() => {
    if (!now || !shiftStart || !shiftEnd) return 0;
    const startMin = hhmmToMin(shiftStart);
    const endMin = hhmmToMin(shiftEnd);
    if (endMin <= startMin) return 0;
    const nowMin = now.getHours() * 60 + now.getMinutes();
    return Math.max(0, Math.min(100, ((nowMin - startMin) / (endMin - startMin)) * 100));
  }, [now, shiftStart, shiftEnd]);

  const status = !today
    ? "미출근"
    : today.checkOut
      ? "퇴근"
      : "근무 중";
  const statusStyle =
    status === "근무 중"
      ? "bg-primary/20 text-primary"
      : status === "퇴근"
        ? "bg-emerald-500/20 text-emerald-400"
        : "bg-white/10 text-muted";

  const scanLabel = !today ? "출근" : !today.checkOut ? "퇴근" : "재퇴근";

  return (
    <div className="rounded-lg border border-line bg-card px-6 py-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">오늘 근무</p>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${statusStyle}`}
        >
          {status}
        </span>
      </div>
      <p className="mt-2 text-center text-4xl font-black tracking-tighter text-fg tabular-nums">
        {clock}
      </p>
      <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-sm">
        <span className="text-muted tabular-nums">{shiftStart ?? "--:--"}</span>
        <span className="font-semibold text-primary">
          {Math.round(percent)}%
        </span>
        <span className="text-muted tabular-nums">{shiftEnd ?? "--:--"}</span>
      </div>
      <div className="mt-6 flex items-center justify-between text-sm">
        <div className="flex items-center gap-3">
          <span className="text-muted">출근</span>
          <span className="text-fg tabular-nums">
            {formatCheckTime(today?.checkIn ?? null)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-muted">퇴근</span>
          <span className="text-fg tabular-nums">
            {formatCheckTime(today?.checkOut ?? null)}
          </span>
        </div>
      </div>

      {/* 출퇴근 버튼 */}
      <button
        type="button"
        onClick={() => scanMutation.mutate()}
        disabled={scanMutation.isPending || !meId}
        className="mt-4 w-full rounded-md border border-emerald-400/60 bg-emerald-500/25 py-2 text-sm font-semibold text-emerald-300 shadow-lg shadow-emerald-500/20 transition-colors hover:bg-emerald-500/35 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {scanMutation.isPending ? "…" : scanLabel}
      </button>
      {scanMutation.isError && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-red-300">
          <ExclamationTriangleIcon className="mt-0.5 size-3.5 shrink-0" />
          {getV2ErrorMessage(scanMutation.error)}
        </p>
      )}
    </div>
  );
}

function hhmmToMin(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

// 앱 shortcut 카드 — 4열 그리드. 각 셀 : 컬러 아이콘 + 라벨 (+ 뱃지).
// 뱃지는 mock. 나중에 알림·업무 카운트로 연결.
interface ShortcutItem {
  label: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  tone: string;
  badge?: number;
}
const SHORTCUTS: ShortcutItem[] = [
  { label: "업무", href: "/admin/tasks", icon: ClipboardDocumentCheckIcon, tone: "text-primary", badge: 2 },
  { label: "프로젝트", href: "/admin/projects", icon: FolderIcon, tone: "text-yellow-400", badge: 2 },
  { label: "회의록", href: "/admin/meetings", icon: DocumentTextIcon, tone: "text-sky-400" },
  { label: "근태 · 월차", href: "/admin/attendance", icon: ClockIcon, tone: "text-pink-400" },
  { label: "랭킹", href: "/admin/ranking", icon: TrophyIcon, tone: "text-amber-400" },
  { label: "일정", href: "/admin/schedule", icon: CalendarIcon, tone: "text-violet-400" },
  { label: "급여", href: "/admin/payroll", icon: BanknotesIcon, tone: "text-emerald-400" },
  { label: "공지", href: "/admin/notices", icon: MegaphoneIcon, tone: "text-lime-400", badge: 1 },
];

function AppShortcutCard() {
  return (
    <div className="rounded-lg border border-line bg-card px-6 py-5">
      <div className="grid grid-cols-4 gap-y-5">
        {SHORTCUTS.map((s) => (
          <ShortcutTile key={s.label} {...s} />
        ))}
      </div>
    </div>
  );
}

function ShortcutTile({ label, href, icon: Icon, tone, badge }: ShortcutItem) {
  // 클릭·hover 영역이 grid 셀 전체가 아니라 아이콘+라벨 크기까지만 되도록,
  // 링크 자체는 inline-flex 로 폭을 컨텐츠에 맞추고 셀 안에서 중앙 정렬.
  return (
    <div className="flex justify-center">
      <Link
        href={href}
        className="inline-flex flex-col items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors hover:bg-card-hover"
      >
        <span className="relative inline-flex">
          <Icon className={`size-5 ${tone}`} />
          {badge ? (
            <span className="absolute -top-1.5 -right-2 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
              {badge}
            </span>
          ) : null}
        </span>
        <span className="text-sm text-muted">{label}</span>
      </Link>
    </div>
  );
}

// 홈 리스트 카드 공용 헤더 — 좌측 제목·카운트, 우측 "전체 →".
function ListCardHeader({
  title,
  count,
  href,
}: {
  title: string;
  count: number;
  href: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-baseline gap-2">
        <h3 className="text-base font-bold text-fg">{title}</h3>
        <span className="text-sm text-muted tabular-nums">{count}</span>
      </div>
      <Link
        href={href}
        className="flex items-center gap-1 text-sm text-muted transition-colors hover:text-fg"
      >
        전체 <ArrowRightIcon className="size-4" />
      </Link>
    </div>
  );
}

// 하단 fade 힌트 (더 있음 암시) — 실제 로딩 skeleton 아님.
function TeaseRow() {
  return (
    <li className="flex items-center gap-3 pl-3">
      <span className="h-6 w-0.5 rounded-full bg-white/10" />
      <span className="h-2 w-1/2 rounded-full bg-white/10" />
    </li>
  );
}

// 오늘 일정 — GET /events?from=오늘00:00&to=오늘23:59.
// 시간 순 정렬은 서버가 제공.
function ScheduleCard() {
  // 오늘 [00:00, 다음날 00:00) — mount 시 1회 고정.
  const range = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
    );
    return {
      from: start.toISOString(),
      to: end.toISOString(),
    };
  }, []);

  const eventsQuery = useQuery({
    queryKey: ["v2", "events", "today", range] as const,
    queryFn: () => listEvents(range),
  });
  const events = eventsQuery.data ?? [];
  const display = events.slice(0, 3);

  return (
    <div className="rounded-lg border border-line bg-card px-6 py-5">
      <ListCardHeader
        title="오늘 일정"
        count={events.length}
        href="/admin/schedule"
      />
      {eventsQuery.isLoading ? (
        <ul className="mt-4 space-y-3">
          {[0, 1, 2].map((i) => (
            <li key={i} className="flex items-center gap-3">
              <span className="h-8 w-1 rounded-full bg-white/10" />
              <span className="h-3 flex-1 rounded bg-white/10" />
              <span className="h-4 w-12 rounded-full bg-white/10" />
            </li>
          ))}
        </ul>
      ) : events.length === 0 ? (
        <p className="mt-4 py-6 text-center text-sm text-muted">
          오늘 예정된 일정이 없어요.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {display.map((e) => (
            <li
              key={e.id}
              className="flex items-center gap-3 border-b border-line pb-3 last:border-b-0 last:pb-0"
            >
              <span
                className="h-8 w-1 rounded-full"
                style={{ backgroundColor: colorHint(e.color) }}
              />
              <span className="flex-1 truncate font-semibold text-fg">
                {e.title}
              </span>
              <span className="rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-bold tabular-nums text-primary">
                {formatHM(e.startAt)}
              </span>
            </li>
          ))}
          {events.length < 3 && (
            <>
              <TeaseRow />
              <TeaseRow />
            </>
          )}
        </ul>
      )}
    </div>
  );
}

// 백엔드가 저장하는 color 는 자유 문자열 (hex/이름). hex 는 그대로, 아니면 primary fallback.
function colorHint(color: string): string {
  if (/^#[0-9a-fA-F]{3,8}$/.test(color)) return color;
  return "var(--color-primary)";
}

function formatHM(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--:--";
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

// 프로젝트 — GET /projects. 미완료(진행중·대기·누락) 중 마감 임박 순으로 3개.
function ProjectsCard() {
  const [today] = useState(() => new Date());
  const projectsQuery = useQuery({
    queryKey: ["v2", "projects"] as const,
    queryFn: () => listProjects(),
  });
  const projects = projectsQuery.data ?? [];

  const upcoming = useMemo(() => {
    const active = projects.filter((p) => p.status !== "DONE");
    return [...active].sort(
      (a, b) => computeDday(a.due, today) - computeDday(b.due, today),
    );
  }, [projects, today]);
  const display = upcoming.slice(0, 3);

  return (
    <div className="rounded-lg border border-line bg-card px-6 py-5">
      <ListCardHeader
        title="프로젝트"
        count={upcoming.length}
        href="/admin/projects"
      />
      {projectsQuery.isLoading ? (
        <ul className="mt-4 space-y-3">
          {[0, 1, 2].map((i) => (
            <li key={i} className="flex items-center gap-3">
              <span className="h-8 w-1 rounded-full bg-white/10" />
              <span className="h-3 flex-1 rounded bg-white/10" />
              <span className="h-4 w-10 rounded-full bg-white/10" />
            </li>
          ))}
        </ul>
      ) : upcoming.length === 0 ? (
        <p className="mt-4 py-6 text-center text-sm text-muted">
          진행 중인 프로젝트가 없어요.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {display.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 border-b border-line pb-3 last:border-b-0 last:pb-0"
            >
              <span className={`h-8 w-1 rounded-full ${projectAccent(p)}`} />
              <span className="flex-1 truncate font-semibold text-fg">
                {p.title}
              </span>
              <DdayBadge dday={computeDday(p.due, today)} />
            </li>
          ))}
          {upcoming.length < 3 && (
            <>
              <TeaseRow />
              <TeaseRow />
            </>
          )}
        </ul>
      )}
    </div>
  );
}

function projectAccent(p: ProjectOut): string {
  if (p.status === "MISSED") return "bg-red-400";
  if (p.status === "WAITING") return "bg-neutral-500";
  return "bg-primary";
}

function DdayBadge({ dday }: { dday: number }) {
  const urgent = dday <= 14;
  const cls = urgent
    ? "bg-yellow-400/20 text-yellow-400"
    : "bg-primary/20 text-primary";
  const text = dday === 0 ? "D-day" : dday > 0 ? `D-${dday}` : `D+${-dday}`;
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ${cls}`}>
      {text}
    </span>
  );
}
