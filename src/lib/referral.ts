// 유입경로 (referral) 관련 헬퍼.
// - 신청서: "기타" 옵션 선택 시 자유 텍스트 입력 노출
// - 제출 시: 자유 입력이 기존 enum 라벨과 매치되면 그 enum 으로 자동 매핑
//   (예: "블로그" 적으면 OTHER → BLOG. 통계 메인 차트엔 블로그, details 차트엔 "블로그" 양쪽 카운트)
// - 라벨: "기타" 옵션엔 보조 설명 덧붙임

import type { EnumOption } from "./api/types";
import type { StatDetailItem } from "./api/stats";

// "기타" 옵션 라벨 보강 — 신청서/수정 다이얼로그 공용.
// 백엔드 enum 응답의 "기타" 를 표시용으로 변환하는 자리.
// (이전: "기타 (소정의 상품이 제공됩니다.)" — 실제 사은품 정책 확정 전까지 잠시 끔)
export function referralOptions(options: EnumOption[]): EnumOption[] {
  return options;
}

// 자유 입력 텍스트가 기존 enum 라벨과 매치되는지.
// 1) 정확 일치 우선 ("블로그" → BLOG)
// 2) 그 다음 부분 일치 — 입력이 enum 라벨을 포함하면 그 enum
//    ("블로그를 보고 방문" → BLOG, "전단지 받음" → FLYER)
// OTHER 는 부분 일치 후보에서 제외 ("기타" 부분 매칭 의미 없음).
// 매칭 안 되면 OTHER.
export function matchReferralEnum(
  detail: string,
  options: EnumOption[],
): string {
  const lower = detail.trim().toLowerCase();
  if (!lower) return "OTHER";
  const exact = options.find(
    (o) => o.label.trim().toLowerCase() === lower,
  );
  if (exact) return exact.code;
  const partial = options.find(
    (o) =>
      o.code !== "OTHER" &&
      lower.includes(o.label.trim().toLowerCase()),
  );
  return partial ? partial.code : "OTHER";
}

// "기타 세부 입력" 통계 정규화.
// 자유 입력 텍스트(예: "블로그를 보고 방문했습니다") 에 enum 라벨이 포함되면
// 그 라벨로 키를 통일하고 카운트 합산. 매칭 안 되는 텍스트는 입력 그대로 유지.
// → 같은 의미의 변형 입력들을 하나의 막대로 합쳐 차트가 깔끔해짐.
export function aggregateReferralDetails(
  items: StatDetailItem[],
  options: EnumOption[],
): StatDetailItem[] {
  const map = new Map<string, number>();
  for (const item of items) {
    const lower = item.label.trim().toLowerCase();
    let key = item.label.trim();
    const exact = options.find(
      (o) => o.code !== "OTHER" && o.label.trim().toLowerCase() === lower,
    );
    if (exact) {
      key = exact.label;
    } else {
      const partial = options.find(
        (o) =>
          o.code !== "OTHER" &&
          lower.includes(o.label.trim().toLowerCase()),
      );
      if (partial) key = partial.label;
    }
    map.set(key, (map.get(key) ?? 0) + item.count);
  }
  return Array.from(map, ([label, count]) => ({ label, count })).sort(
    (a, b) => b.count - a.count,
  );
}

// 신청서 제출/수정 시 referral·referral_detail 페어 결정.
// - 기타 아닌 enum + 빈 detail → 그대로 (detail null)
// - 기타 아닌 enum + detail 있음 → 그대로 + detail 보존
//   (어드민이 BLOG 인 기존 회원 수정 시 detail 이 null 로 덮이지 않도록)
// - 기타 + 빈 detail → OTHER + null
// - 기타 + detail 있음 → 매칭 시 그 enum (양쪽 통계 카운트), 매칭 안 되면 OTHER. detail 은 입력 그대로.
export function resolveReferralForSubmit(
  referral: string,
  detail: string,
  options: EnumOption[],
): { referral: string; referral_detail: string | null } {
  const trimmed = detail.trim();
  if (referral !== "OTHER") {
    return { referral, referral_detail: trimmed || null };
  }
  if (!trimmed) {
    return { referral: "OTHER", referral_detail: null };
  }
  return {
    referral: matchReferralEnum(trimmed, options),
    referral_detail: trimmed,
  };
}
