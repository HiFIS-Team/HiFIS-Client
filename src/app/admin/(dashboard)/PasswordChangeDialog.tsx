"use client";

import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { changePassword } from "@/lib/api/auth";
import { getErrorMessage } from "@/lib/api/client";
import { useToast } from "@/providers/ToastProvider";
import { TextField } from "@/components/TextField";

// 로그인 상태에서 비밀번호 변경 모달 — 사이드바에서 호출.
export function PasswordChangeDialog({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: () => changePassword(current, next),
    onSuccess: () => {
      toast.success("비밀번호가 변경되었습니다.");
      onClose();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    const e: Record<string, string> = {};
    if (!current) e.current = "현재 비밀번호를 입력해 주세요.";
    if (!next) e.next = "새 비밀번호를 입력해 주세요.";
    else if (next.length < 8)
      e.next = "새 비밀번호는 8자 이상이어야 합니다.";
    else if (next === current)
      e.next = "현재 비밀번호와 다른 비밀번호를 사용해 주세요.";
    if (!confirm) e.confirm = "새 비밀번호 확인을 입력해 주세요.";
    else if (confirm !== next) e.confirm = "비밀번호가 일치하지 않습니다.";
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    mutation.mutate();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6 py-10"
      onClick={onClose}
    >
      <div
        className="flex max-h-full w-full max-w-md flex-col rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="border-b border-gray-200 px-6 py-4 text-lg font-bold text-gray-900">
          비밀번호 변경
        </h2>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-col"
          noValidate
        >
          <div className="space-y-4 overflow-y-auto px-6 py-5">
            <TextField
              id="current-password"
              label="현재 비밀번호"
              required
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              error={errors.current}
            />
            <TextField
              id="new-password"
              label="새 비밀번호"
              required
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              error={errors.next}
              hint="8자 이상"
            />
            <TextField
              id="confirm-password"
              label="새 비밀번호 확인"
              required
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              error={errors.confirm}
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
            >
              {mutation.isPending ? "처리 중…" : "변경"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
