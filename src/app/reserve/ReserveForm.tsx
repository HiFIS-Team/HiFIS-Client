"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  CalendarDaysIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";
import { getBranches } from "@/lib/api/branches";
import { createReservation } from "@/lib/api/reservations";
import { ApiError } from "@/lib/api/client";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/Button";

// 오늘 날짜 YYYY-MM-DD (기기 로컬 기준)
function todayStr(): string {
  return new Date().toLocaleDateString("en-CA");
}

// YYYY-MM-DD → 한국어 표기
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR");
}

interface FieldErrors {
  name?: string;
  phone?: string;
  visitDate?: string;
}

export function ReserveForm() {
  const searchParams = useSearchParams();
  // 지점은 URL 파라미터로 전달받음 (네이버 플레이스 링크가 지점별)
  const branchId = searchParams.get("branch_id");

  // 지점 목록 — branch_id 가 실재하는지 확인 + 지점명 표시용
  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: getBranches,
    enabled: !!branchId,
  });

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  // 기본값 = 오늘 — 사용자가 연·월 픽 안 해도 되게. 다른 날짜면 픽커에서 며칠만 바꾸면 됨.
  const [visitDate, setVisitDate] = useState(() => todayStr());
  const [errors, setErrors] = useState<FieldErrors>({});

  const mutation = useMutation({ mutationFn: createReservation });

  const today = todayStr();

  // branch_id 가 아예 없는 경우
  if (!branchId) {
    return (
      <ErrorScreen
        title="지점 정보가 없습니다"
        message="예약 링크가 올바르지 않습니다. 지점의 네이버 플레이스에서 다시 접속해 주세요."
      />
    );
  }

  if (branchesQuery.isLoading) {
    return <CenterMessage>불러오는 중…</CenterMessage>;
  }
  if (branchesQuery.isError) {
    return (
      <ErrorScreen
        title="일시적인 오류"
        message="지점 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."
      />
    );
  }

  const branch = branchesQuery.data?.find((b) => b.id === branchId);
  if (!branch) {
    return (
      <ErrorScreen
        title="지점을 찾을 수 없습니다"
        message="예약 링크의 지점 정보가 올바르지 않습니다. 지점의 네이버 플레이스에서 다시 접속해 주세요."
      />
    );
  }

  // 제출 성공 — 완료 화면 (키오스크 KioskSuccess 와 동일 톤)
  if (mutation.isSuccess) {
    return (
      <main className="mx-auto max-w-md px-6 py-16 text-center">
        <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-violet-50 text-primary">
          <CheckCircleIcon className="size-12" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-gray-900">
          예약 신청이 완료되었습니다
        </h1>
        <p className="mt-3 text-base text-gray-600">
          {branch.name} · {formatDate(mutation.data.visit_date)} 방문 예정
        </p>
        <p className="mt-1 text-sm text-gray-500">
          확인 후 연락드리겠습니다. 감사합니다.
        </p>
      </main>
    );
  }

  function validate(): boolean {
    const next: FieldErrors = {};

    const trimmedName = name.trim();
    if (!trimmedName) next.name = "이름을 입력해 주세요.";
    else if (trimmedName.length > 50)
      next.name = "이름은 50자 이내로 입력해 주세요.";

    const digits = phone.replace(/\D/g, "");
    if (!phone.trim()) next.phone = "전화번호를 입력해 주세요.";
    else if (digits.length < 9 || digits.length > 12)
      next.phone = "전화번호를 정확히 입력해 주세요.";

    if (!visitDate) next.visitDate = "방문 예정일을 선택해 주세요.";
    else if (visitDate < today)
      next.visitDate = "방문 예정일은 오늘 이후로 선택해 주세요.";

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    mutation.mutate({
      branch_id: branchId as string,
      name: name.trim(),
      phone: phone.trim(),
      visit_date: visitDate,
    });
  }

  // 제출 에러 — 429(호출 제한)는 안내 문구로 대체
  let submitError: string | null = null;
  if (mutation.isError) {
    if (mutation.error instanceof ApiError && mutation.error.status === 429) {
      submitError = "요청이 많습니다. 잠시 후 다시 시도해 주세요.";
    } else if (mutation.error instanceof ApiError) {
      submitError = mutation.error.detail;
    } else {
      submitError = "예약 신청에 실패했습니다. 잠시 후 다시 시도해 주세요.";
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 py-10">
      <header className="text-center">
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-sm font-semibold text-primary">
            <MapPinIcon className="size-3.5" />
            {branch.name}
          </span>
        </div>
        <div className="mx-auto mt-4 flex size-14 items-center justify-center rounded-2xl bg-violet-50 text-primary">
          <CalendarDaysIcon className="size-7" />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-gray-900">예약 신청</h1>
        <p className="mt-2 text-sm/6 text-gray-500">
          이름·연락처·방문 예정일을 남겨 주시면 확인 후 연락드립니다.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6" noValidate>
        <TextField
          id="name"
          label="이름"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="홍길동"
          autoComplete="name"
          maxLength={50}
          error={errors.name}
        />
        <TextField
          id="phone"
          label="전화번호"
          required
          type="tel"
          inputMode="numeric"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="010-1234-5678"
          autoComplete="tel"
          error={errors.phone}
        />
        <TextField
          id="visit-date"
          label="방문 예정일"
          required
          type="date"
          value={visitDate}
          min={today}
          onChange={(e) => setVisitDate(e.target.value)}
          error={errors.visitDate}
        />

        {submitError && (
          <p className="rounded-md bg-red-50 px-3 py-2.5 text-sm text-red-700">
            {submitError}
          </p>
        )}

        <Button type="submit" className="w-full" loading={mutation.isPending}>
          예약 신청하기
        </Button>
      </form>
    </main>
  );
}

function CenterMessage({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto max-w-md px-6 py-16 text-center text-gray-500">
      {children}
    </main>
  );
}

function ErrorScreen({ title, message }: { title: string; message: string }) {
  return (
    <main className="mx-auto max-w-md px-6 py-16 text-center">
      <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-amber-50 text-amber-500">
        <ExclamationTriangleIcon className="size-9" />
      </div>
      <h1 className="mt-5 text-xl font-bold text-gray-900">{title}</h1>
      <p className="mt-2 text-sm/6 text-gray-600">{message}</p>
    </main>
  );
}
