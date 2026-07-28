"use client";

import { useMemo, useState } from "react";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  FolderIcon,
  MagnifyingGlassIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { PageTitle } from "../PageTitle";
import { NewProjectDialog } from "./NewProjectDialog";

// 프로젝트 페이지 (v2, PC 우선) — 좌 목록 + 우 상세 split.
// mock. 실제 저장/할당/알림은 API 붙는 시점에.

// ─────────────── mock ───────────────

type ProjectStatus = "대기" | "진행중" | "완료" | "누락";

interface Project {
  id: string;
  title: string;
  status: ProjectStatus;
  progress: number; // 0 ~ 100
  assignees: string[]; // 이름 리스트 (담당자 미배정이면 [])
  due: string; // "7/31" 등 표기용
  dday: number; // 음수 = 지남
  purpose?: string;
  steps?: { done: boolean; text: string }[];
  createdBy?: { name: string; tone: string };
  updated?: string;
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
    purpose:
      "2층 확장 + 인테리어 리뉴얼. 트레이너 룸 · 그룹 PT 존 신설. 8/8 오픈 목표.",
    steps: [
      { done: true, text: "시공 견적 3사 비교" },
      { done: true, text: "자재 발주" },
      { done: false, text: "부분 오픈 프로모션 페이지" },
      { done: false, text: "회원 이관 안내 알림톡" },
    ],
    createdBy: { name: "이앨리스", tone: "bg-emerald-500" },
    updated: "7. 25.",
  },
  {
    id: "p2",
    title: "여름 리텐션 캠페인",
    status: "완료",
    progress: 100,
    assignees: ["하이여", "정프로"],
    due: "7/20",
    dday: -8,
    purpose:
      "3개월 이상 미출석 회원 대상 재등록 인센티브. 목표 재등록률 15%.",
    steps: [
      { done: true, text: "대상자 추출 · 세그먼트" },
      { done: true, text: "알림톡 A/B 발송" },
      { done: true, text: "결과 리포트 공유" },
    ],
    createdBy: { name: "김데모", tone: "bg-primary" },
    updated: "7. 20.",
  },
  {
    id: "p3",
    title: "트레이너 온보딩 프로세스 정립",
    status: "대기",
    progress: 0,
    assignees: [],
    due: "9/10",
    dday: 44,
    purpose:
      "신규 트레이너 첫 2주 온보딩 체크리스트 · 메이트 매칭 가이드 초안 작성 → 리드 리뷰 → 문서함 등록.",
    steps: [
      { done: false, text: "체크리스트 초안" },
      { done: false, text: "리드 리뷰" },
      { done: false, text: "문서함 등록 · 알림" },
    ],
    createdBy: { name: "박그레이스", tone: "bg-violet-500" },
    updated: "7. 10.",
  },
];

type StatusFilter = "all" | ProjectStatus;
const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "대기", label: "대기" },
  { key: "진행중", label: "진행중" },
  { key: "완료", label: "완료" },
  { key: "누락", label: "누락" },
];

// ─────────────── page ───────────────

export default function ProjectsPage() {
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(PROJECTS[0].id);
  const [newOpen, setNewOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PROJECTS.filter((p) => {
      if (filter !== "all" && p.status !== filter) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.assignees.some((a) => a.toLowerCase().includes(q))
      );
    });
  }, [filter, query]);

  const inFiltered = filtered.some((p) => p.id === selectedId);
  const effectiveId = inFiltered ? selectedId : filtered[0]?.id ?? null;
  const selected = effectiveId
    ? PROJECTS.find((p) => p.id === effectiveId) ?? null
    : null;

  const totalCount = PROJECTS.length;
  const inProgress = PROJECTS.filter((p) => p.status === "진행중").length;
  const done = PROJECTS.filter((p) => p.status === "완료").length;

  return (
    <div>
      <PageTitle title="프로젝트" />

      {/* 상단 */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs text-muted">업무</p>
          <h1 className="mt-0.5 text-2xl font-black tracking-tighter text-fg">
            프로젝트
          </h1>
          <p className="mt-1 text-sm text-muted">
            전체 <span className="font-bold text-fg">{totalCount}</span>{" "}
            <span className="text-line">·</span> 진행중{" "}
            <span className="font-bold text-fg">{inProgress}</span>{" "}
            <span className="text-line">·</span> 완료{" "}
            <span className="font-bold text-fg">{done}</span>
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
            onClick={() => setNewOpen(true)}
            className="flex items-center gap-1 rounded-md border border-primary bg-primary/25 px-3 py-2 text-sm font-semibold text-primary shadow-lg shadow-primary/20 transition-colors hover:bg-primary/35"
          >
            <PlusIcon className="size-4" />새 프로젝트
          </button>
        </div>
      </div>

      {/* 검색 */}
      <div className="relative mt-5">
        <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="프로젝트 · 담당자로 검색"
          className="w-full rounded-md border border-line bg-card-hover py-2.5 pr-3 pl-9 text-sm text-fg placeholder-muted focus:border-primary focus:outline-none"
        />
      </div>

      {/* 필터 chips + 총 개수 */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-lg border px-4 py-1.5 text-sm font-semibold transition-colors ${
                active
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-line text-fg hover:bg-card-hover"
              }`}
            >
              {f.label}
            </button>
          );
        })}
        <span className="ml-auto text-sm text-muted tabular-nums">
          {filtered.length}개
        </span>
      </div>

      {/* 본문 : lg 에서 좌 1/3 + 우 2/3 split */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div>
          <ProjectListCard
            projects={filtered}
            selectedId={effectiveId}
            onSelect={setSelectedId}
          />
        </div>
        <div className="lg:col-span-2">
          {selected ? (
            <ProjectDetail project={selected} />
          ) : (
            <EmptyState />
          )}
        </div>
      </div>

      <NewProjectDialog open={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  );
}

// ─────────────── ProjectListCard ───────────────

function ProjectListCard({
  projects,
  selectedId,
  onSelect,
}: {
  projects: Project[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-card">
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <h2 className="text-base font-bold text-fg">프로젝트 목록</h2>
        <span className="text-xs text-muted tabular-nums">
          {projects.length}건
        </span>
      </div>
      {projects.length === 0 ? (
        <p className="border-t border-line px-5 py-10 text-center text-sm text-muted">
          조건에 맞는 프로젝트가 없어요.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {projects.map((p) => (
            <ProjectRow
              key={p.id}
              project={p}
              active={selectedId === p.id}
              onClick={() => onSelect(p.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ProjectRow({
  project,
  active,
  onClick,
}: {
  project: Project;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`flex w-full items-start gap-3 px-5 py-4 text-left transition-colors ${
          active ? "bg-primary/15" : "hover:bg-card-hover"
        }`}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-fg">{project.title}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusChip project={project} />
            <p className="min-w-0 truncate text-xs text-muted">
              {project.assignees.length > 0
                ? project.assignees.join(", ")
                : "미지정"}{" "}
              <span className="text-line">·</span> 마감 {project.due}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <DdayBadge project={project} />
          <ChevronRightIcon className="size-4 text-muted" />
        </div>
      </button>
    </li>
  );
}

function StatusChip({ project }: { project: Project }) {
  switch (project.status) {
    case "진행중":
      return (
        <span className="rounded-md bg-sky-500/15 px-2 py-0.5 text-xs font-bold text-sky-400">
          {project.progress}%
        </span>
      );
    case "완료":
      return (
        <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-400">
          완료
        </span>
      );
    case "누락":
      return (
        <span className="rounded-md bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-400">
          누락
        </span>
      );
    case "대기":
    default:
      return (
        <span className="rounded-md bg-card-hover px-2 py-0.5 text-xs font-semibold text-muted">
          대기
        </span>
      );
  }
}

function DdayBadge({ project }: { project: Project }) {
  if (project.status === "완료") {
    return (
      <CheckCircleIcon className="size-5 text-emerald-400" aria-label="완료" />
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
    <span className={`text-sm font-bold tabular-nums ${tone}`}>{label}</span>
  );
}

// ─────────────── ProjectDetail ───────────────

function ProjectDetail({ project }: { project: Project }) {
  return (
    <div className="rounded-lg border border-line bg-card">
      {/* 헤더 */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-6 py-5">
        <div className="min-w-0">
          <p className="text-xs text-muted">프로젝트</p>
          <h2 className="mt-0.5 text-lg font-bold text-fg">{project.title}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusChip project={project} />
            <span className="text-xs text-muted">
              담당{" "}
              <span className="text-fg">
                {project.assignees.length > 0
                  ? project.assignees.join(", ")
                  : "미지정"}
              </span>{" "}
              <span className="text-line">·</span> 마감{" "}
              <span className="font-semibold text-fg">{project.due}</span>
            </span>
          </div>
        </div>
        <DdayBadge project={project} />
      </div>

      {/* 진행률 바 */}
      {project.status !== "대기" && (
        <div className="border-b border-line px-6 py-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold text-muted">진행률</p>
            <p className="text-sm font-bold tabular-nums text-fg">
              {project.progress}%
            </p>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-card-hover">
            <div
              className={`h-full rounded-full transition-all ${
                project.status === "완료"
                  ? "bg-emerald-400"
                  : project.status === "누락"
                    ? "bg-red-400"
                    : "bg-sky-400"
              }`}
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* 목표 */}
      {project.purpose && (
        <div className="border-b border-line px-6 py-5">
          <p className="text-xs font-semibold text-muted">목표</p>
          <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-fg">
            {project.purpose}
          </p>
        </div>
      )}

      {/* 단계 (steps) */}
      {project.steps && project.steps.length > 0 && (
        <div className="border-b border-line px-6 py-5">
          <p className="text-xs font-semibold text-muted">
            단계 <span className="text-muted/70 tabular-nums">· {project.steps.filter((s) => s.done).length} / {project.steps.length}</span>
          </p>
          <ul className="mt-3 space-y-2">
            {project.steps.map((s, i) => (
              <li
                key={i}
                className="flex items-center gap-2.5 rounded-md border border-line bg-card-hover px-3 py-2"
              >
                <span
                  className={`flex size-4 shrink-0 items-center justify-center rounded ${
                    s.done
                      ? "bg-emerald-500/25 text-emerald-400"
                      : "border border-line"
                  }`}
                >
                  {s.done && (
                    <svg
                      viewBox="0 0 12 12"
                      fill="none"
                      className="size-2.5"
                      aria-hidden
                    >
                      <path
                        d="M2 6l3 3 5-6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
                <span
                  className={`text-sm ${
                    s.done ? "text-muted line-through" : "text-fg"
                  }`}
                >
                  {s.text}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 담당자 */}
      <div className="border-b border-line px-6 py-5">
        <p className="text-xs font-semibold text-muted">담당자</p>
        {project.assignees.length === 0 ? (
          <p className="mt-2 text-sm text-muted">아직 지정되지 않았어요.</p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {project.assignees.map((name) => (
              <li
                key={name}
                className="flex items-center gap-2 rounded-full border border-line bg-card-hover px-3 py-1"
              >
                <span
                  className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white"
                  aria-hidden
                >
                  {name.charAt(0)}
                </span>
                <span className="text-sm text-fg">{name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 하단 메타 + 액션 */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-4">
        <p className="text-xs text-muted tabular-nums">
          {project.createdBy && (
            <>
              작성 <span className="text-fg">{project.createdBy.name}</span>{" "}
              <span className="text-line">·</span>{" "}
            </>
          )}
          최근 수정 {project.updated}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-fg hover:bg-card-hover"
          >
            편집
          </button>
          <button
            type="button"
            className="rounded-md border border-primary bg-primary/25 px-3 py-1.5 text-xs font-semibold text-primary shadow-lg shadow-primary/20 hover:bg-primary/35"
          >
            달성 · 코멘트
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────── EmptyState ───────────────

function EmptyState() {
  return (
    <div className="flex h-full min-h-72 flex-col items-center justify-center gap-3 rounded-lg border border-line bg-card p-8 text-center">
      <FolderIcon className="size-8 text-muted/70" />
      <p className="text-sm text-muted">목록에서 프로젝트를 선택해주세요.</p>
    </div>
  );
}
