"use client";

import { useEffect, useMemo } from "react";
import {
  ArrowPathIcon,
  CameraIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

// 얼굴 사진 캡처 — 모바일 전면 카메라(`capture="user"`) 우선, 안 되면 갤러리.
// 첨단점 회원·PT 신청서에서만 노출 (Branch.dajim_face_enabled).
// 잡힌 이미지는 미리보기로 표시하고 "다시 찍기" 로 다시 받음.
//
// errorMessage : 백엔드 400 "얼굴 인증 실패" 등 — 미리보기 위에 빨간 박스로.
export function FaceCapture({
  value,
  onChange,
  invalid,
  errorMessage,
}: {
  value: File | null;
  onChange: (next: File | null) => void;
  invalid?: boolean;
  errorMessage?: string | null;
}) {
  const preview = useMemo(
    () => (value ? URL.createObjectURL(value) : null),
    [value],
  );
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  return (
    <div className="space-y-2">
      {!value ? (
        <label
          className={`flex w-full cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center text-sm transition-colors ${
            invalid
              ? "border-red-400 bg-red-50 text-red-700"
              : "border-gray-300 bg-gray-50 text-gray-600 hover:bg-gray-100"
          }`}
        >
          <CameraIcon className="size-8 text-gray-400" />
          <span className="font-medium">얼굴 사진 촬영</span>
          <span className="text-xs text-gray-500">
            정면을 보고 또렷하게 한 장 찍어 주세요
          </span>
          <input
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={(e) => onChange(e.target.files?.[0] ?? null)}
          />
        </label>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-gray-300 bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview ?? undefined}
            alt="얼굴 사진"
            className="size-20 shrink-0 rounded-md object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-800">
              얼굴 사진이 준비됐어요
            </p>
            <label className="mt-1 inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-primary hover:underline">
              <ArrowPathIcon className="size-4" />
              다시 찍기
              <input
                type="file"
                accept="image/*"
                capture="user"
                className="hidden"
                onChange={(e) => onChange(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        </div>
      )}
      {errorMessage && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <ExclamationTriangleIcon className="mt-0.5 size-4 shrink-0 text-red-500" />
          <p className="min-w-0">{errorMessage}</p>
        </div>
      )}
    </div>
  );
}
