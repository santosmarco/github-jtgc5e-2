"use client";

import { motion } from "framer-motion";

import { cn } from "~/lib/utils";

export type ToggleSwitchProps = {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
};

export function ToggleSwitch({
  checked,
  onCheckedChange,
  disabled,
}: ToggleSwitchProps) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "text-xs font-medium transition-colors duration-200",
          checked ? "text-muted-foreground" : "text-foreground/80",
        )}
      >
        Off
      </span>
      <div
        className={cn(
          "relative h-6 w-12 cursor-pointer rounded-full p-1 transition-colors duration-300",
          checked
            ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
            : "bg-muted",
          disabled && "cursor-not-allowed opacity-50",
        )}
        onClick={() => !disabled && onCheckedChange?.(!checked)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (disabled) return;
            onCheckedChange?.(!checked);
          }
        }}
      >
        {/* Glow effect */}
        <motion.div
          className="absolute inset-0 rounded-full bg-emerald-400/20 blur-md"
          initial={false}
          animate={{
            opacity: checked ? 1 : 0,
            scale: checked ? 1.2 : 1,
          }}
          transition={{ duration: 0.3 }}
        />

        {/* Track */}
        <div className="relative z-10 h-full w-full">
          {/* Thumb */}
          <motion.div
            className="absolute top-0 h-4 w-4 rounded-full bg-white shadow-md"
            initial={false}
            animate={{
              x: checked ? "150%" : "0%",
              scale: checked ? 1.1 : 1,
              backgroundColor: checked ? "#ffffff" : "#ffffff",
            }}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 30,
            }}
          />
        </div>
      </div>
      <span
        className={cn(
          "text-xs font-medium transition-colors duration-200",
          checked ? "text-emerald-500" : "text-muted-foreground",
        )}
      >
        On
      </span>
    </div>
  );
}
