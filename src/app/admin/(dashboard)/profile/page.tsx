"use client";

import { ProfileBody } from "./ProfileBody";

// 어드민 프로필 라우트 — /admin/profile.
// PC 에선 사이드바 프로필, 모바일에선 헤더 사람 아이콘 → 라우트 이동.
export default function AdminProfilePage() {
  return <ProfileBody />;
}
