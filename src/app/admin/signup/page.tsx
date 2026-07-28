"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { signup } from "@/lib/api/v2/auth";
import { getV2ErrorMessage } from "@/lib/api/v2/client";
import { useToast } from "@/providers/ToastProvider";

// v2 초대키 기반 가입 — HiFIS-Server-V2 /auth/signup 연동.
// 초대키 유효 → { result: "JOINED" } · 바로 로그인 화면으로.
// 초대키 없음/무효 → { result: "PENDING" } · 관리자 승인 대기 상태 안내.
export default function AdminSignupPage() {
  const router = useRouter();
  const toast = useToast();

  const [inviteKey, setInviteKey] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      signup({
        name: name.trim(),
        email: email.trim(),
        password,
        // 백엔드는 미입력 시 PENDING 로 처리 — 빈 문자열 안 보내고 아예 필드 제외.
        inviteKey: inviteKey.trim() || undefined,
      }),
    onSuccess: (res) => {
      if (res.result === "JOINED") {
        toast.success("가입 완료! 로그인해 주세요.");
        router.replace("/admin/login");
      } else {
        // PENDING — 초대키 없이 신청, 관리자 승인 대기.
        setPending(true);
      }
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!inviteKey.trim()) errs.inviteKey = "초대키를 입력해 주세요.";
    if (!name.trim()) errs.name = "이름을 입력해 주세요.";
    if (!email.trim()) errs.email = "이메일을 입력해 주세요.";
    if (password.length < 8) errs.password = "비밀번호는 8자 이상이어야 합니다.";
    if (password !== passwordConfirm)
      errs.passwordConfirm = "비밀번호가 일치하지 않습니다.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    mutation.mutate();
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

      {/* 폼 — 상단에서 고정 offset (로그인 페이지와 타이틀 위치 정렬) */}
      <div className="flex flex-1 justify-center px-6 pt-[20vh] pb-10">
        <div className="w-full max-w-md">
          {pending ? (
            <PendingPanel email={email} />
          ) : (
            <>
          <h1 className="text-center text-3xl font-black tracking-tighter text-fg">
            함께 시작해요
          </h1>
          <p className="mt-2 text-center text-sm text-muted">
            관리자에게 받은 초대키로 워크스페이스에 합류하세요.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-3" noValidate>
            {/* 초대키 */}
            <div>
              <input
                id="invite-key"
                value={inviteKey}
                onChange={(e) => setInviteKey(e.target.value)}
                placeholder="초대키     ( 예 :  FIS-XXXX-XXXX )"
                aria-label="초대키"
                autoComplete="off"
                className="w-full rounded-lg border border-line bg-card px-4 py-3.5 text-sm text-fg placeholder-muted transition-colors focus:border-primary focus:outline-none"
              />
              {errors.inviteKey && (
                <p className="mt-1.5 pl-1 text-xs text-red-400">
                  {errors.inviteKey}
                </p>
              )}
            </div>

            {/* 이름 + 업무 이메일 — 2열 (모바일은 stack) */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="이름"
                  aria-label="이름"
                  autoComplete="name"
                  className="w-full rounded-lg border border-line bg-card px-4 py-3.5 text-sm text-fg placeholder-muted transition-colors focus:border-primary focus:outline-none"
                />
                {errors.name && (
                  <p className="mt-1.5 pl-1 text-xs text-red-400">
                    {errors.name}
                  </p>
                )}
              </div>
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
                {errors.email && (
                  <p className="mt-1.5 pl-1 text-xs text-red-400">
                    {errors.email}
                  </p>
                )}
              </div>
            </div>

            {/* 비밀번호 + 비밀번호 확인 — 2열 (모바일은 stack) */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호 (8자 이상)"
                  aria-label="비밀번호"
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-line bg-card px-4 py-3.5 text-sm text-fg placeholder-muted transition-colors focus:border-primary focus:outline-none"
                />
                {errors.password && (
                  <p className="mt-1.5 pl-1 text-xs text-red-400">
                    {errors.password}
                  </p>
                )}
              </div>
              <div>
                <input
                  id="password-confirm"
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="비밀번호 확인"
                  aria-label="비밀번호 확인"
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-line bg-card px-4 py-3.5 text-sm text-fg placeholder-muted transition-colors focus:border-primary focus:outline-none"
                />
                {errors.passwordConfirm && (
                  <p className="mt-1.5 pl-1 text-xs text-red-400">
                    {errors.passwordConfirm}
                  </p>
                )}
              </div>
            </div>

            {mutation.isError && (
              <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-sm text-red-400">
                {getV2ErrorMessage(mutation.error)}
              </p>
            )}

            <button
              type="submit"
              disabled={mutation.isPending}
              className="mt-3 w-full rounded-lg bg-primary px-4 py-3.5 text-sm font-bold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              {mutation.isPending ? "가입 중..." : "가입하기"}
            </button>
          </form>

          {/* 하단 링크 — 로그인 */}
          <p className="mt-6 text-center text-sm text-muted">
            이미 계정이 있나요?{" "}
            <Link
              href="/admin/login"
              className="ml-1 font-semibold text-primary hover:text-primary-hover"
            >
              로그인
            </Link>
          </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

// ─────────────── PendingPanel ───────────────

// 초대키 없이 신청 → JoinRequest 생성됨. 관리자 승인 후에 로그인 가능.
function PendingPanel({ email }: { email: string }) {
  return (
    <>
      <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/15 text-primary">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-8"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      </div>
      <h1 className="mt-5 text-center text-2xl font-black tracking-tighter text-fg">
        승인 대기 중이에요
      </h1>
      <p className="mt-2 text-center text-sm text-muted">
        <span className="font-semibold text-fg">{email}</span> 로 가입 요청이
        접수됐어요.
        <br />
        관리자 승인 후에 로그인할 수 있어요.
      </p>
      <div className="mt-6 text-center">
        <Link
          href="/admin/login"
          className="inline-block rounded-lg border border-line bg-card px-5 py-2.5 text-sm font-semibold text-fg transition-colors hover:bg-card-hover"
        >
          로그인 화면으로
        </Link>
      </div>
    </>
  );
}
