// src/lib/apiClient.ts

// This is a lightweight wrapper around the native fetch API.
// It will be configured to automatically include the auth token.

type ApiClientOptions = {
    getToken: () => Promise<string | null>;
};

// We will initialize this client in our hook or component where we have access to Clerk's getToken.
export const createApiClient = ({ getToken }: ApiClientOptions) => {
    const request = async (method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, body?: object) => {
        const token = await getToken();
        if (!token) {
            throw new Error("User is not authenticated.");
        }

        const headers = new Headers({
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        });

        const fullUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}${path}`;
        console.log('🔧 API Request Debug:', {
            baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
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
            throw new Error(errorData.message || `API request failed with status ${response.status}`);
        }

        // For POST requests that return 201 Created with no body
        if (response.status === 201 && response.headers.get('Content-Length') === '0') {
            return null;
        }

        return response.json();
    };

    return {
        get: (path: string) => request('GET', path),
        post: (path: string, body: object) => request('POST', path, body),
        // You can add put and delete methods here as needed
    };
};