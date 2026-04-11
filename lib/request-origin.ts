import { ROOT_URL } from "@/lib/constants";

export function getRequestOrigin(headerList: Headers) {
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto =
    headerList.get("x-forwarded-proto") ??
    (host?.includes("localhost") || host?.startsWith("127.0.0.1")
      ? "http"
      : "https");

  return host ? `${proto}://${host}` : ROOT_URL;
}
