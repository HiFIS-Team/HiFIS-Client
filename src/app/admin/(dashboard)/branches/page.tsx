"use client";

import { MobileSubPage } from "../MobileSubPage";
import { BranchesContent } from "./BranchesContent";

// 라우트 직접 진입(/admin/branches) — PC 프로필 메뉴의 지점 관리 클릭 케이스.
// 모바일에서 프로필 메뉴는 layout 인라인 패널로 띄움 (parent 페이지 유지) —
// 이 라우트는 모바일에서 거의 도달하지 않음.
export default function AdminBranchesPage() {
  return (
    <MobileSubPage title="지점 관리">
      <BranchesContent />
    </MobileSubPage>
  );
}
