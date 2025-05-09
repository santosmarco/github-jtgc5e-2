import type { Transition } from "framer-motion";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import * as React from "react";

import { cn } from "~/lib/utils";

export const animationPresets = {
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slideUp: {
    hidden: {
      opacity: 0,
      y: 10,
      scale: 0.98,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24,
        when: "beforeChildren",
        staggerChildren: 0.1,
      },
    },
    exit: {
      opacity: 0,
      y: 5,
      scale: 0.98,
      transition: {
        duration: 0.2,
        ease: "easeOut",
      },
    },
  },
} as const satisfies Record<string, Variants>;

export type ContentContainerProps = React.ComponentProps<typeof motion.div> & {
  delay?: number;
  animationPreset?: keyof typeof animationPresets | Variants;
  reducedMotionPreset?: Variants;
  transitionProps?: Transition;
};

export const ContentContainer = React.forwardRef<
  React.ElementRef<typeof motion.div>,
  ContentContainerProps
>(function ContentContainer(
  {
    className,
    children,
    delay = 0,
    animationPreset = "slideUp",
    reducedMotionPreset = animationPresets.fadeIn,
    transitionProps = {},
    ...props
  },
  ref,
) {
  const shouldReduceMotion = useReducedMotion();

  const variants = React.useMemo(() => {
    if (shouldReduceMotion) {
      return reducedMotionPreset;
    }

    return typeof animationPreset === "string"
      ? animationPresets[animationPreset]
      : animationPreset;
  }, [shouldReduceMotion, animationPreset, reducedMotionPreset]);

  return (
    <motion.div
      ref={ref}
      variants={variants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{
        delay,
        ...transitionProps,
      }}
      className={cn(
        "h-full overflow-y-auto rounded-md border border-border/70 bg-background/50 px-6 py-4",
        className,
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
});
