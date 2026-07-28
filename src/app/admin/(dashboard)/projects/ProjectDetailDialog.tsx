"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import { getV2ErrorMessage } from "@/lib/api/v2/client";
import { avatarTone } from "@/lib/api/v2/employees";
import {
  computeDday,
  statusLabel,
  updateProject,
  type ProjectOut,
  type ProjectStatus,
} from "@/lib/api/v2/projects";
import { ExtensionRequestDialog } from "./ExtensionRequestDialog";

// 프로젝트 상세 다이얼로그 — PATCH /projects/{id} 로 진행률 저장.
// 완료 버튼 = progress 100 (백엔드가 status=DONE 파생).
// 담당자는 progress 만 수정 가능 (백엔드가 강제). 기타 필드는 편집 UI 없음 (읽기 전용).

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

interface ProjectDetailDialogProps {
  open: boolean;
  project: ProjectOut | null;
  today: Date;
  nameOf: (id: string) => string;
  colorOf: (id: string) => string | undefined;
  onClose: () => void;
  onChanged: () => void;
}

export function ProjectDetailDialog({
  open,
  project,
  today,
  nameOf,
  colorOf,
  onClose,
  onChanged,
}: ProjectDetailDialogProps) {
  useEscapeKey(onClose, open);

  const [progress, setProgress] = useState<number>(project?.progress ?? 0);
  const [extensionOpen, setExtensionOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: ({ id, newProgress }: { id: string; newProgress: number }) =>
      updateProject(id, { progress: newProgress }),
    onSuccess: () => {
      onChanged();
      onClose();
    },
  });

  useEffect(() => {
    if (open && project) {
      setProgress(project.progress);
      mutation.reset();
    }
    if (!open) setExtensionOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, project?.id]);

  if (!open || !project) return null;

  const dirty = progress !== project.progress;
  const dday = computeDday(project.due, today);
  const stepList = project.steps
    ? project.steps.split(/\r?\n/).filter((s) => s.trim().length > 0)
    : [];

  function complete() {
    mutation.mutate({ id: project!.id, newProgress: 100 });
  }
  function saveProgress() {
    mutation.mutate({ id: project!.id, newProgress: progress });
  }

  const showFooter = project.status !== "DONE";

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
        {/* 헤더 */}
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
            <HeaderDday status={project.status} dday={dday} />
          </div>

          <div className="mt-3">
            <StatusChip status={project.status} progress={project.progress} />
          </div>

          {project.status !== "WAITING" && (
            <div className="mt-4">
              <div className="flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-card-hover">
                  <div
                    className={`h-full rounded-full transition-all ${
                      project.status === "DONE"
                        ? "bg-emerald-400"
                        : project.status === "MISSED"
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

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {/* 담당자 + 마감일 */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-fg">담당자</p>
              {project.assigneeIds.length === 0 ? (
                <p className="mt-2 text-sm text-muted">
                  아직 지정되지 않았어요.
                </p>
              ) : (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {project.assigneeIds.map((id) => {
                    const name = nameOf(id);
                    const tone = colorOf(id)
                      ? avatarTone(colorOf(id))
                      : toneForName(name);
                    return (
                      <li
                        key={id}
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
                {formatMD(project.due)}
              </p>
              <p
                className={`mt-0.5 text-xs font-semibold tabular-nums ${
                  project.status === "DONE"
                    ? "text-emerald-400"
                    : dday <= 0
                      ? "text-red-400"
                      : dday <= 7
                        ? "text-amber-400"
                        : "text-muted"
                }`}
              >
                {project.status === "DONE"
                  ? "완료됨"
                  : dday >= 0
                    ? `${dday}일 남음`
                    : `${-dday}일 지남`}
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
          {stepList.length > 0 && (
            <div>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-fg">
                <span aria-hidden>📋</span>절차
              </p>
              <ol className="mt-2 space-y-2">
                {stepList.map((s, i) => (
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
          {project.status !== "DONE" && (
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

          {mutation.isError && (
            <div className="flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              <ExclamationTriangleIcon className="size-4 shrink-0" />
              <span>{getV2ErrorMessage(mutation.error)}</span>
            </div>
          )}
        </div>

        {showFooter && (
          <div className="space-y-2 border-t border-line px-6 py-4">
            <button
              type="button"
              onClick={dirty ? saveProgress : complete}
              disabled={mutation.isPending}
              className="w-full rounded-md border border-primary bg-primary/25 py-2.5 text-sm font-bold text-primary shadow-lg shadow-primary/20 transition-colors hover:bg-primary/35 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {mutation.isPending
                ? "저장 중…"
                : dirty
                  ? "진행률 저장"
                  : "완료"}
            </button>
            <button
              type="button"
              onClick={() => setExtensionOpen(true)}
              disabled={mutation.isPending}
              className="w-full rounded-md border border-line py-2.5 text-sm font-semibold text-fg transition-colors hover:bg-card-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              기한 연장 요청
            </button>
          </div>
        )}
      </div>

      <ExtensionRequestDialog
        open={extensionOpen}
        projectId={project.id}
        currentDue={formatMD(project.due)}
        overdue={dday < 0}
        onClose={() => setExtensionOpen(false)}
        onSubmitted={() => {
          setExtensionOpen(false);
          onChanged();
        }}
      />
    </div>
  );
}

// ─────────────── bits ───────────────

function HeaderDday({
  status,
  dday,
}: {
  status: ProjectStatus;
  dday: number;
}) {
  if (status === "DONE") {
    return (
      <span className="inline-flex items-center gap-1 text-lg font-black text-emerald-400">
        <CheckCircleIcon className="size-5" />
        완료
      </span>
    );
  }
  const tone =
    dday <= 0
      ? "text-red-400 drop-shadow-[0_0_12px_rgba(248,113,113,0.5)]"
      : dday <= 7
        ? "text-amber-400"
        : "text-muted";
  const label = dday >= 0 ? `D-${dday}` : `D+${-dday}`;
  return (
    <span className={`text-2xl font-black tabular-nums ${tone}`}>{label}</span>
  );
}

function StatusChip({
  status,
  progress,
}: {
  status: ProjectStatus;
  progress: number;
}) {
  const style =
    status === "IN_PROGRESS"
      ? "bg-sky-500/15 text-sky-400"
      : status === "DONE"
        ? "bg-emerald-500/15 text-emerald-400"
        : status === "MISSED"
          ? "bg-red-500/15 text-red-400"
          : "bg-card-hover text-muted";
  const label = status === "IN_PROGRESS" ? `${progress}%` : statusLabel(status);
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold ${style}`}
    >
      {label}
    </span>
  );
}

function formatMD(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
