"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { login } from "@/lib/api/auth";
import { getAccessToken, setTokens } from "@/lib/api/tokenStore";
import { getErrorMessage } from "@/lib/api/client";
import { useToast } from "@/providers/ToastProvider";

// v2 로그인 — 다크 톤 워크스페이스 진입. AuthLayout(라이트 카드) 대신 자체 셸.
// signup·password-reset 은 여전히 AuthLayout 사용.
export default function AdminLoginPage() {
  const router = useRouter();
  const toast = useToast();

  // PWA start_url 이 /admin/login → 토큰 살아있으면 곧장 대시보드.
  // checking 동안 폼 안 보여 — 깜빡임 방지.
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    if (getAccessToken()) {
      router.replace("/admin");
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChecking(false);
    }
  }, [router]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // 자동 로그인 — 체크: localStorage(영구), 미체크: sessionStorage(탭 닫으면 풀림)
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );

  const mutation = useMutation({
    mutationFn: () => login(email.trim(), password),
    onSuccess: (res) => {
      setTokens(res.access_token, res.refresh_token, remember);
      toast.success("로그인되었습니다.");
      router.replace("/admin");
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errs: { email?: string; password?: string } = {};
    if (!email.trim()) errs.email = "이메일을 입력해 주세요.";
    if (!password) errs.password = "비밀번호를 입력해 주세요.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    mutation.mutate();
  }

  if (checking) return null;

  return (
    <main
      data-theme="dark"
      className="fixed inset-0 flex flex-col bg-surface"
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

      {/* 폼 — 상단에서 고정 offset (가입 페이지와 타이틀 위치 정렬) */}
      <div className="flex flex-1 justify-center px-6 pt-[20vh] pb-10">
        <div className="w-full max-w-sm">
          <h1 className="text-center text-3xl font-black tracking-tighter text-fg">
            어서 오세요
          </h1>
          <p className="mt-2 text-center text-sm text-muted">
            이메일과 비밀번호로 워크스페이스에 들어갈 수 있어요.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-3" noValidate>
            <div>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일"
                aria-label="이메일"
                className="w-full rounded-lg border border-line bg-card px-4 py-3.5 text-sm text-fg placeholder-muted transition-colors focus:border-primary focus:outline-none"
              />
              {errors.email && (
                <p className="mt-1.5 pl-1 text-xs text-red-400">
                  {errors.email}
                </p>
              )}
            </div>
            <div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호"
                aria-label="비밀번호"
                className="w-full rounded-lg border border-line bg-card px-4 py-3.5 text-sm text-fg placeholder-muted transition-colors focus:border-primary focus:outline-none"
              />
              {errors.password && (
                <p className="mt-1.5 pl-1 text-xs text-red-400">
                  {errors.password}
                </p>
              )}
            </div>

            <label className="flex cursor-pointer items-center gap-2 pt-1 pl-1 select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="size-4 rounded accent-primary"
              />
              <span className="text-sm text-muted">자동 로그인</span>
            </label>

            {mutation.isError && (
              <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-sm text-red-400">
                {getErrorMessage(mutation.error)}
              </p>
            )}

            <button
              type="submit"
              disabled={mutation.isPending}
              className="mt-3 w-full rounded-lg bg-primary py-3.5 text-base font-bold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              {mutation.isPending ? "로그인 중..." : "로그인"}
            </button>
          </form>

          {/* 링크 — 초대키 가입 · 비밀번호 찾기 */}
          <div className="mt-6 flex items-center justify-center gap-3 text-sm">
            <Link
              href="/admin/signup"
              className="font-semibold text-muted hover:text-fg"
            >
              초대키로 가입
            </Link>
            <span className="text-line">·</span>
            <Link
              href="/admin/password-reset"
              className="font-semibold text-muted hover:text-fg"
            >
              비밀번호 찾기
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
