"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type FormEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  CheckBadgeIcon,
  ChatBubbleLeftRightIcon,
  CreditCardIcon,
  TicketIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import { getBranches } from "@/lib/api/branches";
import { getEnums } from "@/lib/api/enums";
import {
  getClothesPasses,
  getLockerPasses,
  getMembershipPasses,
} from "@/lib/api/passes";
import { createMember } from "@/lib/api/members";
import { getRegistrationLookup } from "@/lib/api/registrations";
import { ApiError } from "@/lib/api/client";
import type { EnumOption, Pass } from "@/lib/api/types";
import { TextField } from "@/components/TextField";
import { DateField } from "@/components/DateField";
import { NumberField } from "@/components/NumberField";
import { FaceCapture } from "@/components/FaceCapture";
import { Select, type SelectOption } from "@/components/Select";
import { Checkbox } from "@/components/Checkbox";
import { Button } from "@/components/Button";
import { TermsDialog } from "@/components/TermsDialog";
import { ContractDialog } from "@/components/ContractDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { OPERATING_RULES, MEMBERSHIP_PLEDGE } from "@/lib/operatingRules";
import { DAJIM_MEMBER_TERMS, DAJIM_PLEDGE } from "@/lib/dajimTerms";
import { referralOptions, resolveReferralForSubmit } from "@/lib/referral";
import {
  passDuration,
  sortPassesForUI,
  type PassDuration,
} from "@/lib/passDuration";
import { RegisterSuccess } from "../RegisterSuccess";

// 오늘 날짜 YYYY-MM-DD (기기 로컬 기준)
function todayStr(): string {
  return new Date().toLocaleDateString("en-CA");
}

// passDuration / PassDuration 은 @/lib/passDuration 공용 모듈에서 import (admin 상품관리와 공유).

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

// YYYY-MM-DD 에 일 수를 더한다.
function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d + days);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mm}-${dd}`;
}

// 기간 객체를 적용해 종료일 계산.
// 종료일은 "마지막 유효일"(포함) 의미 — 백엔드 만기 처리가 end_date < today 기준.
// 일권/주권: 1일권 → end=start, 7일권 → start+6, 2주권 → start+13.
// 개월권은 관례상 "같은 날짜 다음달" 그대로 (예: 1개월 6/5 → 7/5, 31일 유효).
// 시간권(3시간권 등): 당일 만료 → end=start.
function applyDuration(startDate: string, duration: PassDuration): string {
  if ("months" in duration) return addMonths(startDate, duration.months);
  if ("days" in duration) return addDays(startDate, duration.days - 1);
  return startDate; // hours — 당일
}

// enum 옵션 → Select 옵션
function enumOpts(arr: EnumOption[]): SelectOption[] {
  return arr.map((o) => ({ value: o.code, label: o.label }));
}

// 상품 목록 → Select 옵션. 카테고리(일반·학생·제휴 등) → 기간 → 가격 순으로 정렬.
// label = 상품명, description = 가격, meta = 무료 제공 태그.
function passOpts(arr: Pass[]): SelectOption[] {
  return sortPassesForUI(arr).map((p) => {
    const items: string[] = [];
    if (p.provides_locker) items.push("락커");
    if (p.provides_clothes) items.push("운동복");
    return {
      value: p.id,
      label: p.name,
      description: `현금 ${p.cash_price.toLocaleString()}원 / 카드 ${p.card_price.toLocaleString()}원`,
      meta: items.length > 0 ? `${items.join(", ")} 무료 제공` : undefined,
    };
  });
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
  // "기타" 선택 시 사용자 자유 입력 — 제출 직전 enum 자동 매핑 + 백엔드에 detail 로 전송
  referral_detail: "",
  motivation: "",
  // 일반 지점: 체크박스로 동의 받음.
  // 다짐 지점(첨단·동광주): 체크박스 대신 전자서명 받음 → 제출 시 자동 true.
  agreed_terms: false,
  // 마케팅 정보 수신 동의 (선택) — 만기 알림톡 등 마케팅성 트리거에만 영향
  agreed_marketing: false,
  // 회원권이 락커·운동복을 무료 제공할 때 사용자가 "선택 안 함" 으로 바꾼 경우 (UI 표시용).
  // 백엔드 제출 시점엔 어차피 null 이라 별도 전송 필드는 아님.
  locker_opt_out: false,
  clothes_opt_out: false,
};

type FormState = typeof INITIAL;

export function MemberForm({ branchId }: { branchId: string }) {
  const router = useRouter();
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
  const [termsOpen, setTermsOpen] = useState(false);
  const [signatureOpen, setSignatureOpen] = useState(false);
  // 중복 가입 감지 모달 — 같은 이름+전화로 이미 회원 이력이 있을 때 1회 표시.
  // 한 번 닫으면 같은 (이름,전화) 조합엔 다시 안 띄움 (dismissedKey).
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);

  // 이름+전화 디바운스 — 입력 멈춘 뒤 500ms 지나면 lookup query key 갱신.
  const [debouncedName, setDebouncedName] = useState("");
  const [debouncedPhone, setDebouncedPhone] = useState("");
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedName(form.name.trim());
      setDebouncedPhone(form.phone.replace(/\D/g, ""));
    }, 500);
    return () => clearTimeout(t);
  }, [form.name, form.phone]);

  const lookupEnabled =
    !!debouncedName &&
    debouncedPhone.length >= 9 &&
    debouncedPhone.length <= 12;
  const lookupQuery = useQuery({
    queryKey: ["registration-lookup", branchId, debouncedName, debouncedPhone],
    queryFn: () =>
      getRegistrationLookup({
        branchId,
        name: debouncedName,
        phone: debouncedPhone,
      }),
    enabled: lookupEnabled,
    retry: false,
  });

  // lookup 응답에 MEMBER 가 있으면 모달 트리거 (단, 같은 조합으로 이미 닫은 적 있으면 skip)
  const currentKey = `${debouncedName}|${debouncedPhone}`;
  useEffect(() => {
    if (!lookupQuery.data) return;
    if (!lookupQuery.data.kinds.includes("MEMBER")) return;
    if (currentKey === dismissedKey) return;
    setDuplicateOpen(true);
  }, [lookupQuery.data, currentKey, dismissedKey]);

  function goRenewal() {
    setDuplicateOpen(false);
    const qs = new URLSearchParams({
      branch_id: branchId,
      prefill_name: form.name.trim(),
      prefill_phone: form.phone.trim(),
    }).toString();
    router.push(`/register/renewal?${qs}`);
  }

  function dismissDuplicate() {
    setDuplicateOpen(false);
    setDismissedKey(currentKey);
  }
  // 전자서명 PNG Blob — 동의의 근거 (체크박스 대체).
  // 미리보기 URL 은 Blob 에서 derive + cleanup-only effect 로 revoke (React 19 권장).
  const [signature, setSignature] = useState<Blob | null>(null);
  const signaturePreview = useMemo(
    () => (signature ? URL.createObjectURL(signature) : null),
    [signature],
  );
  useEffect(() => {
    if (!signaturePreview) return;
    return () => URL.revokeObjectURL(signaturePreview);
  }, [signaturePreview]);
  // 첨단점 다짐 얼굴 등록 — Branch.dajim_face_enabled 일 때만 받음.
  // 백엔드 400 "얼굴 인증 실패" 응답 시 faceError 에 detail 담아 미리보기 위에 노출.
  const [faceImage, setFaceImage] = useState<File | null>(null);
  const [faceError, setFaceError] = useState<string | null>(null);
  const mutation = useMutation({ mutationFn: createMember });
  // 백엔드가 400 "얼굴 인증 실패…" 로 막은 경우 — 사진 리셋 + 인라인 에러로 다시 찍게 유도.
  // 아래 mutation.isSuccess early return 보다 위에 둬야 hooks 순서가 변하지 않음.
  useEffect(() => {
    if (
      mutation.isError &&
      mutation.error instanceof ApiError &&
      mutation.error.status === 400 &&
      /얼굴/.test(mutation.error.detail ?? "")
    ) {
      setFaceImage(null);
      setFaceError(mutation.error.detail ?? "얼굴 인증에 실패했습니다.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mutation.isError, mutation.error]);
  useEffect(() => {
    if (faceImage) setFaceError(null);
  }, [faceImage]);

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
  const branch = branchesQuery.data?.find((b) => b.id === branchId);
  const branchName = branch?.name ?? "";
  // 종이 계약서 헤더에 들어가는 "동광주점" 같은 짧은 지점명
  const branchShort = branchName.replace(/^피트니스스타\s*/, "");
  // 다짐 지점(첨단·동광주)은 별도 이용약관 — Branch.dajim_enabled 로 판정
  const isDajim = !!branch?.dajim_enabled;
  // 첨단점만 다짐 얼굴 등록을 추가로 요구 — Branch.dajim_face_enabled 로 판정.
  const isDajimFace = !!branch?.dajim_face_enabled;
  const terms = isDajim ? DAJIM_MEMBER_TERMS : OPERATING_RULES;
  const pledge = isDajim ? DAJIM_PLEDGE : MEMBERSHIP_PLEDGE;
  const termsButtonLabel = isDajim ? "이용약관 전문 보기" : "운영 회칙 전문 보기";

  // 선택한 상품 가격 합계 — 결제수단이 카드면 카드가, 그 외엔 현금가 적용.
  // 회원권/락커/운동복 중 하나가 다른 종류를 무료 제공하면 그 가격은 합산에서 제외.
  function priceOf(passes: Pass[], id: string, useCard: boolean): number {
    const p = passes.find((x) => x.id === id);
    if (!p) return 0;
    return useCard ? p.card_price : p.cash_price;
  }
  function totalFor(next: FormState): number {
    const useCard = next.payment_method === "CARD";
    const sm = membershipPasses.find((x) => x.id === next.membership_pass_id);
    const sl = lockerPasses.find((x) => x.id === next.locker_pass_id);
    const sc = clothesPasses.find((x) => x.id === next.clothes_pass_id);
    const lockerLockedNext = !!sm?.provides_locker || !!sc?.provides_locker;
    const clothesLockedNext = !!sm?.provides_clothes || !!sl?.provides_clothes;
    return (
      priceOf(membershipPasses, next.membership_pass_id, useCard) +
      (lockerLockedNext
        ? 0
        : priceOf(lockerPasses, next.locker_pass_id, useCard)) +
      (clothesLockedNext
        ? 0
        : priceOf(clothesPasses, next.clothes_pass_id, useCard))
    );
  }
  // 상품·결제수단 변경 시 최종 금액을 자동 재계산
  const setWithPrice = (patch: Partial<FormState>) => {
    setForm((f) => {
      const next = { ...f, ...patch };
      return { ...next, final_price: String(totalFor(next)) };
    });
  };

  // 선택된 회원권의 이용 기간 (이름에서 추출, 없으면 null) — months 또는 days
  const durationOf = (passId: string): PassDuration | null => {
    const p = membershipPasses.find((x) => x.id === passId);
    return p ? passDuration(p) : null;
  };
  // 선택된 회원권·락커·운동복 — 교차 무료 제공 판단용
  const selectedMembership = membershipPasses.find(
    (x) => x.id === form.membership_pass_id,
  );
  const selectedLocker = lockerPasses.find(
    (x) => x.id === form.locker_pass_id,
  );
  const selectedClothes = clothesPasses.find(
    (x) => x.id === form.clothes_pass_id,
  );
  // 락커 잠금 — 회원권이 락커 무료 제공이거나, 선택한 운동복이 락커 무료 제공.
  // 운동복 잠금 — 회원권이 운동복 무료 제공이거나, 선택한 락커가 운동복 무료 제공.
  const lockerProvided =
    !!selectedMembership?.provides_locker ||
    !!selectedClothes?.provides_locker;
  const clothesProvided =
    !!selectedMembership?.provides_clothes ||
    !!selectedLocker?.provides_clothes;
  // 잠금 출처 표시용 — 회원권/운동복/락커 중 어느 게 끼워주는지에 따라 라벨 다름
  const lockerProvidedLabel = selectedMembership?.provides_locker
    ? "회원권에 포함 (무료 제공)"
    : selectedClothes?.provides_locker
      ? "운동복에 포함 (무료 제공)"
      : "포함 (무료 제공)";
  const clothesProvidedLabel = selectedMembership?.provides_clothes
    ? "회원권에 포함 (무료 제공)"
    : selectedLocker?.provides_clothes
      ? "락커에 포함 (무료 제공)"
      : "포함 (무료 제공)";

  // 종이 계약서에 띄울 회원·상품 정보 — 폼 state + enum 라벨 + pass lookup 으로 조립.
  // 빈 값은 ContractDialog 가 "—" 로 표시. 다짐 지점만 사용.
  const enumLabel = (arr: EnumOption[], code: string) =>
    arr.find((o) => o.code === code)?.label ?? "";
  const contractMemberInfo = [
    { label: "이름", value: form.name.trim() },
    { label: "성별", value: enumLabel(enums.gender, form.gender) },
    { label: "연락처", value: form.phone.trim() },
  ];
  const contractProductInfo = [
    { label: "회원권", value: selectedMembership?.name ?? "" },
    {
      label: "락커",
      value: lockerProvided
        ? form.locker_opt_out
          ? "선택 안 함"
          : lockerProvidedLabel
        : (selectedLocker?.name ?? "선택 안 함"),
    },
    {
      label: "운동복",
      value: clothesProvided
        ? form.clothes_opt_out
          ? "선택 안 함"
          : clothesProvidedLabel
        : (selectedClothes?.name ?? "선택 안 함"),
    },
    {
      label: "이용 기간",
      value:
        form.start_date && form.end_date
          ? `${form.start_date} ~ ${form.end_date}`
          : "",
    },
    {
      label: "결제 방식",
      value: enumLabel(enums.payment_method, form.payment_method),
    },
    {
      label: "결제 금액",
      value: form.final_price
        ? `${Number(form.final_price).toLocaleString()}원`
        : "",
    },
  ];
  // 회원권 선택 — 가격 + 이용 기간 자동 설정
  // (시작일은 비어 있으면 등록일=오늘, 종료일은 시작일 + 회원권 기간)
  // 새 회원권이 락커·운동복을 무료 제공하면 기존 별도 선택을 비우고 opt-out 상태도 리셋
  // → 기본값은 "포함 (무료 제공)" 으로 자연 노출
  const onMembershipChange = (id: string) => {
    const next = membershipPasses.find((x) => x.id === id);
    setForm((f) => {
      const base: FormState = { ...f, membership_pass_id: id };
      if (next?.provides_locker) {
        base.locker_pass_id = "";
        base.locker_opt_out = false;
      }
      if (next?.provides_clothes) {
        base.clothes_pass_id = "";
        base.clothes_opt_out = false;
      }
      base.final_price = String(totalFor(base));
      const d = durationOf(id);
      if (d == null) return base;
      const start = base.start_date || today;
      return { ...base, start_date: start, end_date: applyDuration(start, d) };
    });
  };
  // 락커 변경 — 그 락커가 운동복을 무료 제공하면 운동복 선택은 비움 (opt-out 도 리셋)
  const onLockerChange = (id: string) => {
    const next = lockerPasses.find((x) => x.id === id);
    setForm((f) => {
      const base: FormState = { ...f, locker_pass_id: id };
      if (next?.provides_clothes) {
        base.clothes_pass_id = "";
        base.clothes_opt_out = false;
      }
      return { ...base, final_price: String(totalFor(base)) };
    });
  };
  // 운동복 변경 — 그 운동복이 락커를 무료 제공하면 락커 선택은 비움
  const onClothesChange = (id: string) => {
    const next = clothesPasses.find((x) => x.id === id);
    setForm((f) => {
      const base: FormState = { ...f, clothes_pass_id: id };
      if (next?.provides_locker) {
        base.locker_pass_id = "";
        base.locker_opt_out = false;
      }
      return { ...base, final_price: String(totalFor(base)) };
    });
  };
  // 이용 시작일 변경 — 회원권 기간에 맞춰 종료일 재계산
  const onStartDateChange = (value: string) => {
    setForm((f) => {
      const next: FormState = { ...f, start_date: value };
      const d = durationOf(f.membership_pass_id);
      if (d != null && value) next.end_date = applyDuration(value, d);
      return next;
    });
  };

  // 제출 성공 — 완료 화면 (5초 후 키오스크 진입 화면으로 자동 복귀)
  if (mutation.isSuccess) {
    return (
      <RegisterSuccess
        title="회원가입 신청이 접수되었습니다"
        name={mutation.data.name}
      />
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
    // 동의 — 모든 지점: 체크박스 필수. 다짐 지점은 전자서명까지 추가로 필수.
    const termsErrorMsg = isDajim
      ? "이용약관에 동의해 주세요."
      : "운영 회칙에 동의해 주세요.";
    if (!form.agreed_terms) e.agreed_terms = termsErrorMsg;
    if (isDajim && !signature) e.signature = "전자서명을 입력해 주세요.";
    if (isDajimFace && !faceImage) e.faceImage = "얼굴 사진을 촬영해 주세요.";

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    // 기타 선택 + 자유 입력 시 enum 자동 매핑 ("블로그" → BLOG). detail 은 입력 그대로 보관.
    const { referral, referral_detail } = resolveReferralForSubmit(
      form.referral,
      form.referral_detail,
      enums.referral,
    );
    mutation.mutate({
      payload: {
        branch_id: branchId,
        membership_pass_id: form.membership_pass_id,
        name: form.name.trim(),
        gender: form.gender,
        birth_date: form.birth_date,
        phone: form.phone.trim(),
        address: form.address.trim(),
        referral,
        referral_detail,
        payment_method: form.payment_method,
        final_price: Number(form.final_price),
        start_date: form.start_date,
        end_date: form.end_date,
        // 회원권이 무료 제공하면 백엔드가 별도 선택을 400으로 막음 — 무조건 null
        locker_pass_id: lockerProvided ? null : form.locker_pass_id || null,
        clothes_pass_id: clothesProvided ? null : form.clothes_pass_id || null,
        motivation: form.motivation,
        // 모든 지점에서 체크박스로 동의 받음 (다짐은 서명까지 추가).
        agreed_terms: form.agreed_terms,
        agreed_marketing: form.agreed_marketing,
      },
      // signature 는 다짐 지점에서만 전달 (래퍼가 없으면 JSON 으로 보냄)
      signature: isDajim ? signature : undefined,
      // face_image 는 첨단점만. 백엔드가 다짐 RegisterFace 동기 호출.
      faceImage: isDajimFace ? faceImage : undefined,
    });
  }

  // 제출 에러 — 429(호출 제한)는 안내 문구로 대체.
  // 400 "얼굴 인증 실패…" 는 FaceCapture 자체에 인라인 에러로 띄우므로 하단 중복 표시는 생략.
  let submitError: string | null = null;
  if (mutation.isError) {
    if (mutation.error instanceof ApiError && mutation.error.status === 429) {
      submitError = "요청이 많습니다. 잠시 후 다시 시도해 주세요.";
    } else if (
      mutation.error instanceof ApiError &&
      mutation.error.status === 400 &&
      /얼굴/.test(mutation.error.detail ?? "")
    ) {
      submitError = null;
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
        <Section title="신청자 정보" icon={UserIcon}>
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
          <DateField
            id="birth-date"
            label="생년월일"
            required
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

        <Section title="회원권 · 이용 기간" icon={TicketIcon}>
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
          {/* 무료 제공이면 "포함(기본)" / "선택 안 함" 두 옵션. 잠금 출처는
              회원권/운동복/락커 중 어느 게 끼워주는지에 따라 라벨이 달라짐. */}
          <Select
            id="locker-pass"
            label="락커 (선택)"
            options={
              lockerProvided
                ? [
                    { value: "PROVIDED", label: lockerProvidedLabel },
                    { value: "OPT_OUT", label: "선택 안 함" },
                  ]
                : optional(passOpts(lockerPasses))
            }
            value={
              lockerProvided
                ? form.locker_opt_out
                  ? "OPT_OUT"
                  : "PROVIDED"
                : form.locker_pass_id
            }
            onChange={(e) =>
              lockerProvided
                ? set({ locker_opt_out: e.target.value === "OPT_OUT" })
                : onLockerChange(e.target.value)
            }
          />
          <Select
            id="clothes-pass"
            label="운동복 (선택)"
            options={
              clothesProvided
                ? [
                    { value: "PROVIDED", label: clothesProvidedLabel },
                    { value: "OPT_OUT", label: "선택 안 함" },
                  ]
                : optional(passOpts(clothesPasses))
            }
            value={
              clothesProvided
                ? form.clothes_opt_out
                  ? "OPT_OUT"
                  : "PROVIDED"
                : form.clothes_pass_id
            }
            onChange={(e) =>
              clothesProvided
                ? set({ clothes_opt_out: e.target.value === "OPT_OUT" })
                : onClothesChange(e.target.value)
            }
          />
          <DateField
            id="start-date"
            label="이용 시작일"
            required
            value={form.start_date}
            onChange={(e) => onStartDateChange(e.target.value)}
            error={errors.start_date}
            hint="회원권을 선택하면 등록일(오늘)로 채워져요. 바꾸면 종료일이 다시 계산돼요."
          />
          <DateField
            id="end-date"
            label="이용 종료일"
            required
            min={form.start_date || undefined}
            value={form.end_date}
            onChange={(e) => set({ end_date: e.target.value })}
            error={errors.end_date}
            hint="회원권 기간에 맞춰 자동 계산돼요. 필요하면 직접 수정하세요."
          />
        </Section>

        <Section title="결제" icon={CreditCardIcon}>
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
          <NumberField
            id="final-price"
            label="최종 결제 금액"
            required
            placeholder="0"
            value={form.final_price}
            onChange={(next) => set({ final_price: next })}
            error={errors.final_price}
            hint="회원권·락커·운동복·결제수단을 선택하면 자동 계산돼요. 할인이 있으면 직접 수정하세요."
          />
        </Section>

        <Section title="설문" icon={ChatBubbleLeftRightIcon}>
          <Select
            id="referral"
            label="유입 경로"
            required
            placeholder="선택해 주세요"
            options={enumOpts(referralOptions(enums.referral))}
            value={form.referral}
            onChange={(e) => set({ referral: e.target.value })}
            error={errors.referral}
          />
          {/* "기타" 선택 시 자유 입력 — 입력값이 enum 라벨과 매치되면 제출 시 그 enum 으로 자동 매핑 */}
          {form.referral === "OTHER" && (
            <TextField
              id="referral-detail"
              label="직접 입력"
              placeholder="예: 전단지, 블로그, 인스타"
              maxLength={100}
              value={form.referral_detail}
              onChange={(e) => set({ referral_detail: e.target.value })}
              hint="피트니스스타를 처음 알게 된 경로를 자세히 적어 주세요. 기존 항목 이름(전단지·블로그·인스타 등)과 같으면 그 항목으로 자동 분류돼요."
            />
          )}
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

        <Section title="동의" icon={CheckBadgeIcon}>
          <div className="space-y-4">
            {isDajim ? (
              /* 다짐 지점(첨단·동광주) — 종이 계약서 다이얼로그 하나로 동의·서명 동시 처리 */
              signature && signaturePreview ? (
                <div className="flex items-center gap-3 rounded-xl border border-violet-100 bg-violet-50/40 p-3.5 sm:gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={signaturePreview}
                    alt="신청서 미리보기"
                    className="h-16 w-12 shrink-0 rounded-lg border border-violet-100 bg-white object-cover object-top"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-start gap-1.5 text-sm font-semibold text-primary">
                      <CheckCircleIcon
                        aria-hidden="true"
                        className="size-5 shrink-0"
                      />
                      <span>약관 동의 + 전자서명 완료</span>
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      내용을 바꾸려면 다시 동의해 주세요.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSignatureOpen(true)}
                    className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    다시 동의
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setSignatureOpen(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/30 px-4 py-5 text-base font-semibold text-primary hover:border-primary hover:bg-violet-50"
                >
                  📄 이용약관 동의 + 전자서명
                </button>
              )
            ) : (
              /* 화순 등 일반 지점 — 기존 흐름: 서약문 + 약관 보기 + 체크박스 */
              <>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3.5">
                  <p className="text-base/7 text-gray-700">{pledge}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setTermsOpen(true)}
                  className="rounded-md border border-gray-300 px-4 py-2 text-base font-medium text-gray-700 hover:bg-gray-50"
                >
                  {termsButtonLabel}
                </button>
                <Checkbox
                  id="agreed-terms"
                  label="위 내용에 동의합니다. (필수)"
                  checked={form.agreed_terms}
                  onChange={(e) => set({ agreed_terms: e.target.checked })}
                  error={errors.agreed_terms}
                />
              </>
            )}
            {isDajim && errors.signature && (
              <p className="text-sm text-red-600">{errors.signature}</p>
            )}

            {isDajimFace && (
              <div>
                <p className="mb-2 text-sm font-medium text-gray-700">
                  얼굴 사진 (다짐 회원 등록용)
                </p>
                <FaceCapture
                  value={faceImage}
                  onChange={setFaceImage}
                  invalid={!!errors.faceImage}
                  errorMessage={faceError ?? errors.faceImage ?? null}
                />
              </div>
            )}

            <Checkbox
              id="agreed-marketing"
              label="마케팅 정보 수신에 동의합니다. (선택)"
              checked={form.agreed_marketing}
              onChange={(e) => set({ agreed_marketing: e.target.checked })}
            />
          </div>
        </Section>

        {submitError && (
          <p className="rounded-md bg-red-50 px-3 py-2.5 text-sm text-red-700">
            {submitError}
          </p>
        )}

        <div className="flex gap-3">
          <Link
            href={`/register?branch_id=${branchId}`}
            className="flex items-center justify-center rounded-md px-4 py-3 text-base font-semibold text-gray-600"
          >
            취소
          </Link>
          <Button
            type="submit"
            className="flex-1"
            loading={mutation.isPending}
            disabled={
              !form.agreed_terms ||
              (isDajim && !signature) ||
              (isDajimFace && !faceImage)
            }
          >
            신청서 제출
          </Button>
        </div>
      </form>

      {/* 다짐 지점 — 종이 계약서: 약관 + 동의 + 서명 한 모달에서 처리 */}
      {isDajim && (
        <ContractDialog
          open={signatureOpen}
          kind="member"
          branchName={branchShort}
          terms={terms}
          memberName={form.name.trim()}
          memberInfo={contractMemberInfo}
          productInfo={contractProductInfo}
          onConfirm={(blob) => {
            setSignature(blob);
            // 종이 안에서 "동의합니다" 받았으므로 agreed_terms 도 true 로
            set({ agreed_terms: true });
            setSignatureOpen(false);
            setErrors((prev) => {
              if (!prev.signature && !prev.agreed_terms) return prev;
              const next = { ...prev };
              delete next.signature;
              delete next.agreed_terms;
              return next;
            });
          }}
          onClose={() => setSignatureOpen(false)}
        />
      )}
      {/* 화순 등 일반 지점 — 기존 약관 전문 보기 모달 */}
      {!isDajim && termsOpen && (
        <TermsDialog content={terms} onClose={() => setTermsOpen(false)} />
      )}
      {/* 같은 이름+전화로 이미 회원 이력이 있으면 재등록 페이지로 안내 */}
      <ConfirmDialog
        open={duplicateOpen}
        title="이미 가입한 이력이 있습니다"
        message="입력하신 이름·전화번호로 등록된 회원 정보가 있어요. 재등록 페이지로 이동하시겠습니까?"
        confirmLabel="재등록 페이지로 이동"
        onConfirm={goRenewal}
        onCancel={dismissDuplicate}
      />
    </main>
  );
}

// 폼 섹션 — 아이콘 칩 + 제목 + 구분선
function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-gray-200 pt-8">
      <div className="flex items-center gap-2.5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-violet-50 text-primary">
          <Icon className="size-5" />
        </div>
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      </div>
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
