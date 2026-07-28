"use client";

import { useState, type ComponentType, type SVGProps } from "react";
import {
  BanknotesIcon,
  DocumentTextIcon,
  PaperAirplaneIcon,
  PlusIcon,
  ShoppingCartIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import { DialogGradientHeader } from "../DialogGradientHeader";

// 결재선은 대표가 일괄 결재해서 사용자가 지정하지 않음 → 폼에서 제외.

// 새 결재 올리기 모달 — UI 만. 저장 로직은 API 붙는 시점에.
// 헤더는 DialogGradientHeader 공용.

interface Kind {
  key: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  tone: string;
}
const KINDS: Kind[] = [
  { key: "trip", label: "출장 신청", icon: PaperAirplaneIcon, tone: "text-sky-400" },
  { key: "field", label: "외근 신청", icon: TruckIcon, tone: "text-emerald-400" },
  { key: "expense", label: "지출결의", icon: BanknotesIcon, tone: "text-pink-400" },
  { key: "purchase", label: "구매 요청", icon: ShoppingCartIcon, tone: "text-orange-400" },
  { key: "general", label: "일반 품의", icon: DocumentTextIcon, tone: "text-violet-400" },
  { key: "etc", label: "기타", icon: PlusIcon, tone: "text-muted" },
];

interface NewApprovalDialogProps {
  open: boolean;
  onClose: () => void;
}

export function NewApprovalDialog({ open, onClose }: NewApprovalDialogProps) {
  useEscapeKey(onClose, open);

  const [kind, setKind] = useState<string>("trip");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [destination, setDestination] = useState("");

  if (!open) return null;

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
                      {k.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="제목">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예) 부산 KT 본사 미팅 동행"
              className="w-full rounded-md border border-line bg-card-hover px-3 py-2.5 text-sm text-fg placeholder-muted focus:border-primary focus:outline-none"
            />
          </Field>

          <Field label="내용">
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
              <DateInput
                value={startDate}
                onChange={setStartDate}
                placeholder="YYYY-MM-DD"
              />
            </Field>
            <Field label="종료일">
              <DateInput
                value={endDate}
                onChange={setEndDate}
                placeholder="YYYY-MM-DD"
              />
            </Field>
          </div>

          <Field label="목적지">
            <input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="예: 부산 지사"
              className="w-full rounded-md border border-line bg-card-hover px-3 py-2.5 text-sm text-fg placeholder-muted focus:border-primary focus:outline-none"
            />
          </Field>
        </div>

        {/* 푸터 : 좌 템플릿 저장 · 우 취소/상신 */}
        <div className="flex items-center justify-between gap-2 border-t border-line px-6 py-4">
          <button
            type="button"
            className="rounded-md border border-line px-3 py-2 text-sm font-semibold text-muted hover:bg-card-hover hover:text-fg"
          >
            템플릿으로 저장
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-fg hover:bg-card-hover"
            >
              취소
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-primary bg-primary/25 px-4 py-2 text-sm font-semibold text-primary shadow-lg shadow-primary/20 transition-colors hover:bg-primary/35"
            >
              상신
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-fg">{label}</label>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function DateInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-line bg-card-hover px-3 py-2.5 focus-within:border-primary">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-sm tabular-nums text-fg placeholder-muted focus:outline-none"
      />
      <svg
        viewBox="0 0 24 24"
        className="size-4 shrink-0 text-muted"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
      >
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M8 3v4M16 3v4M3 10h18" strokeLinecap="round" />
      </svg>
    </div>
  );
}
