"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  AdjustmentsHorizontalIcon,
  CalendarIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { getMe } from "@/lib/api/auth";
import { useToast } from "@/providers/ToastProvider";
import { formatDate } from "@/lib/format";
import { PageTitle } from "../../PageTitle";
import { MobileSubPage } from "../../MobileSubPage";
import { ConfirmDialog } from "@/components/ConfirmDialog";

// 프로젝트 — 직원이 직접 생성. 주도자 = 생성자.
// 주도자만 진척도 / 완료 / 삭제 가능, 참여자는 read-only.
// 백엔드 연결 전 — 동료 목록 mock + 프로젝트 데이터는 localStorage.
//
// 색은 border + bg-primary/N opacity 위주로 짜서 다크 테마 swap 친화.

type Colleague = { id: string; name: string; position: string };

// TODO: 백엔드 연결 시 본인 지점 직원 목록 API 로 교체.
const MOCK_COLLEAGUES: Colleague[] = [
  { id: "c-1", name: "김민수", position: "점장" },
  { id: "c-2", name: "박지영", position: "팀장" },
  { id: "c-3", name: "이은후", position: "트레이너" },
  { id: "c-4", name: "박회순", position: "FC" },
  { id: "c-5", name: "이명진", position: "FC" },
];

type Project = {
  id: string;
  title: string;
  description: string;
  leaderName: string; // mock 단계라 이름 그대로 (백엔드 ID 로 교체)
  memberNames: string[]; // 주도자 포함
  deadline: string; // YYYY-MM-DD
  progress: number; // 0-100
  status: "active" | "done";
  createdAt: number;
  updatedAt: number;
};

const STORAGE_KEY = "projects:v2";

function loadProjects(): Project[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Project[]) : [];
  } catch {
    return [];
  }
}
function saveProjects(list: Project[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}
function genId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return crypto.randomUUID();
  return `${Date.now()}-${Math.random()}`;
}

// 마감일 D-day 계산 — 양수 면 남은 일수, 0 = 오늘, 음수 = 지남.
function daysUntil(deadline: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(deadline + "T00:00:00");
  return Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
function ddayLabel(deadline: string, status: Project["status"]): string {
  if (status === "done") return `완료 · 마감 ${formatDate(deadline)}`;
  const d = daysUntil(deadline);
  if (d > 0) return `D-${d} · ${formatDate(deadline)}`;
  if (d === 0) return `D-day · ${formatDate(deadline)}`;
  return `${Math.abs(d)}일 지남 · ${formatDate(deadline)}`;
}

export default function StaffProjectsPage() {
  const meQuery = useQuery({ queryKey: ["admin", "me"], queryFn: getMe });
  const myName = meQuery.data?.name ?? "";
  const toast = useToast();

  const [projects, setProjects] = useState<Project[]>([]);
  useEffect(() => {
    setProjects(loadProjects());
  }, []);

  // 본인 포함 동료 목록 — 함께하는 인원 선택용
  const allMembers: Colleague[] = myName
    ? MOCK_COLLEAGUES.some((c) => c.name === myName)
      ? MOCK_COLLEAGUES
      : [{ id: "me", name: myName, position: "본인" }, ...MOCK_COLLEAGUES]
    : MOCK_COLLEAGUES;

  const [createOpen, setCreateOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const openProject = openId ? projects.find((p) => p.id === openId) : null;

  // 검색 — 제목 또는 멤버 이름 기준. 디바운스 300ms.
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(
      () => setDebouncedSearch(searchInput.trim().toLowerCase()),
      300,
    );
    return () => clearTimeout(t);
  }, [searchInput]);

  // ⚙ 필터 popover — 진행 중 / 완료 단일 선택. 기본 "active" (진행 중만).
  // 외부 클릭 시 자동 닫힘.
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const [statusFilter, setStatusFilter] = useState<"active" | "done">("active");
  useEffect(() => {
    if (!filterOpen) return;
    function handle(e: PointerEvent) {
      if (
        filterRef.current &&
        !filterRef.current.contains(e.target as Node)
      ) {
        setFilterOpen(false);
      }
    }
    document.addEventListener("pointerdown", handle);
    return () => document.removeEventListener("pointerdown", handle);
  }, [filterOpen]);

  function persist(next: Project[]) {
    setProjects(next);
    saveProjects(next);
  }

  function createProject(input: {
    title: string;
    description: string;
    deadline: string;
    memberNames: string[];
  }) {
    if (!myName) return;
    const now = Date.now();
    const nextMembers = input.memberNames.includes(myName)
      ? input.memberNames
      : [myName, ...input.memberNames];
    const project: Project = {
      id: genId(),
      title: input.title,
      description: input.description,
      leaderName: myName,
      memberNames: nextMembers,
      deadline: input.deadline,
      progress: 0,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    persist([project, ...projects]);
    setCreateOpen(false);
    toast.success("프로젝트를 등록했어요.");
  }

  function updateProject(id: string, patch: Partial<Project>) {
    persist(
      projects.map((p) =>
        p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p,
      ),
    );
  }

  function deleteProject(id: string) {
    persist(projects.filter((p) => p.id !== id));
    setOpenId(null);
    toast.success("프로젝트를 삭제했어요.");
  }

  // 검색 + status 필터 적용한 가시 목록
  const visibleProjects = projects.filter((p) => {
    if (p.status !== statusFilter) return false;
    if (debouncedSearch) {
      const hay = `${p.title.toLowerCase()} ${p.memberNames.join(" ").toLowerCase()}`;
      if (!hay.includes(debouncedSearch)) return false;
    }
    return true;
  });
  // 카운트는 검색·필터와 무관한 전체 기준
  const myLeadCount = projects.filter(
    (p) => p.status === "active" && p.leaderName === myName,
  ).length;
  const totalActiveCount = projects.filter((p) => p.status === "active").length;

  return (
    <div>
      <PageTitle title="프로젝트" />

      {/* 검색 — 회원 페이지와 동일한 prominent 톤 (단독 한 줄). */}
      <div className="relative mt-2">
        <MagnifyingGlassIcon
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted"
        />
        <input
          type="search"
          placeholder="제목 또는 멤버 검색"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full rounded-xl border border-line bg-card py-3 pr-4 pl-11 text-[15px] text-fg placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none"
        />
      </div>

      {/* 카운트 줄 — 좌측 카운트, 우측에 ⚙ 필터 + + 새 프로젝트 작게.
          회원/PT 필터 버튼 톤 (border 없는 size-9 아이콘) 그대로. */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-xs text-muted">
          진행 중{" "}
          <span className="font-semibold text-fg tabular-nums">
            {totalActiveCount}개
          </span>
          {" · "}
          내가 주도{" "}
          <span className="font-semibold text-primary tabular-nums">
            {myLeadCount}개
          </span>
        </p>
        <div className="flex items-center gap-1">
          <div ref={filterRef} className="relative">
            <button
              type="button"
              onClick={() => setFilterOpen((v) => !v)}
              aria-label="필터"
              className={`flex size-9 items-center justify-center rounded-md transition-colors ${
                statusFilter === "done"
                  ? "bg-primary/10 text-primary"
                  : "text-muted hover:bg-card-hover hover:text-fg"
              }`}
            >
              <AdjustmentsHorizontalIcon className="size-5" />
            </button>
            {filterOpen && (
              <div className="animate-panel-in absolute top-full right-0 z-30 mt-2 w-40 overflow-hidden rounded-xl border border-line bg-card p-1.5 shadow-lg">
                {(["active", "done"] as const).map((s) => {
                  const label = s === "active" ? "진행 중" : "완료";
                  const selected = statusFilter === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setStatusFilter(s);
                        setFilterOpen(false);
                      }}
                      className={`block w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                        selected
                          ? "bg-primary/10 font-semibold text-primary"
                          : "text-fg hover:bg-card-hover"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            disabled={!myName}
            aria-label="새 프로젝트"
            className="flex size-9 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10 disabled:opacity-40"
          >
            <PlusIcon className="size-5" />
          </button>
        </div>
      </div>

      {/* 단일 섹션 — statusFilter 기준 (진행 중 또는 완료) 으로 visibleProjects
          렌더. 섹션 헤더는 필터 popover 가 이미 상태를 보여주니 생략. */}
      <section className="mt-6">
        {visibleProjects.length === 0 ? (
          <p className="mt-2 rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
            {statusFilter === "active"
              ? "진행 중인 프로젝트가 없어요."
              : "완료된 프로젝트가 없어요."}
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {visibleProjects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                isLeader={p.leaderName === myName}
                onClick={() => setOpenId(p.id)}
              />
            ))}
          </ul>
        )}
      </section>

      {openProject && (
        <MobileSubPage
          title={openProject.title}
          onClose={() => setOpenId(null)}
        >
          <ProjectDetail
            project={openProject}
            isLeader={openProject.leaderName === myName}
            onUpdate={(patch) => updateProject(openProject.id, patch)}
            onDelete={() => deleteProject(openProject.id)}
            onClose={() => setOpenId(null)}
          />
        </MobileSubPage>
      )}

      {createOpen && (
        <CreateProjectDialog
          allMembers={allMembers}
          myName={myName}
          onCancel={() => setCreateOpen(false)}
          onCreate={createProject}
        />
      )}
    </div>
  );
}

// 카드 — 제목 + 마감일 D-day + 멤버 + 진척도 바
function ProjectCard({
  project,
  isLeader,
  onClick,
}: {
  project: Project;
  isLeader: boolean;
  onClick: () => void;
}) {
  const done = project.status === "done";
  const overdue = !done && daysUntil(project.deadline) < 0;
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`w-full rounded-xl border p-4 text-left transition-colors ${
          done
            ? "border-line bg-card-hover"
            : "border-line bg-card hover:bg-card-hover"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <p
            className={`flex-1 truncate text-sm font-semibold ${
              done ? "text-muted" : "text-fg"
            }`}
          >
            {project.title}
          </p>
          {isLeader && (
            <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
              주도
            </span>
          )}
        </div>
        <p
          className={`mt-1 flex items-center gap-1 text-[11px] ${
            overdue ? "text-red-400" : "text-muted"
          }`}
        >
          <CalendarIcon className="size-3" />
          {ddayLabel(project.deadline, project.status)}
        </p>
        <p className="mt-2 flex items-center gap-1 truncate text-[11px] text-muted">
          <UserGroupIcon className="size-3 shrink-0" />
          <span className="truncate">{project.memberNames.join(", ")}</span>
        </p>
        <div className="mt-3 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-card-hover">
            <div
              className={`h-full rounded-full ${done ? "bg-muted" : "bg-primary"}`}
              style={{ width: `${project.progress}%` }}
            />
          </div>
          <span
            className={`shrink-0 text-[11px] tabular-nums ${
              done ? "text-muted" : "text-primary"
            }`}
          >
            {project.progress}%
          </span>
        </div>
      </button>
    </li>
  );
}

// 상세 — 주도자 권한이면 진척도·저장·삭제 컨트롤, 아니면 read-only.
// 슬라이더는 local state 만. 저장 버튼이 진척도 + status (>=100 → done / 미만
// → active) 한꺼번에 반영하고 오버레이 닫음. ← 으로 나가면 슬라이더 변경은
// 저장 안 됨 (cancel 동작).
function ProjectDetail({
  project,
  isLeader,
  onUpdate,
  onDelete,
  onClose,
}: {
  project: Project;
  isLeader: boolean;
  onUpdate: (patch: Partial<Project>) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [progress, setProgress] = useState(project.progress);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-5">
        <p className="text-xs font-medium text-muted">주도자</p>
        <p className="mt-0.5 text-lg font-bold tracking-tight text-fg">
          {project.leaderName}
          {isLeader && (
            <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              나
            </span>
          )}
        </p>
      </header>

      {/* 마감일 */}
      <section className="rounded-lg border border-line bg-card-hover px-3 py-2.5">
        <p className="text-[11px] font-medium text-muted">마감일</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-fg">
          <CalendarIcon className="size-4 text-muted" />
          {ddayLabel(project.deadline, project.status)}
        </p>
      </section>

      {/* 함께하는 인원 */}
      <section className="mt-4">
        <p className="text-xs font-semibold text-muted">함께하는 인원</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {project.memberNames.map((name) => (
            <span
              key={name}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                name === project.leaderName
                  ? "bg-primary/10 text-primary"
                  : "bg-card-hover text-fg"
              }`}
            >
              {name === project.leaderName && (
                <span className="text-[10px]">★</span>
              )}
              {name}
            </span>
          ))}
        </div>
      </section>

      {/* 설명 */}
      {project.description && (
        <section className="mt-5">
          <p className="text-xs font-semibold text-muted">설명</p>
          <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-wrap text-fg">
            {project.description}
          </p>
        </section>
      )}

      {/* 진척도 — 주도자만 슬라이더 가능 */}
      <section className="mt-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-fg">진척도</p>
          <span className="text-sm font-bold tabular-nums text-primary">
            {progress}%
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={progress}
          onChange={(e) => setProgress(parseInt(e.target.value, 10))}
          disabled={!isLeader}
          className="mt-2 w-full accent-primary disabled:opacity-50"
        />
      </section>

      {/* 액션 — 주도자만. 저장 버튼이 슬라이더 값 + status 분기 (>=100 → done /
          미만 → active) 한 번에 반영하고 오버레이 닫음. ← 으로 나가면 cancel. */}
      {isLeader && (
        <section className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              onUpdate({
                progress,
                status: progress >= 100 ? "done" : "active",
              });
              onClose();
            }}
            className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            저장
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-red-500/30 px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10"
          >
            <TrashIcon className="size-4" />
            삭제
          </button>
        </section>
      )}

      <ConfirmDialog
        open={confirmDelete}
        danger
        title="프로젝트 삭제"
        message={`'${project.title}' 프로젝트를 삭제할까요?`}
        confirmLabel="삭제"
        requireText="삭제"
        onConfirm={onDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

// 새 프로젝트 생성 다이얼로그 — 제목 / 마감일 / 함께하는 인원 / 설명
function CreateProjectDialog({
  allMembers,
  myName,
  onCancel,
  onCreate,
}: {
  allMembers: Colleague[];
  myName: string;
  onCancel: () => void;
  onCreate: (input: {
    title: string;
    description: string;
    deadline: string;
    memberNames: string[];
  }) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  // 본인은 기본 선택 (주도자라서)
  const [memberNames, setMemberNames] = useState<string[]>(
    myName ? [myName] : [],
  );

  const canSubmit = title.trim() && deadline;

  function toggleMember(name: string) {
    if (name === myName) return; // 주도자는 항상 포함
    setMemberNames((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
  }

  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-10">
      <div className="animate-dialog-in flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-xl border border-line bg-card shadow-xl">
        <header className="border-b border-line px-5 py-4">
          <h2 className="text-base font-bold text-fg">새 프로젝트</h2>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div>
            <label className="text-xs font-semibold text-fg">
              제목 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 새 회원 환영 키트 제작"
              className="mt-1.5 w-full rounded-lg border border-line bg-card-hover px-3 py-2 text-sm text-fg placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none"
            />
          </div>

          <div className="mt-4">
            <label className="text-xs font-semibold text-fg">
              마감일 <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-line bg-card-hover px-3 py-2 text-sm text-fg focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none"
            />
          </div>

          <div className="mt-4">
            <label className="text-xs font-semibold text-fg">
              함께하는 인원
            </label>
            <p className="mt-0.5 text-[11px] text-muted">
              본인은 주도자로 자동 포함돼요.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {allMembers.map((m) => {
                const isMe = m.name === myName;
                const selected = memberNames.includes(m.name);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleMember(m.name)}
                    disabled={isMe}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      selected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-line bg-card-hover text-muted hover:text-fg"
                    } ${isMe ? "cursor-default opacity-100" : ""}`}
                  >
                    {m.name}
                    {isMe && (
                      <span className="ml-1 text-[10px] text-muted">
                        (본인)
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4">
            <label className="text-xs font-semibold text-fg">설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="프로젝트 내용·목표를 적어주세요"
              className="mt-1.5 w-full rounded-lg border border-line bg-card-hover px-3 py-2 text-sm leading-relaxed text-fg placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none"
            />
          </div>
        </div>
        <footer className="flex justify-end gap-2 border-t border-line px-5 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-line px-4 py-2 text-sm font-medium text-fg hover:bg-card-hover"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() =>
              canSubmit &&
              onCreate({
                title: title.trim(),
                description: description.trim(),
                deadline,
                memberNames,
              })
            }
            disabled={!canSubmit}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
          >
            등록
          </button>
        </footer>
      </div>
    </div>
  );
}
