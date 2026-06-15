"use client";

import { MobileSubPage } from "../MobileSubPage";
import { ReleaseNotesContent } from "./ReleaseNotesContent";

// 라우트 직접 진입(/admin/release-notes) 케이스 — MobileSubPage 가 모바일 풀스크린 wrapper.
// 프로필 인라인 패널은 profile/page.tsx 에서 ReleaseNotesContent 만 직접 사용.
export default function AdminReleaseNotesPage() {
  return (
    <MobileSubPage title="패치 노트">
      <ReleaseNotesContent />
    </MobileSubPage>
  );
}
