"use client";

import { CheckIcon, CopyIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import { useCopyToClipboard } from "~/hooks/use-copy-to-clipboard";
import { cn } from "~/lib/utils";

type CopyButtonProps = {
  content: string;
  copyMessage?: string;
  size?: "sm" | "md";
};

export function CopyButton({
  content,
  copyMessage,
  size = "md",
}: CopyButtonProps) {
  const { isCopied, handleCopy } = useCopyToClipboard({
    text: content,
    copyMessage,
  });

  const buttonSize = size === "sm" ? "h-5 w-5" : "h-6 w-6";
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("relative p-0", buttonSize)}
      aria-label="Copy to clipboard"
      onClick={handleCopy}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <CheckIcon
          className={cn(
            iconSize,
            "text-emerald-500 transition-transform ease-in-out",
            isCopied ? "scale-100" : "scale-0",
          )}
        />
      </div>
      <CopyIcon
        className={cn(
          iconSize,
          "transition-transform ease-in-out",
          isCopied ? "scale-0" : "scale-100",
        )}
      />
    </Button>
  );
}
