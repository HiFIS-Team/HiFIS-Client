"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeftIcon, EnvelopeIcon } from "@heroicons/react/24/outline";
import { useToast } from "@/providers/ToastProvider";

// v2 비밀번호 재설정 (mock) — 이메일로 재설정 링크 발송 방식.
// 기존 4단계(이메일 → 6자리 인증 → 새 비번 → 완료) 대신 매직 링크 1단계로 단순화.
//
// ⚠️ HiFIS-Server-V2 는 password-reset 엔드포인트가 아직 없음 (backend-api.md §12 미구현).
// 지금은 UI 만 mock 으로 동작 (400ms 후 sent 상태). 백엔드가 준비되면 요청/재발송을 실제 API 로 교체.
export default function AdminPasswordResetPage() {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setError("이메일을 입력해 주세요.");
      return;
    }
    setError(undefined);
    setSubmitting(true);
    // TODO: v2 재설정 링크 발송 API 연동
    setTimeout(() => {
      setSubmitting(false);
      setSent(true);
    }, 400);
  }

  function resend() {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      toast.success("링크를 다시 보냈어요.");
    }, 400);
  }

  return (
    <main
      data-theme="dark"
      className="fixed inset-0 flex flex-col overflow-y-auto bg-surface"
    >
      {/* 상단 좌측 브랜드 로고 + 서브 라벨 */}
      <div className="px-6 py-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/hifis-logo.png"
          alt="HiFIS"
          className="h-5 w-auto"
        />
        <p className="mt-1.5 text-xs text-muted">
          피트니스스타 직원 관리 플랫폼
        </p>
      </div>

      {/* 폼 — 상단에서 고정 offset (로그인·가입과 타이틀 위치 정렬) */}
      <div className="flex flex-1 justify-center px-6 pt-[20vh] pb-10">
        <div className="w-full max-w-md">
          {sent ? (
            <SentPanel email={email} onResend={resend} submitting={submitting} />
          ) : (
            <>
              <h1 className="text-center text-3xl font-black tracking-tighter text-fg">
                비밀번호를 잊으셨나요?
              </h1>
              <p className="mt-2 text-center text-sm text-muted">
                가입하신 업무 이메일로 재설정 링크를 보내드릴게요.
              </p>

              <form onSubmit={submit} className="mt-8 space-y-3" noValidate>
                <div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="업무 이메일"
                    aria-label="업무 이메일"
                    autoComplete="email"
                    className="w-full rounded-lg border border-line bg-card px-4 py-3.5 text-sm text-fg placeholder-muted transition-colors focus:border-primary focus:outline-none"
                  />
                  {error && (
                    <p className="mt-1.5 pl-1 text-xs text-red-400">{error}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-3 w-full rounded-lg bg-primary px-4 py-3.5 text-sm font-bold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
                >
                  {submitting ? "보내는 중..." : "재설정 링크 받기"}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  href="/admin/login"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-fg"
                >
                  <ArrowLeftIcon className="size-3.5" />
                  로그인으로 돌아가기
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

// ─────────────── SentPanel ───────────────

function SentPanel({
  email,
  onResend,
  submitting,
}: {
  email: string;
  onResend: () => void;
  submitting: boolean;
}) {
  return (
    <>
      <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/15 text-primary">
        <EnvelopeIcon className="size-8" />
      </div>
      <h1 className="mt-5 text-center text-2xl font-black tracking-tighter text-fg">
        이메일을 확인해 주세요
      </h1>
      <p className="mt-2 text-center text-sm text-muted">
        <span className="font-semibold text-fg">{email}</span> 로 재설정 링크를
        보냈어요.
        <br />
        메일함이 안 보이면 스팸함도 확인해 주세요.
      </p>

      <button
        type="button"
        onClick={onResend}
        disabled={submitting}
        className="mt-6 w-full rounded-lg border border-line bg-card py-3 text-sm font-semibold text-fg transition-colors hover:bg-card-hover disabled:opacity-60"
      >
        {submitting ? "다시 보내는 중..." : "링크 다시 보내기"}
      </button>

      <div className="mt-4 text-center">
        <Link
          href="/admin/login"
          className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-fg"
        >
          <ArrowLeftIcon className="size-3.5" />
          로그인으로 돌아가기
        </Link>
      </div>
    </>
  );
}
