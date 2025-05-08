import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { api } from "~/trpc/react";

import type { SkillAssessment } from "./use-skill-data";

export function useSkillNavigation(
  reportUrl: string | null,
  latestValidAssessment: SkillAssessment | null,
  profileId: string,
  skillId: string,
  isEnabled: boolean,
  isLoading: boolean,
) {
  const router = useRouter();
  const utils = api.useUtils();

  const navigateToReport = () => {
    if (isEnabled && !isLoading && reportUrl) {
      router.push(reportUrl);
    }
  };

  // Prefetch data for better performance
  useEffect(() => {
    if (reportUrl && latestValidAssessment) {
      router.prefetch(reportUrl);

      void utils.reports.getGroupReports.prefetch({
        groupId: latestValidAssessment.id,
      });
      void utils.reports.getReportsTimelineDataForUser.prefetch({
        userId: profileId,
        skillId: skillId,
      });
    }
  }, [router, reportUrl, profileId, skillId, utils, latestValidAssessment]);

  return {
    navigateToReport,
  };
}
