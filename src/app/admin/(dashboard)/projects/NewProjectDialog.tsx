"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import { getV2ErrorMessage } from "@/lib/api/v2/client";
import type { EmployeeOut } from "@/lib/api/v2/types";
import { createProject } from "@/lib/api/v2/projects";
import { DialogGradientHeader } from "../DialogGradientHeader";

// 새 프로젝트 생성 다이얼로그 — POST /projects.
// 담당자 chip 은 employees 리스트에서 pick (id 로 저장).
// 마감 날짜는 date input → yyyy-MM-dd → 백엔드 datetime 으로는 자정 UTC 로 전송.

interface NewProjectDialogProps {
  open: boolean;
  onClose: () => void;
  employees: EmployeeOut[];
  onCreated: () => void;
}

export function NewProjectDialog({
  open,
  onClose,
  employees,
  onCreated,
}: NewProjectDialogProps) {
  useEscapeKey(onClose, open);

  const [title, setTitle] = useState("");
  const [purpose, setPurpose] = useState("");
  const [steps, setSteps] = useState("");
  const [due, setDue] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);

  const mutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => onCreated(),
  });

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setPurpose("");
    setSteps("");
    setDue("");
    setAssigneeIds([]);
    mutation.reset();
    // mutation 은 stable — deps 에 넣으면 무한 루프.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const canSubmit =
    title.trim().length > 0 && due.length > 0 && !mutation.isPending;

  function toggleAssignee(id: string) {
    setAssigneeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function submit() {
    if (!canSubmit) return;
    // date input (YYYY-MM-DD) → 그 날짜 자정 UTC ISO 로 전송.
    mutation.mutate({
      title: title.trim(),
      purpose: purpose.trim(),
      steps: steps.trim(),
      due: new Date(`${due}T00:00:00Z`).toISOString(),
      assigneeIds,
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8"
      onClick={onClose}
    >
      <div
        className="animate-dialog-in flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-line bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogGradientHeader
          kicker="NEW PROJECT"
          title="새 프로젝트"
          onClose={onClose}
        />

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <Field label="프로젝트 제목" required>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예) 3층 시설 점검"
              maxLength={80}
              autoFocus
              className="w-full rounded-md border border-line bg-card-hover px-3 py-2.5 text-sm text-fg placeholder-muted focus:border-primary focus:outline-none"
            />
          </Field>

          <Field label="목적">
            <textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="이 프로젝트를 왜 하나요?"
              className="w-full resize-y rounded-md border border-line bg-card-hover px-3 py-2.5 text-sm leading-6 text-fg placeholder-muted focus:border-primary focus:outline-none"
            />
          </Field>

          <Field label="절차">
            <textarea
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              rows={5}
              maxLength={1000}
              placeholder="어떤 순서로 진행하나요?"
              className="w-full resize-y rounded-md border border-line bg-card-hover px-3 py-2.5 text-sm leading-6 text-fg placeholder-muted focus:border-primary focus:outline-none"
            />
          </Field>

          <Field label="마감 날짜" required>
            <div className="flex items-center gap-2 rounded-md border border-line bg-card-hover px-3 py-2.5 focus-within:border-primary">
              <input
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm tabular-nums text-fg placeholder-muted focus:outline-none"
              />
              <svg
                viewBox="0 0 24 24"
                className="size-4 shrink-0 text-muted"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                aria-hidden
              >
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M8 3v4M16 3v4M3 10h18" strokeLinecap="round" />
              </svg>
            </div>
          </Field>

          {/* 담당자 chip — employees 에서 pick */}
          <div>
            <label className="block text-sm font-semibold text-fg">
              담당자{" "}
              <span className="text-xs font-normal text-muted">
                (여러 명 가능 · {assigneeIds.length}명)
              </span>
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {employees.length === 0 ? (
                <p className="text-xs text-muted">
                  구성원 정보를 불러오는 중이에요.
                </p>
              ) : (
                employees.map((e) => {
                  const active = assigneeIds.includes(e.id);
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => toggleAssignee(e.id)}
                      className={`rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors ${
                        active
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-line text-fg hover:bg-card-hover"
                      }`}
                    >
                      {e.name}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {mutation.isError && (
            <div className="flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              <ExclamationTriangleIcon className="size-4 shrink-0" />
              <span>{getV2ErrorMessage(mutation.error)}</span>
            </div>
          )}
        </div>

        {/* 푸터 : 취소 / 추가 */}
        <div className="grid grid-cols-2 gap-2 border-t border-line px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
            className="rounded-md border border-line px-4 py-2.5 text-sm font-semibold text-fg hover:bg-card-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            취소
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={submit}
            className="rounded-md border border-primary bg-primary/25 px-4 py-2.5 text-sm font-semibold text-primary shadow-lg shadow-primary/20 transition-colors hover:bg-primary/35 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {mutation.isPending ? "추가 중…" : "추가"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-fg">
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </label>
      <div className="mt-2">{children}</div>
    </div>
  );
}
