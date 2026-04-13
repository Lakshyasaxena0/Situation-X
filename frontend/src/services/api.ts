const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

if (!BASE_URL) {
  throw new Error("NEXT_PUBLIC_API_URL is not defined");
}

type ApiError = {
  error: string;
};

// -----------------------------
// INTERNAL REQUEST HANDLER
// -----------------------------
async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    // ignore JSON parse errors
  }

  if (!response.ok) {
    const message =
      (data as ApiError)?.error || "Something went wrong";
    throw new Error(message);
  }

  return data as T;
}

// -----------------------------
// API CLIENT
// -----------------------------
export const apiClient = {
  get: async <T>(path: string, token?: string): Promise<T> => {
    return request<T>(path, { method: "GET" }, token);
  },

  post: async <T>(
    path: string,
    body: unknown,
    token?: string
  ): Promise<T> => {
    return request<T>(
      path,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
      token
    );
  },

  // -----------------------------
  // PUT METHOD (FIXED — was missing)
  // -----------------------------
  put: async <T>(
    path: string,
    body: unknown,
    token?: string
  ): Promise<T> => {
    return request<T>(
      path,
      {
        method: "PUT",
        body: JSON.stringify(body),
      },
      token
    );
  },

  delete: async <T>(
    path: string,
    token?: string
  ): Promise<T> => {
    return request<T>(path, { method: "DELETE" }, token);
  },
};
