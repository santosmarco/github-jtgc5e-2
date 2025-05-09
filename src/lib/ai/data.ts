import type { extractOnlyUsefulReportData } from "~/lib/reports/formatting";
import type { RouterOutputs } from "~/trpc/shared";

export type ReportContext = {
  type: "report";
  data: ReturnType<typeof extractOnlyUsefulReportData>;
  markdown: string;
};

export type VideoContext = {
  type: "video";
  data: RouterOutputs["meetings"]["getAllRelevantDataForVideo"];
};

export type AIContext = ReportContext | VideoContext;

export type PageContext = {
  currentPath: string;
  viewDescription: string;
  viewContext: string;
  contentContext: AIContext;
};
