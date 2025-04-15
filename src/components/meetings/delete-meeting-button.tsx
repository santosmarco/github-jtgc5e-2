"use client";

import { Download, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { saveAs } from "file-saver";

import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Progress } from "~/components/ui/progress";
import { api } from "~/trpc/react";

import { FirstConfirmationModal } from "./first-confirmation-modal";
import { SecondConfirmationModal } from "./second-confirmation-modal";

export interface DeleteMeetingButtonProps {
  readonly meetingId: string;
}

interface DownloadState {
  isDownloading: boolean;
  progress: number;
}

export function DeleteMeetingButton({ meetingId }: DeleteMeetingButtonProps) {
  const [modalState, setModalState] = useState({
    isFirstModalOpen: false,
    isSecondModalOpen: false,
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [downloadState, setDownloadState] = useState<DownloadState>({
    isDownloading: false,
    progress: 0,
  });

  const router = useRouter();
  const { mutateAsync: deleteMeetingAsync } =
    api.videos.deleteMeeting.useMutation();

  const handleDelete = async (): Promise<void> => {
    setIsDeleting(true);
    try {
      await deleteMeetingAsync({ meetingId });
      setModalState((prev) => ({ ...prev, isSecondModalOpen: false }));
      router.push("/");
      toast.success("Meeting deletion initiated");
    } catch (error) {
      console.error("Error deleting meeting:", error);
      toast.error("Failed to delete meeting. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = async (): Promise<void> => {
    if (downloadState.isDownloading) return;

    setDownloadState({ isDownloading: true, progress: 0 });

    try {
      const response = await fetch(`/api/download-video/${meetingId}`);
      if (!response.ok || !response.body) {
        throw new Error("Failed to fetch video");
      }

      const totalSize = Number(response.headers.get("content-length")) || 0;
      const contentType = response.headers.get("content-type") || "video/mp4";
      const fileName = extractFileName(response.headers, meetingId);

      const { blob } = await streamResponseToBlob(response.body, {
        totalSize,
        contentType,
        onProgress: (progress) => {
          setDownloadState((prev) => ({ ...prev, progress }));
        },
      });

      saveAs(blob, fileName);
      toast.success("Download completed");
    } catch (error) {
      console.error("Error downloading video:", error);
      toast.error("Failed to download video. Please try again.");
    } finally {
      setDownloadState({ isDownloading: false, progress: 0 });
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <Settings className="h-4 w-4" />
            <span className="sr-only">Open settings</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={handleDownload}
            disabled={downloadState.isDownloading}
          >
            <Download className="mr-2 h-4 w-4" />
            {downloadState.isDownloading ? "Downloading..." : "Download video"}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() =>
              setModalState((prev) => ({ ...prev, isFirstModalOpen: true }))
            }
          >
            Delete meeting
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <FirstConfirmationModal
        isOpen={modalState.isFirstModalOpen}
        onClose={() =>
          setModalState((prev) => ({ ...prev, isFirstModalOpen: false }))
        }
        onConfirm={() => {
          setModalState({
            isFirstModalOpen: false,
            isSecondModalOpen: true,
          });
        }}
      />

      <SecondConfirmationModal
        isOpen={modalState.isSecondModalOpen}
        onClose={() =>
          setModalState((prev) => ({ ...prev, isSecondModalOpen: false }))
        }
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />

      {downloadState.isDownloading && (
        <div className="fixed bottom-4 left-4 right-4 z-50 flex flex-col gap-2 rounded-lg bg-background/95 p-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:left-auto sm:right-4 sm:w-80">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Downloading video...</p>
            <span className="text-sm text-muted-foreground">
              {downloadState.progress}%
            </span>
          </div>
          <Progress value={downloadState.progress} className="h-2 w-full" />
        </div>
      )}
    </>
  );
}

interface StreamOptions {
  totalSize: number;
  contentType: string;
  onProgress: (progress: number) => void;
}

async function streamResponseToBlob(
  body: ReadableStream<Uint8Array>,
  options: StreamOptions,
): Promise<{ blob: Blob }> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let receivedLength = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    if (value) {
      chunks.push(value);
      receivedLength += value.length;
      const progress = options.totalSize
        ? Math.round((receivedLength / options.totalSize) * 100)
        : 0;
      options.onProgress(progress);
    }
  }

  return {
    blob: new Blob(chunks, { type: options.contentType }),
  };
}

function extractFileName(headers: Headers, fallbackId: string): string {
  const disposition = headers.get("content-disposition");
  if (!disposition) return `meeting-${fallbackId}.mp4`;

  const match = disposition.match(/filename="?([^";]+)"?/);
  return match?.[1] ?? `meeting-${fallbackId}.mp4`;
}
