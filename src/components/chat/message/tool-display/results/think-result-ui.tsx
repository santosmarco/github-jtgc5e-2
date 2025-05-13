"use client";

import _ from "lodash";
import { BrainIcon } from "lucide-react";

import { CollapsibleSection } from "~/components/chat/collapsible-section";
import { Markdown } from "~/components/markdown/markdown";
import type { ThinkToolOutput } from "~/lib/ai/tools";

export type ThinkResultUIProps = ThinkToolOutput & {
  args?: Record<string, unknown>;
};

export function ThinkResultUI({ thought, args }: ThinkResultUIProps) {
  return (
    <CollapsibleSection
      title="Thinking Process"
      icon={BrainIcon}
      args={args}
      defaultOpen={true} // Thinking process is often useful to see by default
    >
      <div className="prose prose-sm max-w-none space-y-3 p-2 text-foreground dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-li:my-0.5">
        <Markdown id={_.kebabCase(thought)} content={thought} />
      </div>
    </CollapsibleSection>
  );
}
