/**
 * Axios client for the CRM.
 *
 * Every network call in the app goes through this instance, so auth headers,
 * error shapes and the base URL are configured in exactly one place.
 *
 * While the backend does not exist yet we plug in a local adapter that answers
 * the very same routes and JSON payloads from localStorage. The day the API is
 * live, set VITE_API_URL and the adapter is bypassed — no component changes.
 */
import axios, { AxiosError, type AxiosInstance } from "axios";
import { mockAdapter } from "./mock-server";

const BASE_URL = import.meta.env['VITE_API_URL'] ?? "";
export const USING_MOCK_API = !BASE_URL;

const TOKEN_KEY = "manju-crm-token";

export function setAuthToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export const http: AxiosInstance = axios.create({
  baseURL: BASE_URL || "/api",
  timeout: 15000,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
  ...(USING_MOCK_API ? { adapter: mockAdapter } : {}),
});

/** Request interceptor — attach the bearer token to every call. */
http.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) config.headers.set("Authorization", `Bearer ${token}`);
  return config;
});

/** Error thrown to the UI. Always carries a human-readable message. */
export class ApiError extends Error {
  status: number;
  code: string;
  constructor(message: string, status = 400, code = "bad_request") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

/** Response interceptor — normalise every failure into one ApiError shape. */
http.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: { code?: string; message?: string } }>) => {
    if (error.response) {
      const body = error.response.data?.error;
      return Promise.reject(
        new ApiError(
          body?.message ?? `Request failed (${error.response.status}).`,
          error.response.status,
          body?.code ?? "request_failed",
        ),
      );
    }
    if (error.code === "ECONNABORTED") {
      return Promise.reject(new ApiError("The server took too long to respond.", 408, "timeout"));
    }
    return Promise.reject(new ApiError("Cannot reach the server. Check your connection.", 0, "network_error"));
  },
);
