"use client";

import { useEffect, useMemo, useState, type ComponentType, type SVGProps } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowUpIcon,
  BanknotesIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  PaperAirplaneIcon,
  PlusIcon,
  ShoppingCartIcon,
  TruckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import { getV2ErrorMessage } from "@/lib/api/v2/client";
import { avatarTone, listEmployees } from "@/lib/api/v2/employees";
import { createApproval } from "@/lib/api/v2/approvals";
import type { EmployeeOut } from "@/lib/api/v2/types";
import { DialogGradientHeader } from "../DialogGradientHeader";

// 새 결재 올리기 — POST /approvals.
// 결재선 : 순차. 최소 1명. 상단부터 순서대로 결재됨.

interface Kind {
  key: string; // 백엔드 저장값 (한국어 자유형)
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  tone: string;
}
const KINDS: Kind[] = [
  { key: "출장 신청", icon: PaperAirplaneIcon, tone: "text-sky-400" },
  { key: "외근 신청", icon: TruckIcon, tone: "text-emerald-400" },
  { key: "지출결의", icon: BanknotesIcon, tone: "text-pink-400" },
  { key: "구매 요청", icon: ShoppingCartIcon, tone: "text-orange-400" },
  { key: "일반 품의", icon: DocumentTextIcon, tone: "text-violet-400" },
  { key: "기타", icon: PlusIcon, tone: "text-muted" },
];

interface NewApprovalDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function NewApprovalDialog({
  open,
  onClose,
  onCreated,
}: NewApprovalDialogProps) {
  useEscapeKey(onClose, open);

  const [kind, setKind] = useState("출장 신청");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [place, setPlace] = useState("");
  const [amount, setAmount] = useState("");
  const [approverIds, setApproverIds] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const employeesQuery = useQuery({
    queryKey: ["v2", "employees", "all"] as const,
    queryFn: () => listEmployees({}),
  });
  const employees = employeesQuery.data ?? [];

  const mutation = useMutation({
    mutationFn: createApproval,
    onSuccess: () => onCreated(),
  });

  useEffect(() => {
    if (!open) return;
    setKind("출장 신청");
    setTitle("");
    setContent("");
    setStartDate("");
    setEndDate("");
    setPlace("");
    setAmount("");
    setApproverIds([]);
    setPickerOpen(false);
    mutation.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const canSubmit =
    title.trim().length > 0 &&
    content.trim().length > 0 &&
    approverIds.length > 0 &&
    !mutation.isPending;

  function submit() {
    if (!canSubmit) return;
    mutation.mutate({
      kind,
      title: title.trim(),
      content: content.trim(),
      startDate: startDate || null,
      endDate: endDate || null,
      place: place.trim() || null,
      amount: amount ? Number(amount.replace(/[^0-9]/g, "")) : null,
      approverIds,
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
          kicker="NEW APPROVAL"
          title="새 결재 올리기"
          onClose={onClose}
        />

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {/* 결재 종류 6 카드 */}
          <Field label="결재 종류">
            <div className="grid grid-cols-3 gap-3">
              {KINDS.map((k) => {
                const active = kind === k.key;
                const Icon = k.icon;
                return (
                  <button
                    key={k.key}
                    type="button"
                    onClick={() => setKind(k.key)}
                    className={`flex flex-col items-center gap-2 rounded-md border py-4 transition-colors ${
                      active
                        ? "border-primary bg-primary/15"
                        : "border-line hover:bg-card-hover"
                    }`}
                  >
                    <Icon className={`size-5 ${k.tone}`} />
                    <span
                      className={`text-sm font-semibold ${
                        active ? "text-primary" : "text-fg"
                      }`}
                    >
                      {k.key}
                    </span>
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="제목" required>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예) 부산 KT 본사 미팅 동행"
              className="w-full rounded-md border border-line bg-card-hover px-3 py-2.5 text-sm text-fg placeholder-muted focus:border-primary focus:outline-none"
            />
          </Field>

          <Field label="내용" required>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              placeholder="목적·일정·비용 등 필요한 내용을 자유롭게 적어주세요"
              className="w-full resize-y rounded-md border border-line bg-card-hover px-3 py-2 text-sm text-fg placeholder-muted focus:border-primary focus:outline-none"
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="시작일">
              <DateInput value={startDate} onChange={setStartDate} />
            </Field>
            <Field label="종료일">
              <DateInput value={endDate} onChange={setEndDate} />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="목적지">
              <input
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                placeholder="예: 부산 지사"
                className="w-full rounded-md border border-line bg-card-hover px-3 py-2.5 text-sm text-fg placeholder-muted focus:border-primary focus:outline-none"
              />
            </Field>
            <Field label="금액 (원)">
              <input
                value={amount}
                onChange={(e) => {
                  const digits = e.target.value.replace(/[^0-9]/g, "");
                  setAmount(digits ? Number(digits).toLocaleString("ko-KR") : "");
                }}
                inputMode="numeric"
                placeholder="예: 320,000"
                className="w-full rounded-md border border-line bg-card-hover px-3 py-2.5 text-sm tabular-nums text-fg placeholder-muted focus:border-primary focus:outline-none"
              />
            </Field>
          </div>

          {/* 결재선 */}
          <Field label="결재선" required hint="(순차 승인)">
            <ApproverChips
              approverIds={approverIds}
              onChange={setApproverIds}
              onOpen={() => setPickerOpen(true)}
              employees={employees}
            />
          </Field>

          {mutation.isError && (
            <div className="flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              <ExclamationTriangleIcon className="size-4 shrink-0" />
              <span>{getV2ErrorMessage(mutation.error)}</span>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-end gap-2 border-t border-line px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
            className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-fg hover:bg-card-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            취소
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="rounded-md border border-primary bg-primary/25 px-4 py-2 text-sm font-semibold text-primary shadow-lg shadow-primary/20 transition-colors hover:bg-primary/35 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {mutation.isPending ? "상신 중…" : "상신"}
          </button>
        </div>
      </div>

      <ApproverPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        employees={employees}
        selected={approverIds}
        onSubmit={(ids) => {
          setApproverIds(ids);
          setPickerOpen(false);
        }}
      />
    </div>
  );
}

// ─────────────── ApproverChips ───────────────

function ApproverChips({
  approverIds,
  onChange,
  onOpen,
  employees,
}: {
  approverIds: string[];
  onChange: (ids: string[]) => void;
  onOpen: () => void;
  employees: EmployeeOut[];
}) {
  const map = useMemo(() => {
    const m = new Map<string, EmployeeOut>();
    for (const e of employees) m.set(e.id, e);
    return m;
  }, [employees]);

  function moveUp(idx: number) {
    if (idx === 0) return;
    const next = [...approverIds];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onChange(next);
  }
  function remove(idx: number) {
    onChange(approverIds.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-2">
      {approverIds.length === 0 ? (
        <p className="text-xs text-muted">아직 결재자가 지정되지 않았어요.</p>
      ) : (
        <ol className="space-y-2">
          {approverIds.map((id, i) => {
            const e = map.get(id);
            return (
              <li
                key={id}
                className="flex items-center gap-2 rounded-md border border-line bg-card-hover px-3 py-2"
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-card text-xs font-bold tabular-nums text-fg">
                  {i + 1}
                </span>
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${avatarTone(e?.avatarColor)}`}
                  aria-hidden
                >
                  {(e?.name ?? "?").charAt(0)}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-fg">
                  {e?.name ?? "알 수 없음"}
                </span>
                <button
                  type="button"
                  onClick={() => moveUp(i)}
                  aria-label="위로"
                  disabled={i === 0}
                  className="rounded-md p-1 text-muted transition-colors hover:bg-card hover:text-fg disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ArrowUpIcon className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  aria-label="제외"
                  className="rounded-md p-1 text-muted transition-colors hover:bg-red-500/10 hover:text-red-400"
                >
                  <XMarkIcon className="size-3.5" />
                </button>
              </li>
            );
          })}
        </ol>
      )}
      <button
        type="button"
        onClick={onOpen}
        className="inline-flex items-center gap-1 rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-fg transition-colors hover:bg-card-hover"
      >
        <PlusIcon className="size-3.5" />
        결재자 지정
      </button>
    </div>
  );
}

// ─────────────── ApproverPickerDialog ───────────────

function ApproverPickerDialog({
  open,
  onClose,
  employees,
  selected,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  employees: EmployeeOut[];
  selected: string[];
  onSubmit: (ids: string[]) => void;
}) {
  useEscapeKey(onClose, open);
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<string[]>(selected);

  useEffect(() => {
    if (open) {
      setPicked(selected);
      setQ("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const kw = q.trim().toLowerCase();
  const filtered = kw
    ? employees.filter(
        (e) =>
          e.name.toLowerCase().includes(kw) ||
          (e.team ?? "").toLowerCase().includes(kw),
      )
    : employees;

  function toggle(id: string) {
    setPicked((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="animate-fade-in fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4 py-8"
      onClick={onClose}
    >
      <div
        className="animate-dialog-in flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-lg border border-line bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-base font-bold text-fg">결재자 지정</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="rounded-md p-1 text-muted transition-colors hover:bg-card-hover hover:text-fg"
          >
            <XMarkIcon className="size-5" />
          </button>
        </div>

        <div className="border-b border-line px-5 py-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="이름·팀으로 검색"
            className="w-full rounded-md border border-line bg-card-hover px-3 py-2 text-sm text-fg placeholder-muted focus:border-primary focus:outline-none"
          />
        </div>

        <ul className="flex-1 divide-y divide-line overflow-y-auto">
          {filtered.length === 0 ? (
            <li className="px-5 py-10 text-center text-sm text-muted">
              검색 결과가 없어요.
            </li>
          ) : (
            filtered.map((e) => {
              const active = picked.includes(e.id);
              const order = picked.indexOf(e.id) + 1;
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => toggle(e.id)}
                    className={`flex w-full items-center gap-3 px-5 py-3 text-left transition-colors ${active ? "bg-primary/10" : "hover:bg-card-hover"}`}
                  >
                    <span
                      className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${avatarTone(e.avatarColor)}`}
                      aria-hidden
                    >
                      {e.name.charAt(0)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-fg">
                        {e.name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted">
                        {e.team ?? "미지정"}
                      </p>
                    </div>
                    {active && (
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold tabular-nums text-white">
                        {order}
                      </span>
                    )}
                  </button>
                </li>
              );
            })
          )}
        </ul>

        <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-fg hover:bg-card-hover"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => onSubmit(picked)}
            disabled={picked.length === 0}
            className="rounded-md border border-primary bg-primary/25 px-4 py-2 text-sm font-semibold text-primary shadow-lg shadow-primary/20 transition-colors hover:bg-primary/35 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {picked.length}명 확정
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────── Field · DateInput ───────────────

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-fg">
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
        {hint && <span className="ml-1 text-xs font-normal text-muted">{hint}</span>}
      </label>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function DateInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-line bg-card-hover px-3 py-2.5 focus-within:border-primary">
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
  );
}
