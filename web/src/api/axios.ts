import axios from "axios";

export const BASE_URL = "http://localhost:3000"; // backend URL

// In-memory access token (lost on page refresh)
let ACCESS_TOKEN_MEM: string | null = null;

export const setAccessToken = (token: string | null) => {
  ACCESS_TOKEN_MEM = token;
  try {
    // Notify listeners (e.g., content scripts) via custom event
    window.dispatchEvent(
      new CustomEvent("access-token-updated", { detail: token })
    );
  } catch {}
};
export const getAccessToken = () => ACCESS_TOKEN_MEM;
export const clearAccessToken = () => {
  ACCESS_TOKEN_MEM = null;
  try {
    window.dispatchEvent(
      new CustomEvent("access-token-updated", { detail: null })
    );
  } catch {}
};

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Listen for token updates coming from a Chrome extension content script
try {
  window.addEventListener(
    "access-token-write",
    (e: Event) => {
      const anyEvent = e as CustomEvent<string | null>;
      setAccessToken(anyEvent.detail ?? null);
    },
    false
  );
} catch {}

// Add a request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = ACCESS_TOKEN_MEM;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor for handling token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Don't retry if the failed request was the refresh endpoint itself
    if (originalRequest.url?.includes("/auth/refresh")) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Call refresh endpoint - cookie is sent automatically via withCredentials
        const response = await axios.post(
          `${BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const { accessToken } = response.data;
        setAccessToken(accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - clear state and redirect to login
        clearAccessToken();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
