"use client";

import { useEffect, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import { DialogGradientHeader } from "../DialogGradientHeader";

// 새 프로젝트 생성 다이얼로그 — UI 만. 저장 로직은 v2 /projects POST 붙는 시점에.
// 헤더는 신청/생성 계열 공용 DialogGradientHeader (일정 · 결재 등과 동일 톤).

// mock — 실제로는 /employees 에서 로드.
const MEMBERS = [
  "정프로",
  "A매니저",
  "하이여",
  "관리자",
  "박서준",
  "이하나",
  "최민서",
  "정유진",
  "김도현",
  "테스트멤버1",
  "테스트멤버2",
  "테스트매니저",
  "화순테스트트레이너",
];

interface NewProjectDialogProps {
  open: boolean;
  onClose: () => void;
}

export function NewProjectDialog({ open, onClose }: NewProjectDialogProps) {
  useEscapeKey(onClose, open);

  const [title, setTitle] = useState("");
  const [purpose, setPurpose] = useState("");
  const [steps, setSteps] = useState("");
  const [due, setDue] = useState("");
  const [assignees, setAssignees] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setPurpose("");
    setSteps("");
    setDue("");
    setAssignees([]);
  }, [open]);

  if (!open) return null;

  const canSubmit = title.trim().length > 0;

  function toggleAssignee(name: string) {
    setAssignees((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name],
    );
  }

  function submit() {
    // TODO: v2 /projects POST 연동.
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
        className="animate-dialog-in flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-line bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogGradientHeader
          kicker="NEW PROJECT"
          title="새 프로젝트"
          onClose={onClose}
        />

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {/* 프로젝트 제목 */}
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

          {/* 목적 */}
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

          {/* 절차 */}
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

          {/* 마감 날짜 */}
          <Field label="마감 날짜">
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

          {/* 담당자 — chip multi-select */}
          <div>
            <label className="block text-sm font-semibold text-fg">
              담당자{" "}
              <span className="text-xs font-normal text-muted">
                (여러 명 가능 · {assignees.length}명)
              </span>
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {MEMBERS.map((m) => {
                const active = assignees.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggleAssignee(m)}
                    className={`rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors ${
                      active
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-line text-fg hover:bg-card-hover"
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 푸터 : 취소 / 추가 */}
        <div className="grid grid-cols-2 gap-2 border-t border-line px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-line px-4 py-2.5 text-sm font-semibold text-fg hover:bg-card-hover"
          >
            취소
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={submit}
            className="rounded-md border border-primary bg-primary/25 px-4 py-2.5 text-sm font-semibold text-primary shadow-lg shadow-primary/20 transition-colors hover:bg-primary/35 disabled:cursor-not-allowed disabled:opacity-40"
          >
            추가
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
