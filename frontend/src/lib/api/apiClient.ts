type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

interface RequestOptions {
  headers?: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal;
}

interface ApiResponse<T> {
  data: T;
  status: number;
}

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly body: unknown,
  ) {
    super(`API error ${status}: ${statusText}`);
    this.name = "ApiClientError";
  }
}

export class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      "Content-Type": "application/json",
    };
  }

  setAuthToken(token: string): void {
    this.defaultHeaders.Authorization = `Bearer ${token}`;
  }

  clearAuthToken(): void {
    delete this.defaultHeaders.Authorization;
  }

  private async request<T>(
    method: HttpMethod,
    path: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      ...this.defaultHeaders,
      ...options?.headers,
    };

    const response = await fetch(url, {
      method,
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
      signal: options?.signal,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new ApiClientError(response.status, response.statusText, body);
    }

    const data = (await response.json()) as T;
    return { data, status: response.status };
  }

  async get<T>(path: string, options?: Omit<RequestOptions, "body">): Promise<ApiResponse<T>> {
    return this.request<T>("GET", path, options);
  }

  async post<T>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, "body">,
  ): Promise<ApiResponse<T>> {
    return this.request<T>("POST", path, { ...options, body });
  }

  async put<T>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, "body">,
  ): Promise<ApiResponse<T>> {
    return this.request<T>("PUT", path, { ...options, body });
  }

  async delete<T>(path: string, options?: Omit<RequestOptions, "body">): Promise<ApiResponse<T>> {
    return this.request<T>("DELETE", path, options);
  }
}

export type { ApiResponse };
