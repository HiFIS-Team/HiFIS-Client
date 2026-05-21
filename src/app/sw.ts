import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

// 서비스워커 진입점 — Serwist가 이 파일을 public/sw.js로 컴파일한다.
// next.config.ts 의 swSrc 가 이 경로를 가리킴.
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    // 빌드 시 프리캐시 목록이 주입되는 지점
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();
