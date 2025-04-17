import { usePathname } from "next/navigation";
import { useCallback, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

import { useChatContext as useGlobalChatContext } from "~/components/floating-chat/chat-context-provider";
import {
  extractOnlyUsefulReportData,
  formatReportToMarkdown,
} from "~/lib/reports/formatting";
import { api } from "~/trpc/react";

export function usePageChatContext() {
  const pathname = usePathname();
  const { setMessages, setCurrentContext } = useGlobalChatContext();

  // Extract report ID from path if we're on a report page
  const reportId = pathname.includes("/goals/reports/")
    ? pathname.split("/goals/reports/")[1]?.split("?")[0] || null
    : null;

  // Fetch report data when on a report page
  const { data: groupReports } = api.reports.getGroupReports.useQuery(
    { groupId: reportId ?? "" },
    { enabled: !!reportId },
  );

  const getContextForPath = useCallback((path: string) => {
    if (path === "/") {
      return "You are viewing the meetings page. I can help you analyze meeting data, extract insights, and identify important moments.";
    }

    if (path.includes("/videos/")) {
      return "You are viewing a specific meeting. I can help you analyze the discussion, identify key moments, and extract actionable insights.";
    }

    if (path.includes("/goals/reports/")) {
      return "You are viewing a performance report. I can help you understand insights, growth areas, and strengths identified in this report.";
    }

    if (path.includes("goals")) {
      return "You are in the skills section. I can help you understand your development areas, track progress on specific competencies, and suggest learning opportunities.";
    }

    return undefined;
  }, []);

  // Set report data as context when available
  useEffect(() => {
    if (reportId && groupReports?.reports?.[0]) {
      const report = groupReports.reports[0];

      const formattedReport = formatReportToMarkdown(report);

      setCurrentContext({
        report_data: {
          type: "report_data",
          report: extractOnlyUsefulReportData(report),
          reportMarkdown: formattedReport,
        },
      });
    }
  }, [reportId, groupReports, setCurrentContext]);

  useEffect(() => {
    const contextInfo = getContextForPath(pathname);

    if (!contextInfo) return;

    setMessages((prevMessages) =>
      prevMessages.length === 1
        ? prevMessages
        : [
            ...prevMessages,
            {
              id: uuidv4(),
              role: "data",
              content: JSON.stringify({
                type: "user_navigation",
                pathname,
                context: contextInfo,
              }),
            },
          ],
    );
  }, [pathname, getContextForPath, setMessages]);
}
