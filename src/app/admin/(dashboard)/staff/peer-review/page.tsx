"use client";

import { ScaleIcon } from "@heroicons/react/24/outline";
import { ComingSoon } from "../ComingSoon";

export default function StaffPeerReviewPage() {
  return (
    <ComingSoon
      title="동료 평가"
      description="동료 FC 간 상호 평가 결과를 모아 보여줘요. 항목·기간 기준이 정해지면 여기서 결과를 확인할 수 있어요."
      icon={ScaleIcon}
    />
  );
}
