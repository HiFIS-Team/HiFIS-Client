"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Link from "@tiptap/extension-link";
import {
  BoldIcon,
  CheckCircleIcon,
  ChatBubbleLeftEllipsisIcon,
  H1Icon,
  H2Icon,
  H3Icon,
  ItalicIcon,
  LinkIcon,
  ListBulletIcon,
  NumberedListIcon,
  StrikethroughIcon,
} from "@heroicons/react/24/outline";
import type { Editor } from "@tiptap/react";
import type { ComponentType, SVGProps } from "react";

// 노션 톤 회의록 에디터 — tiptap + starter-kit + task/placeholder/link.
// BubbleMenu : 텍스트 선택 시 뜨는 인라인 툴바. 블록 변환(H1~3, 리스트, 인용) 도 여기서.
// 슬래시 커맨드는 다음 스텝.

export function MeetingEditor() {
  const editor = useEditor({
    // Next.js hydration 안전 — SSR 시 즉시 렌더하지 않고 mount 후에.
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder:
          "여기에 텍스트를 입력하거나 텍스트를 선택해 서식을 지정하세요",
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
    ],
    content: "",
  });

  if (!editor) return null;

  return (
    <>
      <BubbleMenu
        editor={editor}
        className="flex items-center gap-0.5 rounded-md border border-line bg-card p-1 shadow-xl"
      >
        <ToolButton
          icon={H1Icon}
          active={editor.isActive("heading", { level: 1 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          label="제목 1"
        />
        <ToolButton
          icon={H2Icon}
          active={editor.isActive("heading", { level: 2 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          label="제목 2"
        />
        <ToolButton
          icon={H3Icon}
          active={editor.isActive("heading", { level: 3 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          label="제목 3"
        />
        <Divider />
        <ToolButton
          icon={BoldIcon}
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          label="굵게"
        />
        <ToolButton
          icon={ItalicIcon}
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          label="기울임"
        />
        <ToolButton
          icon={StrikethroughIcon}
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          label="취소선"
        />
        <ToolButton
          icon={LinkIcon}
          active={editor.isActive("link")}
          onClick={() => toggleLink(editor)}
          label="링크"
        />
        <Divider />
        <ToolButton
          icon={ListBulletIcon}
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          label="글머리 기호"
        />
        <ToolButton
          icon={NumberedListIcon}
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          label="번호 매기기"
        />
        <ToolButton
          icon={CheckCircleIcon}
          active={editor.isActive("taskList")}
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          label="할 일"
        />
        <ToolButton
          icon={ChatBubbleLeftEllipsisIcon}
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          label="인용"
        />
      </BubbleMenu>

      <EditorContent editor={editor} />
    </>
  );
}

function ToolButton({
  icon: Icon,
  active,
  onClick,
  label,
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`rounded p-1.5 transition-colors ${
        active
          ? "bg-primary/20 text-primary"
          : "text-muted hover:bg-card-hover hover:text-fg"
      }`}
    >
      <Icon className="size-4" />
    </button>
  );
}

function Divider() {
  return <span className="mx-0.5 h-5 w-px bg-line" aria-hidden />;
}

// 링크 토글 — 선택 텍스트에 링크 걸거나 해제. 이미 링크면 unset.
function toggleLink(editor: Editor) {
  if (editor.isActive("link")) {
    editor.chain().focus().unsetLink().run();
    return;
  }
  const url = window.prompt("URL 을 입력하세요");
  if (!url) return;
  editor
    .chain()
    .focus()
    .extendMarkRange("link")
    .setLink({ href: url })
    .run();
}
