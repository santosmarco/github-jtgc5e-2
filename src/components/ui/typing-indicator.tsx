import { Dot } from "lucide-react";

import { LoadingSpinner } from "~/components/ui/loading-spinner";

export function TypingIndicator({ showText = false }: { showText?: boolean }) {
  return (
    <div className="justify-left flex space-x-1">
      <div className="rounded-lg bg-muted p-3">
        {showText ? (
          <div className="flex items-center space-x-2">
            <LoadingSpinner className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">
              Titan AI is thinking...
            </span>
          </div>
        ) : (
          <div className="flex -space-x-2.5">
            <Dot className="h-5 w-5 animate-typing-dot-bounce" />
            <Dot className="h-5 w-5 animate-typing-dot-bounce [animation-delay:90ms]" />
            <Dot className="h-5 w-5 animate-typing-dot-bounce [animation-delay:180ms]" />
          </div>
        )}
      </div>
    </div>
  );
}
