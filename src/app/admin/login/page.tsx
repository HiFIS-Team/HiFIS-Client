"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { login } from "@/lib/api/auth";
import { getAccessToken, setTokens } from "@/lib/api/tokenStore";
import { getErrorMessage } from "@/lib/api/client";
import { TextField } from "@/components/TextField";
import { GmailField } from "@/components/GmailField";
import { Button } from "@/components/Button";
import { useToast } from "@/providers/ToastProvider";
import { AuthLayout } from "../AuthLayout";

export default function AdminLoginPage() {
  const router = useRouter();
  const toast = useToast();
  // PWA start_url 이 /admin/login 이라 PWA 진입 시 무조건 여기로 옴.
  // 자동 로그인 체크해서 토큰이 살아있으면 곧장 대시보드로 보낸다.
  // checking 동안 폼 안 보여 — 깜빡임 방지 (토큰 있을 때 로그인 폼이 잠깐 떴다가 사라지는 현상).
  // (토큰 무효(401)는 dashboard layout 의 me 쿼리에서 redirect 처리)
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
      // access·refresh 토큰 저장 후 대시보드로 (remember 에 따라 storage 결정)
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

  // 토큰 검사 중에는 폼 안 표시 — 토큰 있으면 곧 dashboard 로, 없으면 setChecking(false) → 폼 표시
  if (checking) return null;

  return (
    <AuthLayout title="관리자 로그인">
      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
        noValidate
      >
        <GmailField
          id="email"
          label="이메일"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        <TextField
          id="password"
          label="비밀번호"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        <label className="flex cursor-pointer items-center gap-2 select-none">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="size-4 rounded accent-primary"
          />
          <span className="text-sm text-gray-700">자동 로그인</span>
        </label>
        {mutation.isError && (
          <p className="rounded-md bg-red-50 px-3 py-2.5 text-sm text-red-700">
            {getErrorMessage(mutation.error)}
          </p>
        )}
        <Button type="submit" className="w-full" loading={mutation.isPending}>
          로그인
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-500">
        <Link href="/admin/signup" className="text-primary">
          회원가입
        </Link>
        <span className="mx-2">·</span>
        <Link href="/admin/password-reset" className="text-primary">
          비밀번호 재설정
        </Link>
      </p>
    </AuthLayout>
  );
}
