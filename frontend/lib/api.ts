// Frontend API client with JWT support and error handling

// API base resolution order:
//  1. NEXT_PUBLIC_API_URL — explicit override (split deployments, local dev)
//  2. Same-origin '/api' — the single-service production layout (Express API
//     and Next.js served from one host), so no CORS and no baked-in host
//  3. Dev fallback: localhost:5000 when running the two-server layout
const isProdBuild = process.env.NODE_ENV === 'production';
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (isProdBuild ? '/api' : 'http://localhost:5000/api');

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    message: string;
    stack?: string;
  };
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('subscrr_token');
  }

  public setToken(token: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('subscrr_token', token);
    }
  }

  public clearToken() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('subscrr_token');
      localStorage.removeItem('subscrr_user');
    }
  }

  public async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const token = this.getToken();

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        const error = new Error(
          data?.error?.message || data?.message || `HTTP error ${response.status}`
        ) as Error & { status?: number };
        // Carry the HTTP status so callers can distinguish 401 (stale
        // session — clear it) from transient failures (rate limit, network).
        error.status = response.status;
        throw error;
      }

      return data;
    } catch (error: any) {
      // No console.error here: errors are always propagated to callers, who
      // decide whether to surface them. Logging-and-rethrowing double-reports
      // expected failures (401 boot checks, 429 rate limits) into overlays.
      throw error;
    }
  }

  // HTTP Helper methods
  public get<T = any>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  public post<T = any>(endpoint: string, body?: any, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  public put<T = any>(endpoint: string, body?: any, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  public patch<T = any>(endpoint: string, body?: any, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  public delete<T = any>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const api = new ApiClient(API_BASE_URL);
export default api;
