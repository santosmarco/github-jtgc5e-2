"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState } from "react";

/**
 * Hook to generate and manage animated particles for UI effects
 * @param options Configuration options for the particles
 * @returns Particle-related properties and components
 */
export function useParticles({
  count,
  color = "bg-primary/40",
  size = "h-1 w-1",
  duration = { min: 1.5, max: 2.5 },
  delayBetween = 0.1,
}: {
  count: number;
  color?: string;
  size?: string;
  duration?: { min: number; max: number };
  delayBetween?: number;
}) {
  const [isActive, setIsActive] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Generates motion properties for a single particle
   */
  const generateParticleProps = (index: number) => {
    // Get container dimensions for positioning particles
    const containerWidth = containerRef.current?.offsetWidth || 300;
    const containerHeight = containerRef.current?.offsetHeight || 400;

    // Random starting position within the container
    const startX = Math.random() * containerWidth;
    const startY = Math.random() * containerHeight;

    // Random movement direction and distance
    const moveX = (Math.random() - 0.5) * containerWidth * 0.5;
    const moveY = (Math.random() - 0.5) * containerHeight * 0.5;

    // Calculate random duration within the specified range
    const particleDuration =
      duration.min + Math.random() * (duration.max - duration.min);

    return {
      initial: {
        opacity: 0,
        scale: 0,
        x: startX,
        y: startY,
      },
      animate: {
        opacity: [0, 0.8, 0],
        scale: [0, 1, 0],
        x: startX + moveX,
        y: startY + moveY,
      },
      exit: { opacity: 0, scale: 0 },
      transition: {
        duration: particleDuration,
        ease: "easeOut",
        delay: index * delayBetween,
      },
      className: `absolute z-0 ${size} rounded-full ${color}`,
    };
  };

  const renderParticle = (_: unknown, i: number) => (
    <motion.div key={`particle-${i}`} {...generateParticleProps(i)} />
  );

  /**
   * Renders the particle effect component
   */
  const ParticleEffect = () => (
    <AnimatePresence>
      {isActive && Array.from({ length: count }).map(renderParticle)}
    </AnimatePresence>
  );

  return {
    containerRef,
    isActive,
    setIsActive,
    ParticleEffect,
    generateParticleProps,
  };
}
