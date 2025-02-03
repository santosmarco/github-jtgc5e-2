import { api } from "~/trpc/server";

import { ReportPageClient } from "./page.client";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;
  const report = await api.reports.getOne({ reportId });

  return <ReportPageClient report={report} />;
}
