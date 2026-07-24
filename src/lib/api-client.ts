export const BASE_URL = (() => {
  if (import.meta.env.DEV) return "/api/v1";
  return import.meta.env.VITE_API_BASE_URL || "https://neuro-server.vercel.app/api/v1";
})().replace(/\/$/, "");

export type AuthUser = { id: string; email: string; isAdmin: boolean };
export type NotificationPreferences = {
  email_notifications: boolean;
  in_app_notifications: boolean;
  dataset_updates: boolean;
  new_matches: boolean;
  account_activity: boolean;
};

export type UserProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: "student" | "researcher" | "scientist" | "working_professional" | null;
  institute: string | null;
  notifications_enabled: boolean;
  notification_preferences: NotificationPreferences;
  onboarding_complete: boolean;
};
export type SavedDataset = {
  id: string;
  dataset_id: string;
  dataset_snapshot: Record<string, unknown>;
  created_at: string;
};
export type Collection = { id: string; name: string; created_at: string; itemCount?: number };
export type CollectionItem = { id: string; savedDatasetId: string; dataset_snapshot: Record<string, unknown> };
export type SocialLink = { id: string; platform: string; url: string };
export type SearchResult = {
  id: string;
  name: string;
  repo: string;
  modality: string;
  description: string;
  subjects: number | null;
  size: string | null;
  region: string | null;
  species: string | null;
  ageGroup: string | null;
  disease: string | null;
  license: string | null;
  access: string | null;
  verified: string | null;
  doi: string | null;
  url: string | null;
};

type Envelope<T> = { success: boolean; message: string; data: T };
let accessToken: string | null = null;
const ACCESS_TOKEN_KEY = "neuro_access_token";

function setAccessToken(token: string | null) {
  accessToken = token;
  if (typeof window !== "undefined") {
    if (token) window.sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
    else window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    window.dispatchEvent(new Event("neuro-auth-changed"));
  }
}

function getAccessToken() {
  if (!accessToken && typeof window !== "undefined")
    accessToken = window.sessionStorage.getItem(ACCESS_TOKEN_KEY);
  return accessToken;
}

function messageOf(payload: unknown, fallback: string) {
  return typeof payload === "object" &&
    payload &&
    "message" in payload &&
    typeof (payload as { message?: unknown }).message === "string"
    ? (payload as { message: string }).message
    : fallback;
}

async function refreshAccessToken() {
  const response = await fetch(`${BASE_URL}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });
  const payload = (await response.json().catch(() => null)) as Envelope<{
    accessToken: string;
  }> | null;
  if (!response.ok || !payload?.data?.accessToken)
    throw new Error(messageOf(payload, "Your session has expired."));
  setAccessToken(payload.data.accessToken);
}

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let response = await fetch(`${BASE_URL}${path}`, { ...init, headers, credentials: "include" });
  if (response.status === 401 && retry && path !== "/auth/refresh") {
    try {
      await refreshAccessToken();
    } catch {
      setAccessToken(null);
    }
    if (accessToken) return request<T>(path, init, false);
  }
  const payload = (await response.json().catch(() => null)) as Envelope<T> | null;
  if (!response.ok || !payload?.success) throw new Error(messageOf(payload, "Request failed."));
  return payload.data;
}

function idOf(value: Record<string, unknown>) {
  return String(value._id ?? value.id ?? "");
}
function asDate(value: Record<string, unknown>) {
  return String(value.createdAt ?? value.created_at ?? "");
}
function splitPhone(value: string) {
  const compact = value.replace(/[\s()-]/g, "");
  const match = compact.match(/^(\+\d{1,4})(\d{6,14})$/);
  return match
    ? { countryCode: match[1], phone: match[2] }
    : { countryCode: "+91", phone: compact.replace(/^\+/, "") };
}
function mapUser(data: Record<string, unknown>): AuthUser {
  return { id: idOf(data), email: String(data.email ?? ""), isAdmin: Boolean(data.isAdmin) };
}
function mapProfile(data: Record<string, unknown>): UserProfile {
  const phone = data.phone ? `${String(data.countryCode ?? "")}${String(data.phone)}` : null;
  const prefs = (data.notificationPreferences as Record<string, boolean> | undefined) ?? {};
  const defaultVal = Boolean(data.notificationsEnabled ?? true);
  return {
    id: idOf(data),
    full_name: (data.name as string | null) ?? null,
    email: (data.email as string | null) ?? null,
    phone,
    role: (data.role as UserProfile["role"]) ?? null,
    institute: (data.institute as string | null) ?? null,
    notifications_enabled: Boolean(data.notificationsEnabled ?? true),
    notification_preferences: {
      email_notifications: prefs.email_notifications ?? defaultVal,
      in_app_notifications: prefs.in_app_notifications ?? defaultVal,
      dataset_updates: prefs.dataset_updates ?? defaultVal,
      new_matches: prefs.new_matches ?? defaultVal,
      account_activity: prefs.account_activity ?? defaultVal,
    },
    onboarding_complete: Boolean(data.isOnboarded),
  };
}
// ponytail: resultSource='cache' means record already in DB — relabel 'web_search' → 'Database'.
export function mapDataset(data: Record<string, unknown>, resultSource?: string): SearchResult {
  const list = (value: unknown) => (Array.isArray(value) ? value.join(", ") : String(value ?? ""));
  const verified = data.last_verified_at
    ? new Date(String(data.last_verified_at)).toLocaleDateString()
    : ((data.trust_tier as string | null) ?? null);
  const rawSource = String(data.source ?? "Dataset");
  const repo = rawSource === "web_search" && resultSource === "cache" ? "Database" : rawSource;
  return {
    id: idOf(data),
    name: String(data.title ?? "Untitled dataset"),
    repo,
    modality: list(data.modality) || "DS",
    description: String(data.description ?? ""),
    subjects: typeof data.subject_count === "number" ? data.subject_count : null,
    size: (data.size_label as string | null) ?? null,
    region: (data.region as string | null) ?? null,
    species: list(data.species) || null,
    ageGroup: (data.age_group as string | null) ?? null,
    disease: (data.disease as string | null) ?? null,
    license: (data.license as string | null) ?? null,
    access: (data.access_tier as string | null) ?? null,
    verified,
    doi: (data.doi as string | null) ?? null,
    url: (data.url as string | null) ?? null,
  };
}

const auth = {
  async login(email: string, password: string) {
    const data = await request<{ accessToken: string; user: Record<string, unknown> }>(
      "/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) },
      false,
    );
    setAccessToken(data.accessToken);
    return mapUser(data.user);
  },
  async signup(data: { email: string; password: string; full_name: string; phone: string }) {
    const phone = splitPhone(data.phone);
    return request<{ id: string; email: string }>(
      "/auth/register",
      {
        method: "POST",
        body: JSON.stringify({
          name: data.full_name,
          email: data.email,
          password: data.password,
          confirmPassword: data.password,
          ...phone,
        }),
      },
      false,
    );
  },
  async verifyOtp(email: string, otp: string) {
    const data = await request<{ accessToken: string; user: Record<string, unknown> }>(
      "/auth/verify-otp",
      { method: "POST", body: JSON.stringify({ email, otp }) },
      false,
    );
    setAccessToken(data.accessToken);
    return mapUser(data.user);
  },
  async google(idToken: string) {
    const data = await request<{
      accessToken: string;
      user: Record<string, unknown>;
      isOnboarded: boolean;
    }>("/auth/google", { method: "POST", body: JSON.stringify({ idToken }) }, false);
    setAccessToken(data.accessToken);
    return { user: mapUser(data.user), isOnboarded: data.isOnboarded };
  },
  resendOtp: (email: string) =>
    request<null>("/auth/resend-otp", { method: "POST", body: JSON.stringify({ email }) }, false),
  async me() {
    if (!getAccessToken()) await refreshAccessToken();
    return mapUser(await request<Record<string, unknown>>("/auth/me"));
  },
  async logout() {
    await request<null>("/auth/logout", { method: "POST" }, false);
    setAccessToken(null);
  },
  async forgotPassword(email: string) {
    return request<null>("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }, false);
  },
  async resetPassword(email: string, otp: string, newPassword: string) {
    return request<null>("/auth/reset-password", { method: "POST", body: JSON.stringify({ email, otp, newPassword, confirmNewPassword: newPassword }) }, false);
  },
};

const profiles = {
  async getMe() {
    return mapProfile(await request<Record<string, unknown>>("/users/me"));
  },
  async update(data: Partial<UserProfile>) {
    if (data.onboarding_complete) {
      const phone = splitPhone(data.phone ?? "");
      await request("/auth/complete-onboarding", {
        method: "POST",
        body: JSON.stringify({
          name: data.full_name,
          role: data.role,
          institute: data.institute,
          ...phone,
        }),
      });
    } else if (data.notification_preferences !== undefined) {
      await request("/users/me/notifications", {
        method: "PATCH",
        body: JSON.stringify({ notificationPreferences: data.notification_preferences }),
      });
    } else if (data.notifications_enabled !== undefined) {
      await request("/users/me/notifications", {
        method: "PATCH",
        body: JSON.stringify({ enabled: data.notifications_enabled }),
      });
    } else {
      const phone = data.phone === undefined ? {} : splitPhone(data.phone ?? "");
      await request("/users/me", {
        method: "PUT",
        body: JSON.stringify({
          name: data.full_name,
          role: data.role,
          institute: data.institute,
          ...phone,
        }),
      });
    }
    return profiles.getMe();
  },
};

const savedDatasets = {
  async upsert(data: { dataset_id: string; dataset_snapshot?: Record<string, unknown> }) {
    return request("/users/saved-datasets", {
      method: "POST",
      body: JSON.stringify({ datasetId: data.dataset_id }),
    });
  },
  async list(): Promise<SavedDataset[]> {
    const values = await request<Record<string, unknown>[]>("/users/saved-datasets");
    return values.map((v) => ({
      id: idOf(v),
      dataset_id: String(v.datasetId),
      dataset_snapshot: mapDataset((v.datasetSnapshot as Record<string, unknown>) ?? {}),
      created_at: asDate(v),
    }));
  },
  delete: (id: string) => request<null>(`/users/saved-datasets/${id}`, { method: "DELETE" }),
};
const collections = {
  async list(): Promise<Collection[]> {
    const values = await request<Record<string, unknown>[]>("/users/collections");
    return values.map((v) => ({ id: idOf(v), name: String(v.name), created_at: asDate(v) }));
  },
  async create(name: string): Promise<Collection> {
    const v = await request<Record<string, unknown>>("/users/collections", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    return { id: idOf(v), name: String(v.name), created_at: asDate(v) };
  },
  delete: (id: string) => request<null>(`/users/collections/${id}`, { method: 'DELETE' }),
  async getItems(id: string): Promise<Array<{ id: string; savedDatasetId: { id: string; datasetId: string; datasetSnapshot: SearchResult } }>> {
    const values = await request<Record<string, unknown>[]>(`/users/collections/${id}/items`);
    return values.map((v) => {
      const sd = (v.savedDatasetId as Record<string, unknown>) ?? {};
      return {
        id: idOf(v),
        savedDatasetId: {
          id: idOf(sd),
          datasetId: String(sd.datasetId ?? ""),
          datasetSnapshot: mapDataset((sd.datasetSnapshot as Record<string, unknown>) ?? {}),
        },
      };
    });
  },
  addItem: (collectionId: string, savedDatasetId: string) =>
    request<null>(`/users/collections/${collectionId}/items`, { method: 'POST', body: JSON.stringify({ savedDatasetId }) }),
  removeItem: (collectionId: string, savedDatasetId: string) =>
    request<null>(`/users/collections/${collectionId}/items/${savedDatasetId}`, { method: 'DELETE' }),
};
const searchHistory = {
  async list() {
    const values = await request<Record<string, unknown>[]>("/users/search-history");
    return values.map((v) => ({ id: idOf(v), query: String(v.query), created_at: asDate(v) }));
  },
  clearAll: () => request<null>("/users/search-history", { method: "DELETE" }),
  deleteOne: (id: string) => request<null>(`/users/search-history/${id}`, { method: "DELETE" }),
};
const socialLinks = {
  async list(): Promise<SocialLink[]> {
    const values = await request<Record<string, unknown>[]>("/users/social-links");
    return values.map((v) => ({ id: idOf(v), platform: String(v.platform), url: String(v.url) }));
  },
  async upsert(platform: string, url: string): Promise<SocialLink> {
    const v = await request<Record<string, unknown>>("/users/social-links", {
      method: "PUT",
      body: JSON.stringify({ platform, url }),
    });
    return { id: idOf(v), platform: String(v.platform), url: String(v.url) };
  },
  delete: (id: string) => request<null>(`/users/social-links/${id}`, { method: "DELETE" }),
};

const admin = {
  auth: {
    login: (email: string, password: string) =>
      request<{ accessToken: string; user: Record<string, unknown> }>("/admin/login", { method: "POST", body: JSON.stringify({ email, password }) }, false),
    verifyLoginOtp: async (email: string, otp: string) => {
      const data = await request<{ accessToken: string; admin: Record<string, unknown> }>("/admin/verify-login-otp", { method: "POST", body: JSON.stringify({ email, otp }) }, false);
      setAccessToken(data.accessToken);
      return data;
    },
  },
  async dashboard() {
    return request<Record<string, unknown>>("/admin/dashboard");
  },
  async analytics() {
    return request<{
      series: Array<{ day: string; count: number }>;
      users: number;
      saved: number;
      collections: number;
      cacheHitRate: number;
    }>("/admin/analytics");
  },
  users: {
    async list() {
      const values = await request<Record<string, unknown>[]>("/admin/users");
      return values.map((value) => ({
        id: idOf(value),
        full_name: String(value.name ?? ""),
        email: String(value.email ?? ""),
        role: value.role as string | null,
        institute: value.institute as string | null,
        is_admin: Boolean(value.isAdmin),
        suspended: value.isActive === false,
      }));
    },
    delete: (id: string) => request<null>(`/admin/users/${id}`, { method: "DELETE" }),
  },
  repositories: {
    list: () => request<Record<string, unknown>[]>("/admin/repositories"),
    create: (data: {
      name: string;
      trust_tier: string;
      endpoint_config: Record<string, unknown>;
    }) =>
      request<Record<string, unknown>>("/admin/repositories", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    resync: (id: string) =>
      request<Record<string, unknown>>(`/admin/repositories/${id}/resync`, { method: "POST" }),
    delete: (id: string) => request<null>(`/admin/repositories/${id}`, { method: "DELETE" }),
  },
  moderation: {
    queue: () => Promise.resolve([]) as Promise<Array<Record<string, unknown>>>,
    published: () => Promise.resolve([]) as Promise<Array<Record<string, unknown>>>,
    approve: (_id: string) => Promise.resolve(null),
    reject: (_id: string, _reason?: string) => Promise.resolve(null),
  },
  infra: {
    mongo: () => request<Record<string, unknown>>('/admin/infra/mongo'),
    redis: () => request<Record<string, unknown>>('/admin/infra/redis'),
    storage: () => request<Record<string, unknown>>('/admin/infra/storage'),
    tokens: async () => {
      const values = await request<Record<string, unknown>[]>('/admin/tokens');
      return values.map((v) => ({ ...v, id: idOf(v) }));
    },
    agents: async () => {
      const values = await request<Record<string, unknown>[]>('/admin/agents');
      return values.map((v) => ({ ...v, id: idOf(v) }));
    },
  },
  announcements: {
    list: () => {
      try {
        const raw = localStorage.getItem("neuro_announcements");
        return Promise.resolve(raw ? JSON.parse(raw) : []);
      } catch {
        return Promise.resolve([]);
      }
    },
    create: (data: { title: string; body: string; active?: boolean }) => {
      try {
        const raw = localStorage.getItem("neuro_announcements");
        const items = raw ? JSON.parse(raw) : [];
        const newItem = {
          id: `announcement_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          title: data.title,
          body: data.body,
          active: data.active ?? true,
          created_at: new Date().toISOString(),
        };
        items.unshift(newItem);
        localStorage.setItem("neuro_announcements", JSON.stringify(items));
        window.dispatchEvent(new Event("neuro_announcements_updated"));
        return Promise.resolve(newItem);
      } catch {
        return Promise.resolve(null);
      }
    },
    update: (id: string, data: { title: string; body: string; active?: boolean }) => {
      try {
        const raw = localStorage.getItem("neuro_announcements");
        const items: Array<{ id: string; title: string; body: string; active: boolean; created_at: string }> = raw ? JSON.parse(raw) : [];
        const idx = items.findIndex((a) => a.id === id);
        if (idx !== -1) {
          items[idx] = {
            ...items[idx],
            title: data.title,
            body: data.body,
            active: data.active !== undefined ? data.active : items[idx].active,
          };
          localStorage.setItem("neuro_announcements", JSON.stringify(items));
          window.dispatchEvent(new Event("neuro_announcements_updated"));
          return Promise.resolve(items[idx]);
        }
        return Promise.resolve(null);
      } catch {
        return Promise.resolve(null);
      }
    },
    toggle: (id: string, active: boolean) => {
      try {
        const raw = localStorage.getItem("neuro_announcements");
        const items: Array<{ id: string; title: string; body: string; active: boolean; created_at: string }> = raw ? JSON.parse(raw) : [];
        const idx = items.findIndex((a) => a.id === id);
        if (idx !== -1) {
          items[idx].active = active;
          localStorage.setItem("neuro_announcements", JSON.stringify(items));
          window.dispatchEvent(new Event("neuro_announcements_updated"));
          return Promise.resolve(items[idx]);
        }
        return Promise.resolve(null);
      } catch {
        return Promise.resolve(null);
      }
    },
    delete: (id: string) => {
      try {
        const raw = localStorage.getItem("neuro_announcements");
        let items: Array<{ id: string; title: string; body: string; active: boolean; created_at: string }> = raw ? JSON.parse(raw) : [];
        items = items.filter((a) => a.id !== id);
        localStorage.setItem("neuro_announcements", JSON.stringify(items));
        window.dispatchEvent(new Event("neuro_announcements_updated"));
        return Promise.resolve(null);
      } catch {
        return Promise.resolve(null);
      }
    },
  },
  helpDesk: {
    tickets: (page = 1) => request<{ tickets: Array<Record<string, unknown>>; total: number; page: number; limit: number }>(`/admin/tickets?page=${page}&limit=10`),
    articles: () => request<Array<Record<string, unknown>>>("/admin/articles"),
    updateTicket: (id: string, data: Record<string, unknown>) => request<null>(`/admin/tickets/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    createArticle: (data: { title: string; slug: string; body: string; published: boolean }) => request<null>("/admin/articles", { method: "POST", body: JSON.stringify(data) }),
    deleteArticle: (id: string) => request<null>(`/admin/articles/${id}`, { method: "DELETE" }),
  },
  queries: {
    recent: (_limit: number) => Promise.resolve([]) as Promise<Array<Record<string, unknown>>>,
  },
  getAdmins: () => request<Record<string, unknown>[]>("/admin/admins"),
  auditLog: {
    list: (limit = 100) => request<Record<string, unknown>[]>(`/admin/audit-log?limit=${limit}`),
  },
};

export const api = {
  auth,
  profiles,
  savedDatasets,
  collections,
  searchHistory,
  socialLinks,
  admin,
  account: { delete: () => request<null>("/users/me", { method: "DELETE" }) },
  datasets: {
    async search(query: string) {
      const data = await request<{
        source: string;
        results?: Record<string, unknown>[];
        queryId?: string;
      }>("/datasets/search", { method: "POST", body: JSON.stringify({ query }) });
      // ponytail: pass response-level source so mapDataset can relabel 'web_search' → 'Database' on cache hits.
      return { ...data, results: (data.results ?? []).map((r) => mapDataset(r, data.source)) };
    },
    async getById(id: string): Promise<SearchResult> {
      const data = await request<Record<string, unknown>>(`/datasets/${id}`, {}, false);
      return mapDataset(data);
    },
  },
  streamUrl: (queryId: string) => `${BASE_URL}/stream/${encodeURIComponent(queryId)}`,
  BASE_URL,
};
