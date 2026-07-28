"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  ChevronDownIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import { getV2ErrorMessage } from "@/lib/api/v2/client";
import {
  createAccount,
  type AccountScope,
} from "@/lib/api/v2/accounts";

// 새 계정 추가 — POST /accounts.
// 백엔드가 지원하는 필드만 : name, cat, scope, loginId, password, url?, memo?, active.
// (팀 chip · 프로젝트 · 로고 · 외부 담당자는 서버 미지원 → UI 에서도 제거)

const CATEGORIES = [
  { key: "소셜", label: "소셜 미디어", emoji: "📱" },
  { key: "편집", label: "디자인 · 편집", emoji: "🎨" },
  { key: "광고", label: "광고", emoji: "📢" },
  { key: "예약", label: "예약 · CRM", emoji: "🗓️" },
];

const SCOPE_OPTIONS: {
  key: AccountScope;
  label: string;
  hint: string;
}[] = [
  { key: "전사", label: "전사", hint: "모든 구성원이 봅니다" },
  { key: "팀", label: "팀", hint: "같은 팀만 봅니다" },
  { key: "프로젝트", label: "프로젝트", hint: "프로젝트 멤버만 봅니다" },
];

interface NewAccountDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function NewAccountDialog({
  open,
  onClose,
  onCreated,
}: NewAccountDialogProps) {
  useEscapeKey(onClose, open);

  const [name, setName] = useState("");
  const [cat, setCat] = useState<string>("소셜");
  const [scope, setScope] = useState<AccountScope>("전사");
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [url, setUrl] = useState("");
  const [memo, setMemo] = useState("");

  const mutation = useMutation({
    mutationFn: createAccount,
    onSuccess: () => onCreated(),
  });

  useEffect(() => {
    if (!open) return;
    setName("");
    setCat("소셜");
    setScope("전사");
    setLoginId("");
    setPassword("");
    setShowPw(false);
    setUrl("");
    setMemo("");
    mutation.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const canSubmit =
    name.trim().length > 0 &&
    loginId.trim().length > 0 &&
    password.length > 0 &&
    !mutation.isPending;

  function submit() {
    if (!canSubmit) return;
    mutation.mutate({
      name: name.trim(),
      cat,
      scope,
      loginId: loginId.trim(),
      password,
      url: url.trim() || null,
      memo: memo.trim() || null,
      active: true,
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
        className="animate-dialog-in flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-lg border border-line bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 슬림 헤더 */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-base font-bold text-fg">새 계정 추가</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="rounded-md p-1 text-muted transition-colors hover:bg-card-hover hover:text-fg"
          >
            <XMarkIcon className="size-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {/* 서비스 이름 · 카테고리 */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="서비스 이름" required>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예) Instagram"
                maxLength={40}
                autoFocus
                className="w-full rounded-md border border-line bg-card-hover px-3 py-2.5 text-sm text-fg placeholder-muted focus:border-primary focus:outline-none"
              />
            </Field>
            <Field label="카테고리">
              <div className="relative">
                <select
                  value={cat}
                  onChange={(e) => setCat(e.target.value)}
                  className="w-full appearance-none rounded-md border border-line bg-card-hover px-3 py-2.5 pr-8 text-sm text-fg focus:border-primary focus:outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.emoji} {c.label}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted" />
              </div>
            </Field>
          </div>

          {/* 공개 범위 */}
          <div>
            <label className="block text-sm font-semibold text-fg">
              공개 범위
            </label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {SCOPE_OPTIONS.map((o) => {
                const active = scope === o.key;
                return (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => setScope(o.key)}
                    className={`rounded-md border px-3 py-3 text-left transition-colors ${
                      active
                        ? "border-primary bg-primary/10"
                        : "border-line hover:bg-card-hover"
                    }`}
                  >
                    <p
                      className={`text-sm font-bold ${active ? "text-primary" : "text-fg"}`}
                    >
                      {o.label}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">{o.hint}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 로그인 · 비밀번호 */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="로그인 ID" required>
              <input
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="예) marketing@fitnessstar.kr"
                maxLength={100}
                className="w-full rounded-md border border-line bg-card-hover px-3 py-2.5 text-sm text-fg placeholder-muted focus:border-primary focus:outline-none"
              />
            </Field>
            <Field label="비밀번호" required>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="공용 계정 비밀번호"
                  className="w-full rounded-md border border-line bg-card-hover px-3 py-2.5 pr-10 text-sm text-fg placeholder-muted focus:border-primary focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "가리기" : "보기"}
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted hover:bg-card hover:text-fg"
                >
                  {showPw ? (
                    <EyeSlashIcon className="size-4" />
                  ) : (
                    <EyeIcon className="size-4" />
                  )}
                </button>
              </div>
            </Field>
          </div>

          {/* 콘솔 URL */}
          <Field label="콘솔 URL">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
              className="w-full rounded-md border border-line bg-card-hover px-3 py-2.5 text-sm text-fg placeholder-muted focus:border-primary focus:outline-none"
            />
          </Field>

          {/* 메모 */}
          <Field label="메모">
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="2차 인증 · 결제 정보 · 인수인계 노트 등"
              className="w-full resize-y rounded-md border border-line bg-card-hover px-3 py-2.5 text-sm leading-6 text-fg placeholder-muted focus:border-primary focus:outline-none"
            />
          </Field>

          {/* 보안 안내 */}
          <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-300/90">
            <LockClosedIcon className="size-4 shrink-0" />
            <span>
              비밀번호는 AES-256-GCM 으로 암호화되어 저장돼요. 열람 시엔 접근
              로그가 남습니다.
            </span>
          </div>

          {mutation.isError && (
            <div className="flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              <ExclamationTriangleIcon className="size-4 shrink-0" />
              <span>{getV2ErrorMessage(mutation.error)}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-line px-5 py-4">
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
