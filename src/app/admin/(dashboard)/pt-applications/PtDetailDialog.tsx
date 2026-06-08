"use client";

import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { getEnums } from "@/lib/api/enums";
import { getBranches } from "@/lib/api/branches";
import {
  getClothesPasses,
  getLockerPasses,
  getPtPasses,
} from "@/lib/api/passes";
import { StatusBadge } from "@/components/StatusBadge";
import { CategoryBadge } from "@/components/CategoryBadge";
import { ContractImageThumb } from "@/components/ContractImageThumb";
import { formatDate, formatPhone, formatWon } from "@/lib/format";
import type { EnumOption, Pass, PTApplication } from "@/lib/api/types";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";

function enumLabel(arr: EnumOption[] | undefined, code: string): string {
  return arr?.find((o) => o.code === code)?.label ?? code;
}
function passName(arr: Pass[] | undefined, id: string | null): string {
  if (!id) return "선택 안 함";
  return arr?.find((p) => p.id === id)?.name ?? "-";
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-4 py-2.5 text-sm">
      <dt className="w-24 shrink-0 text-gray-500">{label}</dt>
      <dd className="flex-1 text-gray-900">{children}</dd>
    </div>
  );
}

// PT 신청 상세 정보 모달 (읽기 전용).
export function PtDetailDialog({
  app,
  onClose,
}: {
  app: PTApplication;
  onClose: () => void;
}) {
  useEscapeKey(onClose);
  const enumsQuery = useQuery({ queryKey: ["enums"], queryFn: getEnums });
  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: getBranches,
  });
  const ptPassQuery = useQuery({
    queryKey: ["pt-passes", app.branch_id],
    queryFn: () => getPtPasses(app.branch_id),
  });
  const lockerPassQuery = useQuery({
    queryKey: ["locker-passes", app.branch_id],
    queryFn: () => getLockerPasses(app.branch_id),
  });
  const clothesPassQuery = useQuery({
    queryKey: ["clothes-passes", app.branch_id],
    queryFn: () => getClothesPasses(app.branch_id),
  });

  const isLoading =
    enumsQuery.isLoading ||
    ptPassQuery.isLoading ||
    lockerPassQuery.isLoading ||
    clothesPassQuery.isLoading;
  const enums = enumsQuery.data;
  const branchName =
    branchesQuery.data?.find((b) => b.id === app.branch_id)?.name ?? "-";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6 py-10"
      onClick={onClose}
    >
      <div
        className="animate-dialog-in flex max-h-full w-full max-w-lg flex-col rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="border-b border-gray-200 px-6 py-4 text-lg font-bold text-gray-900">
          PT 상세
        </h2>

        {isLoading ? (
          <p className="px-6 py-16 text-center text-sm text-gray-500">
            불러오는 중…
          </p>
        ) : (
          <dl className="divide-y divide-gray-100 overflow-y-auto px-6 py-3">
            <Row label="지점">{branchName}</Row>
            <Row label="이름">{app.name}</Row>
            <Row label="성별">{enumLabel(enums?.gender, app.gender)}</Row>
            <Row label="생년월일">{formatDate(app.birth_date)}</Row>
            <Row label="전화번호">{formatPhone(app.phone)}</Row>
            <Row label="주소">{app.address}</Row>
            <Row label="수강권">
              {passName(ptPassQuery.data, app.pt_pass_id)}
            </Row>
            <Row label="락커">
              {passName(lockerPassQuery.data, app.locker_pass_id)}
            </Row>
            <Row label="운동복">
              {passName(clothesPassQuery.data, app.clothes_pass_id)}
            </Row>
            <Row label="이용 기간">
              {formatDate(app.start_date)} ~ {formatDate(app.end_date)}
            </Row>
            <Row label="결제 방법">
              {enumLabel(enums?.payment_method, app.payment_method)}
            </Row>
            <Row label="결제 금액">{formatWon(app.final_price)}</Row>
            <Row label="누적 결제">
              {app.total_paid != null ? formatWon(app.total_paid) : "-"}
            </Row>
            <Row label="유입 경로">
              {enumLabel(enums?.referral, app.referral)}
              {app.referral_detail && (
                <span className="ml-1 text-gray-500">
                  (직접 입력: {app.referral_detail})
                </span>
              )}
            </Row>
            <Row label="방문 목적">
              {enumLabel(enums?.motivation, app.motivation)}
            </Row>
            <Row label="비고">{app.notes || "-"}</Row>
            <Row label="마케팅 동의">
              {app.agreed_marketing ? "동의" : "미동의"}
            </Row>
            <Row label="상태">
              <StatusBadge status={app.status} />
            </Row>
            <Row label="구분">
              <CategoryBadge category={app.category} />
            </Row>
            <Row label="신청일">{formatDate(app.created_at)}</Row>
            <Row label="신청서">
              <ContractImageThumb url={app.signature_url} />
            </Row>
          </dl>
        )}

        <div className="flex justify-end border-t border-gray-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
