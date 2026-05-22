import { apiFetch } from "./client";
import type { Enums } from "./types";

// GET /enums — 신청서용 enum 옵션 일괄 조회 (공개, 진입 시 1회)
export function getEnums(): Promise<Enums> {
  return apiFetch<Enums>("/enums");
}
