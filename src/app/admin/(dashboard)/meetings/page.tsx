"use client";

import { useMemo, useState, type ComponentType, type SVGProps } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ChartBarIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  FolderIcon,
  GlobeAltIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { getMe } from "@/lib/api/auth";
import { PageTitle } from "../PageTitle";

// 회의록 페이지 — 목록 + 필터/검색/정렬. mock 데이터. API 는 다음 스텝.
// 카드는 full-width — 좁게 늘어놓지 않음.

// ─────────────── mock ───────────────

type Scope = "전사" | "프로젝트" | "특정 인원";
interface Meeting {
  id: string;
  title: string;
  author: string;
  authorTone: string; // 아바타 배경 tailwind 클래스
  meetingDateISO: string; // 회의 진행 일자 (정렬 · timeAgo · bucket 파생)
  updatedISO: string; // 최근 수정 일시 (정렬)
  scope: Scope;
  projectName?: string; // 프로젝트 스코프일 때만
}

const MEETINGS: Meeting[] = [
  {
    id: "1",
    title: "프로덕트 정기 회의 (5/8)",
    author: "이앨리스",
    authorTone: "bg-emerald-500",
    meetingDateISO: "2026-07-26",
    updatedISO: "2026-07-27T16:00",
    scope: "전사",
  },
  {
    id: "2",
    title: "신규 기능 스펙 정리",
    author: "박그레이스",
    authorTone: "bg-violet-500",
    meetingDateISO: "2026-07-25",
    updatedISO: "2026-07-25T11:00",
    scope: "프로젝트",
    projectName: "화순점 리뉴얼 TF",
  },
  {
    id: "3",
    title: "5월 캠페인 브레인스토밍",
    author: "최마틴",
    authorTone: "bg-amber-500",
    meetingDateISO: "2026-07-23",
    updatedISO: "2026-07-23T14:00",
    scope: "전사",
  },
];

type FilterKey = "all" | "mine" | "company" | "project" | "custom";
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "mine", label: "내가 쓴 것" },
  { key: "company", label: "전사 공개" },
  { key: "project", label: "프로젝트" },
  { key: "custom", label: "특정 인원" },
];

type SortKey = "meeting" | "updated";

// 오늘 기준 회의 날짜와의 상대 일수 → "1일 전" 표기
function daysAgo(iso: string, today: Date): number {
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const diff = today.getTime() - target.getTime();
  return Math.floor(diff / 86_400_000);
}
function timeAgoLabel(iso: string, today: Date): string {
  const n = daysAgo(iso, today);
  if (n <= 0) return "오늘";
  if (n === 1) return "어제";
  if (n < 7) return `${n}일 전`;
  if (n < 30) return `${Math.floor(n / 7)}주 전`;
  return `${Math.floor(n / 30)}달 전`;
}
// 그룹 라벨 : 7일 이내 → "이번 주", 그 이후 → "지난 주", 30일 이후 → "이번 달", 그 이전 → "예전"
function bucketLabel(iso: string, today: Date): string {
  const n = daysAgo(iso, today);
  if (n < 7) return "이번 주";
  if (n < 14) return "지난 주";
  if (n < 30) return "이번 달";
  return "예전";
}
function updatedLabel(iso: string): string {
  const [date, time] = iso.split("T");
  const [, m, d] = date.split("-").map(Number);
  return `${m}. ${d}. ${time ?? ""}`.trim();
}

// ─────────────── page ───────────────

export default function MeetingsPage() {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<SortKey>("meeting");
  const [q, setQ] = useState("");
  // 오늘 — 매 렌더마다 새로 만들지 않도록 mount 시 1회 고정 (기간 라벨은 세션 내 안정)
  const [today] = useState(() => new Date());

  const meQuery = useQuery({ queryKey: ["admin", "me"], queryFn: getMe });
  const myName = meQuery.data?.name ?? null;

  // 필터 → 검색 → 정렬 순으로 파이프.
  const filtered = useMemo(() => {
    const scopeMap: Record<Exclude<FilterKey, "all" | "mine">, Scope> = {
      company: "전사",
      project: "프로젝트",
      custom: "특정 인원",
    };
    let list = MEETINGS.filter((m) => {
      if (filter === "all") return true;
      if (filter === "mine") return myName != null && m.author === myName;
      return m.scope === scopeMap[filter];
    });
    const kw = q.trim().toLowerCase();
    if (kw) {
      list = list.filter(
        (m) =>
          m.title.toLowerCase().includes(kw) ||
          m.author.toLowerCase().includes(kw),
      );
    }
    const key = sort === "meeting" ? "meetingDateISO" : "updatedISO";
    return [...list].sort((a, b) => b[key].localeCompare(a[key]));
  }, [filter, q, sort, myName]);

  // 시간대 그룹 렌더 : filtered 결과에 대해 파생 라벨로 그룹.
  const grouped = useMemo(() => {
    const map = new Map<string, Meeting[]>();
    for (const m of filtered) {
      const label = bucketLabel(m.meetingDateISO, today);
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(m);
    }
    return Array.from(map.entries()); // 삽입 순서 유지 → 정렬 결과 순서 그대로.
  }, [filtered, today]);

  // 통계 : 원본 MEETINGS 기준 (필터 · 검색과 무관하게 전체 현황).
  const mineCount = myName
    ? MEETINGS.filter((m) => m.author === myName).length
    : 0;
  const thisWeekCount = MEETINGS.filter(
    (m) => daysAgo(m.updatedISO.split("T")[0], today) < 7,
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
          value={String(MEETINGS.length)}
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

      {/* 회의록 목록 — full width. 정렬 시엔 그룹 라벨 노출 (회의 날짜 정렬일 때만 의미 있음) */}
      <div className="mt-6 space-y-6">
        {filtered.length === 0 ? (
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
                  <MeetingCard key={m.id} meeting={m} today={today} />
                ))}
              </ul>
            </section>
          ))
        ) : (
          <ul className="space-y-3">
            {filtered.map((m) => (
              <MeetingCard key={m.id} meeting={m} today={today} />
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

const SCOPE_STYLE: Record<Scope, { bg: string; text: string; icon: ComponentType<SVGProps<SVGSVGElement>>; bar: string }> = {
  전사: { bg: "bg-emerald-500/15", text: "text-emerald-400", icon: GlobeAltIcon, bar: "bg-emerald-400" },
  프로젝트: { bg: "bg-violet-500/15", text: "text-violet-400", icon: FolderIcon, bar: "bg-violet-400" },
  "특정 인원": { bg: "bg-amber-500/15", text: "text-amber-400", icon: FolderIcon, bar: "bg-amber-400" },
};

function MeetingCard({ meeting, today }: { meeting: Meeting; today: Date }) {
  const scope = SCOPE_STYLE[meeting.scope];
  const ScopeIcon = scope.icon;
  const timeAgo = timeAgoLabel(meeting.meetingDateISO, today);
  const updated = updatedLabel(meeting.updatedISO);
  return (
    <li>
      <Link
        href={`/admin/meetings/detail?id=${meeting.id}`}
        className="group relative flex w-full items-start gap-4 overflow-hidden rounded-lg border border-line bg-card p-5 text-left transition-colors hover:bg-card-hover"
      >
        {/* 좌측 컬러 세로 바 */}
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
              {meeting.scope}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
            <div className="flex items-center gap-2">
              <Avatar name={meeting.author} tone={meeting.authorTone} />
              <span className="font-medium text-fg">{meeting.author}</span>
            </div>
            <span>·</span>
            <span>{timeAgo}</span>
            {meeting.projectName && (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-1 text-fg">
                  <span className="size-1.5 rounded-full bg-violet-400" />
                  {meeting.projectName}
                </span>
              </>
            )}
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
