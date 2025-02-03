"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowDownRightIcon, ArrowUpRightIcon, TrashIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import type { UseValidatedFormReturn } from "~/hooks/use-validated-form";
import { cn } from "~/lib/utils";

import { FormControl, FormField } from "../ui/form";
import type { GoalFormValues } from "./goal-creation-drawer";

export type GoalSignalProps = React.ComponentProps<typeof motion.div> & {
  control?: UseValidatedFormReturn<typeof GoalFormValues>["control"];
  index?: number;
  data?: {
    direction: "positive" | "negative";
    text: string;
  };
  onDelete?: () => void;
};

const iconConfigs = {
  positive: {
    icon: motion(ArrowUpRightIcon),
    color: "text-emerald-700 dark:text-emerald-400",
  },
  negative: {
    icon: motion(ArrowDownRightIcon),
    color: "text-rose-700 dark:text-rose-400",
  },
};

export function GoalSignal({
  control,
  index,
  data,
  onDelete,
  className,
  ...props
}: GoalSignalProps) {
  const renderContent = (
    value: { direction: "positive" | "negative"; text: string },
    onChange?: (value: {
      direction: "positive" | "negative";
      text: string;
    }) => void,
  ) => {
    const iconConfig = iconConfigs[value.direction];

    const direction = (
      <div className="flex h-5 w-5 items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={value.direction}
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <iconConfig.icon
              className={cn("h-4 w-4 flex-shrink-0", iconConfig.color)}
              {...(control &&
                onChange && {
                  onClick: () =>
                    onChange(
                      value.direction === "positive"
                        ? { ...value, direction: "negative" }
                        : { ...value, direction: "positive" },
                    ),
                })}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    );

    return (
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 30,
        }}
        className={cn(
          "flex gap-2 rounded-md border border-border/80 bg-background/50 px-3 py-2 shadow-sm",
          control && "cursor-pointer",
          className,
        )}
        {...props}
      >
        {control ? <FormControl>{direction}</FormControl> : direction}

        {control && onChange ? (
          <FormControl>
            <Input
              value={value.text}
              onChange={(e) => onChange({ ...value, text: e.target.value })}
              autoFocus
              className="h-5 flex-1 rounded-none border-0 border-none border-transparent p-0 text-sm"
            />
          </FormControl>
        ) : (
          <span className="flex-1 text-sm text-foreground/80">
            {value.text}
          </span>
        )}

        {control && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="-mr-1.5 flex h-5 items-center justify-center hover:bg-transparent hover:text-destructive"
            tabIndex={-1}
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        )}
      </motion.div>
    );
  };

  if (control && typeof index === "number") {
    return (
      <FormField
        control={control}
        name={`signals.${index}`}
        render={({ field }) => renderContent(field.value, field.onChange)}
      />
    );
  }

  if (data) {
    return renderContent(data);
  }

  throw new Error("Either control and index, or data must be provided");
}
