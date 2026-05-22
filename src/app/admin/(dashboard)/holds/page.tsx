"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getAdminMembers } from "@/lib/api/members";
import { getAdminPtApplications } from "@/lib/api/ptApplications";
import { createHold } from "@/lib/api/holds";
import { getErrorMessage } from "@/lib/api/client";
import { useToast } from "@/providers/ToastProvider";
import { TextField } from "@/components/TextField";
import { Select } from "@/components/Select";
import { Textarea } from "@/components/Textarea";
import { Button } from "@/components/Button";
import { formatPhone } from "@/lib/format";

const SOURCE_TYPES = [
  { value: "MEMBER", label: "회원" },
  { value: "PT_APPLICATION", label: "PT 신청" },
];

export default function AdminHoldsPage() {
  const toast = useToast();

  const membersQuery = useQuery({
    queryKey: ["admin", "members", "all"],
    queryFn: () => getAdminMembers(),
  });
  const ptQuery = useQuery({
    queryKey: ["admin", "pt-applications", "all"],
    queryFn: () => getAdminPtApplications(),
  });

  const [sourceType, setSourceType] = useState("MEMBER");
  const [sourceId, setSourceId] = useState("");
  const [reason, setReason] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: createHold,
    onSuccess: () => {
      toast.success("홀딩이 등록되었습니다.");
      setSourceId("");
      setReason("");
      setStartDate("");
      setEndDate("");
      setErrors({});
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  // 대상 종류에 따라 회원 / PT 신청 목록을 옵션으로
  const isMember = sourceType === "MEMBER";
  const targetLoading = isMember ? membersQuery.isLoading : ptQuery.isLoading;
  const targetOptions = (
    isMember ? (membersQuery.data ?? []) : (ptQuery.data ?? [])
  ).map((x) => ({
    value: x.id,
    label: `${x.name} · ${formatPhone(x.phone)}`,
  }));

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!sourceId) errs.sourceId = "대상을 선택해 주세요.";
    if (!startDate) errs.startDate = "홀딩 시작일을 선택해 주세요.";
    if (!endDate) errs.endDate = "홀딩 종료일을 선택해 주세요.";
    else if (startDate && endDate < startDate)
      errs.endDate = "종료일은 시작일보다 빠를 수 없습니다.";
    if (!reason.trim()) errs.reason = "홀딩 사유를 입력해 주세요.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    mutation.mutate({
      source_type: sourceType,
      source_id: sourceId,
      reason: reason.trim(),
      start_date: startDate,
      end_date: endDate,
    });
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-gray-900">홀딩</h1>
      <p className="mt-1 text-sm text-gray-500">
        회원·PT 신청의 이용 기간을 일시 정지(홀딩)합니다.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
        <Select
          id="source-type"
          label="대상 종류"
          required
          options={SOURCE_TYPES}
          value={sourceType}
          onChange={(e) => {
            setSourceType(e.target.value);
            setSourceId("");
          }}
        />
        <Select
          id="source-id"
          label="대상"
          required
          placeholder={targetLoading ? "불러오는 중…" : "선택해 주세요"}
          options={targetOptions}
          value={sourceId}
          onChange={(e) => setSourceId(e.target.value)}
          error={errors.sourceId}
        />
        <TextField
          id="start-date"
          label="홀딩 시작일"
          required
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          error={errors.startDate}
        />
        <TextField
          id="end-date"
          label="홀딩 종료일"
          required
          type="date"
          min={startDate || undefined}
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          error={errors.endDate}
        />
        <Textarea
          id="reason"
          label="홀딩 사유"
          required
          maxLength={500}
          placeholder="예: 해외 출장, 부상 등"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          error={errors.reason}
        />
        <Button type="submit" className="w-full" loading={mutation.isPending}>
          홀딩 등록
        </Button>
      </form>

      <p className="mt-6 text-sm text-gray-400">
        ※ 홀딩 목록 조회·취소는 백엔드에 목록 API가 추가되면 지원됩니다.
      </p>
    </div>
  );
}
