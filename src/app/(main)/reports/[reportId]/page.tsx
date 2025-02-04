import { api } from "~/trpc/server";

import { ReportPageClient } from "./page.client";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;
  const { group, reports } = await api.reports.getGroupReports({
    groupId: reportId,
  });

  return <ReportPageClient group={group} reports={reports} />;
}
