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
  BoltIcon,
  CheckBadgeIcon,
  ChatBubbleLeftRightIcon,
  CreditCardIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import { getBranches } from "@/lib/api/branches";
import { getEnums } from "@/lib/api/enums";
import {
  getClothesPasses,
  getLockerPasses,
  getPtPasses,
} from "@/lib/api/passes";
import { createPtApplication } from "@/lib/api/ptApplications";
import { getRegistrationLookup } from "@/lib/api/registrations";
import { ApiError } from "@/lib/api/client";
import type { EnumOption, Pass } from "@/lib/api/types";
import { formatDate } from "@/lib/format";
import { TextField } from "@/components/TextField";
import { FaceCapture } from "@/components/FaceCapture";
import { DateField } from "@/components/DateField";
import { NumberField } from "@/components/NumberField";
import { Select, type SelectOption } from "@/components/Select";
import { Textarea } from "@/components/Textarea";
import { Checkbox } from "@/components/Checkbox";
import { Button } from "@/components/Button";
import { TermsDialog } from "@/components/TermsDialog";
import { ContractDialog } from "@/components/ContractDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PT_NOTICE } from "@/lib/ptNotice";
import { MEMBERSHIP_PLEDGE } from "@/lib/operatingRules";
import { DAJIM_PT_TERMS, DAJIM_PLEDGE } from "@/lib/dajimTerms";
import { referralOptions, resolveReferralForSubmit } from "@/lib/referral";
import { ptDurationDays, sortPassesForUI } from "@/lib/passDuration";
import { RegisterSuccess } from "../RegisterSuccess";

// 오늘 날짜 YYYY-MM-DD (기기 로컬 기준)
function todayStr(): string {
  return new Date().toLocaleDateString("en-CA");
}

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
  pt_pass_id: "",
  // PT 회원에게 무료 제공되는 락커·운동복 — admin이 0원 상품으로 등록한 것만 선택
  locker_pass_id: "",
  clothes_pass_id: "",
  start_date: "",
  end_date: "",
  payment_method: "",
  final_price: "",
  referral: "",
  // "기타" 선택 시 자유 입력 — 제출 시 enum 자동 매핑 + 백엔드 detail 로 보관
  referral_detail: "",
  motivation: "",
  notes: "",
  // 일반 지점: 체크박스 / 다짐 지점(첨단·동광주): 전자서명 → 제출 시 자동 true.
  agreed_notice: false,
  // 마케팅 정보 수신 동의 (선택)
  agreed_marketing: false,
  // 수강권이 락커·운동복을 무료 제공할 때 사용자가 "선택 안 함" 으로 바꾼 경우 (UI 표시용).
  // 제출 시점엔 어차피 null.
  locker_opt_out: false,
  clothes_opt_out: false,
};

type FormState = typeof INITIAL;

export function PtForm({ branchId }: { branchId: string }) {
  const router = useRouter();
  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: getBranches,
  });
  const enumsQuery = useQuery({ queryKey: ["enums"], queryFn: getEnums });
  const ptPassQuery = useQuery({
    queryKey: ["pt-passes", branchId],
    queryFn: () => getPtPasses(branchId),
  });
  const lockerPassQuery = useQuery({
    queryKey: ["locker-passes", branchId],
    queryFn: () => getLockerPasses(branchId),
  });
  const clothesPassQuery = useQuery({
    queryKey: ["clothes-passes", branchId],
    queryFn: () => getClothesPasses(branchId),
  });

  // 시작일은 등록일(오늘). 종료일은 PT 수강권을 골라야 결정됨 (회수 × 4일).
  const [form, setForm] = useState<FormState>(() => ({
    ...INITIAL,
    start_date: todayStr(),
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [signatureOpen, setSignatureOpen] = useState(false);
  // 중복 PT 신청 감지 — 같은 이름+전화로 이미 PT 이력이 있으면 1회 안내.
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);

  // 이름+전화 디바운스 (입력 멈춘 뒤 500ms) — MemberForm 과 동일 패턴
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

  // PT 가 lookup 에 잡히면 모달 (회원만 있는 건 무시 — 회원 따로 가입한 사람이 PT 처음 신청 케이스).
  const currentKey = `${debouncedName}|${debouncedPhone}`;
  useEffect(() => {
    if (!lookupQuery.data) return;
    if (!lookupQuery.data.kinds.includes("PT")) return;
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
  // 전자서명 PNG Blob — 동의의 근거 (체크박스 대체). 미리보기는 derive + cleanup-only effect.
  const [signature, setSignature] = useState<Blob | null>(null);
  const signaturePreview = useMemo(
    () => (signature ? URL.createObjectURL(signature) : null),
    [signature],
  );
  useEffect(() => {
    if (!signaturePreview) return;
    return () => URL.revokeObjectURL(signaturePreview);
  }, [signaturePreview]);
  // 첨단점 다짐 얼굴 등록 (Branch.dajim_face_enabled). 백엔드 400 "얼굴 인증 실패" 시 faceError.
  const [faceImage, setFaceImage] = useState<File | null>(null);
  const [faceError, setFaceError] = useState<string | null>(null);
  const mutation = useMutation({ mutationFn: createPtApplication });
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
    ptPassQuery.isLoading ||
    lockerPassQuery.isLoading ||
    clothesPassQuery.isLoading;
  const isError =
    enumsQuery.isError ||
    ptPassQuery.isError ||
    lockerPassQuery.isError ||
    clothesPassQuery.isError;

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
  // PT 락커·운동복은 무료 제공 — 가격은 PT 신청에선 반영 안 함 (totalFor 가 수강권만 계산).
  // 백엔드 스키마가 UUID 라 placeholder 로 지점의 첫 패스 ID 를 전달.
  // 지점에 패스가 하나도 등록 안 돼 있으면 신청 토글 자체를 숨김.
  const lockerPasses = lockerPassQuery.data ?? [];
  const clothesPasses = clothesPassQuery.data ?? [];
  const branch = branchesQuery.data?.find((b) => b.id === branchId);
  const branchName = branch?.name ?? "";
  const branchShort = branchName.replace(/^피트니스스타\s*/, "");
  // 다짐 지점(첨단·동광주)은 PT 유의사항 대신 통합 이용약관 사용
  const isDajim = !!branch?.dajim_enabled;
  // 첨단점만 다짐 얼굴 등록 추가.
  const isDajimFace = !!branch?.dajim_face_enabled;
  const terms = isDajim ? DAJIM_PT_TERMS : PT_NOTICE;
  const pledge = isDajim ? DAJIM_PLEDGE : MEMBERSHIP_PLEDGE;
  const termsButtonLabel = isDajim ? "이용약관 전문 보기" : "서명 전 유의사항 보기";

  // 락커·운동복은 무료라 결제 금액에 영향 없음 — totalFor 는 수강권만 반영

  // 수강권·결제수단 변경 시 최종 금액을 자동 재계산
  function totalFor(next: FormState): number {
    const p = ptPasses.find((x) => x.id === next.pt_pass_id);
    if (!p) return 0;
    return next.payment_method === "CARD" ? p.card_price : p.cash_price;
  }
  // 수강권 변경 — 가격 재계산 + 종료일(시작일 + 회수×4일) 재계산 +
  // 무료 제공 수강권이면 별도 락커·운동복 선택과 opt-out 리셋
  // → 기본값 "포함 (무료 제공)" 으로 자연 노출
  const onPtPassChange = (id: string) => {
    const next = ptPasses.find((x) => x.id === id);
    setForm((f) => {
      const base: FormState = { ...f, pt_pass_id: id };
      if (next?.provides_locker) {
        base.locker_pass_id = "";
        base.locker_opt_out = false;
      }
      if (next?.provides_clothes) {
        base.clothes_pass_id = "";
        base.clothes_opt_out = false;
      }
      if (next && base.start_date) {
        // 종료일 = 마지막 유효일(포함) — N일권이면 start + (N-1)
        base.end_date = addDays(
          base.start_date,
          ptDurationDays(next) - 1,
        );
      }
      return { ...base, final_price: String(totalFor(base)) };
    });
  };
  const setWithPrice = (patch: Partial<FormState>) => {
    setForm((f) => {
      const next = { ...f, ...patch };
      return { ...next, final_price: String(totalFor(next)) };
    });
  };

  // 선택된 수강권 — 락커·운동복 무료 제공 여부 판단용
  const selectedPtPass = ptPasses.find((x) => x.id === form.pt_pass_id);
  const lockerProvided = !!selectedPtPass?.provides_locker;
  const clothesProvided = !!selectedPtPass?.provides_clothes;

  // 종이 계약서에 띄울 회원·상품 정보 — 다짐 지점만 사용.
  const enumLabel = (arr: EnumOption[], code: string) =>
    arr.find((o) => o.code === code)?.label ?? "";
  const contractMemberInfo = [
    { label: "이름", value: form.name.trim() },
    { label: "성별", value: enumLabel(enums.gender, form.gender) },
    { label: "연락처", value: form.phone.trim() },
  ];
  const contractProductInfo = [
    { label: "수강권", value: selectedPtPass?.name ?? "" },
    {
      label: "락커",
      value: lockerProvided
        ? form.locker_opt_out
          ? "선택 안 함"
          : "수강권에 포함 (무료 제공)"
        : "선택 안 함",
    },
    {
      label: "운동복",
      value: clothesProvided
        ? form.clothes_opt_out
          ? "선택 안 함"
          : "수강권에 포함 (무료 제공)"
        : "선택 안 함",
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

  // 이용 시작일 변경 — 종료일 = 시작일 + (선택 수강권 회수 × 4일).
  // 수강권 미선택이면 종료일은 비움 — 수강권 선택 시 onPtPassChange 가 채움.
  const onStartDateChange = (value: string) => {
    setForm((f) => {
      const pass = ptPasses.find((x) => x.id === f.pt_pass_id);
      return {
        ...f,
        start_date: value,
        end_date:
          value && pass
            ? addDays(value, ptDurationDays(pass) - 1)
            : "",
      };
    });
  };

  // 제출 성공 — 완료 화면 (5초 후 키오스크 진입 화면으로 자동 복귀)
  if (mutation.isSuccess) {
    return (
      <RegisterSuccess
        title="PT 신청이 접수되었습니다"
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
    if (!form.motivation) e.motivation = "방문 목적을 선택해 주세요.";
    // 동의 — 모든 지점: 체크박스 필수. 다짐 지점은 전자서명까지 추가로 필수.
    if (!form.agreed_notice) e.agreed_notice = "유의사항을 확인해 주세요.";
    if (isDajim && !signature) e.signature = "전자서명을 입력해 주세요.";
    if (isDajimFace && !faceImage) e.faceImage = "얼굴 사진을 촬영해 주세요.";

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    const { referral, referral_detail } = resolveReferralForSubmit(
      form.referral,
      form.referral_detail,
      enums.referral,
    );
    mutation.mutate({
      payload: {
        branch_id: branchId,
        pt_pass_id: form.pt_pass_id,
        // 수강권이 무료 제공하면 백엔드가 별도 선택을 400으로 막음 — 무조건 null
        locker_pass_id: lockerProvided ? null : form.locker_pass_id || null,
        clothes_pass_id: clothesProvided ? null : form.clothes_pass_id || null,
        name: form.name.trim(),
        gender: form.gender,
        birth_date: form.birth_date,
        phone: form.phone.trim(),
        address: form.address.trim(),
        referral,
        referral_detail,
        motivation: form.motivation,
        payment_method: form.payment_method,
        final_price: Number(form.final_price),
        start_date: form.start_date,
        end_date: form.end_date,
        notes: form.notes.trim() || null,
        // 모든 지점에서 체크박스로 동의 받음 (다짐은 서명까지 추가).
        agreed_notice: form.agreed_notice,
        agreed_marketing: form.agreed_marketing,
      },
      signature: isDajim ? signature : undefined,
      faceImage: isDajimFace ? faceImage : undefined,
    });
  }

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

        <Section title="수강권 · 이용 기간" icon={BoltIcon}>
          <Select
            id="pt-pass"
            label="수강권"
            required
            placeholder="선택해 주세요"
            options={passOpts(ptPasses)}
            value={form.pt_pass_id}
            onChange={(e) => onPtPassChange(e.target.value)}
            error={errors.pt_pass_id}
          />
          {/* 락커·운동복 — 수강권이 무료 제공이면 "포함(기본)" / "선택 안 함" 두 옵션 (잠금 X),
              아니면 기존 yes/no 토글 (지점에 0원 무료 패스가 등록된 경우만 노출). */}
          {lockerProvided ? (
            <Select
              id="locker-pass"
              label="락커 (선택)"
              options={[
                { value: "PROVIDED", label: "수강권에 포함 (무료 제공)" },
                { value: "OPT_OUT", label: "선택 안 함" },
              ]}
              value={form.locker_opt_out ? "OPT_OUT" : "PROVIDED"}
              onChange={(e) =>
                set({ locker_opt_out: e.target.value === "OPT_OUT" })
              }
            />
          ) : (
            lockerPasses[0] && (
              <Select
                id="locker-pass"
                label="락커 (무료 제공)"
                options={[
                  { value: "NO", label: "신청 안 함" },
                  { value: "YES", label: "신청 (무료 제공)" },
                ]}
                value={form.locker_pass_id ? "YES" : "NO"}
                onChange={(e) =>
                  set({
                    locker_pass_id:
                      e.target.value === "YES" ? lockerPasses[0].id : "",
                  })
                }
              />
            )
          )}
          {clothesProvided ? (
            <Select
              id="clothes-pass"
              label="운동복 (선택)"
              options={[
                { value: "PROVIDED", label: "수강권에 포함 (무료 제공)" },
                { value: "OPT_OUT", label: "선택 안 함" },
              ]}
              value={form.clothes_opt_out ? "OPT_OUT" : "PROVIDED"}
              onChange={(e) =>
                set({ clothes_opt_out: e.target.value === "OPT_OUT" })
              }
            />
          ) : (
            clothesPasses[0] && (
              <Select
                id="clothes-pass"
                label="운동복 (무료 제공)"
                options={[
                  { value: "NO", label: "신청 안 함" },
                  { value: "YES", label: "신청 (무료 제공)" },
                ]}
                value={form.clothes_pass_id ? "YES" : "NO"}
                onChange={(e) =>
                  set({
                    clothes_pass_id:
                      e.target.value === "YES" ? clothesPasses[0].id : "",
                  })
                }
              />
            )
          )}
          <DateField
            id="start-date"
            label="이용 시작일"
            required
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
              {selectedPtPass
                ? `PT 회원은 헬스권 ${ptDurationDays(selectedPtPass)}일이 제공돼요. 시작일 기준 자동 설정됩니다.`
                : "수강권을 선택하면 헬스권 이용 기간이 자동 설정돼요. (회수 × 4일)"}
            </p>
          </div>
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
            hint="수강권·결제수단을 선택하면 자동 계산돼요. 할인이 있으면 직접 수정하세요."
          />
        </Section>

        <Section title="설문 · 추가 정보" icon={ChatBubbleLeftRightIcon}>
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
          <Textarea
            id="notes"
            label="비고 (선택)"
            value={form.notes}
            onChange={(e) => set({ notes: e.target.value })}
            placeholder="요청 사항이 있으면 적어 주세요."
            maxLength={500}
          />
        </Section>

        <Section title="동의" icon={CheckBadgeIcon}>
          <div className="space-y-4">
            {isDajim ? (
              /* 다짐 지점 — 종이 계약서 다이얼로그 하나로 동의·서명 동시 처리 */
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
              /* 일반 지점 — 기존 흐름: 서약문 + 유의사항 보기 + 체크박스 */
              <>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3.5">
                  <p className="text-base/7 text-gray-700">{pledge}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setNoticeOpen(true)}
                  className="rounded-md border border-gray-300 px-4 py-2 text-base font-medium text-gray-700 hover:bg-gray-50"
                >
                  {termsButtonLabel}
                </button>
                <Checkbox
                  id="agreed-notice"
                  label="위 내용에 동의합니다. (필수)"
                  checked={form.agreed_notice}
                  onChange={(e) => set({ agreed_notice: e.target.checked })}
                  error={errors.agreed_notice}
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
              !form.agreed_notice ||
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
          kind="pt"
          branchName={branchShort}
          terms={terms}
          memberName={form.name.trim()}
          memberInfo={contractMemberInfo}
          productInfo={contractProductInfo}
          onConfirm={(blob) => {
            setSignature(blob);
            set({ agreed_notice: true });
            setSignatureOpen(false);
            setErrors((prev) => {
              if (!prev.signature && !prev.agreed_notice) return prev;
              const next = { ...prev };
              delete next.signature;
              delete next.agreed_notice;
              return next;
            });
          }}
          onClose={() => setSignatureOpen(false)}
        />
      )}
      {/* 일반 지점 — 기존 유의사항 보기 모달 */}
      {!isDajim && noticeOpen && (
        <TermsDialog content={terms} onClose={() => setNoticeOpen(false)} />
      )}
      {/* 같은 이름+전화로 이미 PT 신청 이력이 있으면 재등록 페이지로 안내 */}
      <ConfirmDialog
        open={duplicateOpen}
        title="이미 신청한 이력이 있습니다"
        message="입력하신 이름·전화번호로 등록된 PT 신청 정보가 있어요. 재등록 페이지로 이동하시겠습니까?"
        confirmLabel="재등록 페이지로 이동"
        onConfirm={goRenewal}
        onCancel={dismissDuplicate}
      />
    </main>
  );
}

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
