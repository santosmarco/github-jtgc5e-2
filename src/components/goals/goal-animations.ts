import type { Variants } from "framer-motion";

export const ANIMATION_STAGGER_DELAY = 0.05;
export const LOADING_ANIMATION_DURATION = 0.5;

export const staggerAnimation = {
  animate: {
    transition: {
      staggerChildren: ANIMATION_STAGGER_DELAY,
    },
  },
} as const;

export const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1,
    },
  },
} as const satisfies Variants;

export const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
} as const satisfies Variants;

export const cardVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 70,
      damping: 18,
      mass: 1,
      staggerChildren: 0.08,
    },
  },
} as const satisfies Variants;
