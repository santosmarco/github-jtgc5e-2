import { env } from "~/env";

export const BASE_URL = (() => {
  let url =
    env.NEXT_PUBLIC_SITE_URL ??
    env.NEXT_PUBLIC_VERCEL_URL ??
    window.location.origin;
  url = url.startsWith("http") ? url : `https://${url}`;
  url = url.endsWith("/") ? url : `${url}/`;
  return url;
})();
if (!BASE_URL) throw new Error("NEXT_PUBLIC_SITE_URL is not defined");

export const COMPANY_NAME = "Titan GameTape";
