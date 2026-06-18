"use client";

import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { TextField } from "@/components/TextField";
import { Select } from "@/components/Select";
import { getAdmins } from "@/lib/api/admins";
import type { BranchInput } from "@/lib/api/branches";
import type { Branch } from "@/lib/api/types";

// 직책 코드 → 한국어 (페이지의 POSITION_LABEL 와 일치)
const POSITION_LABEL: Record<string, string> = {
  MANAGER: "점장",
  TEAM_LEADER: "팀장",
  TRAINER: "트레이너",
  FC: "FC",
};

interface BranchFormProps {
  // 수정 시 기존 지점, 등록 시 null
  initial?: Branch | null;
  loading?: boolean;
  onSubmit: (values: BranchInput) => void;
  onCancel: () => void;
  // modal : 모달 다이얼로그 안 — 푸터(취소/저장) 는 form 끝에 인라인.
  // panel : MobileSubPage 슬라이드 안 — 푸터를 viewport 하단 고정 액션 바로
  //         (peer-review ReviewForm 과 동일 패턴). 본문은 pb-24 로 여유.
  variant?: "modal" | "panel";
}

// 지점 등록·수정 폼 본문 — 모달(BranchFormDialog) 과 슬라이드 패널
// (BranchRegisterButton 의 MobileSubPage) 양쪽에서 wrapper 만 갈아끼워 재사용.
// state · 검증 · 발송자 옵션 로딩 등 form 자체 로직만 담고, 외곽 chrome 은 없음.
export function BranchForm({
  initial,
  loading = false,
  onSubmit,
  onCancel,
  variant = "modal",
}: BranchFormProps) {
  const branchId = initial?.id ?? null;
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [kakao, setKakao] = useState(initial?.kakao_url ?? "");
  const [naver, setNaver] = useState(initial?.naver_place_url ?? "");
  const [messengerId, setMessengerId] = useState(
    initial?.messenger_admin_id ?? "",
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 수정 모드에서만 해당 지점 admin 목록 — 신규 등록 시엔 admin 이 없음
  const adminsQuery = useQuery({
    queryKey: ["admin", "admins", "by-branch", branchId],
    queryFn: () => getAdmins(branchId!),
    enabled: !!branchId,
  });

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

  const isPanel = variant === "panel";

  return (
    <form
      onSubmit={handleSubmit}
      className="flex min-h-0 flex-col"
      noValidate
    >
      <div className={`space-y-4 ${isPanel ? "pb-24" : ""}`}>
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
            <p className="mt-1.5 text-sm text-muted">{messengerHint}</p>
          )}
        </div>
      </div>
      {/* 푸터 — panel : viewport 하단 고정 액션 바 (peer-review ReviewForm 패턴).
                modal : form 끝에 인라인. */}
      {isPanel ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card px-4 py-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
          <div className="mx-auto flex max-w-2xl items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md px-4 py-2 text-sm font-semibold text-muted hover:bg-card-hover hover:text-fg"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-md border border-primary bg-primary/25 px-4 py-2 text-sm font-semibold text-primary shadow-lg shadow-primary/20 transition-all hover:bg-primary/35 active:scale-[0.97] disabled:opacity-60"
            >
              {loading ? "처리 중…" : "저장"}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-6 flex justify-end gap-2 border-t border-line pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-4 py-2 text-sm font-semibold text-muted hover:bg-card-hover hover:text-fg"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-md border border-primary bg-primary/25 px-4 py-2 text-sm font-semibold text-primary shadow-lg shadow-primary/20 transition-all hover:bg-primary/35 active:scale-[0.97] disabled:opacity-60"
          >
            {loading ? "처리 중…" : "저장"}
          </button>
        </div>
      )}
    </form>
  );
}
