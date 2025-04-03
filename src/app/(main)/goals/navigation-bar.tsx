"use client";

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  AnimatePresence,
} from "framer-motion";
import { BarChart3Icon, GoalIcon, Sparkles } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import { GenerateReportButton } from "~/components/goals/generate-report-button";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useProfile } from "~/hooks/use-profile";
import { api } from "~/trpc/react";

const tabVariants = {
  inactive: {
    scale: 0.95,
    opacity: 0.7,
  },
  active: {
    scale: 1,
    opacity: 1,
  },
};

export function NavigationBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { profile } = useProfile();
  const [activeTab, setActiveTab] = useState(
    pathname.startsWith("/goals/reports") ? "reports" : "goals",
  );
  const [hovered, setHovered] = useState<string | null>(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  const bgGradient = useMotionTemplate`radial-gradient(
    300px circle at ${mouseX}px ${mouseY}px,
    var(--gradient-color) 0%,
    transparent 70%
  )`;

  useEffect(() => {
    setActiveTab(pathname.startsWith("/goals/reports") ? "reports" : "goals");
  }, [pathname]);

  const { data: user } = api.auth.getUser.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const { data: goals } = api.goals.getGoals.useQuery(
    { user_id: profile?.id ?? user?.id },
    {
      refetchOnWindowFocus: false,
      enabled: Boolean(user?.id),
    },
  );

  // if (!goals?.length) return null;

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    if (tab === "goals") {
      router.push("/goals");
    } else {
      router.push("/goals/reports");
    }
  };

  const tabValue = pathname.startsWith("/goals/reports")
    ? /^\/goals\/reports\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.exec(
        pathname,
      )
      ? "reports"
      : "reports"
    : "goals";

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="sticky top-0 z-50 -mx-12 border-b bg-background py-1"
    >
      <div
        className="relative -ml-2 flex h-12 items-center justify-between overflow-hidden px-6"
        onMouseMove={handleMouseMove}
      >
        <motion.div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            background: bgGradient.get(),
            // @ts-ignore -- CSS custom property not recognized by TypeScript's CSSProperties
            "--gradient-color":
              activeTab === "goals"
                ? "rgba(var(--primary-rgb), 0.2)"
                : "rgba(var(--secondary-rgb), 0.2)",
          }}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Tabs
            value={tabValue}
            className="inline-flex gap-1 rounded-lg bg-transparent"
          >
            <TabsList className="-ml-5 bg-transparent">
              <div>
                <TabsTrigger
                  value="goals"
                  className="group relative inline-flex h-12 items-center gap-2 rounded-md bg-transparent pl-6 pr-3 text-sm font-medium transition-all hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-sm"
                  onClick={() => handleTabClick("goals")}
                  onMouseEnter={() => setHovered("goals")}
                  onMouseLeave={() => setHovered(null)}
                >
                  <motion.span
                    variants={tabVariants}
                    animate={
                      activeTab === "goals" || hovered === "goals"
                        ? "active"
                        : "inactive"
                    }
                    className="relative flex items-center gap-2"
                  >
                    <motion.div
                      initial={{ rotate: 0 }}
                      animate={
                        hovered === "goals"
                          ? { rotate: [0, -15, 15, 0] }
                          : { rotate: 0 }
                      }
                      transition={{ duration: 0.6, ease: "easeInOut" }}
                    >
                      <GoalIcon className="h-4 w-4" />
                    </motion.div>
                    Skills
                    {activeTab === "goals" && (
                      <motion.div
                        className="absolute -bottom-2 left-0 right-0 h-0.5 rounded-full bg-primary"
                        layoutId="activeTabIndicator"
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 30,
                        }}
                      />
                    )}
                  </motion.span>
                </TabsTrigger>
              </div>
              <div>
                <TabsTrigger
                  value="reports"
                  className="group relative inline-flex items-center gap-2 rounded-md bg-transparent py-2 pl-3 pr-6 text-sm font-medium transition-all hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-sm"
                  onClick={() => handleTabClick("reports")}
                  onMouseEnter={() => setHovered("reports")}
                  onMouseLeave={() => setHovered(null)}
                >
                  <motion.span
                    variants={tabVariants}
                    animate={
                      activeTab === "reports" || hovered === "reports"
                        ? "active"
                        : "inactive"
                    }
                    className="relative flex items-center gap-2"
                  >
                    <motion.div
                      initial={{ rotate: 0 }}
                      animate={
                        hovered === "reports"
                          ? { rotate: [0, -5, 5, 0] }
                          : { rotate: 0 }
                      }
                      transition={{ duration: 0.6, ease: "easeInOut" }}
                    >
                      <BarChart3Icon className="h-4 w-4" />
                    </motion.div>
                    Assessments
                    {activeTab === "reports" && (
                      <motion.div
                        className="absolute -bottom-2 left-0 right-0 h-0.5 rounded-full bg-primary"
                        layoutId="activeTabIndicator"
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 30,
                        }}
                      />
                    )}
                  </motion.span>
                </TabsTrigger>
              </div>
            </TabsList>
          </Tabs>
        </motion.div>

        {/* {goals && (pathname === "/goals" || pathname === "/goals/reports") && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
          >
            <GenerateReportButton goals={goals} isEnabled={false} />
          </motion.div>
        )} */}
      </div>
    </motion.div>
  );
}
