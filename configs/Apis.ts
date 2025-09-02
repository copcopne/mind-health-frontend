// api.ts — Axios helper + Expo SecureStore + auto refresh token (TypeScript)
import axios, {
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosHeaders,
} from "axios";
import * as SecureStore from "expo-secure-store";
import { decode as atob } from "base-64";

/** ====== CẤU HÌNH ====== */
export const BASE_URL = "http://10.0.2.2:8080/MindHealth/api";
const ACCESS_KEY = "accessToken";
const REFRESH_KEY = "refreshToken";
const REFRESH_ENDPOINT = "/auth/refresh"; // POST { refreshToken } -> { accessToken, refreshToken? }

export const endpoints = {
  login: "/auth/login",
  verifyEmail: "/auth/email-verify",
  verify: "/auth/email-verify/verify",
  forgotPassword: "/auth/forgot-password",
  resetPassword: "/auth/reset-password/reset",

  users: "/users",
  profile: "/users/profile",

  moodEntries: "/mood-entries",
  moodEntryDetail: (id: number) => `/mood-entries/${id}`, 

  feedbackMoodEntry: (id: number) => `/mood-entries/${id}/feedback`,

  
} as const;

/** ====== TYPES ====== */
type Tokens = { accessToken: string | null; refreshToken: string | null };
type RefreshResponse = {
  access_token: string;
  refresh_token?: string;
};
type WithRetryFlag = InternalAxiosRequestConfig & { _retry?: boolean };

/** ====== SECURESTORE HELPERS ====== */
const SECURE_OPTIONS: SecureStore.SecureStoreOptions = {
  // requireAuthentication: true, // Bật nếu muốn FaceID/TouchID khi đọc
};

async function sset(key: string, value: string | null) {
  if (value == null) return SecureStore.deleteItemAsync(key);
  return SecureStore.setItemAsync(key, value, SECURE_OPTIONS);
}
async function sget(key: string) {
  return SecureStore.getItemAsync(key, SECURE_OPTIONS);
}
async function sdel(key: string) {
  return SecureStore.deleteItemAsync(key, SECURE_OPTIONS);
}

/** ====== JWT UTILS ====== */
function decodeJwtPayload(token: string | null) {
  try {
    if (!token) return null;
    const base64 = token.split(".")[1];
    if (!base64) return null;
    const json = atob(base64.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as { exp?: number };
  } catch {
    return null;
  }
}
function isTokenNearlyExpired(token: string | null, bufferSec = 30) {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;
  const now = Math.floor(Date.now() / 1000);
  return payload.exp - now <= bufferSec;
}

/** ====== LƯU & TẢI TOKEN ====== */
export async function getTokens(): Promise<Tokens> {
  const [accessToken, refreshToken] = await Promise.all([
    sget(ACCESS_KEY),
    sget(REFRESH_KEY),
  ]);
  return { accessToken, refreshToken };
}
export async function setTokens({
  accessToken,
  refreshToken,
}: {
  accessToken?: string | null;
  refreshToken?: string | null;
}) {
  await Promise.all([
    accessToken !== undefined
      ? sset(ACCESS_KEY, accessToken)
      : Promise.resolve(),
    refreshToken !== undefined
      ? sset(REFRESH_KEY, refreshToken)
      : Promise.resolve(),
  ]);
}
export async function clearTokens() {
  await Promise.all([sdel(ACCESS_KEY), sdel(REFRESH_KEY)]);
}

/** ====== AXIOS INSTANCE ====== */
export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

/** ====== SINGLE-FLIGHT REFRESH (chống race) ====== */
let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

async function doRefreshTokens(): Promise<string> {
  const { refreshToken } = await getTokens();
  if (!refreshToken) throw new Error("NO_REFRESH_TOKEN");

  const res = await axios.post<RefreshResponse>(
  `${BASE_URL}${REFRESH_ENDPOINT}`,
  { refresh_token: refreshToken }
);
  const { access_token: newAccess, refresh_token: newRefresh } = res.data || {};
  if (!newAccess) throw new Error("INVALID_REFRESH_RESPONSE");

  await setTokens({
    accessToken: newAccess,
    refreshToken: newRefresh ?? refreshToken,
  });
  return newAccess;
}
async function getRefreshedAccessToken(): Promise<string> {
  if (isRefreshing && refreshPromise) return refreshPromise;

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const token = await doRefreshTokens();
      return token;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/** ====== LOGOUT HOOK ====== */
export async function logout() {
  await clearTokens();
}

// Helper set Authorization header an toàn cho cả 2 kiểu headers
function setAuthHeader(
  config: InternalAxiosRequestConfig,
  token: string
): InternalAxiosRequestConfig {
  // Bảo đảm headers là AxiosHeaders
  if (!(config.headers instanceof AxiosHeaders)) {
    // from() nhận object/raw headers và trả về AxiosHeaders
    config.headers = AxiosHeaders.from(config.headers || {});
  }
  (config.headers as AxiosHeaders).set("Authorization", `Bearer ${token}`);
  return config;
}

/** ====== REQUEST INTERCEPTOR ====== */
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const { accessToken, refreshToken } = await getTokens();

    // Chủ động refresh nếu sắp hết hạn
    if (accessToken && refreshToken && isTokenNearlyExpired(accessToken, 30)) {
      try {
        const newAccess = await getRefreshedAccessToken();
        setAuthHeader(config, newAccess);
        return config;
      } catch {
        await logout();
      }
    }

    // Gắn access hiện tại nếu có
    if (accessToken) {
      setAuthHeader(config, accessToken);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/** ====== RESPONSE INTERCEPTOR ====== */
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config as WithRetryFlag | undefined;
    const status = error.response?.status;
    const url = original?.url || "";

    const eligible =
      original && !original._retry && !url.includes("/auth/");

    if (eligible && (status === 401 || status === 403)) {
      original._retry = true;
      try {
        const newAccess = await getRefreshedAccessToken();
        setAuthHeader(original, newAccess);
        return api.request(original);
      } catch (e) {
        await logout();
        return Promise.reject(e);
      }
    }
    return Promise.reject(error);
  }
);

