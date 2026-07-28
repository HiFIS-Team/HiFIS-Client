import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";
import pkg from "./package.json";

// PWA 서비스워커 — 키오스크 오프라인 대응.
// dev에선 비활성화(캐시 간섭 방지) → dev는 Turbopack 그대로,
// 프로덕션 빌드는 Serwist가 webpack을 요구 (package.json build 스크립트 참조)
const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  // 정적 export — 빌드 결과(out/)를 홈서버에 파일로 서빙 (Node 불필요)
  output: "export",
  // 좌하단 "N" dev 인디케이터 숨김 — 화면 하단 채팅 입력 · 하단 탭바랑 겹쳐 거슬림.
  devIndicators: false,
  // dev server에 외부 origin(클플 터널 통한 dev.hifis.app) 허용 - 폰 테스트용.
  // 미설정 시 Next.js가 Cross-Origin 보호로 외부 host 요청 차단해서 hydrate 실패.
  allowedDevOrigins: ["dev.hifis.app", "v2.hifis.app"],
  // 정적 export는 이미지 최적화 서버가 없으므로 비활성화
  images: { unoptimized: true },
  // 빌드 시 package.json 의 version 을 클라이언트 번들로 인라인.
  // 사이드바 푸터에서 process.env.NEXT_PUBLIC_APP_VERSION 으로 접근.
  // 버전 올릴 땐 `npm version <patch|minor|major>` — package.json + git tag 자동.
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
  // Serwist가 webpack 설정을 주입 → dev의 Turbopack이 충돌로 보지 않도록
  // 빈 turbopack 설정을 명시 (Next.js 16 권장 해법)
  turbopack: {},
  // dev 한정 — /api/* 호출을 same-origin으로 백엔드(localhost:8000)에 프록시.
  // 폰에서 dev.hifis.app 으로 보면 CORS·LAN IP 셋업 없이 바로 동작.
  // 프로덕션은 output:"export"라 정적 파일 + 친구 nginx 라우팅이라 rewrites 자동 무시.
  async rewrites() {
    return [
      // v1 백엔드 (HiFIS-Server, 레거시) — 아직 안 옮긴 어드민 페이지가 사용.
      {
        source: "/api/:path*",
        destination: "http://localhost:8000/:path*",
      },
      // v2 백엔드 (HiFIS-Server-V2) — 새 인증 · 문서함 · 결재 등 v2 페이지 대상.
      {
        source: "/api-v2/:path*",
        destination: "http://localhost:8001/:path*",
      },
    ];
  },
};

export default withSerwist(nextConfig);
