"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/providers/ToastProvider";

// v2 초대키 기반 가입 (mock UI) — 관리자가 발급한 초대키 + 기본 정보로 워크스페이스 합류.
// 지점 선택 / 이메일 인증 / 승인 대기는 v2 스펙에서 제외 (초대키가 자체 검증).
// API 는 다음 스텝 — 지금은 mock submit → login 으로.
export default function AdminSignupPage() {
  const router = useRouter();
  const toast = useToast();

  const [inviteKey, setInviteKey] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

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

    // TODO: v2 초대키 검증 + 계정 생성 API 연동
    setSubmitting(true);
    setTimeout(() => {
      toast.success("가입 요청을 접수했어요.");
      router.replace("/admin/login");
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

      {/* 폼 — 상단에서 고정 offset (로그인 페이지와 타이틀 위치 정렬) */}
      <div className="flex flex-1 justify-center px-6 pt-[20vh] pb-10">
        <div className="w-full max-w-md">
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

            <button
              type="submit"
              disabled={submitting}
              className="mt-3 w-full rounded-lg bg-primary px-4 py-3.5 text-sm font-bold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              {submitting ? "가입 중..." : "가입하기"}
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
        </div>
      </div>
    </main>
  );
}
