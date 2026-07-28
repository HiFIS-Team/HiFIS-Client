"use client";

import { useEffect, useState } from "react";
import { CheckCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";

// 프로젝트 상세 모달 — 카드 클릭 시 오픈. UI 만. 저장 로직은 v2 /projects/{id} PATCH 시점.
// 상단: 제목 + D-day 뱃지 + X.
// 헤더 카드 : 상태 chip + 진행률 바.
// 담당자 · 목적 · 절차 → 하단 진행률 슬라이더 + 완료 · 기한 연장 요청 액션.

export interface ProjectDetail {
  id: string;
  title: string;
  status: "대기" | "진행중" | "완료" | "누락";
  progress: number;
  assignees: string[];
  due: string;
  dday: number;
  purpose?: string;
  steps?: string[];
}

interface ProjectDetailDialogProps {
  open: boolean;
  project: ProjectDetail | null;
  onClose: () => void;
}

// 아바타 배경 색 팔레트 (이름별 안정적 매핑) — 최대 6색 순환.
const AVATAR_TONES = [
  "bg-primary",
  "bg-emerald-500",
  "bg-sky-500",
  "bg-pink-500",
  "bg-amber-500",
  "bg-violet-500",
];
function toneForName(name: string): string {
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return AVATAR_TONES[sum % AVATAR_TONES.length];
}

export function ProjectDetailDialog({
  open,
  project,
  onClose,
}: ProjectDetailDialogProps) {
  useEscapeKey(onClose, open);

  // 진행률 슬라이더 로컬 상태 — 열릴 때마다 프로젝트 값으로 sync.
  const [progress, setProgress] = useState<number>(project?.progress ?? 0);
  useEffect(() => {
    if (open && project) setProgress(project.progress);
  }, [open, project]);

  if (!open || !project) return null;

  const dirty = progress !== project.progress;
  const finished = project.status === "완료" || progress >= 100;

  function complete() {
    // TODO: v2 /projects/{id} PATCH { status: 완료, progress: 100 }.
    onClose();
  }
  function requestExtension() {
    // TODO: v2 /projects/{id}/extend 요청 API.
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8"
      onClick={onClose}
    >
      <div
        className="animate-dialog-in flex max-h-full w-full max-w-xl flex-col overflow-hidden rounded-lg border border-line bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 카드 : 제목 · D-day · 상태 chip · 진행률 바 */}
        <div className="relative border-b border-line px-6 pt-5 pb-5">
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="absolute top-4 right-4 rounded-md p-1 text-muted transition-colors hover:bg-card-hover hover:text-fg"
          >
            <XMarkIcon className="size-5" />
          </button>

          <div className="flex items-start justify-between gap-3 pr-10">
            <h2 className="text-lg font-bold text-fg">{project.title}</h2>
            <HeaderDday project={project} />
          </div>

          <div className="mt-3">
            <StatusChip status={project.status} progress={project.progress} />
          </div>

          {project.status !== "대기" && (
            <div className="mt-4">
              <div className="flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-card-hover">
                  <div
                    className={`h-full rounded-full transition-all ${
                      project.status === "완료"
                        ? "bg-emerald-400"
                        : project.status === "누락"
                          ? "bg-red-400"
                          : "bg-primary"
                    }`}
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
                <span className="text-sm font-bold tabular-nums text-fg">
                  {project.progress}%
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 본문 스크롤 영역 */}
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {/* 담당자 + 마감일 */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-fg">담당자</p>
              {project.assignees.length === 0 ? (
                <p className="mt-2 text-sm text-muted">아직 지정되지 않았어요.</p>
              ) : (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {project.assignees.map((name) => {
                    const tone = toneForName(name);
                    return (
                      <li
                        key={name}
                        className="flex items-center gap-1.5 rounded-full border border-line bg-card-hover py-0.5 pr-3 pl-1"
                      >
                        <span
                          className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${tone}`}
                          aria-hidden
                        >
                          {name.charAt(0)}
                        </span>
                        <span className="text-sm text-fg">{name}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-muted">마감일</p>
              <p className="mt-1 text-lg font-black tabular-nums text-fg">
                {project.due}
              </p>
              <p
                className={`mt-0.5 text-xs font-semibold tabular-nums ${
                  project.status === "완료"
                    ? "text-emerald-400"
                    : project.dday <= 0
                      ? "text-red-400"
                      : project.dday <= 7
                        ? "text-amber-400"
                        : "text-muted"
                }`}
              >
                {project.status === "완료"
                  ? "완료됨"
                  : project.dday >= 0
                    ? `${project.dday}일 남음`
                    : `${-project.dday}일 지남`}
              </p>
            </div>
          </div>

          {/* 목적 */}
          {project.purpose && (
            <div>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-fg">
                <span aria-hidden>🎯</span>목적
              </p>
              <div className="mt-2 rounded-md border border-line bg-card-hover px-4 py-3 text-sm leading-6 whitespace-pre-wrap text-fg">
                {project.purpose}
              </div>
            </div>
          )}

          {/* 절차 */}
          {project.steps && project.steps.length > 0 && (
            <div>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-fg">
                <span aria-hidden>📋</span>절차
              </p>
              <ol className="mt-2 space-y-2">
                {project.steps.map((s, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-3 rounded-md border border-line bg-card-hover px-4 py-2.5"
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold tabular-nums text-primary">
                      {i + 1}
                    </span>
                    <span className="text-sm text-fg">{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* 진행률 조절 슬라이더 */}
          {project.status !== "완료" && (
            <div className="border-t border-line pt-5">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-fg">진행률 조절</p>
                <p className="text-sm font-bold tabular-nums text-primary">
                  {progress}%
                </p>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
          )}
        </div>

        {/* 푸터 액션 */}
        {project.status !== "완료" && (
          <div className="space-y-2 border-t border-line px-6 py-4">
            <button
              type="button"
              onClick={complete}
              className="w-full rounded-md border border-primary bg-primary/25 py-2.5 text-sm font-bold text-primary shadow-lg shadow-primary/20 transition-colors hover:bg-primary/35"
            >
              {finished ? "완료로 저장" : dirty ? "진행률 저장" : "완료"}
            </button>
            <button
              type="button"
              onClick={requestExtension}
              className="w-full rounded-md border border-line py-2.5 text-sm font-semibold text-fg transition-colors hover:bg-card-hover"
            >
              기한 연장 요청
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────── HeaderDday ───────────────

function HeaderDday({ project }: { project: ProjectDetail }) {
  if (project.status === "완료") {
    return (
      <span className="inline-flex items-center gap-1 text-lg font-black text-emerald-400">
        <CheckCircleIcon className="size-5" />
        완료
      </span>
    );
  }
  const tone =
    project.dday <= 0
      ? "text-red-400 drop-shadow-[0_0_12px_rgba(248,113,113,0.5)]"
      : project.dday <= 7
        ? "text-amber-400"
        : "text-muted";
  const label = project.dday >= 0 ? `D-${project.dday}` : `D+${-project.dday}`;
  return (
    <span className={`text-2xl font-black tabular-nums ${tone}`}>{label}</span>
  );
}

// ─────────────── StatusChip ───────────────

function StatusChip({
  status,
  progress,
}: {
  status: ProjectDetail["status"];
  progress: number;
}) {
  const style =
    status === "진행중"
      ? "bg-sky-500/15 text-sky-400"
      : status === "완료"
        ? "bg-emerald-500/15 text-emerald-400"
        : status === "누락"
          ? "bg-red-500/15 text-red-400"
          : "bg-card-hover text-muted";
  const label = status === "진행중" ? `${progress}%` : status;
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold ${style}`}
    >
      {label}
    </span>
  );
}
