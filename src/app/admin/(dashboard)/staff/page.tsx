"use client";

import { useMemo, useState } from "react";
import {
  ArrowPathIcon,
  ArrowsUpDownIcon,
  ChevronDownIcon,
  KeyIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
  Squares2X2Icon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import type { ComponentType, SVGProps } from "react";
import { PageTitle } from "../PageTitle";

// 직원 페이지 — 구성원 · 초대키 · 팀 · 직급 4개 서브 탭. 지금은 구성원만 실제로 렌더.
// PC 는 계정 관리와 동일 패턴 : lg 에서 2-column 카드 그리드.
// 기본 뷰 (4-필드) · 상세 뷰 (6-필드) 로 정보 밀도 토글.

// ─────────────── mock ───────────────

type Role = "ADMIN" | "MANAGER" | "MEMBER";
type Status = "ACTIVE" | "INACTIVE" | "RESIGNED";

interface Employee {
  id: string;
  name: string;
  email: string;
  avatarTone: string;
  rankLabel: string; // 예 : 트레이너 · 점장
  team: string; // "미지정" 가능
  role: Role;
  status: Status;
  joinedAt: string; // "2026. 7. 22."
  lastActive: string; // "기록 없음" 또는 "3시간 전"
  phone: string; // "-" 가능
}

const EMPLOYEES: Employee[] = [
  {
    id: "e1",
    name: "정프로",
    email: "pro@hifis.local",
    avatarTone: "bg-primary",
    rankLabel: "트레이너",
    team: "PT팀",
    role: "MEMBER",
    status: "ACTIVE",
    joinedAt: "2026. 7. 22.",
    lastActive: "기록 없음",
    phone: "-",
  },
  {
    id: "e2",
    name: "A매니저",
    email: "mgr@hifis.local",
    avatarTone: "bg-emerald-500",
    rankLabel: "점장",
    team: "미지정",
    role: "MANAGER",
    status: "ACTIVE",
    joinedAt: "2026. 7. 18.",
    lastActive: "3시간 전",
    phone: "010-2222-3333",
  },
  {
    id: "e3",
    name: "이앨리스",
    email: "alice@hifis.local",
    avatarTone: "bg-emerald-500",
    rankLabel: "대표",
    team: "경영",
    role: "ADMIN",
    status: "ACTIVE",
    joinedAt: "2026. 5. 1.",
    lastActive: "방금 전",
    phone: "010-1111-2222",
  },
  {
    id: "e4",
    name: "박그레이스",
    email: "grace@hifis.local",
    avatarTone: "bg-violet-500",
    rankLabel: "디자이너",
    team: "마케팅",
    role: "MEMBER",
    status: "ACTIVE",
    joinedAt: "2026. 6. 10.",
    lastActive: "1일 전",
    phone: "010-3333-4444",
  },
  {
    id: "e5",
    name: "최마틴",
    email: "martin@hifis.local",
    avatarTone: "bg-amber-500",
    rankLabel: "매니저",
    team: "마케팅",
    role: "MEMBER",
    status: "ACTIVE",
    joinedAt: "2026. 6. 15.",
    lastActive: "2시간 전",
    phone: "010-4444-5555",
  },
  {
    id: "e6",
    name: "김도현",
    email: "kim@hifis.local",
    avatarTone: "bg-sky-500",
    rankLabel: "트레이너",
    team: "PT팀",
    role: "MEMBER",
    status: "ACTIVE",
    joinedAt: "2026. 7. 1.",
    lastActive: "30분 전",
    phone: "-",
  },
];

type MainTab = "members" | "invites" | "teams" | "ranks";
const MAIN_TABS: { key: MainTab; label: string; icon: ComponentType<SVGProps<SVGSVGElement>>; count: number }[] = [
  { key: "members", label: "구성원", icon: UsersIcon, count: EMPLOYEES.length },
  { key: "invites", label: "초대키", icon: KeyIcon, count: 0 },
  { key: "teams", label: "팀", icon: Squares2X2Icon, count: 2 },
  { key: "ranks", label: "직급", icon: ArrowsUpDownIcon, count: 3 },
];

type StatusTab = "ACTIVE" | "INACTIVE" | "RESIGNED";
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return EMPLOYEES.filter((e) => {
      if (e.status !== status) return false;
      if (role !== "all" && e.role !== role) return false;
      if (!q) return true;
      return (
        e.name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.team.toLowerCase().includes(q)
      );
    });
  }, [role, status, query]);

  const stats = useMemo(() => {
    const activeN = EMPLOYEES.filter((e) => e.status === "ACTIVE").length;
    const teamsN = new Set(
      EMPLOYEES.filter((e) => e.team !== "미지정").map((e) => e.team),
    ).size;
    const ranksN = new Set(EMPLOYEES.map((e) => e.rankLabel)).size;
    return { total: EMPLOYEES.length, activeN, teamsN, ranksN };
  }, []);
  const statusCount = (k: StatusTab) =>
    EMPLOYEES.filter((e) => e.status === k).length;

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
            aria-label="새로고침"
            className="rounded-full border border-line p-2 text-muted transition-colors hover:bg-card-hover hover:text-fg"
          >
            <ArrowPathIcon className="size-4" />
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
}: {
  view: ViewMode;
  setView: (v: ViewMode) => void;
  role: "all" | Role;
  setRole: (v: "all" | Role) => void;
  status: StatusTab;
  setStatus: (v: StatusTab) => void;
  query: string;
  setQuery: (v: string) => void;
  filtered: Employee[];
  statusCount: (k: StatusTab) => number;
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

      {/* 리스트 — PC 2-column, 모바일 1-column. 각 카드는 자체 border + gap 으로 분리 (계정 관리와 동일) */}
      {filtered.length === 0 ? (
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
  employee: Employee;
  view: ViewMode;
}) {
  return (
    <li className="rounded-lg border border-line bg-card-hover/40 p-5">
      {/* 상단 : 아바타 + 이름/이메일 + Active + 편집 */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={`flex size-11 shrink-0 items-center justify-center rounded-full text-base font-black text-white ${employee.avatarTone}`}
            aria-hidden
          >
            {employee.name.charAt(0)}
          </span>
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
          <span className="text-fg">{employee.rankLabel}</span>
        </Field>
        <Field label="팀">
          <span className={employee.team === "미지정" ? "text-muted" : "text-fg"}>
            {employee.team}
          </span>
        </Field>
        {view === "detail" && (
          <>
            <Field label="최근 접속">
              <span
                className={
                  employee.lastActive === "기록 없음" ? "text-muted" : "text-fg"
                }
              >
                {employee.lastActive}
              </span>
            </Field>
            <Field label="연락처">
              <span
                className={employee.phone === "-" ? "text-muted" : "text-fg"}
              >
                {employee.phone}
              </span>
            </Field>
          </>
        )}
        <Field label="입사일">
          <span className="text-fg tabular-nums">{employee.joinedAt}</span>
        </Field>
        <Field label="권한">
          <RolePill role={employee.role} />
        </Field>
      </dl>
    </li>
  );
}

// ─────────────── ComingPanel ───────────────

function ComingPanel({ label }: { label: string }) {
  return (
    <div className="mt-5 flex min-h-64 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line bg-card px-5 py-16 text-center">
      <p className="text-sm font-semibold text-fg">{label} 탭 준비 중</p>
      <p className="text-xs text-muted">
        v2 백엔드 연동 시점에 열려요.
      </p>
    </div>
  );
}

// ─────────────── bits ───────────────

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

function StatusPill({ status }: { status: Status }) {
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
  const label =
    role === "ADMIN" ? "ADMIN" : role === "MANAGER" ? "MANAGER" : "MEMBER";
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
      {label}
    </span>
  );
}
