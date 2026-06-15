"use client";

import { AcademicCapIcon } from "@heroicons/react/24/outline";
import { ComingSoon } from "../ComingSoon";

export default function StaffClassesPage() {
  return (
    <ComingSoon
      title="수업 개수"
      description="FC 별 진행한 PT 수업 수를 집계해요. PT 진행 기록이 연결되면 여기서 월별·지점별 카운트를 볼 수 있어요."
      icon={AcademicCapIcon}
    />
  );
}
