import type { ReactNode } from "react";

export interface BaseMenuItem {
  label: string;
  icon: ReactNode;
  isActive: boolean;
}

export interface SingleMenuItem extends BaseMenuItem {
  type: "item";
  href: string;
}

export interface GroupMenuItem extends BaseMenuItem {
  type: "group";
  defaultHref?: string;
  children: SingleMenuItem[];
  isCollapsed?: boolean;
}

export type MenuItem = SingleMenuItem | GroupMenuItem;
