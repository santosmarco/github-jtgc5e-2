"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";
import { FeedbackDialog } from "./feedback-dialog";

const BUTTON_SIZE = 56;
const BUTTON_PADDING = 20;

export function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isPositioned, setIsPositioned] = useState(false);
  const [dragConstraints, setDragConstraints] = useState({
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  });

  // Always start at lower right corner
  const [position, setPosition] = useState(() => {
    if (typeof window === "undefined") return { x: 0, y: 0 };

    const maxX = window.innerWidth - BUTTON_SIZE - BUTTON_PADDING;
    const maxY = window.innerHeight - BUTTON_SIZE - BUTTON_PADDING;

    // Always use the bottom right position
    return { x: maxX, y: maxY };
  });

  // Motion values for smooth animations
  const x = useMotionValue(position.x);
  const y = useMotionValue(position.y);

  // Spring animations for smooth movement
  const springConfig = { damping: 20, stiffness: 300 };
  const scaleSpring = useSpring(1, springConfig);
  const xSpring = useSpring(x, springConfig);
  const ySpring = useSpring(y, springConfig);

  // Scale based on dragging state
  const scale = useTransform(scaleSpring, [0, 1], [0.8, 1]);

  // Initialize position after mount
  useEffect(() => {
    if (!isPositioned && typeof window !== "undefined") {
      const maxX = window.innerWidth - BUTTON_SIZE - BUTTON_PADDING;
      const maxY = window.innerHeight - BUTTON_SIZE - BUTTON_PADDING;

      // Always set to bottom right
      setPosition({
        x: maxX,
        y: maxY,
      });

      x.set(maxX);
      y.set(maxY);
      setIsPositioned(true);
    }
  }, [isPositioned, x, y]);

  // Update drag constraints and position on window resize
  useEffect(() => {
    const updateConstraints = () => {
      const maxX = window.innerWidth - BUTTON_SIZE - BUTTON_PADDING;
      const maxY = window.innerHeight - BUTTON_SIZE - BUTTON_PADDING;

      setDragConstraints({
        top: BUTTON_PADDING,
        left: BUTTON_PADDING,
        right: maxX,
        bottom: maxY,
      });

      // Ensure current position is within bounds
      const newX = Math.min(Math.max(BUTTON_PADDING, position.x), maxX);
      const newY = Math.min(Math.max(BUTTON_PADDING, position.y), maxY);

      if (newX !== position.x || newY !== position.y) {
        setPosition({ x: newX, y: newY });
        x.set(newX);
        y.set(newY);
      }
    };

    // Initial setup
    updateConstraints();

    // Update on resize
    window.addEventListener("resize", updateConstraints);
    return () => window.removeEventListener("resize", updateConstraints);
  }, [position.x, position.y, x, y]);

  // Save position to localStorage when it changes
  useEffect(() => {
    if (isPositioned) {
      localStorage.setItem("feedbackButtonPosition", JSON.stringify(position));
    }
  }, [position, isPositioned]);

  const handleDragStart = () => {
    setIsDragging(true);
    scaleSpring.set(0.8);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    scaleSpring.set(1);

    // Ensure final position is within bounds
    const maxX = window.innerWidth - BUTTON_SIZE - BUTTON_PADDING;
    const maxY = window.innerHeight - BUTTON_SIZE - BUTTON_PADDING;

    const newX = Math.min(Math.max(BUTTON_PADDING, xSpring.get()), maxX);
    const newY = Math.min(Math.max(BUTTON_PADDING, ySpring.get()), maxY);

    const newPosition = { x: newX, y: newY };
    setPosition(newPosition);
    x.set(newX);
    y.set(newY);

    // If the drag was very short, treat it as a click
    const dragDistance =
      Math.abs(newX - position.x) + Math.abs(newY - position.y);
    if (dragDistance < 5) {
      setIsOpen(true);
    }
  };

  if (!isPositioned) {
    return null;
  }

  return (
    <>
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0.1}
        dragConstraints={dragConstraints}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          x: xSpring,
          y: ySpring,
          scale,
        }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: isDragging ? 0.8 : 1.1 }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className="z-50 flex cursor-grab touch-none select-none items-center justify-center"
      >
        <motion.button
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-shadow hover:shadow-xl hover:shadow-primary/35"
          whileTap={{ scale: 0.95 }}
          onClick={() => !isDragging && setIsOpen(true)}
        >
          <MessageSquare className="h-6 w-6" />
        </motion.button>
      </motion.div>

      <FeedbackDialog open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}
