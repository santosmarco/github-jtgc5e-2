"use client";

import { motion } from "framer-motion";
import { BarChart3Icon, GoalIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { GenerateReportButton } from "~/components/goals/generate-report-button";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useProfile } from "~/hooks/use-profile";
import { api } from "~/trpc/react";

export function NavigationBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { profile } = useProfile();

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

  if (!goals?.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="sticky top-0 z-10 -mx-12 border-b bg-background/10 backdrop-blur-md"
    >
      <div className="-ml-2 flex h-12 items-center justify-between px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Tabs
            value={
              pathname.startsWith("/goals/reports")
                ? /^\/goals\/reports\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.exec(
                    pathname,
                  )
                  ? undefined
                  : "reports"
                : "goals"
            }
            className="inline-flex gap-1 rounded-lg bg-transparent"
          >
            <TabsList className="-ml-5 bg-transparent">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <TabsTrigger
                  value="goals"
                  className="group relative inline-flex items-center gap-2 rounded-md bg-transparent py-2 pl-6 pr-3 text-sm font-medium transition-all hover:text-primary data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
                  onClick={() => router.push("/goals")}
                >
                  <GoalIcon className="h-4 w-4 stroke-[2.5px] transition-transform group-hover:scale-110" />
                  Goals
                </TabsTrigger>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <TabsTrigger
                  value="reports"
                  className="group relative inline-flex items-center gap-2 rounded-md bg-transparent py-2 pl-3 pr-6 text-sm font-medium transition-all hover:text-primary data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
                  onClick={() => router.push("/goals/reports")}
                >
                  <BarChart3Icon className="h-4 w-4 stroke-[2.5px] transition-transform group-hover:scale-110" />
                  Reports
                </TabsTrigger>
              </motion.div>
            </TabsList>
          </Tabs>
        </motion.div>

        {goals && (pathname === "/goals" || pathname === "/goals/reports") && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
          >
            <GenerateReportButton goals={goals} />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
