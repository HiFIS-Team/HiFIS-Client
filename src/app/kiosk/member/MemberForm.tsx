"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import { getBranches } from "@/lib/api/branches";
import { getEnums } from "@/lib/api/enums";
import {
  getClothesPasses,
  getLockerPasses,
  getMembershipPasses,
} from "@/lib/api/passes";
import { createMember } from "@/lib/api/members";
import { ApiError } from "@/lib/api/client";
import type { EnumOption, Pass } from "@/lib/api/types";
import { TextField } from "@/components/TextField";
import { Select, type SelectOption } from "@/components/Select";
import { Checkbox } from "@/components/Checkbox";
import { Button } from "@/components/Button";

// 오늘 날짜 YYYY-MM-DD (기기 로컬 기준)
function todayStr(): string {
  return new Date().toLocaleDateString("en-CA");
}

// 회원권 이름에서 이용 개월 수 추출 ("3개월권"→3, "1년권"→12). 못 찾으면 null.
// 백엔드 Pass 에 기간 필드가 없어 이름으로 추정 — 추후 duration 필드가 생기면 그걸 사용할 것.
function passDurationMonths(name: string): number | null {
  const year = name.match(/(\d+)\s*년/);
  if (year) return Number(year[1]) * 12;
  const month = name.match(/(\d+)\s*개월/);
  if (month) return Number(month[1]);
  return null;
}

// YYYY-MM-DD 에 개월 수를 더한다 (말일 초과 시 해당 월 말일로 보정).
function addMonths(dateStr: string, months: number): string {
  const [y, m, day] = dateStr.split("-").map(Number);
  const target = new Date(y, m - 1 + months, 1);
  const lastDay = new Date(
    target.getFullYear(),
    target.getMonth() + 1,
    0,
  ).getDate();
  target.setDate(Math.min(day, lastDay));
  const mm = String(target.getMonth() + 1).padStart(2, "0");
  const dd = String(target.getDate()).padStart(2, "0");
  return `${target.getFullYear()}-${mm}-${dd}`;
}

// enum 옵션 → Select 옵션
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
  membership_pass_id: "",
  locker_pass_id: "",
  clothes_pass_id: "",
  start_date: "",
  end_date: "",
  payment_method: "",
  final_price: "",
  referral: "",
  motivation: "",
  agreed_terms: false,
};

type FormState = typeof INITIAL;

export function MemberForm({ branchId }: { branchId: string }) {
  // 신청서 진입 시 필요한 데이터 (지점·enum·상품)
  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: getBranches,
  });
  const enumsQuery = useQuery({ queryKey: ["enums"], queryFn: getEnums });
  const membershipQuery = useQuery({
    queryKey: ["membership-passes", branchId],
    queryFn: () => getMembershipPasses(branchId),
  });
  const lockerQuery = useQuery({
    queryKey: ["locker-passes", branchId],
    queryFn: () => getLockerPasses(branchId),
  });
  const clothesQuery = useQuery({
    queryKey: ["clothes-passes", branchId],
    queryFn: () => getClothesPasses(branchId),
  });

  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const mutation = useMutation({ mutationFn: createMember });

  const set = (patch: Partial<FormState>) =>
    setForm((f) => ({ ...f, ...patch }));

  const today = todayStr();

  const isLoading =
    enumsQuery.isLoading ||
    membershipQuery.isLoading ||
    lockerQuery.isLoading ||
    clothesQuery.isLoading;
  const isError =
    enumsQuery.isError ||
    membershipQuery.isError ||
    lockerQuery.isError ||
    clothesQuery.isError;

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
  const membershipPasses = membershipQuery.data ?? [];
  const lockerPasses = lockerQuery.data ?? [];
  const clothesPasses = clothesQuery.data ?? [];
  const branchName =
    branchesQuery.data?.find((b) => b.id === branchId)?.name ?? "";

  // 선택한 상품 가격 합계 — 결제수단이 카드면 카드가, 그 외엔 현금가 적용
  function priceOf(passes: Pass[], id: string, useCard: boolean): number {
    const p = passes.find((x) => x.id === id);
    if (!p) return 0;
    return useCard ? p.card_price : p.cash_price;
  }
  function totalFor(next: FormState): number {
    const useCard = next.payment_method === "CARD";
    return (
      priceOf(membershipPasses, next.membership_pass_id, useCard) +
      priceOf(lockerPasses, next.locker_pass_id, useCard) +
      priceOf(clothesPasses, next.clothes_pass_id, useCard)
    );
  }
  // 상품·결제수단 변경 시 최종 금액을 자동 재계산
  const setWithPrice = (patch: Partial<FormState>) => {
    setForm((f) => {
      const next = { ...f, ...patch };
      return { ...next, final_price: String(totalFor(next)) };
    });
  };

  // 선택된 회원권의 이용 개월 수 (이름에서 추출, 없으면 null)
  const monthsOf = (passId: string): number | null => {
    const p = membershipPasses.find((x) => x.id === passId);
    return p ? passDurationMonths(p.name) : null;
  };
  // 회원권 선택 — 가격 + 이용 기간 자동 설정
  // (시작일은 비어 있으면 등록일=오늘, 종료일은 시작일 + 회원권 기간)
  const onMembershipChange = (id: string) => {
    setForm((f) => {
      const base: FormState = { ...f, membership_pass_id: id };
      base.final_price = String(totalFor(base));
      const months = monthsOf(id);
      if (months == null) return base;
      const start = base.start_date || today;
      return { ...base, start_date: start, end_date: addMonths(start, months) };
    });
  };
  // 이용 시작일 변경 — 회원권 기간에 맞춰 종료일 재계산
  const onStartDateChange = (value: string) => {
    setForm((f) => {
      const next: FormState = { ...f, start_date: value };
      const months = monthsOf(f.membership_pass_id);
      if (months != null && value) next.end_date = addMonths(value, months);
      return next;
    });
  };

  // 제출 성공 — 완료 화면
  if (mutation.isSuccess) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <CheckCircleIcon className="mx-auto size-16 text-primary" />
        <h1 className="mt-4 text-2xl font-bold text-gray-900">
          회원가입 신청이 접수되었습니다
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
    if (!form.membership_pass_id)
      e.membership_pass_id = "회원권을 선택해 주세요.";

    if (!form.start_date) e.start_date = "이용 시작일을 선택해 주세요.";
    if (!form.end_date) e.end_date = "이용 종료일을 선택해 주세요.";
    else if (form.start_date && form.end_date < form.start_date)
      e.end_date = "종료일은 시작일보다 빠를 수 없습니다.";

    if (!form.payment_method) e.payment_method = "결제 방법을 선택해 주세요.";
    if (form.final_price === "")
      e.final_price = "최종 결제 금액을 입력해 주세요.";
    else if (
      Number.isNaN(Number(form.final_price)) ||
      Number(form.final_price) < 0
    )
      e.final_price = "결제 금액을 정확히 입력해 주세요.";

    if (!form.referral) e.referral = "유입 경로를 선택해 주세요.";
    if (!form.motivation) e.motivation = "방문 목적을 선택해 주세요.";
    if (!form.agreed_terms) e.agreed_terms = "운영 회칙에 동의해 주세요.";

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    mutation.mutate({
      branch_id: branchId,
      membership_pass_id: form.membership_pass_id,
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
      locker_pass_id: form.locker_pass_id || null,
      clothes_pass_id: form.clothes_pass_id || null,
      motivation: form.motivation,
      agreed_terms: form.agreed_terms,
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
      submitError = "신청에 실패했습니다. 잠시 후 다시 시도해 주세요.";
    }
  }

  // 락커·운동복은 선택 항목 → "선택 안 함" 옵션을 맨 앞에
  const optional = (arr: SelectOption[]): SelectOption[] => [
    { value: "", label: "선택 안 함" },
    ...arr,
  ];

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <header>
        {branchName && (
          <p className="text-sm font-semibold text-primary">{branchName}</p>
        )}
        <h1 className="mt-1 text-2xl font-bold text-gray-900">
          회원가입 신청서
        </h1>
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

        <Section title="회원권 · 이용 기간">
          <Select
            id="membership-pass"
            label="회원권"
            required
            placeholder="선택해 주세요"
            options={passOpts(membershipPasses)}
            value={form.membership_pass_id}
            onChange={(e) => onMembershipChange(e.target.value)}
            error={errors.membership_pass_id}
          />
          <Select
            id="locker-pass"
            label="락커 (선택)"
            options={optional(passOpts(lockerPasses))}
            value={form.locker_pass_id}
            onChange={(e) => setWithPrice({ locker_pass_id: e.target.value })}
          />
          <Select
            id="clothes-pass"
            label="운동복 (선택)"
            options={optional(passOpts(clothesPasses))}
            value={form.clothes_pass_id}
            onChange={(e) => setWithPrice({ clothes_pass_id: e.target.value })}
          />
          <TextField
            id="start-date"
            label="이용 시작일"
            required
            type="date"
            value={form.start_date}
            onChange={(e) => onStartDateChange(e.target.value)}
            error={errors.start_date}
            hint="회원권을 선택하면 등록일(오늘)로 채워져요. 바꾸면 종료일이 다시 계산돼요."
          />
          <TextField
            id="end-date"
            label="이용 종료일"
            required
            type="date"
            min={form.start_date || undefined}
            value={form.end_date}
            onChange={(e) => set({ end_date: e.target.value })}
            error={errors.end_date}
            hint="회원권 기간에 맞춰 자동 계산돼요. 필요하면 직접 수정하세요."
          />
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
            hint="회원권·락커·운동복·결제수단을 선택하면 자동 계산돼요. 할인이 있으면 직접 수정하세요."
          />
        </Section>

        <Section title="설문">
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
          <Select
            id="motivation"
            label="방문 목적"
            required
            placeholder="선택해 주세요"
            options={enumOpts(enums.motivation)}
            value={form.motivation}
            onChange={(e) => set({ motivation: e.target.value })}
            error={errors.motivation}
          />
        </Section>

        <Section title="동의">
          <Checkbox
            id="agreed-terms"
            label="운영 회칙에 동의합니다. (필수)"
            checked={form.agreed_terms}
            onChange={(e) => set({ agreed_terms: e.target.checked })}
            error={errors.agreed_terms}
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
            disabled={!form.agreed_terms}
          >
            신청서 제출
          </Button>
        </div>
      </form>
    </main>
  );
}

// 폼 섹션 — 제목 + 구분선
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
