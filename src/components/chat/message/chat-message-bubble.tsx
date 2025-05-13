"use client";

import { cva, type VariantProps } from "class-variance-authority";
import React from "react";

import { cn } from "~/lib/utils";

export const chatBubbleVariants = cva(
  "group/message relative w-full break-words rounded-xl p-3.5 text-sm shadow-sm transition-all sm:max-w-[80%]",
  {
    variants: {
      isUser: {
        true: "self-end border border-primary/10 bg-primary text-primary-foreground",
        false: "self-start border border-border bg-muted text-foreground",
      },
      animation: {
        none: "",
        slide: "duration-300 animate-in fade-in-0",
        scale: "duration-300 animate-in fade-in-0 zoom-in-90",
        fade: "duration-500 animate-in fade-in-0",
      },
    },
    compoundVariants: [
      {
        isUser: true,
        animation: "slide",
        class: "slide-in-from-right",
      },
      {
        isUser: false,
        animation: "slide",
        class: "slide-in-from-left",
      },
      {
        isUser: true,
        animation: "scale",
        class: "origin-bottom-right",
      },
      {
        isUser: false,
        animation: "scale",
        class: "origin-bottom-left",
      },
      {
        isUser: false,
        class: "border-border/70 bg-muted/60",
      },
      {
        isUser: false,
        class: "border-border bg-muted",
      },
    ],
  },
);

export type ChatBubbleAnimation = NonNullable<
  VariantProps<typeof chatBubbleVariants>["animation"]
>;

export type ChatMessageBubbleProps = React.ComponentProps<"div"> &
  VariantProps<typeof chatBubbleVariants> & {
    role: "user" | "assistant" | "data" | "tool" | "system"; // Added "system"
    createdAt?: Date;
    showTimeStamp?: boolean;
    actions?: React.ReactNode;
    children: React.ReactNode;
    animation?: ChatBubbleAnimation;
    // hasToolInvocation is a variant prop
    // isUser is a variant prop
    // isSystem is a new variant prop
  };

export const ChatMessageBubble = React.forwardRef<
  React.ElementRef<"div">,
  ChatMessageBubbleProps
>(function ChatMessageBubble(
  {
    className,
    role,
    createdAt,
    showTimeStamp = false,
    actions,
    children,
    animation = "scale",
    ...props
  },
  ref,
) {
  const isUser = role === "user";
  const formattedTime = createdAt?.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      ref={ref}
      className={cn(
        "flex w-full flex-col",
        isUser ? "items-end" : "items-start",
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          chatBubbleVariants({
            isUser,
            animation,
          }),
          // Removed duplicate call and default space-y-3
        )}
      >
        {children}

        {role === "assistant" && actions && (
          <div
            className={cn(
              "absolute right-2 flex space-x-1 rounded-lg border bg-background/80 p-0.5 opacity-0 shadow-md backdrop-blur-sm transition-opacity group-hover/message:opacity-100",
              isUser ? "-bottom-3" : "-bottom-3", // Adjust positioning as needed
            )}
          >
            {actions}
          </div>
        )}
      </div>

      {showTimeStamp && createdAt && (
        <span
          className={cn(
            "mt-1.5 block px-1.5 text-xs text-muted-foreground/80", // Adjusted styling
            animation !== "none" && "duration-500 animate-in fade-in-0",
          )}
        >
          {formattedTime}
        </span>
      )}
    </div>
  );
});
