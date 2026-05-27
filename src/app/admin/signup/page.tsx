"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  CheckCircleIcon,
  EnvelopeIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";
import { getBranches } from "@/lib/api/branches";
import { resendVerification, signup, verifyEmail } from "@/lib/api/auth";
import { getErrorMessage } from "@/lib/api/client";
import { TextField } from "@/components/TextField";
import { GmailField } from "@/components/GmailField";
import { Select } from "@/components/Select";
import { Button } from "@/components/Button";
import { AuthLayout } from "../AuthLayout";

// 가입 폼 → 이메일 인증 → 승인 대기 안내, 3단계
type Step = "form" | "verify" | "done";

export default function AdminSignupPage() {
  const [step, setStep] = useState<Step>("form");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [branchId, setBranchId] = useState("");
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: getBranches,
  });

  const signupMutation = useMutation({
    mutationFn: () =>
      signup({
        email: email.trim(),
        name: name.trim(),
        password,
        branch_id: branchId,
      }),
    onSuccess: () => {
      setErrors({});
      setStep("verify");
    },
  });
  const verifyMutation = useMutation({
    mutationFn: () => verifyEmail(email.trim(), code.trim()),
    onSuccess: () => {
      setErrors({});
      setStep("done");
    },
  });
  const resendMutation = useMutation({
    mutationFn: () => resendVerification(email.trim()),
  });

  function submitForm(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!email.trim()) errs.email = "이메일을 입력해 주세요.";
    if (!name.trim()) errs.name = "이름을 입력해 주세요.";
    if (password.length < 8) errs.password = "비밀번호는 8자 이상이어야 합니다.";
    if (password !== passwordConfirm)
      errs.passwordConfirm = "비밀번호가 일치하지 않습니다.";
    if (!branchId) errs.branchId = "소속 지점을 선택해 주세요.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    signupMutation.mutate();
  }

  function submitVerify(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (code.trim().length !== 6) errs.code = "6자리 인증번호를 입력해 주세요.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    verifyMutation.mutate();
  }

  // 3단계 — 승인 대기 안내
  if (step === "done") {
    return (
      <AuthLayout title="회원가입 완료" icon={CheckCircleIcon}>
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <p className="text-base font-semibold text-gray-900">
            이메일 인증이 완료되었습니다
          </p>
          <p className="mt-2 text-sm/6 text-gray-600">
            대표 관리자의 승인 후 로그인할 수 있습니다. 승인이 완료되면 다시
            로그인해 주세요.
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

  // 2단계 — 이메일 인증번호 입력
  if (step === "verify") {
    return (
      <AuthLayout title="이메일 인증" icon={EnvelopeIcon}>
        <form
          onSubmit={submitVerify}
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
          {verifyMutation.isError && (
            <p className="rounded-md bg-red-50 px-3 py-2.5 text-sm text-red-700">
              {getErrorMessage(verifyMutation.error)}
            </p>
          )}
          <Button
            type="submit"
            className="w-full"
            loading={verifyMutation.isPending}
          >
            인증 확인
          </Button>
          <div className="text-center">
            <button
              type="button"
              onClick={() => resendMutation.mutate()}
              disabled={resendMutation.isPending}
              className="text-sm text-gray-500 underline underline-offset-2 disabled:opacity-60"
            >
              인증번호 재발송
            </button>
            {resendMutation.isSuccess && (
              <p className="mt-1 text-sm text-primary">
                인증번호를 다시 보냈습니다.
              </p>
            )}
            {resendMutation.isError && (
              <p className="mt-1 text-sm text-red-600">
                {getErrorMessage(resendMutation.error)}
              </p>
            )}
          </div>
        </form>
      </AuthLayout>
    );
  }

  // 1단계 — 회원가입 폼
  return (
    <AuthLayout title="FC 회원가입" icon={UserPlusIcon}>
      <form
        onSubmit={submitForm}
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
          id="name"
          label="이름"
          required
          maxLength={50}
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
        />
        <TextField
          id="password"
          label="비밀번호"
          type="password"
          required
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          hint="8자 이상"
        />
        <TextField
          id="password-confirm"
          label="비밀번호 확인"
          type="password"
          required
          autoComplete="new-password"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          error={errors.passwordConfirm}
        />
        <Select
          id="branch"
          label="소속 지점"
          required
          placeholder={
            branchesQuery.isLoading ? "불러오는 중…" : "선택해 주세요"
          }
          options={(branchesQuery.data ?? []).map((b) => ({
            value: b.id,
            label: b.name,
          }))}
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          error={errors.branchId}
        />
        {signupMutation.isError && (
          <p className="rounded-md bg-red-50 px-3 py-2.5 text-sm text-red-700">
            {getErrorMessage(signupMutation.error)}
          </p>
        )}
        <Button
          type="submit"
          className="w-full"
          loading={signupMutation.isPending}
        >
          가입하기
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-500">
        이미 계정이 있나요?{" "}
        <Link href="/admin/login" className="text-primary">
          로그인
        </Link>
      </p>
    </AuthLayout>
  );
}
