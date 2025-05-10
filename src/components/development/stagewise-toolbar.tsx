"use client";

import { StagewiseToolbar as StagewiseToolbarOriginal } from "@stagewise/toolbar-next";

import { stagewiseToolbarConfig } from "~/config/stagewise";

export function StagewiseToolbar() {
  return <StagewiseToolbarOriginal config={stagewiseToolbarConfig} />;
}
