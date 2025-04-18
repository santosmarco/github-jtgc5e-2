import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  Maximize2,
  MessageCircle,
  Minimize2,
  RefreshCw,
  X,
} from "lucide-react";
import Image from "next/image";
import type React from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "~/lib/utils";

interface FloatingChatContainerProps {
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
  chatInputComponent?: React.ReactNode;
  isMinimized: boolean;
  onMinimizeToggle: () => void;
  onReset: () => void;
  isFullscreen?: boolean;
  onFullscreenToggle?: () => void;
}

export function FloatingChatContainer({
  children,
  isOpen,
  onToggle,
  className,
  chatInputComponent,
  isMinimized,
  onMinimizeToggle,
  onReset,
  isFullscreen = false,
  onFullscreenToggle,
}: FloatingChatContainerProps) {
  // Only create portal on client side
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const content = (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
          type: "spring",
          stiffness: 400,
          damping: 30,
          opacity: { duration: 0.2 },
        },
      }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className={cn(
        "fixed z-50 mx-auto flex flex-col overflow-hidden rounded-lg bg-background shadow-2xl transition-all duration-300 ease-in-out",
        isFullscreen
          ? "inset-0 rounded-none"
          : "inset-x-4 bottom-4 max-w-3xl border lg:left-72 lg:right-0",
        className,
      )}
      style={{
        boxShadow: isFullscreen
          ? "none"
          : "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
      }}
    >
      {/* Header */}
      <button
        className={cn(
          "flex h-12 w-full items-center justify-between border-b bg-muted/50 px-3",
          "transition-colors duration-200",
          "cursor-pointer hover:bg-muted/80",
        )}
        onClick={() => {
          if (!isOpen) {
            onToggle();
          } else {
            onMinimizeToggle();
          }
        }}
        type="button"
      >
        <div className="ml-1.5 flex items-center justify-start gap-2">
          <div className="relative h-6 w-6 overflow-hidden rounded-full">
            <Image
              src="/images/icons/titan-coach.png"
              alt="Titan Coach"
              width={24}
              height={24}
              className="object-cover"
            />
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={`open-minimized-${!isOpen || isMinimized}`}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              transition={{ duration: 0.2 }}
              className="whitespace-nowrap text-left text-sm font-medium"
            >
              {!isOpen || isMinimized ? "Ask Coach" : "Coach"}
            </motion.span>
          </AnimatePresence>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onReset();
            }}
            className="rounded p-1.5 transition-colors hover:bg-muted"
            aria-label="Reset chat"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          {onFullscreenToggle && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onFullscreenToggle();
              }}
              className="rounded p-1.5 transition-colors hover:bg-muted"
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="rounded p-1.5 transition-colors hover:bg-muted"
            aria-label="Close chat"
          >
            {isOpen ? (
              isMinimized ? (
                <X className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </button>
        </div>
      </button>

      {/* Content */}
      <div className="flex flex-col">
        {/* Messages area - only hidden when minimized */}
        <AnimatePresence>
          {!isMinimized && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{
                opacity: 1,
                height: isFullscreen ? "calc(100vh - 10rem)" : "500px",
                transition: {
                  height: {
                    type: "spring",
                    stiffness: 300,
                    damping: 25,
                  },
                  opacity: { duration: 0.3 },
                },
              }}
              exit={{
                opacity: 0,
                height: 0,
                transition: {
                  height: { duration: 0.2 },
                  opacity: { duration: 0.1 },
                },
              }}
              className="overflow-auto"
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat input - only visible when open */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{
                opacity: 1,
                height: "auto",
                transition: {
                  height: {
                    type: "spring",
                    stiffness: 300,
                    damping: 25,
                  },
                  opacity: { duration: 0.3 },
                },
              }}
              exit={{
                opacity: 0,
                height: 0,
                transition: {
                  height: { duration: 0.2 },
                  opacity: { duration: 0.1 },
                },
              }}
            >
              {chatInputComponent}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );

  return createPortal(content, document.body);
}
