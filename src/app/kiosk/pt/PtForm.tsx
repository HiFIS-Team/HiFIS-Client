"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import { getBranches } from "@/lib/api/branches";
import { getEnums } from "@/lib/api/enums";
import { getPtPasses } from "@/lib/api/passes";
import { createPtApplication } from "@/lib/api/ptApplications";
import { ApiError } from "@/lib/api/client";
import type { EnumOption, Pass } from "@/lib/api/types";
import { formatDate } from "@/lib/format";
import { TextField } from "@/components/TextField";
import { Select, type SelectOption } from "@/components/Select";
import { Textarea } from "@/components/Textarea";
import { Checkbox } from "@/components/Checkbox";
import { Button } from "@/components/Button";

// 오늘 날짜 YYYY-MM-DD (기기 로컬 기준)
function todayStr(): string {
  return new Date().toLocaleDateString("en-CA");
}

// PT 회원에게 제공되는 헬스권 이용 기간 (일) — 고정값
const PT_DURATION_DAYS = 40;

// YYYY-MM-DD 에 일수를 더한다
function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d + days);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mm}-${dd}`;
}

function enumOpts(arr: EnumOption[]): SelectOption[] {
  return arr.map((o) => ({ value: o.code, label: o.label }));
}

// 상품 목록 → Select 옵션 (가격을 라벨에 함께 표시)
function passOpts(arr: Pass[]): SelectOption[] {
  return arr.map((p) => ({
    value: p.id,
    label: `${p.name} · 현금 ${p.cash_price.toLocaleString()}원 / 카드 ${p.card_price.toLocaleString()}원`,
  }));
}

const INITIAL = {
  name: "",
  gender: "",
  birth_date: "",
  phone: "",
  address: "",
  pt_pass_id: "",
  start_date: "",
  end_date: "",
  payment_method: "",
  final_price: "",
  referral: "",
  notes: "",
  agreed_notice: false,
};

type FormState = typeof INITIAL;

export function PtForm({ branchId }: { branchId: string }) {
  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: getBranches,
  });
  const enumsQuery = useQuery({ queryKey: ["enums"], queryFn: getEnums });
  const ptPassQuery = useQuery({
    queryKey: ["pt-passes", branchId],
    queryFn: () => getPtPasses(branchId),
  });

  // 시작일은 등록일(오늘), 종료일은 +40일로 시작 — PT 헬스권 기간은 40일 고정
  const [form, setForm] = useState<FormState>(() => {
    const t = todayStr();
    return { ...INITIAL, start_date: t, end_date: addDays(t, PT_DURATION_DAYS) };
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const mutation = useMutation({ mutationFn: createPtApplication });

  const set = (patch: Partial<FormState>) =>
    setForm((f) => ({ ...f, ...patch }));

  const today = todayStr();

  const isLoading = enumsQuery.isLoading || ptPassQuery.isLoading;
  const isError = enumsQuery.isError || ptPassQuery.isError;

  if (isLoading) {
    return <Center>불러오는 중…</Center>;
  }
  if (isError) {
    return (
      <Center>
        신청서 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
      </Center>
    );
  }

  const enums = enumsQuery.data!;
  const ptPasses = ptPassQuery.data ?? [];
  const branchName =
    branchesQuery.data?.find((b) => b.id === branchId)?.name ?? "";

  // 수강권·결제수단 변경 시 최종 금액을 자동 재계산
  function totalFor(next: FormState): number {
    const p = ptPasses.find((x) => x.id === next.pt_pass_id);
    if (!p) return 0;
    return next.payment_method === "CARD" ? p.card_price : p.cash_price;
  }
  const setWithPrice = (patch: Partial<FormState>) => {
    setForm((f) => {
      const next = { ...f, ...patch };
      return { ...next, final_price: String(totalFor(next)) };
    });
  };

  // 이용 시작일 변경 — 종료일은 항상 시작일 + 40일 (PT 헬스권 기간 고정)
  const onStartDateChange = (value: string) => {
    setForm((f) => ({
      ...f,
      start_date: value,
      end_date: value ? addDays(value, PT_DURATION_DAYS) : "",
    }));
  };

  if (mutation.isSuccess) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <CheckCircleIcon className="mx-auto size-16 text-primary" />
        <h1 className="mt-4 text-2xl font-bold text-gray-900">
          PT 신청이 접수되었습니다
        </h1>
        <p className="mt-2 text-base text-gray-600">
          {mutation.data.name}님, 신청해 주셔서 감사합니다.
        </p>
        <Link
          href="/kiosk"
          className="mt-8 inline-block rounded-md bg-primary px-6 py-3 text-base font-semibold text-white hover:bg-primary-hover"
        >
          처음으로
        </Link>
      </main>
    );
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "이름을 입력해 주세요.";
    if (!form.gender) e.gender = "성별을 선택해 주세요.";
    if (!form.birth_date) e.birth_date = "생년월일을 선택해 주세요.";
    else if (form.birth_date > today)
      e.birth_date = "생년월일은 오늘 이후일 수 없습니다.";

    const digits = form.phone.replace(/\D/g, "");
    if (!form.phone.trim()) e.phone = "전화번호를 입력해 주세요.";
    else if (digits.length < 9 || digits.length > 12)
      e.phone = "전화번호를 정확히 입력해 주세요.";

    if (!form.address.trim()) e.address = "주소를 입력해 주세요.";
    if (!form.pt_pass_id) e.pt_pass_id = "수강권을 선택해 주세요.";

    // 종료일은 시작일 + 40일로 자동 계산되므로 시작일만 검증
    if (!form.start_date) e.start_date = "이용 시작일을 선택해 주세요.";

    if (!form.payment_method) e.payment_method = "결제 방법을 선택해 주세요.";
    if (form.final_price === "")
      e.final_price = "최종 결제 금액을 입력해 주세요.";
    else if (
      Number.isNaN(Number(form.final_price)) ||
      Number(form.final_price) < 0
    )
      e.final_price = "결제 금액을 정확히 입력해 주세요.";

    if (!form.referral) e.referral = "유입 경로를 선택해 주세요.";
    if (!form.agreed_notice) e.agreed_notice = "유의사항을 확인해 주세요.";

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    mutation.mutate({
      branch_id: branchId,
      pt_pass_id: form.pt_pass_id,
      name: form.name.trim(),
      gender: form.gender,
      birth_date: form.birth_date,
      phone: form.phone.trim(),
      address: form.address.trim(),
      referral: form.referral,
      payment_method: form.payment_method,
      final_price: Number(form.final_price),
      start_date: form.start_date,
      end_date: form.end_date,
      notes: form.notes.trim() || null,
      agreed_notice: form.agreed_notice,
    });
  }

  let submitError: string | null = null;
  if (mutation.isError) {
    if (mutation.error instanceof ApiError && mutation.error.status === 429) {
      submitError = "요청이 많습니다. 잠시 후 다시 시도해 주세요.";
    } else if (mutation.error instanceof ApiError) {
      submitError = mutation.error.detail;
    } else {
      submitError = "신청에 실패했습니다. 잠시 후 다시 시도해 주세요.";
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <header>
        {branchName && (
          <p className="text-sm font-semibold text-primary">{branchName}</p>
        )}
        <h1 className="mt-1 text-2xl font-bold text-gray-900">PT 신청서</h1>
        <p className="mt-2 text-sm/6 text-gray-500">
          아래 정보를 입력해 주세요. <span className="text-red-500">*</span> 는
          필수 항목입니다.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="mt-8 space-y-8" noValidate>
        <Section title="신청자 정보">
          <TextField
            id="name"
            label="이름"
            required
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="홍길동"
            maxLength={50}
            error={errors.name}
          />
          <Select
            id="gender"
            label="성별"
            required
            placeholder="선택해 주세요"
            options={enumOpts(enums.gender)}
            value={form.gender}
            onChange={(e) => set({ gender: e.target.value })}
            error={errors.gender}
          />
          <TextField
            id="birth-date"
            label="생년월일"
            required
            type="date"
            max={today}
            value={form.birth_date}
            onChange={(e) => set({ birth_date: e.target.value })}
            error={errors.birth_date}
          />
          <TextField
            id="phone"
            label="전화번호"
            required
            type="tel"
            inputMode="numeric"
            placeholder="010-1234-5678"
            value={form.phone}
            onChange={(e) => set({ phone: e.target.value })}
            error={errors.phone}
          />
          <TextField
            id="address"
            label="주소"
            required
            value={form.address}
            onChange={(e) => set({ address: e.target.value })}
            placeholder="OO시 OO구 OO동"
            maxLength={255}
            error={errors.address}
          />
        </Section>

        <Section title="수강권 · 이용 기간">
          <Select
            id="pt-pass"
            label="수강권"
            required
            placeholder="선택해 주세요"
            options={passOpts(ptPasses)}
            value={form.pt_pass_id}
            onChange={(e) => setWithPrice({ pt_pass_id: e.target.value })}
            error={errors.pt_pass_id}
          />
          <TextField
            id="start-date"
            label="이용 시작일"
            required
            type="date"
            value={form.start_date}
            onChange={(e) => onStartDateChange(e.target.value)}
            error={errors.start_date}
            hint="등록일(오늘)로 채워져 있어요. 바꾸면 종료일이 다시 계산돼요."
          />
          <div>
            <p className="block text-sm/6 font-medium text-gray-900">
              이용 종료일
            </p>
            <div className="mt-2 rounded-md bg-gray-100 px-3 py-2.5 text-base text-gray-600">
              {form.end_date ? formatDate(form.end_date) : "—"}
            </div>
            <p className="mt-1.5 text-sm text-gray-500">
              PT 회원은 헬스권 40일이 제공돼요. 시작일 기준 자동 설정됩니다.
            </p>
          </div>
        </Section>

        <Section title="결제">
          <Select
            id="payment-method"
            label="결제 방법"
            required
            placeholder="선택해 주세요"
            options={enumOpts(enums.payment_method)}
            value={form.payment_method}
            onChange={(e) => setWithPrice({ payment_method: e.target.value })}
            error={errors.payment_method}
          />
          <TextField
            id="final-price"
            label="최종 결제 금액 (원)"
            required
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="0"
            value={form.final_price}
            onChange={(e) => set({ final_price: e.target.value })}
            error={errors.final_price}
            hint="수강권·결제수단을 선택하면 자동 계산돼요. 할인이 있으면 직접 수정하세요."
          />
        </Section>

        <Section title="설문 · 추가 정보">
          <Select
            id="referral"
            label="유입 경로"
            required
            placeholder="선택해 주세요"
            options={enumOpts(enums.referral)}
            value={form.referral}
            onChange={(e) => set({ referral: e.target.value })}
            error={errors.referral}
          />
          <Textarea
            id="notes"
            label="비고 (선택)"
            value={form.notes}
            onChange={(e) => set({ notes: e.target.value })}
            placeholder="요청 사항이 있으면 적어 주세요."
            maxLength={500}
          />
        </Section>

        <Section title="동의">
          <Checkbox
            id="agreed-notice"
            label="유의사항을 확인하였습니다. (필수)"
            checked={form.agreed_notice}
            onChange={(e) => set({ agreed_notice: e.target.checked })}
            error={errors.agreed_notice}
          />
        </Section>

        {submitError && (
          <p className="rounded-md bg-red-50 px-3 py-2.5 text-sm text-red-700">
            {submitError}
          </p>
        )}

        <div className="flex gap-3">
          <Link
            href="/kiosk"
            className="flex items-center justify-center rounded-md px-4 py-3 text-base font-semibold text-gray-600"
          >
            취소
          </Link>
          <Button
            type="submit"
            className="flex-1"
            loading={mutation.isPending}
            disabled={!form.agreed_notice}
          >
            신청서 제출
          </Button>
        </div>
      </form>
    </main>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-gray-200 pt-8">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

function Center({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-6 text-center text-gray-500">
      {children}
    </main>
  );
}
