import type { Message } from "ai";
import { usePathname } from "next/navigation";
import { useCallback, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

import { useChatContext as useGlobalChatContext } from "~/components/floating-chat/chat-context-provider";
import type { PageContext } from "~/lib/ai/data";
import {
  extractOnlyUsefulReportData,
  formatReportToMarkdown,
} from "~/lib/reports/formatting";
import type { RouterOutputs } from "~/trpc/react";
import { api } from "~/trpc/react";

/**
 * Hook to manage chat context based on the current page
 * Handles setting appropriate context for different page types (home, videos, reports)
 */
export function usePageChatContext() {
  const pathname = usePathname();
  const { setMessages, setCurrentContext } = useGlobalChatContext();

  // Extract IDs from pathname
  const reportId = extractPathId(pathname, "/goals/reports/");
  const apiVideoId = extractPathId(pathname, "/videos/");

  // Fetch report data when on a report page
  const { data: groupReports } = api.reports.getGroupReports.useQuery(
    { groupId: reportId ?? "" },
    { enabled: !!reportId },
  );

  /**
   * Get contextual information based on the current path
   */
  const getContextForPath = useCallback((path: string): string | undefined => {
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

  // Set report context when available
  useEffect(() => {
    if (reportId && groupReports?.reports?.[0]) {
      const report = groupReports.reports[0];
      setReportContext(report, pathname, setCurrentContext);
    } else if (!apiVideoId) {
      setCurrentContext(null);
    }
  }, [reportId, groupReports, setCurrentContext, apiVideoId, pathname]);

  // Update messages with navigation context
  useEffect(() => {
    const contextInfo = getContextForPath(pathname);
    if (!contextInfo) return;

    updateNavigationMessages(pathname, contextInfo, setMessages);
  }, [pathname, getContextForPath, setMessages]);
}

/**
 * Extract an ID from a pathname based on a prefix
 */
function extractPathId(pathname: string, prefix: string): string | null {
  return pathname.includes(prefix)
    ? pathname.split(prefix)[1]?.split("?")[0] || null
    : null;
}

/**
 * Set the report context in the chat
 */
function setReportContext(
  report: RouterOutputs["reports"]["getGroupReports"]["reports"][number],
  pathname: string,
  setCurrentContext: (context: PageContext | null) => void,
): void {
  const formattedReport = formatReportToMarkdown(report);

  setCurrentContext({
    currentPath: pathname,
    viewDescription: "You are viewing a performance report.",
    viewContext: "You are viewing a performance report.",
    contentContext: {
      type: "report",
      data: extractOnlyUsefulReportData(report),
      markdown: formattedReport,
    },
  });
}

/**
 * Update navigation messages in the chat
 */
function updateNavigationMessages(
  pathname: string,
  contextInfo: string,
  setMessages: (updater: (prevMessages: Message[]) => Message[]) => void,
): void {
  setMessages((prevMessages) =>
    prevMessages.length === 1 &&
    prevMessages[0]?.role === "data" &&
    prevMessages[0].content.includes(`"pathname":"${pathname}"`)
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
}
