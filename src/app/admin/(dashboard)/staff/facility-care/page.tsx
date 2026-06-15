"use client";

import { SparklesIcon } from "@heroicons/react/24/outline";
import { ComingSoon } from "../ComingSoon";

export default function StaffFacilityCarePage() {
  return (
    <ComingSoon
      title="환경 정비"
      description="센터 환경 관리에 기여한 정도를 항목별로 평가해요. 점수 모델이 정해지면 이 자리에서 입력·집계할 수 있어요."
      icon={SparklesIcon}
    />
  );
}
