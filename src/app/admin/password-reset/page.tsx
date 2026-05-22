"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { confirmPasswordReset, requestPasswordReset } from "@/lib/api/auth";
import { getErrorMessage } from "@/lib/api/client";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/Button";
import { AuthLayout } from "../AuthLayout";

// 이메일 → 인증번호 → 새 비밀번호 → 완료, 4단계
type Step = "request" | "code" | "password" | "done";

export default function AdminPasswordResetPage() {
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const requestMutation = useMutation({
    mutationFn: () => requestPasswordReset(email.trim()),
    onSuccess: () => {
      setErrors({});
      setStep("code");
    },
  });
  const confirmMutation = useMutation({
    mutationFn: () =>
      confirmPasswordReset(email.trim(), code.trim(), newPassword),
    onSuccess: () => {
      setErrors({});
      setStep("done");
    },
  });

  function submitRequest(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!email.trim()) errs.email = "이메일을 입력해 주세요.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    requestMutation.mutate();
  }

  // 인증번호 단계 — 백엔드에 단독 검증 API가 없어 다음 단계로만 넘어감.
  // 실제 검증은 마지막 confirm 제출 시 함께 이뤄진다.
  function submitCode(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (code.trim().length !== 6) errs.code = "6자리 인증번호를 입력해 주세요.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setErrors({});
    setStep("password");
  }

  function submitPassword(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (newPassword.length < 8)
      errs.newPassword = "비밀번호는 8자 이상이어야 합니다.";
    if (newPassword !== newPasswordConfirm)
      errs.newPasswordConfirm = "비밀번호가 일치하지 않습니다.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    confirmMutation.mutate();
  }

  // 4단계 — 완료
  if (step === "done") {
    return (
      <AuthLayout title="비밀번호 변경 완료">
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <p className="text-base font-semibold text-gray-900">
            비밀번호가 변경되었습니다
          </p>
          <p className="mt-2 text-sm/6 text-gray-600">
            새 비밀번호로 로그인해 주세요.
          </p>
          <Link
            href="/admin/login"
            className="mt-5 inline-block text-sm font-semibold text-primary"
          >
            로그인 화면으로
          </Link>
        </div>
      </AuthLayout>
    );
  }

  // 3단계 — 새 비밀번호 입력
  if (step === "password") {
    return (
      <AuthLayout title="비밀번호 재설정">
        <form
          onSubmit={submitPassword}
          className="space-y-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
          noValidate
        >
          <p className="text-sm/6 text-gray-600">
            새 비밀번호를 입력해 주세요.
          </p>
          <TextField
            id="new-password"
            label="새 비밀번호"
            type="password"
            required
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            error={errors.newPassword}
            hint="8자 이상"
          />
          <TextField
            id="new-password-confirm"
            label="새 비밀번호 확인"
            type="password"
            required
            autoComplete="new-password"
            value={newPasswordConfirm}
            onChange={(e) => setNewPasswordConfirm(e.target.value)}
            error={errors.newPasswordConfirm}
          />
          {confirmMutation.isError && (
            <p className="rounded-md bg-red-50 px-3 py-2.5 text-sm text-red-700">
              {getErrorMessage(confirmMutation.error)}
            </p>
          )}
          <Button
            type="submit"
            className="w-full"
            loading={confirmMutation.isPending}
          >
            비밀번호 변경
          </Button>
          <button
            type="button"
            onClick={() => {
              setErrors({});
              setStep("code");
            }}
            className="w-full text-sm text-gray-500 underline underline-offset-2"
          >
            이전 (인증번호 다시 입력)
          </button>
        </form>
      </AuthLayout>
    );
  }

  // 2단계 — 인증번호 입력
  if (step === "code") {
    return (
      <AuthLayout title="비밀번호 재설정">
        <form
          onSubmit={submitCode}
          className="space-y-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
          noValidate
        >
          <p className="text-sm/6 text-gray-600">
            <span className="font-medium text-gray-900">{email}</span> 으로 보낸
            6자리 인증번호를 입력해 주세요.
          </p>
          <TextField
            id="code"
            label="인증번호"
            required
            inputMode="numeric"
            maxLength={6}
            placeholder="6자리"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            error={errors.code}
          />
          <Button type="submit" className="w-full">
            다음
          </Button>
          <button
            type="button"
            onClick={() => {
              setErrors({});
              setStep("request");
            }}
            className="w-full text-sm text-gray-500 underline underline-offset-2"
          >
            이전 (이메일 다시 입력)
          </button>
        </form>
      </AuthLayout>
    );
  }

  // 1단계 — 이메일 입력
  return (
    <AuthLayout title="비밀번호 재설정">
      <form
        onSubmit={submitRequest}
        className="space-y-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
        noValidate
      >
        <p className="text-sm/6 text-gray-600">
          가입한 이메일로 인증번호를 보내드립니다.
        </p>
        <TextField
          id="email"
          label="이메일"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        {requestMutation.isError && (
          <p className="rounded-md bg-red-50 px-3 py-2.5 text-sm text-red-700">
            {getErrorMessage(requestMutation.error)}
          </p>
        )}
        <Button
          type="submit"
          className="w-full"
          loading={requestMutation.isPending}
        >
          인증번호 받기
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-500">
        <Link href="/admin/login" className="text-primary">
          로그인으로 돌아가기
        </Link>
      </p>
    </AuthLayout>
  );
}
