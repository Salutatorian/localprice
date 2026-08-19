export const NATIVE_APP_SCHEME = "com.localprice.app";

export function nativeCallbackUrl(search: string): string {
  const query = search.startsWith("?") ? search : search ? `?${search}` : "";
  return `${NATIVE_APP_SCHEME}://auth/callback${query}`;
}

export function isNativeAuthUrl(url: string): boolean {
  return url.startsWith(`${NATIVE_APP_SCHEME}://`);
}

function firstParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }
  return null;
}

function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/scan";
  }
  return value;
}

export function nativeCallbackFromParams(
  params: Record<string, string | string[] | undefined>,
): string {
  const query = new URLSearchParams();
  const code = firstParam(params.code);
  const state = firstParam(params.state);
  if (code && code.length <= 2048) {
    query.set("code", code);
  }
  if (state && state.length <= 2048) {
    query.set("state", state);
  }
  query.set("next", safeNext(firstParam(params.next)));
  return nativeCallbackUrl(`?${query.toString()}`);
}
