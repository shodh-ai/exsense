// src/lib/apiClient.ts

// This is a lightweight wrapper around the native fetch API.
// It will be configured to automatically include the auth token.

type ApiClientOptions = {
  // getToken is optional. If not provided or returns null, requests will be sent without Authorization header.
  getToken?: () => Promise<string | null>;
};

// Provide richer error details so callers (React Query) can implement
// smarter retry/backoff based on HTTP status and Retry-After header.
export class ApiError extends Error {
  status: number;
  retryAfter?: number; // seconds, if provided by server
  data?: any;
  constructor(message: string, status: number, retryAfter?: number, data?: any) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.retryAfter = retryAfter;
      this.data = data;
  }
}

// We will initialize this client in our hook or component where we have access to Clerk's getToken.
export const createApiClient = ({ getToken }: ApiClientOptions) => {
  const request = async (method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, body?: object) => {
      const token = getToken ? await getToken() : null;

      const headers = new Headers({
          'Content-Type': 'application/json',
      });
      if (token) {
          headers.set('Authorization', `Bearer ${token}`);
      }

      // Determine base URL with a safe fallback to localhost for dev
      const rawBase = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
      const baseUrl = rawBase && rawBase.length > 0 ? rawBase : 'http://localhost:3001';
      // Normalize URL join to avoid double slashes
      const normalizedBase = baseUrl.replace(/\/+$/, '');
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;
      const fullUrl = `${normalizedBase}${normalizedPath}`;
      console.log('🔧 API Request Debug:', {
          baseUrl,
          path,
          fullUrl,
          method
      });
      
      const response = await fetch(fullUrl, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: "An unknown API error occurred." }));
          const retryAfterHeader = response.headers.get('Retry-After');
          const retryAfter = retryAfterHeader ? Number(retryAfterHeader) : undefined;
          const message = errorData.message || `API request failed with status ${response.status}`;
          throw new ApiError(message, response.status, Number.isFinite(retryAfter) ? retryAfter : undefined, errorData);
      }

      // For POST requests that return 201 Created with no body
      if (response.status === 201 && response.headers.get('Content-Length') === '0') {
          return null;
      }

      // For 204 No Content responses
      if (response.status === 204) {
          return null;
      }

      return response.json();
  };

  return {
      get: (path: string) => request('GET', path),
      post: (path: string, body: object) => request('POST', path, body),
      put: (path: string, body: object) => request('PUT', path, body),
      patch: (path: string, body: object) => request('PATCH', path, body),
      delete: (path: string) => request('DELETE', path),
  };
};

