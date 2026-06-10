"use client";

import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react";
import {
  BuildingOffice2Icon,
  ChevronUpDownIcon,
} from "@heroicons/react/16/solid";
import { CheckIcon } from "@heroicons/react/16/solid";
import type { Branch } from "@/lib/api/types";

// "피트니스스타 화순점" → "화순점" — 신청서 폼과 동일 prefix strip.
// 글로벌 헤더의 좁은 공간에서 이름이 잘리지 않게. 헤더 라벨·토스트 등에서도 동일하게 씀.
export function branchShortName(name: string): string {
  return name.replace(/^피트니스스타\s*/, "");
}

// 글로벌 지점 셀렉터 — 컴팩트 칩 형태.
// 일반 Select(라벨 + 큰 input) 와 달리 라벨 없이 한 줄 칩.
// 좁은 공간에서 메뉴/액션 영역을 덜 침범하도록 디자인.
export function BranchPicker({
  value,
  onChange,
  branches,
}: {
  value: string | undefined;
  onChange: (id: string) => void;
  branches: Branch[];
}) {
  if (branches.length === 0) return null;
  const selected = branches.find((b) => b.id === value);
  return (
    <Listbox value={value ?? ""} onChange={onChange}>
      <div className="relative">
        <ListboxButton className="flex w-full items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary data-[open]:bg-gray-100">
          <BuildingOffice2Icon className="size-4 shrink-0 text-gray-400" />
          <span className="min-w-0 flex-1 truncate text-left">
            {selected ? branchShortName(selected.name) : "지점"}
          </span>
          <ChevronUpDownIcon className="size-4 shrink-0 text-gray-400" />
        </ListboxButton>
        <ListboxOptions
          anchor={false}
          modal={false}
          transition
          className="absolute top-full left-0 z-[60] mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 shadow-lg ring-1 ring-black/10 focus:outline-none data-[closed]:opacity-0 data-[leave]:transition data-[leave]:duration-100 data-[leave]:ease-in"
        >
          {branches.map((b) => (
            <ListboxOption
              key={b.id}
              value={b.id}
              className="group relative flex cursor-default items-center gap-2 py-2 pr-9 pl-3 text-sm text-gray-900 select-none data-[focus]:bg-primary data-[focus]:text-white"
            >
              <span className="min-w-0 flex-1 truncate group-data-[selected]:font-semibold">
                {branchShortName(b.name)}
              </span>
              <CheckIcon
                aria-hidden="true"
                className="invisible absolute top-1/2 right-3 size-4 -translate-y-1/2 text-primary group-data-[selected]:visible group-data-[focus]:text-white"
              />
            </ListboxOption>
          ))}
        </ListboxOptions>
      </div>
    </Listbox>
  );
}
