"use client";

import { MobileSubPage } from "../MobileSubPage";
import { ProfileBody } from "./ProfileBody";

// 라우트 직접 진입(/admin/profile) — PC sidebar 의 프로필 카드 클릭 케이스.
// 모바일에서 헤더 사람 아이콘은 layout 의 state 기반 오버레이로 직접 띄움 (parent 페이지가
// 그대로 보이도록) — 그래서 이 라우트는 모바일에서는 거의 도달하지 않음.
export default function AdminProfilePage() {
  return (
    <MobileSubPage title="내 정보">
      <ProfileBody />
    </MobileSubPage>
  );
}
