"use client";

import { useMemo, useState, type ComponentType, type SVGProps } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ChartBarIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  FolderIcon,
  GlobeAltIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  SparklesIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { getMe } from "@/lib/api/auth";
import { getV2ErrorMessage } from "@/lib/api/v2/client";
import { avatarTone, listEmployees } from "@/lib/api/v2/employees";
import { listMeetings, type MeetingOut, type MeetingScope } from "@/lib/api/v2/meetings";
import { PageTitle } from "../PageTitle";

// 회의록 목록 — GET /meetings.
// 서버 파라미터는 미사용 (스코프별 카운트가 필요해서 전체 로드). q · 정렬 · 필터는 클라이언트.
// author 이름 · 아바타 색은 GET /employees 로 별도 로드해서 authorId → { name, color } lookup.

type FilterKey = "all" | "mine" | "company" | "project" | "custom";
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "mine", label: "내가 쓴 것" },
  { key: "company", label: "전사 공개" },
  { key: "project", label: "프로젝트" },
  { key: "custom", label: "특정 인원" },
];
const FILTER_SCOPE: Record<Exclude<FilterKey, "all" | "mine">, MeetingScope> = {
  company: "COMPANY",
  project: "PROJECT",
  custom: "PEOPLE",
};

type SortKey = "meeting" | "updated";

// ISO date-part 기준 오늘과의 상대 일수.
function daysAgo(iso: string, today: Date): number {
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return 0;
  // 날짜 기준 비교 — 시각 절삭.
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const d = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.floor((t.getTime() - d.getTime()) / 86_400_000);
}
function timeAgoLabel(iso: string, today: Date): string {
  const n = daysAgo(iso, today);
  if (n <= 0) return "오늘";
  if (n === 1) return "어제";
  if (n < 7) return `${n}일 전`;
  if (n < 30) return `${Math.floor(n / 7)}주 전`;
  return `${Math.floor(n / 30)}달 전`;
}
function bucketLabel(iso: string, today: Date): string {
  const n = daysAgo(iso, today);
  if (n < 7) return "이번 주";
  if (n < 14) return "지난 주";
  if (n < 30) return "이번 달";
  return "예전";
}
function updatedLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getMonth() + 1}. ${d.getDate()}. ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─────────────── page ───────────────

export default function MeetingsPage() {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<SortKey>("meeting");
  const [q, setQ] = useState("");
  const [today] = useState(() => new Date());

  const meQuery = useQuery({ queryKey: ["admin", "me"], queryFn: getMe });
  const meId = meQuery.data?.id ?? null;

  const meetingsQuery = useQuery({
    queryKey: ["v2", "meetings"] as const,
    queryFn: () => listMeetings(),
  });
  const meetings = meetingsQuery.data ?? [];

  const employeesQuery = useQuery({
    queryKey: ["v2", "employees", "all"] as const,
    queryFn: () => listEmployees({}),
  });
  const employeeLookup = useMemo(() => {
    const map = new Map<
      string,
      { name: string; avatarColor: string | undefined }
    >();
    for (const e of employeesQuery.data ?? []) {
      map.set(e.id, { name: e.name, avatarColor: e.avatarColor });
    }
    return map;
  }, [employeesQuery.data]);

  const filtered = useMemo(() => {
    let list = meetings.filter((m) => {
      if (filter === "all") return true;
      if (filter === "mine") return meId != null && m.authorId === meId;
      return m.scope === FILTER_SCOPE[filter];
    });
    const kw = q.trim().toLowerCase();
    if (kw) {
      list = list.filter((m) => {
        const author = employeeLookup.get(m.authorId)?.name ?? "";
        return (
          m.title.toLowerCase().includes(kw) ||
          author.toLowerCase().includes(kw)
        );
      });
    }
    const key = sort === "meeting" ? "meetingAt" : "createdAt";
    return [...list].sort((a, b) => b[key].localeCompare(a[key]));
  }, [meetings, filter, q, sort, meId, employeeLookup]);

  const grouped = useMemo(() => {
    const map = new Map<string, MeetingOut[]>();
    for (const m of filtered) {
      const label = bucketLabel(m.meetingAt, today);
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(m);
    }
    return Array.from(map.entries());
  }, [filtered, today]);

  const mineCount = meId
    ? meetings.filter((m) => m.authorId === meId).length
    : 0;
  const thisWeekCount = meetings.filter(
    (m) => daysAgo(m.createdAt, today) < 7,
  ).length;

  return (
    <div>
      <PageTitle title="회의록" />

      {/* 상단 : 좌 페이지 제목·부제, 우 + 새 회의록 */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-fg">
            회의록
          </h1>
          <p className="mt-1 text-sm text-muted">
            노션처럼 서식을 넣어 작성하고, 공개 범위를 세밀하게 지정하세요.
          </p>
        </div>
        <Link
          href="/admin/meetings/new"
          className="flex items-center gap-1 rounded-md border border-primary bg-primary/25 px-3 py-2 text-sm font-semibold text-primary shadow-lg shadow-primary/20 transition-colors hover:bg-primary/35"
        >
          <PlusIcon className="size-4" />새 회의록
        </Link>
      </div>

      {/* 통계 3 카드 */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="전체 회의록"
          value={String(meetings.length)}
          icon={DocumentTextIcon}
          tone="primary"
        />
        <StatCard
          label="내가 쓴 것"
          value={String(mineCount)}
          icon={ChartBarIcon}
          tone="violet"
        />
        <StatCard
          label="이번 주 업데이트"
          value={String(thisWeekCount)}
          icon={SparklesIcon}
          tone="emerald"
        />
      </div>

      {/* 검색·필터·정렬 카드 */}
      <div className="mt-6 rounded-lg border border-line bg-card p-4">
        <label className="flex items-center gap-2 rounded-md border border-line bg-card-hover px-3 py-2">
          <MagnifyingGlassIcon className="size-4 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="제목·작성자로 검색"
            className="flex-1 bg-transparent text-sm text-fg placeholder-muted focus:outline-none"
          />
        </label>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                    active
                      ? "bg-primary text-white"
                      : "text-muted hover:bg-card-hover hover:text-fg"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted">{filtered.length}개</span>
            <div className="inline-flex rounded-full border border-line p-0.5">
              <SortButton
                active={sort === "meeting"}
                onClick={() => setSort("meeting")}
              >
                회의 날짜
              </SortButton>
              <SortButton
                active={sort === "updated"}
                onClick={() => setSort("updated")}
              >
                최근 수정
              </SortButton>
            </div>
          </div>
        </div>
      </div>

      {/* 회의록 목록 */}
      <div className="mt-6 space-y-6">
        {meetingsQuery.isLoading ? (
          <ul className="space-y-3">
            {[0, 1, 2].map((i) => (
              <MeetingSkeleton key={i} />
            ))}
          </ul>
        ) : meetingsQuery.isError ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-line bg-card px-6 py-12 text-center">
            <ExclamationTriangleIcon className="size-8 text-red-400" />
            <p className="text-sm text-fg">
              {getV2ErrorMessage(meetingsQuery.error)}
            </p>
            <button
              type="button"
              onClick={() => meetingsQuery.refetch()}
              className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-fg hover:bg-card-hover"
            >
              다시 시도
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line bg-card px-6 py-12 text-center text-sm text-muted">
            {q.trim()
              ? "검색 결과가 없어요."
              : filter === "mine"
                ? "아직 작성한 회의록이 없어요."
                : "표시할 회의록이 없어요."}
          </div>
        ) : sort === "meeting" ? (
          grouped.map(([label, items]) => (
            <section key={label}>
              <h3 className="mb-2 text-xs font-semibold text-muted">{label}</h3>
              <ul className="space-y-3">
                {items.map((m) => (
                  <MeetingCard
                    key={m.id}
                    meeting={m}
                    today={today}
                    author={employeeLookup.get(m.authorId)}
                  />
                ))}
              </ul>
            </section>
          ))
        ) : (
          <ul className="space-y-3">
            {filtered.map((m) => (
              <MeetingCard
                key={m.id}
                meeting={m}
                today={today}
                author={employeeLookup.get(m.authorId)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─────────────── StatCard ───────────────

type StatTone = "primary" | "emerald" | "violet";
const STAT_TONE: Record<StatTone, { bg: string; text: string }> = {
  primary: { bg: "bg-primary/15", text: "text-primary" },
  emerald: { bg: "bg-emerald-500/15", text: "text-emerald-400" },
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

// ─────────────── SortButton ───────────────

function SortButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
        active ? "bg-card-hover text-fg" : "text-muted hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}

// ─────────────── MeetingCard ───────────────

const SCOPE_STYLE: Record<
  MeetingScope,
  {
    bg: string;
    text: string;
    icon: ComponentType<SVGProps<SVGSVGElement>>;
    bar: string;
    label: string;
  }
> = {
  COMPANY: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-400",
    icon: GlobeAltIcon,
    bar: "bg-emerald-400",
    label: "전사",
  },
  PROJECT: {
    bg: "bg-violet-500/15",
    text: "text-violet-400",
    icon: FolderIcon,
    bar: "bg-violet-400",
    label: "프로젝트",
  },
  PEOPLE: {
    bg: "bg-amber-500/15",
    text: "text-amber-400",
    icon: UserGroupIcon,
    bar: "bg-amber-400",
    label: "특정 인원",
  },
};

function MeetingCard({
  meeting,
  today,
  author,
}: {
  meeting: MeetingOut;
  today: Date;
  author: { name: string; avatarColor: string | undefined } | undefined;
}) {
  const scope = SCOPE_STYLE[meeting.scope];
  const ScopeIcon = scope.icon;
  const timeAgo = timeAgoLabel(meeting.meetingAt, today);
  const updated = updatedLabel(meeting.createdAt);
  const authorName = author?.name ?? "…";
  const tone = avatarTone(author?.avatarColor);

  return (
    <li>
      <Link
        href={`/admin/meetings/detail?id=${meeting.id}`}
        className="group relative flex w-full items-start gap-4 overflow-hidden rounded-lg border border-line bg-card p-5 text-left transition-colors hover:bg-card-hover"
      >
        <span className={`absolute top-0 bottom-0 left-0 w-1 ${scope.bar}`} />

        <div className="min-w-0 flex-1 pl-3">
          <div className="flex items-start justify-between gap-2">
            <h4 className="truncate text-base font-bold text-fg">
              {meeting.title}
            </h4>
            <span
              className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${scope.bg} ${scope.text}`}
            >
              <ScopeIcon className="size-3" />
              {scope.label}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
            <div className="flex items-center gap-2">
              <Avatar name={authorName} tone={tone} />
              <span className="font-medium text-fg">{authorName}</span>
            </div>
            <span>·</span>
            <span>{timeAgo}</span>
            <span className="ml-auto tabular-nums">수정 {updated}</span>
          </div>
        </div>

        <ChevronRightIcon className="mt-1 size-4 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
      </Link>
    </li>
  );
}

function Avatar({ name, tone }: { name: string; tone: string }) {
  return (
    <span
      className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-bold text-white ${tone}`}
      aria-hidden
    >
      {name.charAt(0)}
    </span>
  );
}

function MeetingSkeleton() {
  return (
    <li className="animate-pulse rounded-lg border border-line bg-card p-5">
      <div className="h-4 w-2/3 rounded bg-card-hover" />
      <div className="mt-3 flex items-center gap-2">
        <div className="size-6 rounded-full bg-card-hover" />
        <div className="h-3 w-16 rounded bg-card-hover" />
        <div className="h-3 w-12 rounded bg-card-hover" />
      </div>
    </li>
  );
}
