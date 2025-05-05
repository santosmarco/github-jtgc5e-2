export function createUtmUrl(url: string, utmSource: string) {
  const urlObj = new URL(url);
  urlObj.searchParams.set("utm_source", utmSource);
  return urlObj.toString();
}

export function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
