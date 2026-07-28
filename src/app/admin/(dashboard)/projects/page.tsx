"use client";

import { useMemo, useState, type ComponentType, type SVGProps } from "react";
import {
  CheckCircleIcon,
  ChevronRightIcon,
  ClockIcon,
  FolderIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { PageTitle } from "../PageTitle";
import { NewProjectDialog } from "./NewProjectDialog";
import { ProjectDetailDialog } from "./ProjectDetailDialog";

// 프로젝트 페이지 — 회의록 페이지 톤 (풀-width 카드 + 상단 통계 + 검색·필터·정렬).
// mock. API 는 다음 스텝.

// ─────────────── mock ───────────────

type ProjectStatus = "대기" | "진행중" | "완료" | "누락";

interface Project {
  id: string;
  title: string;
  status: ProjectStatus;
  progress: number; // 0 ~ 100
  assignees: string[];
  due: string; // "7/31" 표기용
  dday: number; // 음수 = 지남
  updated: string; // "7. 25."
  createdBy: { name: string; tone: string };
  purpose?: string;
  steps?: string[]; // 절차 텍스트 리스트 (1., 2., 3. …)
}

const PROJECTS: Project[] = [
  {
    id: "p1",
    title: "화순점 리뉴얼 2단계",
    status: "진행중",
    progress: 55,
    assignees: ["이하나", "하이여", "A매니저"],
    due: "7/31",
    dday: -3,
    updated: "7. 25.",
    createdBy: { name: "이앨리스", tone: "bg-emerald-500" },
    purpose:
      "2층 확장 + 인테리어 리뉴얼. 트레이너 룸 · 그룹 PT 존 신설. 8/8 오픈 목표.",
    steps: [
      "시공 견적 3사 비교",
      "자재 발주 · 시공 착수",
      "부분 오픈 프로모션 페이지",
      "회원 이관 안내 알림톡 발송",
    ],
  },
  {
    id: "p2",
    title: "앱 · 홈페이지 개편",
    status: "진행중",
    progress: 30,
    assignees: ["박그레이스", "이하나"],
    due: "8/15",
    dday: 18,
    updated: "7. 26.",
    createdBy: { name: "박그레이스", tone: "bg-violet-500" },
    purpose: "회원 · 예약 유입 경로 통합. 모바일 반응형 리디자인.",
    steps: [
      "IA · 와이어프레임 확정",
      "디자인 시스템 v2 반영",
      "예약 흐름 개편 · A/B 테스트",
    ],
  },
  {
    id: "p3",
    title: "트레이너 온보딩 프로세스 정립",
    status: "대기",
    progress: 0,
    assignees: [],
    due: "9/10",
    dday: 44,
    updated: "7. 10.",
    createdBy: { name: "박그레이스", tone: "bg-violet-500" },
    purpose:
      "신규 트레이너 첫 2주 온보딩 체크리스트 · 메이트 매칭 가이드 정리 → 문서함 등록.",
    steps: [
      "체크리스트 초안",
      "리드 리뷰 반영",
      "문서함 등록 · 전사 알림",
    ],
  },
  {
    id: "p4",
    title: "여름 리텐션 캠페인",
    status: "완료",
    progress: 100,
    assignees: ["하이여", "정프로"],
    due: "7/20",
    dday: -8,
    updated: "7. 20.",
    createdBy: { name: "김데모", tone: "bg-primary" },
    purpose:
      "3개월 이상 미출석 회원 대상 재등록 인센티브. 목표 재등록률 15%.",
    steps: [
      "대상자 세그먼트",
      "알림톡 A/B 발송",
      "결과 리포트 공유",
    ],
  },
  {
    id: "p5",
    title: "Q1 실적 회고 · 리포트",
    status: "완료",
    progress: 100,
    assignees: ["김데모"],
    due: "4/15",
    dday: -104,
    updated: "4. 15.",
    createdBy: { name: "김데모", tone: "bg-primary" },
    purpose: "Q1 매출 · 회원 · PT 지표 리뷰. Q2 계획 근거 자료.",
    steps: ["데이터 수집", "리포트 작성", "발표 · 배포"],
  },
];

type FilterKey = "all" | ProjectStatus;
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "대기", label: "대기" },
  { key: "진행중", label: "진행중" },
  { key: "완료", label: "완료" },
  { key: "누락", label: "누락" },
];

type SortKey = "due" | "updated" | "progress";

// ─────────────── page ───────────────

export default function ProjectsPage() {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<SortKey>("due");
  const [q, setQ] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const detailProject = detailId
    ? PROJECTS.find((p) => p.id === detailId) ?? null
    : null;

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const base = PROJECTS.filter((p) => {
      if (filter !== "all" && p.status !== filter) return false;
      if (!query) return true;
      return (
        p.title.toLowerCase().includes(query) ||
        p.assignees.some((a) => a.toLowerCase().includes(query))
      );
    });
    const sorted = [...base];
    if (sort === "due") {
      // 마감 임박 (작은 dday) → 지남 (음수) → 여유 (큰 dday)
      // 완료/누락은 뒤로 미룸.
      sorted.sort((a, b) => {
        const finished = (p: Project) => p.status === "완료" ? 1 : 0;
        if (finished(a) !== finished(b)) return finished(a) - finished(b);
        return a.dday - b.dday;
      });
    } else if (sort === "updated") {
      sorted.sort((a, b) => (a.updated < b.updated ? 1 : -1));
    } else {
      sorted.sort((a, b) => b.progress - a.progress);
    }
    return sorted;
  }, [filter, sort, q]);

  // 상태별 그룹핑 (전체 필터일 때만 그룹 헤더 노출).
  const groups = useMemo(() => {
    if (filter !== "all") return [{ label: null, items: filtered }];
    const order: ProjectStatus[] = ["진행중", "대기", "완료", "누락"];
    return order
      .map((status) => ({
        label: status,
        items: filtered.filter((p) => p.status === status),
      }))
      .filter((g) => g.items.length > 0);
  }, [filter, filtered]);

  const totals = {
    all: PROJECTS.length,
    inProgress: PROJECTS.filter((p) => p.status === "진행중").length,
    dueThisWeek: PROJECTS.filter(
      (p) => p.status !== "완료" && p.dday >= 0 && p.dday <= 7,
    ).length,
    done: PROJECTS.filter((p) => p.status === "완료").length,
  };

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

      {/* 프로젝트 목록 — full width, 상태 그룹핑 */}
      <div className="mt-6 space-y-6">
        {groups.length === 0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-lg border border-line bg-card p-8 text-center">
            <FolderIcon className="size-8 text-muted/70" />
            <p className="text-sm text-muted">조건에 맞는 프로젝트가 없어요.</p>
          </div>
        ) : (
          groups.map((g, gi) => (
            <section key={g.label ?? gi}>
              {g.label && (
                <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted">
                  <span>{g.label}</span>
                  <span className="text-muted/70 tabular-nums">
                    · {g.items.length}
                  </span>
                </h3>
              )}
              <ul className="space-y-3">
                {g.items.map((p) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    onOpen={() => setDetailId(p.id)}
                  />
                ))}
              </ul>
            </section>
          ))
        )}
      </div>

      <NewProjectDialog open={newOpen} onClose={() => setNewOpen(false)} />
      <ProjectDetailDialog
        open={detailProject !== null}
        project={detailProject}
        onClose={() => setDetailId(null)}
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
  진행중: {
    bar: "bg-sky-400",
    chipBg: "bg-sky-500/15",
    chipText: "text-sky-400",
    bar2: "bg-sky-400",
  },
  대기: {
    bar: "bg-neutral-500",
    chipBg: "bg-card-hover",
    chipText: "text-muted",
    bar2: "bg-neutral-500",
  },
  완료: {
    bar: "bg-emerald-400",
    chipBg: "bg-emerald-500/15",
    chipText: "text-emerald-400",
    bar2: "bg-emerald-400",
  },
  누락: {
    bar: "bg-red-400",
    chipBg: "bg-red-500/15",
    chipText: "text-red-400",
    bar2: "bg-red-400",
  },
};

function ProjectCard({
  project,
  onOpen,
}: {
  project: Project;
  onOpen: () => void;
}) {
  const s = STATUS_STYLE[project.status];
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="group relative flex w-full items-start gap-4 overflow-hidden rounded-lg border border-line bg-card p-5 text-left transition-colors hover:bg-card-hover"
      >
        {/* 좌측 컬러 세로 바 (회의록과 톤 통일) */}
        <span className={`absolute top-0 bottom-0 left-0 w-1 ${s.bar}`} />

        <div className="min-w-0 flex-1 pl-3">
          {/* 제목 · 상태 chip */}
          <div className="flex items-start justify-between gap-2">
            <h4 className="truncate text-base font-bold text-fg">
              {project.title}
            </h4>
            <span
              className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${s.chipBg} ${s.chipText}`}
            >
              {project.status === "진행중"
                ? `${project.progress}%`
                : project.status}
            </span>
          </div>

          {/* 담당자 · 마감 · 수정 · D-day */}
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
            {project.assignees.length > 0 ? (
              <div className="flex items-center gap-2">
                <Avatar
                  name={project.assignees[0]}
                  tone={project.createdBy.tone}
                />
                <span className="font-medium text-fg">
                  {project.assignees.join(", ")}
                </span>
              </div>
            ) : (
              <span className="text-muted">담당자 미지정</span>
            )}
            <span>·</span>
            <span>마감 {project.due}</span>
            <span className="ml-auto flex items-center gap-2">
              <DdayBadge project={project} />
              <span className="tabular-nums">수정 {project.updated}</span>
            </span>
          </div>

          {/* 진행률 바 (대기 상태는 숨김) */}
          {project.status !== "대기" && (
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

function DdayBadge({ project }: { project: Project }) {
  if (project.status === "완료") {
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
    project.dday <= 0
      ? "text-red-400"
      : project.dday <= 7
        ? "text-amber-400"
        : "text-muted";
  const label = project.dday >= 0 ? `D-${project.dday}` : `D+${-project.dday}`;
  return (
    <span className={`text-xs font-bold tabular-nums ${tone}`}>{label}</span>
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
