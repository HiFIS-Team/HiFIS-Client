import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

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
  // 정적 export는 이미지 최적화 서버가 없으므로 비활성화
  images: { unoptimized: true },
  // Serwist가 webpack 설정을 주입 → dev의 Turbopack이 충돌로 보지 않도록
  // 빈 turbopack 설정을 명시 (Next.js 16 권장 해법)
  turbopack: {},
};

export default withSerwist(nextConfig);
