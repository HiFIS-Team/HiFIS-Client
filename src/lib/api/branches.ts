import { apiFetch } from "./client";
import type { Branch } from "./types";

// GET /branches — 지점 목록 (공개)
export function getBranches(): Promise<Branch[]> {
  return apiFetch<Branch[]>("/branches");
}
