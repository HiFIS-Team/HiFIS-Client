"use client";

import { useState, type FormEvent } from "react";
import { TextField } from "@/components/TextField";
import type { BranchInput } from "@/lib/api/branches";

interface BranchFormDialogProps {
  open: boolean;
  title: string;
  // 수정 시 기존 값, 등록 시 null
  initial?: BranchInput | null;
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
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [kakao, setKakao] = useState(initial?.kakao_url ?? "");
  const [naver, setNaver] = useState(initial?.naver_place_url ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

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
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
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
          <div className="flex justify-end gap-2 pt-2">
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
