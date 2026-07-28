"use client";

import { useState, type ComponentType, type SVGProps } from "react";
import Link from "next/link";
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
  timeAgo: string; // "1일 전"
  scope: Scope;
  projectName?: string; // 프로젝트 스코프일 때만
  updated: string; // "7. 27. 16:00"
  bucket: "2일 전" | "4일 전" | "6일 전"; // 상단 그룹 라벨
}

const MEETINGS: Meeting[] = [
  {
    id: "1",
    title: "프로덕트 정기 회의 (5/8)",
    author: "이앨리스",
    authorTone: "bg-emerald-500",
    timeAgo: "1일 전",
    scope: "전사",
    updated: "7. 27. 16:00",
    bucket: "2일 전",
  },
  {
    id: "2",
    title: "신규 기능 스펙 정리",
    author: "박그레이스",
    authorTone: "bg-violet-500",
    timeAgo: "4일 전",
    scope: "프로젝트",
    projectName: "HiNest v2",
    updated: "7. 25. 11:00",
    bucket: "4일 전",
  },
  {
    id: "3",
    title: "5월 캠페인 브레인스토밍",
    author: "최마틴",
    authorTone: "bg-amber-500",
    timeAgo: "5일 전",
    scope: "전사",
    updated: "7. 23. 14:00",
    bucket: "6일 전",
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

// ─────────────── page ───────────────

export default function MeetingsPage() {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<SortKey>("meeting");
  const [q, setQ] = useState("");

  // 시간대 그룹 렌더용 : 배열 상 순서 유지 + 그룹 첫 항목에 헤더 노출
  const buckets = MEETINGS.reduce<Record<string, Meeting[]>>((acc, m) => {
    (acc[m.bucket] ||= []).push(m);
    return acc;
  }, {});
  const bucketOrder = Array.from(new Set(MEETINGS.map((m) => m.bucket)));

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
          value="0"
          icon={ChartBarIcon}
          tone="violet"
        />
        <StatCard
          label="이번 주 업데이트"
          value="3"
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
            <span className="text-muted">{MEETINGS.length}개</span>
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

      {/* 회의록 목록 — full width */}
      <div className="mt-6 space-y-6">
        {bucketOrder.map((label) => (
          <section key={label}>
            <h3 className="mb-2 text-xs font-semibold text-muted">{label}</h3>
            <ul className="space-y-3">
              {buckets[label].map((m) => (
                <MeetingCard key={m.id} meeting={m} />
              ))}
            </ul>
          </section>
        ))}
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

function MeetingCard({ meeting }: { meeting: Meeting }) {
  const scope = SCOPE_STYLE[meeting.scope];
  const ScopeIcon = scope.icon;
  return (
    <li>
      <button
        type="button"
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
            <span>{meeting.timeAgo}</span>
            {meeting.projectName && (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-1 text-fg">
                  <span className="size-1.5 rounded-full bg-violet-400" />
                  {meeting.projectName}
                </span>
              </>
            )}
            <span className="ml-auto tabular-nums">수정 {meeting.updated}</span>
          </div>
        </div>

        <ChevronRightIcon className="mt-1 size-4 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
      </button>
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
