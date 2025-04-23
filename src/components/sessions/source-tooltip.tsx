import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, Info } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

import { SourceItemFactory } from "./sources/SourceItemFactory";

interface SourceTooltipProps {
  sourceId: string;
  sourceType: string;
  children?: React.ReactNode;
  message?: string;
  forceOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onViewDetails?: () => void;
}

// Tooltip animation variants
const tooltipVariants = {
  hidden: { opacity: 0, y: 8, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 440,
      damping: 26,
      mass: 0.8,
    },
  },
  exit: {
    opacity: 0,
    y: 6,
    scale: 0.97,
    transition: {
      duration: 0.2,
      ease: [0.4, 0.0, 0.2, 1],
    },
  },
};

// Badge animation variants
const badgeVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 20,
    },
  },
};

export function SourceTooltip({
  sourceId,
  sourceType,
  children,
  message,
  forceOpen,
  onOpenChange,
  onViewDetails,
}: SourceTooltipProps) {
  const { data, isLoading, error } =
    api.sessionAnnotations.getSourceDetails.useQuery({
      sourceId,
      sourceType,
    });
  const [isOpen, setIsOpen] = useState(false);

  // Handle forceOpen prop
  useEffect(() => {
    if (forceOpen !== undefined) {
      setIsOpen(forceOpen);
    }
  }, [forceOpen]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    onOpenChange?.(open);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleOpenChange(!isOpen);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip open={isOpen} onOpenChange={handleOpenChange}>
        <TooltipTrigger asChild onClick={handleClick}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "ml-1.5 h-5 w-auto items-center leading-none",
              "bg-primary/10 shadow-sm",
              "text-primary/75 ring-1 ring-primary/15 backdrop-blur-sm",
              "transition-all duration-200 ease-out",
              "hover:bg-primary/15 hover:text-primary hover:ring-primary/25",
              // isOpen && "bg-primary/80 text-foreground ring-primary",
            )}
            aria-label="View source details"
          >
            {data ? (
              <SourceItemFactory data={data} compact={true} />
            ) : (
              <Info className="h-3 w-3" />
            )}
          </Button>
        </TooltipTrigger>
        <AnimatePresence>
          {isOpen && (
            <TooltipContent
              side="top"
              align="start"
              sideOffset={8}
              className="max-w-[320px] border-none bg-background p-0 shadow-md shadow-black/5 ring-1 ring-primary/10 backdrop-blur-sm dark:shadow-black/10"
              asChild
            >
              <motion.div
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={tooltipVariants}
              >
                <div className="relative overflow-hidden rounded-xl">
                  {/* Decorative accent line at top */}
                  <div className="absolute left-0 right-0 top-0 h-[1px] bg-primary/20" />

                  {/* Content area */}
                  <div className="p-3">
                    {data && <SourceItemFactory data={data} />}
                    {error && (
                      <motion.div
                        className="rounded-lg bg-destructive/5 p-2 text-xs text-destructive/90"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        Unable to load source details
                      </motion.div>
                    )}
                  </div>

                  {/* Footer with view details button */}
                  {onViewDetails && (
                    <motion.div
                      className="flex justify-end border-t border-primary/5 bg-muted/20 p-2"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenChange(false);
                          onViewDetails();
                        }}
                        className="h-7 gap-1 bg-background/80 px-2 text-xs transition-colors hover:bg-primary/5 hover:text-primary focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/20"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View Details
                      </Button>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </TooltipContent>
          )}
        </AnimatePresence>
      </Tooltip>
    </TooltipProvider>
  );
}
