"use client";

import { Placeholder } from "@tiptap/extension-placeholder";
import {
  type Editor as TiptapEditor,
  EditorContent,
  useEditor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type * as React from "react";
import type { Except } from "type-fest";

import { useOnboardingTasks } from "~/hooks/use-onboarding-tasks";
import { coachingFrameworkSuggestion } from "~/lib/editor/extensions/coaching-framework-suggestion";
import { Mentions } from "~/lib/editor/extensions/mentions";
import { SlashCommands } from "~/lib/editor/extensions/slash-commands";
import { suggestion as slashCommandSuggestion } from "~/lib/editor/extensions/suggestion";
import { MentionMark } from "~/lib/editor/marks/mention-mark";
import { SlashCommandMark } from "~/lib/editor/marks/slash-command-mark";
import type { Tables } from "~/lib/supabase/database.types";
import { cn } from "~/lib/utils";

type EditorProps = Except<
  React.ComponentProps<typeof EditorContent>,
  "editor" | "onChange"
> & {
  placeholderText: string;
  frameworks: Tables<"coaching_frameworks">[];
  onSubmit: (event?: { preventDefault?: () => void }) => void;
  onEditorReady?: (editor: TiptapEditor) => void;
};

export function Editor({
  onSubmit,
  frameworks,
  placeholderText,
  className,
  disabled,
  onEditorReady,
  ...props
}: EditorProps) {
  const { completeTask } = useOnboardingTasks();

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: placeholderText,
      }),
      SlashCommandMark,
      MentionMark,
      SlashCommands.configure({
        suggestion: slashCommandSuggestion,
      }),
      Mentions.configure({
        suggestion: coachingFrameworkSuggestion(frameworks),
      }),
    ],
    content: "",
    editable: !disabled,
    onBeforeCreate: ({ editor }) => {
      onEditorReady?.(editor);
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm min-h-[74px] min-w-full grow resize-none rounded-xl border border-input bg-background p-3 pl-4 pr-24 ring-offset-background transition-[border] focus:outline-none focus-visible:border-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 [&_p.is-editor-empty:first-child]:before:pointer-events-none [&_p.is-editor-empty:first-child]:before:float-left [&_p.is-editor-empty:first-child]:before:h-0 [&_p.is-editor-empty:first-child]:before:text-gray-400 [&_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]",
          className,
        ),
      },
      handleKeyDown(view, event) {
        // Only handle Enter without shift and when not in slash command mode
        if (
          event.key === "Enter" &&
          !event.shiftKey &&
          !/(?:\/|@)[a-zA-Z0-9]*$/.test(view.state.doc.textContent)
        ) {
          onSubmit(event);
          // Clear editor content after submission
          view.dispatch(view.state.tr.delete(0, view.state.doc.content.size));
          return true;
        }
        return false;
      },
    },
    onUpdate({ editor }) {
      const editorText = editor.getText();
      if (editorText.includes("/moments")) {
        void completeTask("use_moments_command");
      }
    },
  });

  return (
    <EditorContent
      editor={editor}
      className="min-w-full"
      disabled={disabled}
      {...props}
    />
  );
}
