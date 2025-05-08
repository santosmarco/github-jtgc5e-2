import type { Message } from "ai";
import { motion } from "framer-motion";
import { ClipboardIcon, DownloadIcon } from "lucide-react";
import { useCallback } from "react";

import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";

export interface ExportChatButtonProps {
  readonly messages: readonly Message[];
  readonly className?: string;
}

/**
 * ExportChatButton provides options to export chat messages as JSON, TXT, or copy to clipboard.
 * @param messages - Array of chat messages to export
 */
export function ExportChatButton({
  messages,
  className,
}: ExportChatButtonProps) {
  // Format messages as plain text transcript
  const formatAsText = useCallback((): string => {
    return messages
      .map((msg) => {
        const role = msg.role.charAt(0).toUpperCase() + msg.role.slice(1);
        return `${role}: ${msg.content}`;
      })
      .join("\n\n");
  }, [messages]);

  // Download helper
  const triggerDownload = useCallback(
    (data: string, filename: string, type: string) => {
      const blob = new Blob([data], { type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    [],
  );

  // Export as JSON
  const handleExportJSON = useCallback(() => {
    triggerDownload(
      JSON.stringify(messages, null, 2),
      "chat-history.json",
      "application/json",
    );
  }, [messages, triggerDownload]);

  // Export as TXT
  const handleExportTXT = useCallback(() => {
    triggerDownload(formatAsText(), "chat-history.txt", "text/plain");
  }, [formatAsText, triggerDownload]);

  // Copy to clipboard
  const handleCopyClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(formatAsText());
    } catch {
      // fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = formatAsText();
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
  }, [formatAsText]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className={className}
        >
          <Button
            variant="outline"
            size="icon"
            aria-label="Export chat"
            className="border-muted bg-muted/50 shadow-sm transition-all duration-200 hover:bg-muted/80"
          >
            <DownloadIcon className="h-5 w-5" />
          </Button>
        </motion.div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-[12rem] rounded-lg border p-1 shadow-2xl"
      >
        <DropdownMenuItem
          onClick={handleExportJSON}
          className="cursor-pointer rounded-md px-3 py-2"
        >
          <DownloadIcon className="mr-2 h-4 w-4" />
          Download as JSON
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={handleExportTXT}
          className="cursor-pointer rounded-md px-3 py-2"
        >
          <DownloadIcon className="mr-2 h-4 w-4" />
          Download as TXT
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={handleCopyClipboard}
          className="cursor-pointer rounded-md px-3 py-2"
        >
          <ClipboardIcon className="mr-2 h-4 w-4" />
          Copy to Clipboard
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
