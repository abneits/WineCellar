/**
 * HTTP client for API tests.
 * Reads APP_URL from environment (default: http://localhost:8080).
 */

export const BASE_URL = (process.env.APP_URL ?? "http://localhost:8080").replace(/\/$/, "");

export interface ApiResponse<T = unknown> {
  status: number;
  body: T;
  headers: Record<string, string>;
}

async function request<T>(
  method: string,
  path: string,
  options: {
    body?: unknown;
    form?: FormData;
    headers?: Record<string, string>;
  } = {}
): Promise<ApiResponse<T>> {
  const url = `${BASE_URL}${path}`;

  const init: RequestInit = { method };

  if (options.form) {
    init.body = options.form;
    init.headers = options.headers ?? {};
  } else if (options.body !== undefined) {
    init.body = JSON.stringify(options.body);
    init.headers = {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    };
  } else {
    init.headers = options.headers ?? {};
  }

  const res = await fetch(url, init);

  let body: T;
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    body = (await res.json()) as T;
  } else if (contentType.startsWith("image/")) {
    body = (await res.arrayBuffer()) as unknown as T;
  } else {
    body = (await res.text()) as unknown as T;
  }

  const headers: Record<string, string> = {};
  res.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return { status: res.status, body, headers };
}

export const api = {
  get: <T = unknown>(path: string) => request<T>("GET", path),
  post: <T = unknown>(path: string, body?: unknown) => request<T>("POST", path, { body }),
  postForm: <T = unknown>(path: string, form: FormData) => request<T>("POST", path, { form }),
  put: <T = unknown>(path: string, body?: unknown) => request<T>("PUT", path, { body }),
  delete: <T = unknown>(path: string) => request<T>("DELETE", path),
};
