/**
 * api-client.ts — DEMO MODE (localStorage)
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  DEMO CREDENTIALS                                            ║
 * ║                                                              ║
 * ║  Regular user:                                               ║
 * ║    Email   →  demo@neurosearch.ai                            ║
 * ║    Password→  demo1234                                       ║
 * ║                                                              ║
 * ║  Admin user:                                                 ║
 * ║    Email   →  admin@neurosearch.ai                           ║
 * ║    Password→  admin1234                                      ║
 * ║                                                              ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Session is stored in localStorage under the key "ns_demo_session".
 * All data (history, saved datasets, etc.) lives in localStorage too.
 *
 * TO SWITCH TO THE REAL NODE BACKEND:
 *   1. Delete everything in this file.
 *   2. Replace with the real api-client.ts that calls VITE_API_BASE_URL.
 *   3. Make sure your Node backend CORS allows credentials.
 */

// ─── Shared Types ─────────────────────────────────────────────────────────────

export type UserProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: "student" | "researcher" | "clinician" | "other" | null;
  institute: string | null;
  notifications_enabled: boolean;
  onboarding_complete: boolean;
};

export type ModerationStatus = "pending" | "approved" | "rejected";
type ModerationItem = {
  id: string;
  dataset_snapshot: { title: string; source: string };
  source_query: string;
  confidence_score: number;
  discovered_at: string;
  status: ModerationStatus;
};

type PublishedDataset = {
  id: string;
  dataset_id: string;
  dataset_snapshot: Record<string, unknown>;
  created_at: string;
};

export type AuthUser = {
  id: string;
  email: string;
  isAdmin: boolean;
};

export type SearchHistoryItem = {
  id: string;
  query: string;
  created_at: string;
};

export type SavedDataset = {
  id: string;
  dataset_id: string;
  dataset_snapshot: Record<string, unknown>;
  created_at: string;
};

export type Collection = {
  id: string;
  name: string;
  created_at: string;
};

export type SocialLink = {
  id: string;
  platform: string;
  url: string;
};

// ─── localStorage helpers ─────────────────────────────────────────────────────

const SESSION_KEY = "ns_demo_session";
const HISTORY_KEY = "ns_demo_history";
const SAVED_KEY   = "ns_demo_saved";
const COLLS_KEY   = "ns_demo_collections";
const SOCIAL_KEY  = "ns_demo_social";
const PROFILE_KEY = "ns_demo_profile";

function lsGet<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function lsSet(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}
function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Demo accounts ────────────────────────────────────────────────────────────

const DEMO_ACCOUNTS: Record<string, { password: string; isAdmin: boolean }> = {
  "demo@neurosearch.ai":  { password: "demo1234",  isAdmin: false },
  "admin@neurosearch.ai": { password: "admin1234", isAdmin: true  },
};

const DEMO_PROFILES: Record<string, UserProfile> = {
  "demo@neurosearch.ai": {
    id: "demo-user-001",
    full_name: "Alex Chen",
    email: "demo@neurosearch.ai",
    phone: "+1 555 010 2024",
    role: "researcher",
    institute: "Stanford Neuroscience Lab",
    notifications_enabled: true,
    onboarding_complete: true,
  },
  "admin@neurosearch.ai": {
    id: "demo-admin-001",
    full_name: "Admin User",
    email: "admin@neurosearch.ai",
    phone: "+1 555 000 0001",
    role: "other",
    institute: "NeuroSearch HQ",
    notifications_enabled: true,
    onboarding_complete: true,
  },
};

// ─── Auth ─────────────────────────────────────────────────────────────────────

const auth = {
  me: (): Promise<AuthUser> => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return Promise.reject(new Error("Not authenticated"));
    return Promise.resolve(JSON.parse(stored) as AuthUser);
  },

  login: (email: string, password: string): Promise<AuthUser> => {
    const account = DEMO_ACCOUNTS[email.toLowerCase().trim()];
    if (!account || account.password !== password) {
      return Promise.reject(new Error("Invalid email or password"));
    }
    const user: AuthUser = {
      id: email === "admin@neurosearch.ai" ? "demo-admin-001" : "demo-user-001",
      email: email.toLowerCase().trim(),
      isAdmin: account.isAdmin,
    };
    lsSet(SESSION_KEY, user);
    // Pre-seed profile if not already stored
    if (!localStorage.getItem(PROFILE_KEY + "_" + user.id)) {
      lsSet(PROFILE_KEY + "_" + user.id, DEMO_PROFILES[email.toLowerCase().trim()]);
    }
    return Promise.resolve(user);
  },

  signup: (data: {
    email: string;
    password: string;
    full_name: string;
    phone: string;
    email_signup: boolean;
  }): Promise<AuthUser> => {
    const id = "user-" + uid();
    const user: AuthUser = { id, email: data.email, isAdmin: false };
    lsSet(SESSION_KEY, user);
    const profile: UserProfile = {
      id,
      full_name: data.full_name,
      email: data.email,
      phone: data.phone,
      role: null,
      institute: null,
      notifications_enabled: true,
      onboarding_complete: !!data.email_signup,
    };
    lsSet(PROFILE_KEY + "_" + id, profile);
    return Promise.resolve(user);
  },

  logout: (): Promise<void> => {
    localStorage.removeItem(SESSION_KEY);
    return Promise.resolve();
  },

  /**
   * Google OAuth — in demo mode, clicking "Continue with Google"
   * automatically signs in as the regular demo user.
   */
  googleRedirectUrl: (): string => {
    // We intercept this in handleGoogle (auth.tsx) via a custom param.
    // Return a special marker so auth.tsx can detect demo mode.
    return "__DEMO_GOOGLE__";
  },
};

// ─── Demo Google login helper (called from auth.tsx handleGoogle) ─────────────
// auth.tsx checks if the URL starts with "__DEMO__" and calls this instead.
export function demoGoogleSignIn(): AuthUser {
  const user: AuthUser = {
    id: "demo-user-001",
    email: "demo@neurosearch.ai",
    isAdmin: false,
  };
  lsSet(SESSION_KEY, user);
  if (!localStorage.getItem(PROFILE_KEY + "_demo-user-001")) {
    lsSet(PROFILE_KEY + "_demo-user-001", DEMO_PROFILES["demo@neurosearch.ai"]);
  }
  return user;
}

// ─── Profiles ─────────────────────────────────────────────────────────────────

const profiles = {
  getMe: async (): Promise<UserProfile> => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) throw new Error("Not authenticated");
    const user = JSON.parse(stored) as AuthUser;
    const key = PROFILE_KEY + "_" + user.id;
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved) as UserProfile;
    // Fallback for demo accounts
    const demo = DEMO_PROFILES[user.email];
    if (demo) { lsSet(key, demo); return demo; }
    const fresh: UserProfile = {
      id: user.id,
      full_name: null,
      email: user.email,
      phone: null,
      role: null,
      institute: null,
      notifications_enabled: true,
      onboarding_complete: false,
    };
    lsSet(key, fresh);
    return fresh;
  },

  update: async (data: Partial<Omit<UserProfile, "id">>): Promise<UserProfile> => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) throw new Error("Not authenticated");
    const user = JSON.parse(stored) as AuthUser;
    const key = PROFILE_KEY + "_" + user.id;
    const current = await profiles.getMe();
    const updated = { ...current, ...data };
    lsSet(key, updated);
    return updated;
  },
};

// ─── Search History ───────────────────────────────────────────────────────────

/** Seed some demo history on first load */
function seedHistory(userId: string) {
  const key = HISTORY_KEY + "_" + userId;
  if (localStorage.getItem(key)) return;
  const demos: SearchHistoryItem[] = [
    { id: uid(), query: "Alzheimer biomarkers fMRI 2024", created_at: new Date(Date.now() - 86400000 * 1).toISOString() },
    { id: uid(), query: "Neural plasticity cortex rewiring",  created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
    { id: uid(), query: "BDNF expression hippocampus",        created_at: new Date(Date.now() - 86400000 * 3).toISOString() },
    { id: uid(), query: "Dopamine reward pathways addiction",  created_at: new Date(Date.now() - 86400000 * 4).toISOString() },
    { id: uid(), query: "EEG sleep spindles slow wave",       created_at: new Date(Date.now() - 86400000 * 5).toISOString() },
  ];
  lsSet(key, demos);
}

const searchHistory = {
  list: async (): Promise<SearchHistoryItem[]> => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return [];
    const user = JSON.parse(stored) as AuthUser;
    seedHistory(user.id);
    return lsGet<SearchHistoryItem[]>(HISTORY_KEY + "_" + user.id, []);
  },

  insert: async (query: string): Promise<SearchHistoryItem> => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) throw new Error("Not authenticated");
    const user = JSON.parse(stored) as AuthUser;
    const key = HISTORY_KEY + "_" + user.id;
    const items = lsGet<SearchHistoryItem[]>(key, []);
    const item: SearchHistoryItem = { id: uid(), query, created_at: new Date().toISOString() };
    lsSet(key, [item, ...items]);
    return item;
  },

  deleteOne: async (id: string): Promise<void> => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return;
    const user = JSON.parse(stored) as AuthUser;
    const key = HISTORY_KEY + "_" + user.id;
    lsSet(key, lsGet<SearchHistoryItem[]>(key, []).filter((i) => i.id !== id));
  },

  clearAll: async (): Promise<void> => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return;
    const user = JSON.parse(stored) as AuthUser;
    lsSet(HISTORY_KEY + "_" + user.id, []);
  },
};

// ─── Saved Datasets ───────────────────────────────────────────────────────────

const savedDatasets = {
  list: async (): Promise<SavedDataset[]> => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return [];
    const user = JSON.parse(stored) as AuthUser;
    return lsGet<SavedDataset[]>(SAVED_KEY + "_" + user.id, []);
  },

  upsert: async (data: { dataset_id: string; dataset_snapshot: unknown }): Promise<SavedDataset> => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) throw new Error("Not authenticated");
    const user = JSON.parse(stored) as AuthUser;
    const key = SAVED_KEY + "_" + user.id;
    const items = lsGet<SavedDataset[]>(key, []);
    const existing = items.findIndex((i) => i.dataset_id === data.dataset_id);
    const item: SavedDataset = {
      id: existing >= 0 ? items[existing].id : uid(),
      dataset_id: data.dataset_id,
      dataset_snapshot: data.dataset_snapshot as Record<string, unknown>,
      created_at: existing >= 0 ? items[existing].created_at : new Date().toISOString(),
    };
    if (existing >= 0) items[existing] = item;
    else items.unshift(item);
    lsSet(key, items);
    return item;
  },

  delete: async (id: string): Promise<void> => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return;
    const user = JSON.parse(stored) as AuthUser;
    const key = SAVED_KEY + "_" + user.id;
    lsSet(key, lsGet<SavedDataset[]>(key, []).filter((i) => i.id !== id));
  },
};

// ─── Collections ──────────────────────────────────────────────────────────────

const collections = {
  list: async (): Promise<Collection[]> => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return [];
    const user = JSON.parse(stored) as AuthUser;
    return lsGet<Collection[]>(COLLS_KEY + "_" + user.id, []);
  },

  create: async (name: string): Promise<Collection> => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) throw new Error("Not authenticated");
    const user = JSON.parse(stored) as AuthUser;
    const key = COLLS_KEY + "_" + user.id;
    const item: Collection = { id: uid(), name, created_at: new Date().toISOString() };
    lsSet(key, [item, ...lsGet<Collection[]>(key, [])]);
    return item;
  },

  delete: async (id: string): Promise<void> => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return;
    const user = JSON.parse(stored) as AuthUser;
    const key = COLLS_KEY + "_" + user.id;
    lsSet(key, lsGet<Collection[]>(key, []).filter((c) => c.id !== id));
  },
};

// ─── Social Links ─────────────────────────────────────────────────────────────

const socialLinks = {
  list: async (): Promise<SocialLink[]> => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return [];
    const user = JSON.parse(stored) as AuthUser;
    return lsGet<SocialLink[]>(SOCIAL_KEY + "_" + user.id, []);
  },

  upsert: async (platform: string, url: string): Promise<SocialLink> => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) throw new Error("Not authenticated");
    const user = JSON.parse(stored) as AuthUser;
    const key = SOCIAL_KEY + "_" + user.id;
    const items = lsGet<SocialLink[]>(key, []);
    const idx = items.findIndex((s) => s.platform === platform);
    const item: SocialLink = { id: idx >= 0 ? items[idx].id : uid(), platform, url };
    if (idx >= 0) items[idx] = item;
    else items.push(item);
    lsSet(key, items);
    return item;
  },

  delete: async (id: string): Promise<void> => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return;
    const user = JSON.parse(stored) as AuthUser;
    const key = SOCIAL_KEY + "_" + user.id;
    lsSet(key, lsGet<SocialLink[]>(key, []).filter((s) => s.id !== id));
  },
};

// ─── Account ──────────────────────────────────────────────────────────────────

const account = {
  delete: async (): Promise<void> => {
    localStorage.removeItem(SESSION_KEY);
  },
};

// ─── Admin mock data ──────────────────────────────────────────────────────────

function makeSeries(days = 60) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(Date.now() - (days - i) * 86400000);
    return {
      day: d.toISOString().slice(0, 10),
      count: Math.floor(Math.random() * 120) + 10,
    };
  });
}

const MOCK_SERIES = makeSeries(60);

const MOCK_USERS = [
  { id: "demo-admin-001", full_name: "Admin User",   email: "admin@neurosearch.ai", role: "other",      institute: "NeuroSearch HQ",         is_admin: true,  suspended: false, created_at: "2026-01-01T00:00:00Z" },
  { id: "demo-user-001",  full_name: "Alex Chen",    email: "demo@neurosearch.ai",  role: "researcher", institute: "Stanford Neuroscience Lab", is_admin: false, suspended: false, created_at: "2026-02-10T00:00:00Z" },
  { id: uid(),            full_name: "Maria Santos",  email: "m.santos@usp.br",      role: "clinician",  institute: "Universidade de São Paulo", is_admin: false, suspended: false, created_at: "2026-03-01T00:00:00Z" },
  { id: uid(),            full_name: "James Okonkwo", email: "j.okonkwo@nih.gov",    role: "researcher", institute: "NIH",                       is_admin: false, suspended: true,  created_at: "2026-03-15T00:00:00Z" },
  { id: uid(),            full_name: "Priya Nair",    email: "p.nair@iitb.ac.in",    role: "student",    institute: "IIT Bombay",                is_admin: false, suspended: false, created_at: "2026-04-20T00:00:00Z" },
];

const MOCK_REPOS = [
  { id: uid(), name: "OpenNeuro",       trust_tier: "gold",   sync_status: "online",  last_sync_at: new Date(Date.now() - 3600000).toISOString(),    dataset_count: 1240, endpoint_config: {}, created_at: "2026-01-01T00:00:00Z" },
  { id: uid(), name: "PhysioNet",       trust_tier: "gold",   sync_status: "online",  last_sync_at: new Date(Date.now() - 7200000).toISOString(),    dataset_count: 873,  endpoint_config: {}, created_at: "2026-01-05T00:00:00Z" },
  { id: uid(), name: "NIMH Data Arch.", trust_tier: "silver", sync_status: "syncing", last_sync_at: new Date(Date.now() - 86400000).toISOString(),   dataset_count: 540,  endpoint_config: {}, created_at: "2026-02-01T00:00:00Z" },
  { id: uid(), name: "UK Biobank",      trust_tier: "silver", sync_status: "offline", last_sync_at: new Date(Date.now() - 86400000 * 5).toISOString(), dataset_count: 302, endpoint_config: {}, created_at: "2026-02-15T00:00:00Z" },
];

const MOCK_AUDIT = [
  { id: uid(), admin_id: "demo-admin-001", action: "user.suspend",        target_type: "user",   target_id: MOCK_USERS[3].id, metadata: {}, created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: uid(), admin_id: "demo-admin-001", action: "moderation.approve",  target_type: "dataset",target_id: uid(),            metadata: {}, created_at: new Date(Date.now() - 7200000).toISOString() },
  { id: uid(), admin_id: "demo-admin-001", action: "repo.resync",         target_type: "repo",   target_id: MOCK_REPOS[1].id, metadata: {}, created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: uid(), admin_id: "demo-admin-001", action: "announcement.create", target_type: null,     target_id: null,             metadata: {}, created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
];

const MOCK_MOD_QUEUE: ModerationItem[] = [
  { id: uid(), dataset_snapshot: { title: "fMRI resting-state connectivity 2024", source: "OpenNeuro" }, source_query: "resting state fMRI",   confidence_score: 0.91, discovered_at: new Date(Date.now() - 3600000).toISOString(),    status: "pending" },
  { id: uid(), dataset_snapshot: { title: "EEG sleep architecture dataset",        source: "PhysioNet" }, source_query: "EEG sleep",            confidence_score: 0.87, discovered_at: new Date(Date.now() - 7200000).toISOString(),    status: "pending" },
  { id: uid(), dataset_snapshot: { title: "PET dopamine receptor imaging",         source: "NIMH"      }, source_query: "dopamine PET imaging", confidence_score: 0.78, discovered_at: new Date(Date.now() - 86400000).toISOString(), status: "pending" },
];

const MOCK_ANNOUNCEMENTS = [
  { id: uid(), title: "New repositories added",      body: "OpenNeuro and PhysioNet are now fully indexed.",      active: true,  created_at: new Date(Date.now() - 86400000 * 3).toISOString() },
  { id: uid(), title: "Scheduled maintenance",       body: "Brief downtime on July 20 at 02:00 UTC.",              active: true,  created_at: new Date(Date.now() - 86400000 * 7).toISOString() },
  { id: uid(), title: "Beta search improvements",    body: "Semantic ranking improved based on user feedback.",   active: false, created_at: new Date(Date.now() - 86400000 * 14).toISOString() },
];

const MOCK_TICKETS = [
  { id: uid(), user_id: MOCK_USERS[1].id, subject: "Can't delete saved dataset", message: "The delete button doesn't respond on mobile.", status: "open" as const,       created_at: new Date(Date.now() - 3600000).toISOString(),    resolved_at: null },
  { id: uid(), user_id: MOCK_USERS[2].id, subject: "Search results outdated",    message: "Some results link to 404 pages.",              status: "in_progress" as const, created_at: new Date(Date.now() - 86400000).toISOString(), resolved_at: null },
  { id: uid(), user_id: MOCK_USERS[4].id, subject: "Export to CSV?",             message: "Is CSV export planned?",                       status: "resolved" as const,    created_at: new Date(Date.now() - 86400000 * 3).toISOString(), resolved_at: new Date(Date.now() - 86400000).toISOString() },
];

const MOCK_ARTICLES = [
  { id: uid(), title: "Getting started with NeuroSearch", slug: "getting-started", body: "## How to search\n\nUse the search bar to query our dataset repositories...", published: true,  created_at: "2026-01-01T00:00:00Z", updated_at: "2026-05-01T00:00:00Z" },
  { id: uid(), title: "Understanding trust tiers",         slug: "trust-tiers",    body: "## Gold, Silver, Bronze\n\nEach repository is rated by data quality...",         published: true,  created_at: "2026-02-01T00:00:00Z", updated_at: "2026-06-01T00:00:00Z" },
  { id: uid(), title: "API access guide (draft)",          slug: "api-access",     body: "## Coming soon\n\nAPI documentation is being finalized.",                        published: false, created_at: "2026-06-01T00:00:00Z", updated_at: "2026-07-01T00:00:00Z" },
];

const MOCK_AGENTS = Array.from({ length: 15 }, (_, i) => ({
  id: uid(),
  agent: ["SemanticRanker", "PubMedCrawler", "SchemaMapper", "ScoreAggregator"][i % 4],
  query: ["fMRI alzheimer", "EEG sleep", "dopamine PET", "BDNF expression", "cortical plasticity"][i % 5],
  durationMs: Math.floor(Math.random() * 800) + 120,
  status: (i % 8 === 0 ? "fail" : "success") as "success" | "fail",
  resultCount: Math.floor(Math.random() * 50) + 1,
  createdAt: new Date(Date.now() - i * 1800000).toISOString(),
}));

const MOCK_TOKENS = Array.from({ length: 20 }, (_, i) => ({
  id: uid(),
  userId: MOCK_USERS[i % MOCK_USERS.length].id,
  userEmail: MOCK_USERS[i % MOCK_USERS.length].email,
  agent: ["SemanticRanker", "PubMedCrawler", "SchemaMapper"][i % 3],
  model: ["gpt-4o", "claude-3-5-sonnet", "gemini-1.5-flash"][i % 3],
  tokens: Math.floor(Math.random() * 3000) + 200,
  createdAt: new Date(Date.now() - i * 3600000).toISOString(),
}));

// ─── Admin namespace ──────────────────────────────────────────────────────────

// Mutable in-memory state (persists within tab session)
let _users     = [...MOCK_USERS];
let _repos     = [...MOCK_REPOS];
let _modQueue: ModerationItem[] = [...MOCK_MOD_QUEUE];
let _published: PublishedDataset[] = [];
let _announcements = [...MOCK_ANNOUNCEMENTS];
let _tickets = MOCK_TICKETS.map((t) => ({ ...t })) as Array<typeof MOCK_TICKETS[number] & { status: string; resolved_at: string | null }>;
let _articles  = [...MOCK_ARTICLES];

const ok = { ok: true };
const delay = <T>(val: T) => new Promise<T>((r) => setTimeout(() => r(val), 200));

const admin = {
  dashboard: () => delay({
    totalUsers: _users.length,
    pendingModeration: _modQueue.filter((m) => m.status === "pending").length,
    repositories: _repos,
    recentAudit: MOCK_AUDIT,
  }),

  users: {
    list: () => delay([..._users]),
    update: (id: string, data: Record<string, unknown>) => {
      _users = _users.map((u) => u.id === id ? { ...u, ...data } : u);
      return delay(ok);
    },
    delete: (id: string) => {
      _users = _users.filter((u) => u.id !== id);
      return delay(ok);
    },
  },

  repositories: {
    list: () => delay([..._repos]),
    create: (data: { name: string; trust_tier: string; endpoint_config: Record<string, unknown> }) => {
      const r = { id: uid(), sync_status: "offline" as const, last_sync_at: null as string | null, dataset_count: 0, created_at: new Date().toISOString(), ...data };
      _repos = [..._repos, r as typeof _repos[number]];
      return delay(r);
    },
    delete: (id: string) => { _repos = _repos.filter((r) => r.id !== id); return delay(ok); },
    resync: (id: string) => {
      _repos = _repos.map((r) => r.id === id ? { ...r, sync_status: "syncing" as const } : r);
      return delay(ok);
    },
  },

  moderation: {
    queue: () => delay(_modQueue.filter((m): m is ModerationItem & { status: "pending" } => m.status === "pending")),
    published: () => delay([..._published]),
    approve: (id: string) => {
      const item = _modQueue.find((m) => m.id === id);
      if (item) {
        item.status = "approved";
        const pub: PublishedDataset = { id: uid(), dataset_id: uid(), dataset_snapshot: item.dataset_snapshot as Record<string, unknown>, created_at: new Date().toISOString() };
        _published = [pub, ..._published];
      }
      return delay(ok);
    },
    reject: (_id: string, _reason?: string) => {
      _modQueue = _modQueue.map((m) => m.id === _id ? { ...m, status: "rejected" as ModerationStatus } : m);
      return delay(ok);
    },
  },

  announcements: {
    list: () => delay([..._announcements]),
    create: (data: { title: string; body: string; active: boolean }) => {
      const a = { id: uid(), created_at: new Date().toISOString(), ...data };
      _announcements = [a, ..._announcements];
      return delay(a);
    },
    toggle: (id: string, active: boolean) => {
      _announcements = _announcements.map((a) => a.id === id ? { ...a, active } : a);
      return delay(ok);
    },
    delete: (id: string) => { _announcements = _announcements.filter((a) => a.id !== id); return delay(ok); },
  },

  auditLog: {
    list: (_limit = 500) => delay(MOCK_AUDIT),
  },

  queries: {
    recent: (limit = 30) => delay(
      Array.from({ length: Math.min(limit, 10) }, (_, i) => ({
        id: uid(),
        query: ["fMRI alzheimer", "EEG sleep spindles", "BDNF expression", "dopamine pathways", "cortical plasticity"][i % 5],
        created_at: new Date(Date.now() - i * 900000).toISOString(),
      }))
    ),
  },

  helpDesk: {
    tickets: () => delay(MOCK_TICKETS as unknown as typeof MOCK_TICKETS),
    updateTicket: (id: string, data: { status: string; resolved_at?: string }) => {
      _tickets = _tickets.map((t) => t.id === id ? { ...t, ...data } as typeof _tickets[number] : t);
      return delay(ok);
    },
    articles: () => delay([..._articles]),
    createArticle: (data: { title: string; slug: string; body: string; published: boolean }) => {
      const a = { id: uid(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...data };
      _articles = [a, ..._articles];
      return delay(a);
    },
    deleteArticle: (id: string) => { _articles = _articles.filter((a) => a.id !== id); return delay(ok); },
  },

  analytics: () => delay({
    series: MOCK_SERIES,
    users: _users.length,
    saved: 47,
    collections: 12,
  }),

  infra: {
    agents:  (limit = 50) => delay(MOCK_AGENTS.slice(0, limit)),
    tokens:  (limit = 200) => delay(MOCK_TOKENS.slice(0, limit)),
    mongo: () => delay({
      totalSizeBytes: 524288000,
      collections: [
        { name: "users",          count: _users.length, sizeBytes: 81920 },
        { name: "profiles",       count: _users.length, sizeBytes: 65536 },
        { name: "search_history", count: 4821,          sizeBytes: 2097152 },
        { name: "saved_datasets", count: 893,           sizeBytes: 8388608 },
        { name: "audit_log",      count: 240,           sizeBytes: 524288 },
      ],
      growth: MOCK_SERIES.slice(-30).map((s) => ({ day: s.day, sizeBytes: Math.floor(Math.random() * 500000) + 5000000 })),
    }),
    redis: () => delay({
      activeSseConnections: 3,
      pubsubChannels: [
        { channel: "search:stream", subscribers: 3 },
        { channel: "admin:events",  subscribers: 1 },
      ],
      messageThroughputPerMin: 142,
      inFlightQueries: 1,
      memoryUsedBytes: 12582912,
      uptimeSeconds: 604800,
      connectedClients: 7,
    }),
  },
};

// ─── BASE_URL (kept for EventSource SSE — not used in demo mode) ──────────────

export const BASE_URL = "";

// ─── Public export ────────────────────────────────────────────────────────────

export const api = {
  auth,
  profiles,
  searchHistory,
  savedDatasets,
  collections,
  socialLinks,
  account,
  admin,
  /** Raw base URL for EventSource SSE construction (no-op in demo mode). */
  BASE_URL,
};
