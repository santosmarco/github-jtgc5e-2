import { motion } from "framer-motion";
import { type icons, TrendingUpIcon } from "lucide-react";

import { createLucideIcon } from "~/components/icons";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import type { Tables } from "~/lib/supabase/database.types";

export type ProfileDevelopmentThemeProps = {
  developmentTheme: Tables<"profile_development_themes">;
};

export function ProfileDevelopmentTheme({
  developmentTheme,
}: ProfileDevelopmentThemeProps) {
  const {
    id,
    icon,
    title,
    description,
    key_points: keyPoints,
    is_enabled: isEnabled,
  } = developmentTheme;

  // Dynamically get the icon component using the createLucideIcon function
  const IconComponent =
    createLucideIcon(icon as keyof typeof icons) ?? TrendingUpIcon;

  // Animation variants for staggered animations
  const listVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        type: "spring",
        stiffness: 260,
        damping: 20,
      },
    },
  };

  const iconVariants = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 15,
      },
    },
  };

  return (
    <Card
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isEnabled ? 1 : 0.5, y: 0 }}
      transition={{
        duration: 0.4,
        type: "spring",
        stiffness: 100,
        damping: 20,
      }}
      className={!isEnabled ? "opacity-50" : ""}
    >
      <CardHeader className="flex flex-row items-start gap-4 space-y-0">
        <motion.div
          className={`rounded-full ${
            isEnabled ? "bg-primary/10" : "bg-muted/30"
          } p-2.5`}
          variants={iconVariants}
          initial="hidden"
          animate="visible"
        >
          <IconComponent
            className={`h-5 w-5 ${
              isEnabled ? "text-primary" : "text-muted-foreground"
            }`}
          />
        </motion.div>
        <div>
          <CardTitle className="text-base font-medium leading-tight">
            {title}
          </CardTitle>
          <CardDescription className="mt-1 text-sm">
            {description}
          </CardDescription>
        </div>
      </CardHeader>
      {keyPoints && keyPoints.length > 0 && (
        <CardContent>
          <motion.ul
            className="space-y-3"
            variants={listVariants}
            initial="hidden"
            animate="visible"
          >
            {keyPoints.map((point, index) => (
              <motion.li
                key={`${id}-${point.substring(0, 20).trim().replace(/\s+/g, "-")}`}
                className="flex items-start gap-3 text-sm"
                variants={itemVariants}
                custom={index}
              >
                <motion.div
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    isEnabled ? "bg-primary/70" : "bg-muted-foreground"
                  }`}
                  transition={{ duration: 0.2 }}
                />
                <span
                  className={`text-sm leading-relaxed ${
                    isEnabled
                      ? "text-foreground/90 hover:text-foreground"
                      : "text-muted-foreground"
                  } transition-colors duration-200`}
                >
                  {point}
                </span>
              </motion.li>
            ))}
          </motion.ul>
        </CardContent>
      )}
    </Card>
  );
}
