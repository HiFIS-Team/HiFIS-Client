"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowPathIcon,
  ArrowsUpDownIcon,
  ChevronDownIcon,
  ExclamationTriangleIcon,
  KeyIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
  Squares2X2Icon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import type { ComponentType, SVGProps } from "react";
import { PageTitle } from "../PageTitle";
import { getV2ErrorMessage } from "@/lib/api/v2/client";
import {
  avatarTone,
  formatDateDot,
  formatRelative,
  listEmployees,
  rankLabel,
} from "@/lib/api/v2/employees";
import type { EmployeeOut, EmployeeStatus, Role } from "@/lib/api/v2/types";

// 직원 페이지 — 구성원 · 초대키 · 팀 · 직급 4개 서브 탭. 지금은 구성원만 실제로 렌더.
// PC 는 계정 관리와 동일 패턴 : lg 에서 2-column 카드 그리드.
// 기본 뷰 (4-필드) · 상세 뷰 (6-필드) 로 정보 밀도 토글.
//
// 데이터 : GET /employees (지점 스코프는 백엔드가 자동 처리).
// 서버 파라미터로 status 만 보내고, 나머지(role · q)는 클라이언트에서 즉시 필터.
// 이유 : 검색 keystroke 마다 서버 왕복하면 UX 나쁨. 재직 탭 스위치 정도만 서버 왕복.

type MainTab = "members" | "invites" | "teams" | "ranks";

type StatusTab = EmployeeStatus;
const STATUS_TABS: { key: StatusTab; label: string }[] = [
  { key: "ACTIVE", label: "재직" },
  { key: "INACTIVE", label: "비활성" },
  { key: "RESIGNED", label: "퇴사" },
];

type ViewMode = "basic" | "detail";

// ─────────────── page ───────────────

export default function StaffPage() {
  const [tab, setTab] = useState<MainTab>("members");
  const [role, setRole] = useState<"all" | Role>("all");
  const [status, setStatus] = useState<StatusTab>("ACTIVE");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<ViewMode>("basic");
  const queryClient = useQueryClient();

  // 재직/비활성/퇴사 탭 스위치 시 각각 별도 캐시. 필터는 클라이언트에서 처리.
  const employeesQuery = useQuery({
    queryKey: ["v2", "employees", { status }] as const,
    queryFn: () => listEmployees({ status }),
  });
  const employees = employeesQuery.data ?? [];

  // 전 status 카운트 — 헤더 메타 · 상태 탭 카운트에서 씀.
  // 재직 탭 위주로 쓰지만 다른 status 도 알아야 해서 별도 쿼리 (전체 조회, 필터 없이).
  // 백엔드는 status 없으면 전체 반환.
  const allEmployeesQuery = useQuery({
    queryKey: ["v2", "employees", "all"] as const,
    queryFn: () => listEmployees({}),
  });
  const allEmployees = allEmployeesQuery.data ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return employees.filter((e) => {
      if (role !== "all" && e.role !== role) return false;
      if (!q) return true;
      return (
        e.name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        (e.team ?? "").toLowerCase().includes(q)
      );
    });
  }, [employees, role, query]);

  const stats = useMemo(() => {
    const activeN = allEmployees.filter((e) => e.status === "ACTIVE").length;
    const teamsN = new Set(
      allEmployees.map((e) => e.team).filter((t): t is string => !!t),
    ).size;
    const ranksN = new Set(allEmployees.map((e) => e.rank)).size;
    return { total: allEmployees.length, activeN, teamsN, ranksN };
  }, [allEmployees]);

  const statusCount = (k: StatusTab): number =>
    allEmployees.filter((e) => e.status === k).length;

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["v2", "employees"] });
  }

  const MAIN_TABS: {
    key: MainTab;
    label: string;
    icon: ComponentType<SVGProps<SVGSVGElement>>;
    count: number;
  }[] = [
    { key: "members", label: "구성원", icon: UsersIcon, count: stats.total },
    { key: "invites", label: "초대키", icon: KeyIcon, count: 0 },
    { key: "teams", label: "팀", icon: Squares2X2Icon, count: stats.teamsN },
    { key: "ranks", label: "직급", icon: ArrowsUpDownIcon, count: stats.ranksN },
  ];

  return (
    <div>
      <PageTitle title="직원" />

      {/* 상단 : 제목 · 메타 · 우측 액션 */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-fg">직원</h1>
          <p className="mt-1 text-sm text-muted">
            <b className="text-fg">구성원 {stats.total}</b>
            <span className="mx-1.5">·</span>
            활성 {stats.activeN}
            <span className="mx-1.5">·</span>팀 {stats.teamsN}
            <span className="mx-1.5">·</span>직급 {stats.ranksN}
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
              className={`size-4 ${employeesQuery.isFetching ? "animate-spin" : ""}`}
            />
          </button>
          <button
            type="button"
            className="flex items-center gap-1 rounded-md border border-primary bg-primary/25 px-3 py-2 text-sm font-semibold text-primary shadow-lg shadow-primary/20 transition-colors hover:bg-primary/35"
          >
            <PlusIcon className="size-4" />구성원 초대
          </button>
        </div>
      </div>

      {/* 서브 탭 (구성원 · 초대키 · 팀 · 직급) */}
      <div className="mt-5 flex items-center gap-1 border-b border-line">
        {MAIN_TABS.map((t) => {
          const active = tab === t.key;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold transition-colors ${
                active ? "text-primary" : "text-muted hover:text-fg"
              }`}
            >
              <Icon className="size-4" />
              {t.label}
              <span className="tabular-nums text-muted">{t.count}</span>
              {active && (
                <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      {/* 구성원 탭 컨텐츠 */}
      {tab === "members" ? (
        <MembersView
          view={view}
          setView={setView}
          role={role}
          setRole={setRole}
          status={status}
          setStatus={setStatus}
          query={query}
          setQuery={setQuery}
          filtered={filtered}
          statusCount={statusCount}
          isLoading={employeesQuery.isLoading}
          isError={employeesQuery.isError}
          error={employeesQuery.error}
          onRetry={() => employeesQuery.refetch()}
        />
      ) : (
        <ComingPanel label={MAIN_TABS.find((t) => t.key === tab)?.label ?? ""} />
      )}
    </div>
  );
}

// ─────────────── MembersView ───────────────

function MembersView({
  view,
  setView,
  role,
  setRole,
  status,
  setStatus,
  query,
  setQuery,
  filtered,
  statusCount,
  isLoading,
  isError,
  error,
  onRetry,
}: {
  view: ViewMode;
  setView: (v: ViewMode) => void;
  role: "all" | Role;
  setRole: (v: "all" | Role) => void;
  status: StatusTab;
  setStatus: (v: StatusTab) => void;
  query: string;
  setQuery: (v: string) => void;
  filtered: EmployeeOut[];
  statusCount: (k: StatusTab) => number;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  return (
    <div className="mt-5 overflow-hidden rounded-lg border border-line bg-card">
      {/* 카드 헤더 : 제목 · 카운트 · 뷰 토글 */}
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <h2 className="flex items-baseline gap-2 text-base font-black tracking-tight text-fg">
          구성원 목록
          <span className="text-sm font-semibold text-muted tabular-nums">
            {filtered.length}
          </span>
        </h2>
        <ViewToggle value={view} onChange={setView} />
      </div>

      {/* 검색 + 필터 */}
      <div className="space-y-3 border-b border-line px-5 py-4">
        <div className="relative">
          <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이름 · 이메일 · 팀 검색"
            className="w-full rounded-md border border-line bg-card-hover py-2.5 pr-3 pl-9 text-sm text-fg placeholder-muted focus:border-primary focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "all" | Role)}
              className="appearance-none rounded-md border border-line bg-card-hover px-3 py-2 pr-8 text-sm text-fg focus:border-primary focus:outline-none"
            >
              <option value="all">모든 권한</option>
              <option value="ADMIN">관리자</option>
              <option value="MANAGER">매니저</option>
              <option value="MEMBER">멤버</option>
            </select>
            <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted" />
          </div>
          <div className="flex flex-wrap gap-1 rounded-md border border-line p-0.5">
            {STATUS_TABS.map((t) => {
              const active = status === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setStatus(t.key)}
                  className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                    active
                      ? "bg-primary/20 text-primary"
                      : "text-muted hover:bg-card-hover hover:text-fg"
                  }`}
                >
                  {t.label}{" "}
                  <span className="ml-0.5 tabular-nums">
                    {statusCount(t.key)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 리스트 — PC 2-column, 모바일 1-column. 로딩·에러·빈 상태 분기 */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center gap-3 px-5 py-16 text-center">
          <ExclamationTriangleIcon className="size-8 text-red-400" />
          <p className="text-sm text-fg">{getV2ErrorMessage(error)}</p>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-fg hover:bg-card-hover"
          >
            다시 시도
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 px-5 py-16 text-center">
          <UsersIcon className="size-8 text-muted/70" />
          <p className="text-sm text-muted">조건에 맞는 구성원이 없어요.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-2">
          {filtered.map((e) => (
            <EmployeeCard key={e.id} employee={e} view={view} />
          ))}
        </ul>
      )}
    </div>
  );
}

// ─────────────── EmployeeCard ───────────────

function EmployeeCard({
  employee,
  view,
}: {
  employee: EmployeeOut;
  view: ViewMode;
}) {
  // "지금" 은 카드 렌더 시점 기준 상대 시간 계산용 — 매 렌더마다 재계산해도 부담 없음.
  const now = new Date();
  const tone = avatarTone(employee.avatarColor);

  return (
    <li className="rounded-lg border border-line bg-card-hover/40 p-5">
      {/* 상단 : 아바타 + 이름/이메일 + Active + 편집 */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {employee.avatarUrl ? (
            <img
              src={employee.avatarUrl}
              alt=""
              className="size-11 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span
              className={`flex size-11 shrink-0 items-center justify-center rounded-full text-base font-black text-white ${tone}`}
              aria-hidden
            >
              {employee.name.charAt(0)}
            </span>
          )}
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-fg">
              {employee.name}
            </h3>
            <p className="mt-0.5 truncate text-sm text-muted">
              {employee.email}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusPill status={employee.status} />
          <button
            type="button"
            aria-label="편집"
            className="rounded-md border border-line px-2 py-1 text-xs text-muted transition-colors hover:bg-card-hover hover:text-fg"
          >
            <PencilSquareIcon className="size-3.5" aria-hidden />
          </button>
        </div>
      </div>

      {/* 필드 그리드 */}
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-4">
        <Field label="직급">
          <span className="text-fg">{rankLabel(employee.rank)}</span>
        </Field>
        <Field label="팀">
          <span className={employee.team ? "text-fg" : "text-muted"}>
            {employee.team ?? "미지정"}
          </span>
        </Field>
        {view === "detail" && (
          <>
            <Field label="최근 접속">
              <span
                className={
                  employee.lastActiveAt ? "text-fg" : "text-muted"
                }
              >
                {formatRelative(employee.lastActiveAt, now)}
              </span>
            </Field>
            <Field label="연락처">
              <span className={employee.phone ? "text-fg" : "text-muted"}>
                {employee.phone ?? "-"}
              </span>
            </Field>
          </>
        )}
        <Field label="입사일">
          <span className="text-fg tabular-nums">
            {formatDateDot(employee.joinedAt)}
          </span>
        </Field>
        <Field label="권한">
          <RolePill role={employee.role} />
        </Field>
      </dl>
    </li>
  );
}

// ─────────────── SkeletonCard · ComingPanel · bits ───────────────

function SkeletonCard() {
  return (
    <li className="animate-pulse rounded-lg border border-line bg-card-hover/40 p-5">
      <div className="flex items-start gap-3">
        <div className="size-11 shrink-0 rounded-full bg-card-hover" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-24 rounded bg-card-hover" />
          <div className="h-3 w-40 rounded bg-card-hover" />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 border-t border-line pt-4">
        <div className="h-6 rounded bg-card-hover" />
        <div className="h-6 rounded bg-card-hover" />
        <div className="h-6 rounded bg-card-hover" />
        <div className="h-6 rounded bg-card-hover" />
      </div>
    </li>
  );
}

function ComingPanel({ label }: { label: string }) {
  return (
    <div className="mt-5 flex min-h-64 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line bg-card px-5 py-16 text-center">
      <p className="text-sm font-semibold text-fg">{label} 탭 준비 중</p>
      <p className="text-xs text-muted">v2 백엔드 연동 시점에 열려요.</p>
    </div>
  );
}

function ViewToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-line p-0.5">
      {(
        [
          { key: "basic", label: "기본" },
          { key: "detail", label: "상세" },
        ] as { key: ViewMode; label: string }[]
      ).map((o) => {
        const active = value === o.key;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            className={`rounded-sm px-4 py-1.5 text-sm font-semibold transition-colors ${
              active
                ? "bg-primary/20 text-primary"
                : "text-muted hover:text-fg"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 min-w-0 truncate text-sm font-semibold">
        {children}
      </dd>
    </div>
  );
}

function StatusPill({ status }: { status: EmployeeStatus }) {
  const style =
    status === "ACTIVE"
      ? { dot: "bg-emerald-400", text: "text-emerald-400", label: "Active" }
      : status === "INACTIVE"
        ? { dot: "bg-muted", text: "text-muted", label: "비활성" }
        : { dot: "bg-red-400", text: "text-red-400", label: "퇴사" };
  return (
    <span
      className={`flex items-center gap-1.5 text-sm font-semibold ${style.text}`}
    >
      <span className={`size-1.5 rounded-full ${style.dot}`} aria-hidden />
      {style.label}
    </span>
  );
}

function RolePill({ role }: { role: Role }) {
  const tone =
    role === "ADMIN"
      ? "bg-primary/20 text-primary"
      : role === "MANAGER"
        ? "bg-sky-500/20 text-sky-400"
        : "bg-card-hover text-muted";
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold tracking-wide ${tone}`}
    >
      {role}
    </span>
  );
}
