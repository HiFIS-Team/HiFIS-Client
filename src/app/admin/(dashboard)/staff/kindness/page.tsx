"use client";

import { HeartIcon } from "@heroicons/react/24/outline";
import { ComingSoon } from "../ComingSoon";

export default function StaffKindnessPage() {
  return (
    <ComingSoon
      title="회원 친절도"
      description="회원이 직접 매긴 친절도 점수를 집계해요. 회원 피드백 채널이 연결되면 여기서 통계로 확인할 수 있어요."
      icon={HeartIcon}
    />
  );
}
