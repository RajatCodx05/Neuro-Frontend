export const BASE_URL = (() => {
  if (typeof window === "undefined") {
    // ponytail: SSR requires an absolute URL on the server-side to prevent relative fetch errors
    return "https://neuro-server.vercel.app/api/v1";
  }
  // Browser always uses the relative path to route through Vercel rewrites (first-party cookies)
  return "/api/v1";
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
  role: "academic_researcher" | "industry_researcher" | "healthcare_professional" | "data_ai_engineer" | "other" | null;
  institute: string | null;
  notifications_enabled: boolean;
  notification_preferences: NotificationPreferences;
  onboarding_complete: boolean;
  is_deleted?: boolean;
  deletion_requested_at?: string | null;
  scheduled_deletion_at?: string | null;
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
  access_tier?: string | null;
  verified: string | null;
  doi: string | null;
  url: string | null;
  retrievalSource?: "internal" | "external";
};

export type LiteratureResult = {
  title: string;
  abstract: string | null;
  authors: string[];
  journal: string | null;
  year: number | null;
  doi: string | null;
  pmid: string | null;
  url: string | null;
  provider: string;
  citation_count: number | null;
  publication_type: string | null;
  score: number | null;
};
export type SavedPaper = LiteratureResult & {
  id: string;
  created_at: string;
};
export type DatasetReactionSummary = {
  datasetId: string;
  likes: number;
  dislikes: number;
  userReaction: "like" | "dislike" | null;
};

export type AdminAnalyticsRepository = {
  source: string;
  name: string;
  datasetsIndexed: number;
  searchesServed: number;
  datasetCount: number | null;
  syncStatus: "online" | "syncing" | "offline" | null;
  lastSyncAt: string | null;
};

export type AdminAnalyticsPerformanceDay = {
  day: string;
  count: number;
  avgMs: number;
  medianMs: number | null;
  minMs: number | null;
  maxMs: number | null;
  p95Ms: number | null;
};

export type AdminAnalyticsStage = { count: number; avgMs: number; errors: number } | null;

export type AdminAnalytics = {
  series: Array<{ day: string; count: number }>;
  users: number;
  saved: number;
  collections: number;
  cacheHitRate: number;
  mergedCount?: number;
  repositories?: AdminAnalyticsRepository[];
  searchPerformance?: {
    daily: AdminAnalyticsPerformanceDay[];
    overall: {
      totalOps: number;
      avgMs: number;
      medianMs: number | null;
      minMs: number | null;
      maxMs: number | null;
      p95Ms: number | null;
    };
    stages: Record<string, AdminAnalyticsStage>;
  };
  searchOutcomes?: {
    total: number;
    withResults: number;
    noResults: number;
    bySource: { cache: number; merged: number; fallback: number };
    avgResultsPerSearch: number | null;
    mostCommonQuery: { query: string; count: number } | null;
    mostCommonEmptyQuery: { query: string; count: number } | null;
    failedSearchOperations: number;
    topFailureReason: string | null;
    topFailedQuery: string | null;
  };
};

// ── Phase 8 Observability types ───────────────────────────────────────────────

export type AdminSearchItem = {
  _id: string;
  requestId: string | null;
  rawQuery: string;
  resultSource: 'cache' | 'fallback' | 'merged' | 'out_of_domain';
  resultCount: number;
  provenance: {
    mongodb_dataset?: number;
    mongodb_catalog?: number;
    repository?: number;
    discovery?: number;
  } | null;
  timings: {
    totalMs?: number | null;
    queryParsingMs?: number | null;
    datasetRetrievalMs?: number | null;
    catalogRetrievalMs?: number | null;
    repositoryMs?: number | null;
    discoveryMs?: number | null;
    rankingMs?: number | null;
  } | null;
  filters?: Record<string, unknown> | null;
  createdAt: string;
};

export type AdminAgentItem = {
  _id: string;
  requestId: string | null;
  queryId: string | null;
  agent: string;
  provider: string | null;
  model: string | null;
  query: string;
  durationMs: number;
  resultCount: number;
  status: 'success' | 'error';
  errorMessage: string | null;
  createdAt: string;
};

export type AdminTokenCost = {
  totalCost: number | null;
  inputCost: number | null;
  outputCost: number | null;
  isEstimated: boolean;
  costAvailable: boolean;
  pricingAvailable: boolean;
  reason: string | null;
  currency: string;
};

export type AdminTokenItem = {
  _id: string;
  requestId: string | null;
  userEmail: string;
  agent: string;
  provider: string | null;
  model: string;
  tokens: number;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  usageType: 'actual' | 'estimated' | null;
  status: 'success' | 'error';
  createdAt: string;
  cost: AdminTokenCost;
};

export type AdminExternalLog = {
  _id: string;
  requestId: string | null;
  service: string;
  operation: string;
  endpoint: string | null;
  durationMs: number;
  status: 'success' | 'error';
  httpStatus: number | null;
  error: string | null;
  createdAt: string;
};

export type AdminExternalLogSummary = {
  count: number;
  avgMs: number;
  maxMs: number;
  minMs: number;
  errors: number;
};

export type AdminCostRecord = {
  totalCost: number | null;
  llmCost: number | null;
  externalCost: number | null;
  searchCount: number;
  actualSearches: number;
  estimatedSearches: number;
  costAvailable: boolean;
  pricingAvailable: boolean;
  currency: string;
  period?: string;
};

export type AdminCostBreakdown = {
  period: { from: string | null; to: string | null };
  totals: { searchCount: number; calculableSearchCount: number; llmCost: number; externalCost: number; totalCost: number; calculableTotalCost: number; currency: string };
  coverage: { totalSearches: number; searchesWithCalculableCost: number; searchesWithEstimatedCost: number; searchesWithUnavailableCost: number; calculableEstimatedCount: number; percentCalculable: number; percentEstimated: number; percentUnavailable: number };
  averages: { avgCostPerSearch: number | null; avgLlmPerSearch: number | null; avgExternalPerSearch: number | null; overallAvgCostPerSearch: number | null; assumedCostPerSearch: number | null };
  breakdown: {
    byProvider: Array<{ provider: string; llmCost: number; count: number; costAvailableCount: number; unavailableCount: number; percentage: number }>;
    byModel: Array<{ model: string; provider: string; llmCost: number; count: number; costAvailableCount: number; percentage: number }>;
    byAgent: Array<{ agent: string; llmCost: number; count: number; costAvailableCount: number; percentage: number }>;
    byService: Array<{ service: string; externalCost: number; count: number; costAvailableCount: number; unavailableCount: number; percentage: number }>;
    byUsageType: { actual: { cost: number; count: number }; estimated: { cost: number; count: number }; unknown: { cost: number; count: number } };
    byCostType: { llm: { cost: number; percentage: number; count: number }; external: { cost: number; percentage: number; count: number } };
  };
  drivers: { topModel: { model: string; provider: string; llmCost: number; percentage: number } | null; topAgent: { agent: string; llmCost: number; percentage: number } | null; topProvider: { provider: string; llmCost: number; percentage: number } | null; topService: { service: string; externalCost: number; percentage: number } | null };
  daily: Array<{ date: string; searchCount: number; llmCost: number; externalCost: number; totalCost: number; byProvider: Record<string, number>; byModel: Record<string, number> }>;
  meta: { llmRecordCount: number; externalRecordCount: number; calculableLlmCost: number; calculableExternalCost: number };
};

export type AdminCostScaling = {
  period: { from: string | null; to: string | null };
  measured: { totals: AdminCostBreakdown['totals']; coverage: AdminCostBreakdown['coverage']; averages: AdminCostBreakdown['averages'] };
  assumptions: { historicalPeriod: { from: string | null; to: string | null }; historicalTotalSearches: number; historicalCalculableSearches: number; historicalCalculableCost: number; historicalCoveragePercent: number; avgCostPerSearch: number | null; avgLlmPerSearch: number | null; avgExternalPerSearch: number | null; formula: string; note: string };
  scenarios: number[];
  projections: Array<{ searchesPerDay: number; projectedDailyCost: number; projectedMonthlyCost: number; projectedLlmDailyCost: number; projectedExternalDailyCost: number; currency: string; assumedCostPerSearch: number }>;
  insufficient: boolean;
  insufficientReasons: string[];
  warnings: string[];
  drivers: AdminCostBreakdown['drivers'];
  breakdown: AdminCostBreakdown['breakdown'];
};

export type AdminSearchDetail = {
  requestId: string;
  queryLog: AdminSearchItem | null;
  agentLogs: AdminAgentItem[];
  tokenUsages: (AdminTokenItem & { cost: AdminTokenCost })[];
  externalLogs: AdminExternalLog[];
  cost: AdminCostRecord | null;
  timings: AdminSearchItem['timings'];
  provenance: AdminSearchItem['provenance'];
};

function getAnonKey(): string {
  if (typeof window === "undefined") return "anon_ssr";
  let key = localStorage.getItem("neuro_anon_key");
  if (!key) {
    key = "anon_" + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
    localStorage.setItem("neuro_anon_key", key);
  }
  return key;
}

type Envelope<T> = { success: boolean; message: string; data: T };
let accessToken: string | null = null;
// Avoid repeating /auth/me while a session is established in this browser tab.
// The backend still authorizes every protected API request.
let currentUser: AuthUser | null = null;
let currentUserRequest: Promise<AuthUser> | null = null;

/**
 * Store the access token in memory only (never sessionStorage / localStorage).
 * The refresh token is held in an httpOnly cookie which is not accessible to JS,
 * so XSS cannot exfiltrate it.  On page reload the cookie is used by
 * refreshAccessToken() to mint a new short-lived access token.
 *
 * §10.2: Short-lived access tokens + httpOnly refresh cookie is the intended
 * architecture — persisting the access token to sessionStorage defeated the
 * purpose of using httpOnly cookies for the long-lived credential.
 */
function setAccessToken(token: string | null) {
  accessToken = token;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("neuro-auth-changed"));
  }
}

function getAccessToken() {
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

/** HTTP methods that are safe to retry on a transient 401 (idempotent). */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let response = await fetch(`${BASE_URL}${path}`, { ...init, headers, credentials: "include" });
  // Only retry idempotent methods (GET/HEAD/OPTIONS) on 401 — retrying
  // DELETE, PATCH, POST could cause duplicate mutations (double-delete, double-save).
  if (response.status === 401 && retry && path !== "/auth/refresh" && SAFE_METHODS.has((init.method || 'GET').toUpperCase())) {
    try {
      await refreshAccessToken();
    } catch {
      currentUser = null;
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
    is_deleted: Boolean(data.isDeleted),
    deletion_requested_at: data.deletionRequestedAt ? String(data.deletionRequestedAt) : null,
    scheduled_deletion_at: data.scheduledDeletionAt ? String(data.scheduledDeletionAt) : null,
  };
}
export function cleanSummaryText(raw: string): string {
  if (!raw) return "";
  let text = raw;

  // 1. Remove Git metadata, scraping junk, & README noise
  text = text.replace(/Git Hash:\s*[a-f0-9]+/gi, "");
  text = text.replace(/##\s*README/gi, "");
  text = text.replace(/##\s*Dataset Description/gi, "");
  text = text.replace(/BranchesTags\s+Open\s+more\s+actions\s+menu/gi, "");

  // 2. Strip HTML tags & decode common HTML entities
  text = text
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|h[1-6]|li)>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");

  // 3. Remove Markdown header hashes (#, ##, ###, ####)
  text = text.replace(/#{1,6}\s*/g, " ");

  // 4. Remove orphan section numbers at sentence starts (e.g., "3.2.", "1.")
  text = text.replace(/(^\s*|\s+)(?:\d+\.)+\d*\s*/g, " ");

  // 5. Collapse extra spaces
  return text.replace(/\s+/g, " ").trim();
}

export const stripHtml = cleanSummaryText;

function mapRetrievalSource(rawSource: unknown): "internal" | "external" | undefined {
  const s = String(rawSource ?? "").trim().toLowerCase();
  if (s === "mongodb" || s === "mongodb_dataset" || s === "mongodb_catalog" || s === "catalog") return "internal";
  if (s === "repository" || s === "discovery") return "external";
  return undefined;
}

// ponytail: resultSource='cache' means record already in DB — relabel 'web_search' → 'Database'.
export function mapDataset(data: Record<string, unknown>, resultSource?: string): SearchResult {
  const list = (value: unknown) => (Array.isArray(value) ? value.join(", ") : String(value ?? ""));
  const verified = data.last_verified_at
    ? new Date(String(data.last_verified_at)).toLocaleDateString()
    : ((data.trust_tier as string | null) ?? null);
  const rawSource = String(data.source ?? "Dataset");
  const repo = rawSource === "web_search" && resultSource === "cache" ? "Database" : rawSource;
  const retrievalSource = mapRetrievalSource(data._source);
  // Stability (Expand 404 fix): repository/discovery-tier records come straight
  // from Python without a Mongo `_id` (and `id` is null), so fall back to
  // `source_id` — the backend getById resolves `/datasets/:id` by Mongo `_id`
  // OR `source_id`. Filtering never touches these fields, so the identifier is
  // preserved end-to-end from the cached pool to the card's Expand button.
  return {
    id: String(data._id ?? data.id ?? data.source_id ?? ""),
    name: String(data.title ?? "Untitled dataset"),
    repo,
    modality: list(data.modality) || "DS",
    description: cleanSummaryText(String(data.description ?? "")),
    subjects: typeof data.subject_count === "number" ? data.subject_count : null,
    size: (data.size_label as string | null) ?? null,
    region: (data.region as string | null) ?? null,
    species: list(data.species) || null,
    ageGroup: (data.age_group as string | null) ?? null,
    disease: list(data.disease) || null,
    license: (data.license as string | null) ?? null,
    access: (data.access_tier as string | null) ?? null,
    access_tier: (data.access_tier as string | null) ?? null,
    verified,
    doi: (data.doi as string | null) ?? null,
    url: (data.url as string | null) ?? null,
    ...(retrievalSource ? { retrievalSource } : {}),
  };
}

const auth = {
  async login(email: string, password: string) {
    const data = await request<{ accessToken: string; user: Record<string, unknown> }>(
      "/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) },
      false,
    );
    currentUser = mapUser(data.user);
    setAccessToken(data.accessToken);
    return currentUser;
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
    currentUser = mapUser(data.user);
    setAccessToken(data.accessToken);
    return currentUser;
  },
  async google(idToken: string) {
    const data = await request<{
      accessToken: string;
      user: Record<string, unknown>;
      isOnboarded: boolean;
    }>("/auth/google", { method: "POST", body: JSON.stringify({ idToken }) }, false);
    currentUser = mapUser(data.user);
    setAccessToken(data.accessToken);
    return { user: currentUser, isOnboarded: data.isOnboarded };
  },
  resendOtp: (email: string) =>
    request<null>("/auth/resend-otp", { method: "POST", body: JSON.stringify({ email }) }, false),
  async me() {
    if (currentUser) return currentUser;
    if (!currentUserRequest) {
      currentUserRequest = (async () => {
        if (!getAccessToken()) await refreshAccessToken();
        const user = mapUser(await request<Record<string, unknown>>("/auth/me"));
        currentUser = user;
        return user;
      })().finally(() => { currentUserRequest = null; });
    }
    return currentUserRequest;
  },
  async logout() {
    await request<null>("/auth/logout", { method: "POST" }, false);
    currentUser = null;
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
      // ponytail: regular profile update (Full name, Phone, Institute, Role)
      // Only include phone if it is truthy to avoid sending empty phone string validations to Joi.
      const phone = !data.phone ? {} : splitPhone(data.phone);
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
    resendLoginOtp: (email: string) =>
      request<null>("/admin/resend-login-otp", { method: "POST", body: JSON.stringify({ email }) }, false),
  },
  async dashboard() {
    return request<Record<string, unknown>>("/admin/dashboard");
  },
  async analytics() {
    return request<AdminAnalytics>("/admin/analytics");
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
    list: async () => {
      const values = await request<Record<string, unknown>[]>("/admin/repositories");
      return values.map((v) => ({
        id: idOf(v),
        name: String(v.name),
        trust_tier: String(v.trust_tier),
        sync_status: String(v.sync_status),
        dataset_count: Number(v.dataset_count ?? 0),
        last_sync_at: v.last_sync_at ? String(v.last_sync_at) : null,
        endpoint_config: (v.endpoint_config as Record<string, unknown>) ?? {},
      }));
    },
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
    // Phase 2 GET APIs
    popularCandidates: (params?: { page?: number; limit?: number }) =>
      request<{
        items: Array<{
          datasetId: string;
          canonicalTitle: string;
          repository: string;
          modality: string[];
          likes: number;
          dislikes: number;
          netScore: number;
          description: string | null;
          subjects: number | null;
          region: string | null;
          species: string[];
          ageGroup: string | null;
          disease: string | null;
        }>;
        pagination: { page: number; limit: number; total: number; totalPages: number };
      }>(`/admin/moderation/popular-candidates?page=${params?.page || 1}&limit=${params?.limit || 30}`),

    dislikeQueue: (params?: { reason?: string; minDislikes?: number; page?: number; limit?: number }) => {
      const q = new URLSearchParams();
      if (params?.reason) q.set("reason", params.reason);
      if (params?.minDislikes) q.set("minDislikes", String(params.minDislikes));
      if (params?.page) q.set("page", String(params.page));
      if (params?.limit) q.set("limit", String(params.limit));
      const queryStr = q.toString() ? `?${q.toString()}` : "";
      return request<{
        items: Array<{
          datasetId: string;
          canonicalTitle: string;
          likes: number;
          dislikes: number;
          totalReactions: number;
          dislikeRatio: number;
          netScore: number;
          topReasons: Array<{ reason: string; count: number; percentage: number }>;
          pendingFeedbackCount: number;
        }>;
        pagination: { page: number; limit: number; total: number; totalPages: number };
      }>(`/admin/moderation/dislike-queue${queryStr}`);
    },

    dislikeDetails: (datasetId: string) =>
      request<{
        dataset: {
          datasetId: string;
          title: string;
          source: string;
          modality: string[];
          species: string[];
          description: string | null;
          region: string | null;
          disease: string | null;
          ageGroup: string | null;
          subjectCount: number | null;
        };
        override: Record<string, unknown> | null;
        reactionSummary: {
          likes: number;
          dislikes: number;
          totalReactions: number;
          dislikeRatio: number;
          netScore: number;
        };
        feedbackList: Array<{
          id: string;
          reason: string;
          comment: string | null;
          status: string;
          isAnonymous: boolean;
          createdAt: string;
        }>;
      }>(`/admin/moderation/dislike-queue/${encodeURIComponent(datasetId)}`),

    // Phase 3 curation API client methods
    publishPopular: (datasetId: string, data?: { displayOrder?: number; featuredTitleOverride?: string }) =>
      request<Record<string, unknown>>(`/admin/moderation/popular/${encodeURIComponent(datasetId)}/publish`, {
        method: "POST",
        body: JSON.stringify(data || {}),
      }),
    unpublishPopular: (datasetId: string) =>
      request<Record<string, unknown>>(`/admin/moderation/popular/${encodeURIComponent(datasetId)}/unpublish`, {
        method: "POST",
      }),
    reorderPopular: (items: Array<{ datasetId: string; displayOrder: number }>) =>
      request<null>("/admin/moderation/popular/reorder", {
        method: "PUT",
        body: JSON.stringify({ items }),
      }),
    updateOverride: (datasetId: string, data: Record<string, unknown>) =>
      request<Record<string, unknown>>(`/admin/datasets/${encodeURIComponent(datasetId)}/override`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    deleteOverride: (datasetId: string) =>
      request<null>(`/admin/datasets/${encodeURIComponent(datasetId)}/override`, {
        method: "DELETE",
      }),
    archiveDataset: (datasetId: string) =>
      request<null>(`/admin/datasets/${encodeURIComponent(datasetId)}/archive`, {
        method: "POST",
      }),
    restoreDataset: (datasetId: string) =>
      request<null>(`/admin/datasets/${encodeURIComponent(datasetId)}/restore`, {
        method: "POST",
      }),
    hardDeleteDataset: (datasetId: string, confirmationId: string) =>
      request<null>(`/admin/datasets/${encodeURIComponent(datasetId)}`, {
        method: "DELETE",
        body: JSON.stringify({ confirmationId }),
      }),

    publishedCatalog: (params?: { page?: number; limit?: number }) =>
      request<{
        items: Array<{
          datasetId: string;
          canonicalTitle: string;
          featuredTitleOverride: string | null;
          repository: string;
          status: string;
          displayOrder: number;
          publishedAt: string | null;
          publishedBy: string | null;
          likes: number;
          dislikes: number;
          isActive: boolean;
        }>;
        pagination: { page: number; limit: number; total: number; totalPages: number };
      }>(`/admin/moderation/published?page=${params?.page || 1}&limit=${params?.limit || 30}`),

    searchDatasets: (params?: { q?: string; page?: number; limit?: number }) => {
      const qParams = new URLSearchParams();
      if (params?.q) qParams.set("q", params.q);
      if (params?.page) qParams.set("page", String(params.page));
      if (params?.limit) qParams.set("limit", String(params.limit));
      const queryStr = qParams.toString() ? `?${qParams.toString()}` : "";
      return request<{
        items: Array<{
          datasetId: string;
          title: string;
          repository: string;
          source: string;
          source_id: string | null;
          description: string | null;
          modality: string[];
          species: string[];
          disease: string | null;
          tasks: string[];
          region: string | null;
          ageGroup: string | null;
          subjects: number | null;
          size: string | null;
          publicationYear: number | null;
          studyDesign: string | null;
          isPublished: boolean;
        }>;
        pagination: { page: number; limit: number; total: number; totalPages: number };
      }>(`/admin/moderation/datasets/search${queryStr}`);
    },

    // Phase 1 / pre-existing stubs (preserved for backward compatibility)
    queue: () => Promise.resolve([]) as Promise<Array<Record<string, unknown>>>,
    published: () => request<{ items: Array<Record<string, unknown>> }>("/admin/moderation/published").then((res) => res.items || []),
    approve: (_id: string) => Promise.resolve(null),
    reject: (_id: string, _reason?: string) => Promise.resolve(null),
  },
  infra: {
    mongo: () => request<Record<string, unknown>>('/admin/infra/mongo'),
    redis: () => request<Record<string, unknown>>('/admin/infra/redis'),
    storage: () => request<Record<string, unknown>>('/admin/infra/storage'),
    // ponytail: backward-compat — no params → array; with params → paginated { items, total, limit, offset }
    tokens: async (params?: { requestId?: string; provider?: string; model?: string; agent?: string; usageType?: string; status?: string; from?: string; to?: string; limit?: number; offset?: number }) => {
      if (!params || Object.keys(params).length === 0) {
        const values = await request<Record<string, unknown>[]>('/admin/tokens');
        return values.map((v) => ({ ...v, id: idOf(v) }));
      }
      const q = new URLSearchParams();
      if (params.requestId) q.set('requestId', params.requestId);
      if (params.provider) q.set('provider', params.provider);
      if (params.model) q.set('model', params.model);
      if (params.agent) q.set('agent', params.agent);
      if (params.usageType) q.set('usageType', params.usageType);
      if (params.status) q.set('status', params.status);
      if (params.from) q.set('from', params.from);
      if (params.to) q.set('to', params.to);
      if (params.limit != null) q.set('limit', String(params.limit));
      if (params.offset != null) q.set('offset', String(params.offset));
      return request<{ items: AdminTokenItem[]; total: number; limit: number; offset: number }>(`/admin/tokens?${q}`);
    },
    agents: async (params?: { requestId?: string; agent?: string; provider?: string; status?: string; from?: string; to?: string; limit?: number; offset?: number }) => {
      if (!params || Object.keys(params).length === 0) {
        const values = await request<Record<string, unknown>[]>('/admin/agents');
        return values.map((v) => ({ ...v, id: idOf(v) }));
      }
      const q = new URLSearchParams();
      if (params.requestId) q.set('requestId', params.requestId);
      if (params.agent) q.set('agent', params.agent);
      if (params.provider) q.set('provider', params.provider);
      if (params.status) q.set('status', params.status);
      if (params.from) q.set('from', params.from);
      if (params.to) q.set('to', params.to);
      if (params.limit != null) q.set('limit', String(params.limit));
      if (params.offset != null) q.set('offset', String(params.offset));
      return request<{ items: AdminAgentItem[]; total: number; limit: number; offset: number }>(`/admin/agents?${q}`);
    },
  },
  // Phase 8 — Search Observability
  searches: {
    list: (params?: { from?: string; to?: string; resultSource?: string; q?: string; limit?: number; offset?: number }) => {
      const qs = new URLSearchParams();
      if (params?.from) qs.set('from', params.from);
      if (params?.to) qs.set('to', params.to);
      if (params?.resultSource) qs.set('resultSource', params.resultSource);
      if (params?.q) qs.set('q', params.q);
      if (params?.limit != null) qs.set('limit', String(params.limit));
      if (params?.offset != null) qs.set('offset', String(params.offset));
      const queryStr = qs.toString() ? `?${qs}` : '';
      return request<{ items: AdminSearchItem[]; total: number; limit: number; offset: number }>(`/admin/searches${queryStr}`);
    },
    detail: (requestId: string) =>
      request<AdminSearchDetail>(`/admin/searches/${encodeURIComponent(requestId)}`),
  },
  // Phase 8 — External API Logs
  externalLogs: {
    list: (params?: { service?: string; status?: string; from?: string; to?: string; requestId?: string; limit?: number; offset?: number }) => {
      const qs = new URLSearchParams();
      if (params?.service) qs.set('service', params.service);
      if (params?.status) qs.set('status', params.status);
      if (params?.from) qs.set('from', params.from);
      if (params?.to) qs.set('to', params.to);
      if (params?.requestId) qs.set('requestId', params.requestId);
      if (params?.limit != null) qs.set('limit', String(params.limit));
      if (params?.offset != null) qs.set('offset', String(params.offset));
      const queryStr = qs.toString() ? `?${qs}` : '';
      return request<{ items: AdminExternalLog[]; total: number; limit: number; offset: number; summary: AdminExternalLogSummary }>(`/admin/external-logs${queryStr}`);
    },
  },
  // Phase 6/8/11 — Cost Intelligence
  cost: {
    summary: (params?: { from?: string; to?: string; groupBy?: 'day' | 'month' }) => {
      const qs = new URLSearchParams();
      if (params?.from) qs.set('from', params.from);
      if (params?.to) qs.set('to', params.to);
      if (params?.groupBy) qs.set('groupBy', params.groupBy);
      return request<AdminCostRecord>(`/admin/cost/summary${qs.toString() ? `?${qs}` : ''}`);
    },
    byRequest: (requestId: string) =>
      request<AdminCostRecord>(`/admin/cost/request/${encodeURIComponent(requestId)}`),
    daily: (params?: { date?: string; from?: string; to?: string }) => {
      const qs = new URLSearchParams();
      if (params?.date) qs.set('date', params.date);
      if (params?.from) qs.set('from', params.from);
      if (params?.to) qs.set('to', params.to);
      return request<AdminCostRecord>(`/admin/cost/daily${qs.toString() ? `?${qs}` : ''}`);
    },
    monthly: (params?: { month?: string; from?: string; to?: string }) => {
      const qs = new URLSearchParams();
      if (params?.month) qs.set('month', params.month);
      if (params?.from) qs.set('from', params.from);
      if (params?.to) qs.set('to', params.to);
      return request<AdminCostRecord>(`/admin/cost/monthly${qs.toString() ? `?${qs}` : ''}`);
    },
    pricing: () => request<{ llm: Record<string, unknown>; external: Record<string, unknown>; note: string }>('/admin/cost/pricing'),
    breakdown: (params?: { from?: string; to?: string }) => {
      const qs = new URLSearchParams();
      if (params?.from) qs.set('from', params.from);
      if (params?.to) qs.set('to', params.to);
      return request<AdminCostBreakdown>(`/admin/cost/breakdown${qs.toString() ? `?${qs}` : ''}`);
    },
    scaling: (params?: { from?: string; to?: string; scenarios?: string }) => {
      const qs = new URLSearchParams();
      if (params?.from) qs.set('from', params.from);
      if (params?.to) qs.set('to', params.to);
      if (params?.scenarios) qs.set('scenarios', params.scenarios);
      return request<AdminCostScaling>(`/admin/cost/scaling${qs.toString() ? `?${qs}` : ''}`);
    },
  },
  announcements: {
    list: async () => {
      try {
        return await request<Array<{ id: string; title: string; body: string; active: boolean; created_at: string }>>("/admin/announcements", {}, true);
      } catch {
        return [];
      }
    },
    create: (data: { title: string; body: string; active?: boolean }) =>
      request<{ id: string; title: string; body: string; active: boolean; created_at: string }>("/admin/announcements", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: { title: string; body: string; active?: boolean }) =>
      request<{ id: string; title: string; body: string; active: boolean; created_at: string }>(`/admin/announcements/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    toggle: (id: string, active: boolean) =>
      request<{ id: string; title: string; body: string; active: boolean; created_at: string }>(`/admin/announcements/${id}/toggle`, {
        method: "PATCH",
        body: JSON.stringify({ active }),
      }),
    delete: (id: string) =>
      request<null>(`/admin/announcements/${id}`, { method: "DELETE" }),
  },
  helpDesk: {
    tickets: async (page = 1) => {
      const resp = await request<{ tickets: Array<Record<string, unknown>>; total: number; page: number; limit: number }>(`/admin/tickets?page=${page}&limit=10`);
      return {
        ...resp,
        tickets: resp.tickets.map((t) => ({
          id: idOf(t),
          subject: String(t.subject ?? ""),
          message: String(t.message ?? ""),
          status: String(t.status ?? "open"),
          created_at: asDate(t),
          email: t.email ? String(t.email) : undefined,
          name: t.name ? String(t.name) : undefined,
          source: t.source ? String(t.source) : undefined,
        })),
      };
    },
    articles: () => request<Array<Record<string, unknown>>>("/admin/articles"),
    updateTicket: (id: string, data: Record<string, unknown>) => request<null>(`/admin/tickets/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    submitTicket: (data: { subject: string; message: string; email?: string; name?: string }) => request<null>("/admin/tickets/ingest", { method: "POST", body: JSON.stringify(data) }),
    createArticle: (data: { title: string; slug: string; body: string; published: boolean }) => request<null>("/admin/articles", { method: "POST", body: JSON.stringify(data) }),
    deleteArticle: (id: string) => request<null>(`/admin/articles/${id}`, { method: "DELETE" }),
  },
  queries: {
    recent: (_limit: number) => Promise.resolve([]) as Promise<Array<Record<string, unknown>>>,
  },
  getAdmins: () => request<Record<string, unknown>[]>("/admin/admins"),
  updateProfile: (data: { name: string }) =>
    request<Record<string, unknown>>("/admin/profile", { method: "PATCH", body: JSON.stringify(data) }),
  auditLog: {
    list: (limit = 100) => request<Record<string, unknown>[]>(`/admin/audit-log?limit=${limit}`),
  },
};

export type ApiRepository = {
  id: string;
  name: string;
  trust_tier: "open" | "registered" | "restricted";
  sync_status: "online" | "syncing" | "offline";
  dataset_count: number;
  last_sync_at: string | null;
  endpoint_config: { url?: string };
};

// ponytail: public endpoint — no token needed, used by landing page
const repositories = {
  list: async () => {
    const values = await request<Record<string, unknown>[]>("/repositories", {}, false);
    return values.map((v) => ({
      id: idOf(v),
      name: String(v.name),
      trust_tier: String(v.trust_tier) as "open" | "registered" | "restricted",
      sync_status: String(v.sync_status) as "online" | "syncing" | "offline",
      dataset_count: Number(v.dataset_count ?? 0),
      last_sync_at: v.last_sync_at ? String(v.last_sync_at) : null,
      endpoint_config: (v.endpoint_config as Record<string, unknown>) ?? {},
    })) as ApiRepository[];
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
  repositories,
  announcements: {
    list: async () => {
      try {
        return await request<Array<{ id: string; title: string; body: string; active: boolean; created_at: string }>>("/announcements", {}, false);
      } catch {
        return [];
      }
    },
  },
  account: {
    delete: (payload: { confirmation: string; password?: string }) =>
      request<{ isDeleted: boolean; scheduledDeletionAt: string }>("/users/me", {
        method: "DELETE",
        body: JSON.stringify(payload),
      }),
    cancelDeletion: () =>
      request<{ isDeleted: boolean }>("/users/cancel-deletion", { method: "POST" }),
  },
  datasets: {
    async search(query: string, filters?: Record<string, string[]>) {
      const data = await request<{
        source: string;
        results?: Record<string, unknown>[];
        metrics?: Record<string, unknown>;
        filters?: Record<string, unknown>;
        queryId?: string;
      }>("/datasets/search", { method: "POST", body: JSON.stringify({ query, filters }) });
      // ponytail: pass response-level source so mapDataset can relabel 'web_search' → 'Database' on cache hits.
      // v0.3 (§8.4/§9.2, additive): keep the RAW structured records so the filtering engine sees
      // arrays (not flattened display strings), and surface the parsed-intent `filters` (FR-8/FR-7).
      // Older consumers only read `results` and are unaffected.
      return {
        ...data,
        results: (data.results ?? []).map((r) => mapDataset(r, data.source)),
        rawResults: data.results ?? [],
        filters: data.filters ?? {},
      };
    },
    async getById(id: string): Promise<SearchResult> {
      const data = await request<Record<string, unknown>>(`/datasets/${id}`, {}, false);
      return mapDataset(data);
    },
    reactions: {
      // Phase 1: toggle now accepts optional dislike feedback fields.
      // When reaction === "like" | null, reason/comment are ignored by the backend.
      // Existing callers that pass only (datasetId, reaction) remain fully compatible.
      async toggle(
        datasetId: string,
        reaction: "like" | "dislike" | null,
        reason?: string,
        comment?: string | null,
      ): Promise<DatasetReactionSummary> {
        return request<DatasetReactionSummary>("/datasets/reactions", {
          method: "POST",
          body: JSON.stringify({
            datasetId,
            reaction,
            anonKey: getAnonKey(),
            ...(reason !== undefined ? { reason } : {}),
            ...(comment !== undefined && comment !== null ? { comment } : {}),
          }),
        });
      },
      async getBatch(datasetIds: string[]): Promise<Record<string, DatasetReactionSummary>> {
        if (!datasetIds.length) return {};
        return request<Record<string, DatasetReactionSummary>>("/datasets/reactions/batch", {
          method: "POST",
          body: JSON.stringify({ datasetIds, anonKey: getAnonKey() }),
        });
      },
    },
    // Phase 5: public popular/featured datasets (≤6 curated by admin)
    async popular(): Promise<Array<{
      datasetId: string;
      displayOrder: number;
      title: string;
      description: string | null;
      source: string;
      source_id: string | null;
      url: string | null;
      doi: string | null;
      modality: string[];
      species: string[];
      disease: string | null;
      tasks: string[];
      region: string | null;
      ageGroup: string | null;
      subjects: number | null;
      size: string | null;
      publicationYear: number | null;
      studyDesign: string | null;
    }>> {
      const data = await request<{ items: unknown[] }>("/datasets/popular", {}, false);
      return (data.items ?? []) as ReturnType<typeof this.popular> extends Promise<infer T> ? T : never;
    },
  },
  literature: {
    async search(query: string, signal?: AbortSignal) {
      const data = await request<{
        results: LiteratureResult[];
        metrics?: Record<string, unknown>;
        filters?: Record<string, unknown>;
      }>("/literature/search", { method: "POST", body: JSON.stringify({ query }), signal });
      return data;
    },
  },
  savedPapers: {
    getPaperId(paperOrId: LiteratureResult | SavedPaper | string): string {
      if (typeof paperOrId === "string") return paperOrId;
      return paperOrId.doi || paperOrId.url || paperOrId.title;
    },
    async list(): Promise<SavedPaper[]> {
      try {
        const raw = localStorage.getItem("neurosearch_saved_papers");
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    },
    async save(paper: LiteratureResult): Promise<SavedPaper> {
      const list = await this.list();
      const id = this.getPaperId(paper);
      const existing = list.find((p) => this.getPaperId(p) === id);
      if (existing) return existing;
      const newPaper: SavedPaper = {
        ...paper,
        id,
        created_at: new Date().toISOString(),
      };
      const updated = [newPaper, ...list];
      localStorage.setItem("neurosearch_saved_papers", JSON.stringify(updated));
      return newPaper;
    },
    async delete(paperOrId: LiteratureResult | SavedPaper | string): Promise<void> {
      const id = this.getPaperId(paperOrId);
      const list = (await this.list()).filter((p) => this.getPaperId(p) !== id);
      localStorage.setItem("neurosearch_saved_papers", JSON.stringify(list));
    },
    async isSaved(paperOrId: LiteratureResult | SavedPaper | string): Promise<boolean> {
      const id = this.getPaperId(paperOrId);
      const list = await this.list();
      return list.some((p) => this.getPaperId(p) === id);
    },
  },
  streamUrl: (queryId: string) => `${BASE_URL}/stream/${encodeURIComponent(queryId)}`,
  BASE_URL,
};

