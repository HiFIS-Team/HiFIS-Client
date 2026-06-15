"use client";

import { RocketLaunchIcon } from "@heroicons/react/24/outline";
import { ComingSoon } from "../ComingSoon";

export default function StaffProjectsPage() {
  return (
    <ComingSoon
      title="프로젝트"
      description="FC 가 맡고 있는 센터 프로젝트(이벤트·캠페인 등)와 진행 상황을 관리해요. 프로젝트 모델이 정해지면 여기서 등록·진척 확인이 가능해요."
      icon={RocketLaunchIcon}
    />
  );
}
