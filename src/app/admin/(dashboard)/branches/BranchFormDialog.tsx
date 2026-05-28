"use client";

import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { TextField } from "@/components/TextField";
import { Select } from "@/components/Select";
import { getAdmins } from "@/lib/api/admins";
import type { BranchInput } from "@/lib/api/branches";
import type { Branch } from "@/lib/api/types";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";

// 직책 코드 → 한국어 (페이지의 POSITION_LABEL 와 일치)
const POSITION_LABEL: Record<string, string> = {
  MANAGER: "점장",
  TEAM_LEADER: "팀장",
  TRAINER: "트레이너",
  FC: "FC",
};

interface BranchFormDialogProps {
  open: boolean;
  title: string;
  // 수정 시 기존 지점, 등록 시 null
  initial?: Branch | null;
  loading?: boolean;
  onSubmit: (values: BranchInput) => void;
  onCancel: () => void;
}

// 지점 등록·수정 폼 모달.
export function BranchFormDialog({
  open,
  title,
  initial,
  loading = false,
  onSubmit,
  onCancel,
}: BranchFormDialogProps) {
  const branchId = initial?.id ?? null;
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [kakao, setKakao] = useState(initial?.kakao_url ?? "");
  const [naver, setNaver] = useState(initial?.naver_place_url ?? "");
  const [messengerId, setMessengerId] = useState(
    initial?.messenger_admin_id ?? "",
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEscapeKey(onCancel, open);

  // 수정 모드에서만 해당 지점 admin 목록 — 신규 등록 시엔 admin 이 없음
  const adminsQuery = useQuery({
    queryKey: ["admin", "admins", "by-branch", branchId],
    queryFn: () => getAdmins(branchId!),
    enabled: !!branchId,
  });

  if (!open) return null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "지점명을 입력해 주세요.";
    if (!phone.trim()) errs.phone = "전화번호를 입력해 주세요.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    onSubmit({
      name: name.trim(),
      phone: phone.trim(),
      kakao_url: kakao.trim() || null,
      naver_place_url: naver.trim() || null,
      messenger_admin_id: messengerId || null,
    });
  }

  // 발송자 옵션 — "미설정" + 해당 지점 admin 목록 (직책 표시)
  const messengerOptions = [
    { value: "", label: "미설정" },
    ...(adminsQuery.data ?? []).map((a) => ({
      value: a.id,
      label: a.position
        ? `${a.name} (${POSITION_LABEL[a.position] ?? a.position})`
        : a.name,
    })),
  ];
  const messengerDisabled =
    !branchId || adminsQuery.isLoading || (adminsQuery.data?.length ?? 0) === 0;
  const messengerHint = !branchId
    ? "지점 등록 후 설정할 수 있어요."
    : adminsQuery.isLoading
      ? undefined
      : (adminsQuery.data?.length ?? 0) === 0
        ? "이 지점 소속 관리자가 아직 없어요."
        : undefined;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6 py-10"
      onClick={onCancel}
    >
      <div
        className="animate-dialog-in flex max-h-full w-full max-w-md flex-col rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="border-b border-gray-200 px-6 py-4 text-lg font-bold text-gray-900">
          {title}
        </h2>
        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-col"
          noValidate
        >
          <div className="space-y-4 overflow-y-auto px-6 py-5">
            <TextField
              id="branch-name"
              label="지점명"
              required
              maxLength={50}
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
            />
            <TextField
              id="branch-phone"
              label="전화번호"
              required
              type="tel"
              maxLength={20}
              placeholder="02-1234-5678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              error={errors.phone}
            />
            <TextField
              id="branch-kakao"
              label="카카오 URL (선택)"
              maxLength={255}
              placeholder="https://"
              value={kakao}
              onChange={(e) => setKakao(e.target.value)}
            />
            <TextField
              id="branch-naver"
              label="네이버 플레이스 URL (선택)"
              maxLength={255}
              placeholder="https://"
              value={naver}
              onChange={(e) => setNaver(e.target.value)}
            />
            <div>
              <Select
                id="branch-messenger"
                label="알림톡 발송자"
                placeholder={
                  !branchId
                    ? "지점 등록 후 설정"
                    : adminsQuery.isLoading
                      ? "불러오는 중…"
                      : "선택"
                }
                options={messengerOptions}
                value={messengerId}
                onChange={(e) => setMessengerId(e.target.value)}
                disabled={messengerDisabled}
              />
              {messengerHint && (
                <p className="mt-1.5 text-sm text-gray-500">
                  {messengerHint}
                </p>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
            >
              {loading ? "처리 중…" : "저장"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
