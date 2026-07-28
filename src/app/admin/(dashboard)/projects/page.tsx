"use client";

import { useMemo, useState, type ComponentType, type SVGProps } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircleIcon,
  ChevronRightIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  FolderIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { getV2ErrorMessage } from "@/lib/api/v2/client";
import { avatarTone, listEmployees } from "@/lib/api/v2/employees";
import {
  computeDday,
  listProjects,
  statusLabel,
  type ProjectOut,
  type ProjectStatus,
} from "@/lib/api/v2/projects";
import { PageTitle } from "../PageTitle";
import { NewProjectDialog } from "./NewProjectDialog";
import { ProjectDetailDialog } from "./ProjectDetailDialog";

// 프로젝트 페이지 — GET /projects.
// 백엔드가 created_at desc 로 정렬. 상태는 서버 파생 (progress+due).
// 서버 파라미터 미사용 — 통계·필터별 카운트가 필요해서 전체 로드 후 클라이언트 필터.

type FilterKey = "all" | ProjectStatus;
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "WAITING", label: "대기" },
  { key: "IN_PROGRESS", label: "진행중" },
  { key: "DONE", label: "완료" },
  { key: "MISSED", label: "누락" },
];

type SortKey = "created" | "due" | "updated" | "progress";

// ─────────────── page ───────────────

export default function ProjectsPage() {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<SortKey>("created");
  const [q, setQ] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [today] = useState(() => new Date());
  const queryClient = useQueryClient();

  const projectsQuery = useQuery({
    queryKey: ["v2", "projects"] as const,
    queryFn: () => listProjects(),
  });
  const projects = projectsQuery.data ?? [];

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
  const nameOf = (id: string) => employeeLookup.get(id)?.name ?? id.slice(0, 6);

  const detailProject = detailId
    ? projects.find((p) => p.id === detailId) ?? null
    : null;

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    const base = projects.filter((p) => {
      if (filter !== "all" && p.status !== filter) return false;
      if (!kw) return true;
      return (
        p.title.toLowerCase().includes(kw) ||
        p.assigneeIds.some((id) => nameOf(id).toLowerCase().includes(kw))
      );
    });
    const sorted = [...base];
    if (sort === "created") {
      sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } else if (sort === "due") {
      // 완료는 뒤로 · 그 외는 dday 오름차순 (지남 → 임박 → 여유)
      sorted.sort((a, b) => {
        const finished = (p: ProjectOut) => (p.status === "DONE" ? 1 : 0);
        if (finished(a) !== finished(b)) return finished(a) - finished(b);
        return computeDday(a.due, today) - computeDday(b.due, today);
      });
    } else if (sort === "updated") {
      // 백엔드 updated_at 없음 → createdAt 대체 (사실상 등록순과 동일. 스펙 붙으면 교체).
      sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } else {
      sorted.sort((a, b) => b.progress - a.progress);
    }
    return sorted;
  }, [projects, filter, sort, q, today, employeeLookup]);

  const totals = useMemo(() => {
    const inProgress = projects.filter((p) => p.status === "IN_PROGRESS").length;
    const done = projects.filter((p) => p.status === "DONE").length;
    const dueThisWeek = projects.filter((p) => {
      if (p.status === "DONE") return false;
      const d = computeDday(p.due, today);
      return d >= 0 && d <= 7;
    }).length;
    return { all: projects.length, inProgress, done, dueThisWeek };
  }, [projects, today]);

  return (
    <div>
      <PageTitle title="프로젝트" />

      {/* 상단 */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-fg">
            프로젝트
          </h1>
          <p className="mt-1 text-sm text-muted">
            팀이 함께 진행하는 일들을 목적 · 절차 · 마감까지 한 곳에서 관리하세요.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setNewOpen(true)}
          className="flex items-center gap-1 rounded-md border border-primary bg-primary/25 px-3 py-2 text-sm font-semibold text-primary shadow-lg shadow-primary/20 transition-colors hover:bg-primary/35"
        >
          <PlusIcon className="size-4" />새 프로젝트
        </button>
      </div>

      {/* 통계 4 카드 */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="전체 프로젝트"
          value={String(totals.all)}
          icon={FolderIcon}
          tone="primary"
        />
        <StatCard
          label="진행 중"
          value={String(totals.inProgress)}
          icon={SparklesIcon}
          tone="sky"
        />
        <StatCard
          label="이번 주 마감"
          value={String(totals.dueThisWeek)}
          icon={ClockIcon}
          tone="amber"
        />
        <StatCard
          label="완료"
          value={String(totals.done)}
          icon={CheckCircleIcon}
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
            placeholder="프로젝트 · 담당자로 검색"
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
                active={sort === "created"}
                onClick={() => setSort("created")}
              >
                등록 순
              </SortButton>
              <SortButton
                active={sort === "due"}
                onClick={() => setSort("due")}
              >
                마감 순
              </SortButton>
              <SortButton
                active={sort === "progress"}
                onClick={() => setSort("progress")}
              >
                진행률
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

      {/* 프로젝트 목록 */}
      <div className="mt-6">
        {projectsQuery.isLoading ? (
          <ul className="space-y-3">
            {[0, 1, 2].map((i) => (
              <ProjectSkeleton key={i} />
            ))}
          </ul>
        ) : projectsQuery.isError ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-line bg-card px-6 py-12 text-center">
            <ExclamationTriangleIcon className="size-8 text-red-400" />
            <p className="text-sm text-fg">
              {getV2ErrorMessage(projectsQuery.error)}
            </p>
            <button
              type="button"
              onClick={() => projectsQuery.refetch()}
              className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-fg hover:bg-card-hover"
            >
              다시 시도
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-lg border border-line bg-card p-8 text-center">
            <FolderIcon className="size-8 text-muted/70" />
            <p className="text-sm text-muted">조건에 맞는 프로젝트가 없어요.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                today={today}
                nameOf={nameOf}
                colorOf={(id) => employeeLookup.get(id)?.avatarColor}
                onOpen={() => setDetailId(p.id)}
              />
            ))}
          </ul>
        )}
      </div>

      <NewProjectDialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        employees={employeesQuery.data ?? []}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ["v2", "projects"] });
          setNewOpen(false);
        }}
      />
      <ProjectDetailDialog
        open={detailProject !== null}
        project={detailProject}
        nameOf={nameOf}
        colorOf={(id) => employeeLookup.get(id)?.avatarColor}
        today={today}
        onClose={() => setDetailId(null)}
        onChanged={() => {
          queryClient.invalidateQueries({ queryKey: ["v2", "projects"] });
        }}
      />
    </div>
  );
}

// ─────────────── StatCard ───────────────

type StatTone = "primary" | "sky" | "amber" | "emerald";
const STAT_TONE: Record<StatTone, { bg: string; text: string }> = {
  primary: { bg: "bg-primary/15", text: "text-primary" },
  sky: { bg: "bg-sky-500/15", text: "text-sky-400" },
  amber: { bg: "bg-amber-500/15", text: "text-amber-400" },
  emerald: { bg: "bg-emerald-500/15", text: "text-emerald-400" },
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
          <p className="mt-0.5 text-2xl font-black tracking-tighter tabular-nums text-fg">
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

// ─────────────── ProjectCard ───────────────

const STATUS_STYLE: Record<
  ProjectStatus,
  { bar: string; chipBg: string; chipText: string; bar2: string }
> = {
  IN_PROGRESS: {
    bar: "bg-sky-400",
    chipBg: "bg-sky-500/15",
    chipText: "text-sky-400",
    bar2: "bg-sky-400",
  },
  WAITING: {
    bar: "bg-neutral-500",
    chipBg: "bg-card-hover",
    chipText: "text-muted",
    bar2: "bg-neutral-500",
  },
  DONE: {
    bar: "bg-emerald-400",
    chipBg: "bg-emerald-500/15",
    chipText: "text-emerald-400",
    bar2: "bg-emerald-400",
  },
  MISSED: {
    bar: "bg-red-400",
    chipBg: "bg-red-500/15",
    chipText: "text-red-400",
    bar2: "bg-red-400",
  },
};

function ProjectCard({
  project,
  today,
  nameOf,
  colorOf,
  onOpen,
}: {
  project: ProjectOut;
  today: Date;
  nameOf: (id: string) => string;
  colorOf: (id: string) => string | undefined;
  onOpen: () => void;
}) {
  const s = STATUS_STYLE[project.status];
  const dday = computeDday(project.due, today);
  const assigneeNames = project.assigneeIds.map(nameOf);
  const firstAssigneeColor = project.assigneeIds[0]
    ? colorOf(project.assigneeIds[0])
    : undefined;

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="group relative flex w-full items-start gap-4 overflow-hidden rounded-lg border border-line bg-card p-5 text-left transition-colors hover:bg-card-hover"
      >
        <span className={`absolute top-0 bottom-0 left-0 w-1 ${s.bar}`} />

        <div className="min-w-0 flex-1 pl-3">
          <div className="flex items-start justify-between gap-2">
            <h4 className="truncate text-base font-bold text-fg">
              {project.title}
            </h4>
            <span
              className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${s.chipBg} ${s.chipText}`}
            >
              {project.status === "IN_PROGRESS"
                ? `${project.progress}%`
                : statusLabel(project.status)}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
            {assigneeNames.length > 0 ? (
              <div className="flex items-center gap-2">
                <Avatar
                  name={assigneeNames[0]}
                  tone={avatarTone(firstAssigneeColor)}
                />
                <span className="font-medium text-fg">
                  {assigneeNames.join(", ")}
                </span>
              </div>
            ) : (
              <span className="text-muted">담당자 미지정</span>
            )}
            <span>·</span>
            <span className="tabular-nums">
              등록 {formatMD(project.createdAt)}
            </span>
            <span>·</span>
            <span>마감 {formatMD(project.due)}</span>
            <span className="ml-auto">
              <DdayBadge status={project.status} dday={dday} />
            </span>
          </div>

          {project.status !== "WAITING" && (
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-card-hover">
              <div
                className={`h-full rounded-full transition-all ${s.bar2}`}
                style={{ width: `${project.progress}%` }}
              />
            </div>
          )}
        </div>

        <ChevronRightIcon className="mt-1 size-4 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
      </button>
    </li>
  );
}

function DdayBadge({ status, dday }: { status: ProjectStatus; dday: number }) {
  if (status === "DONE") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-400"
        aria-label="완료"
      >
        <CheckCircleIcon className="size-3" />
        완료
      </span>
    );
  }
  const tone =
    dday <= 0
      ? "text-red-400"
      : dday <= 7
        ? "text-amber-400"
        : "text-muted";
  const label = dday >= 0 ? `D-${dday}` : `D+${-dday}`;
  return (
    <span className={`text-xs font-bold tabular-nums ${tone}`}>{label}</span>
  );
}

function ProjectSkeleton() {
  return (
    <li className="animate-pulse rounded-lg border border-line bg-card p-5">
      <div className="h-4 w-1/2 rounded bg-card-hover" />
      <div className="mt-3 flex gap-2">
        <div className="h-3 w-20 rounded bg-card-hover" />
        <div className="h-3 w-12 rounded bg-card-hover" />
        <div className="h-3 w-16 rounded bg-card-hover" />
      </div>
      <div className="mt-3 h-1.5 w-full rounded-full bg-card-hover" />
    </li>
  );
}

// ISO ("2026-06-01" 또는 "2026-06-01T…") → "6/1"
export function formatMD(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.getMonth() + 1}/${d.getDate()}`;
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
