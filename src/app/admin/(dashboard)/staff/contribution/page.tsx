"use client";

import { TrophyIcon } from "@heroicons/react/24/outline";
import { ComingSoon } from "../ComingSoon";

export default function StaffContributionPage() {
  return (
    <ComingSoon
      title="센터 기여도"
      description="회원 유치·재등록 등 센터 운영에 기여한 정도를 집계해요. 기여 항목과 가중치가 정해지면 여기서 점수로 확인해요."
      icon={TrophyIcon}
    />
  );
}
