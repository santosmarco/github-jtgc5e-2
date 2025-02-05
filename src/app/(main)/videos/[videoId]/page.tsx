import { api, HydrateClient } from "~/trpc/server";

import { VideoPageClient } from "./page.client";

export default async function VideoPage({
  params,
}: {
  params: { videoId: string };
}) {
  await api.transcripts.getOne
    .prefetch({ videoId: params.videoId })
    .catch(() => {
      // do nothing
    });

  return (
    <HydrateClient>
      <VideoPageClient videoId={params.videoId} />
    </HydrateClient>
  );
}
