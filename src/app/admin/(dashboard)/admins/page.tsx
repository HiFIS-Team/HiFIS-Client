"use client";

import { MobileSubPage } from "../MobileSubPage";
import { AdminsContent } from "./AdminsContent";

// 라우트 직접 진입(/admin/admins) 케이스 — MobileSubPage 가 모바일 풀스크린 wrapper.
// 프로필 인라인 패널은 profile/page.tsx 에서 AdminsContent 만 직접 사용.
export default function AdminAdminsPage() {
  return (
    <MobileSubPage title="관리자 관리">
      <AdminsContent />
    </MobileSubPage>
  );
}
