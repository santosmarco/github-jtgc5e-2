import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import * as React from "react";

import { Button } from "~/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { cn } from "~/lib/utils";

interface CollapsibleSectionProps {
  title: string;
  icon: React.ElementType;
  args?: Record<string, unknown>;
  count?: number;
  children: React.ReactNode;
  className?: string;
  defaultOpen?: boolean;
}

export function CollapsibleSection({
  title,
  icon: Icon,
  args,
  count,
  children,
  className,
  defaultOpen = false,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = React.useState(() => defaultOpen);
  const [initialWidth, setInitialWidth] = React.useState<number>();
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (ref.current && !initialWidth) {
      setInitialWidth(ref.current.getBoundingClientRect().width);
    }
  }, [initialWidth]);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn(
        "-mx-1 w-[calc(100%+8px)] overflow-hidden rounded-md border border-border/70 bg-background/50 data-[state=open]:border-border/50",
        className,
      )}
      ref={ref}
      style={initialWidth ? { maxWidth: initialWidth } : undefined}
    >
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="flex w-full items-center justify-between gap-3 text-left hover:rounded-b-none hover:bg-accent/50"
        >
          <div className="flex items-center gap-x-2">
            <Icon className="h-4 w-4 text-primary" />
            <span className="font-medium leading-none">
              {title}
              {count !== undefined && (
                <span className="ml-1.5 text-xs leading-none text-muted-foreground">
                  ({count})
                </span>
              )}
            </span>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180",
            )}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="space-y-4 p-2"
        >
          {args && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <div className="text-xs font-medium text-muted-foreground">
                Arguments:
              </div>
              <pre className="max-h-[200px] overflow-auto rounded-md bg-accent/50 p-2 text-xs">
                <code>{JSON.stringify(args, null, 2)}</code>
              </pre>
            </motion.div>
          )}
          {children}
        </motion.div>
      </CollapsibleContent>
    </Collapsible>
  );
}
