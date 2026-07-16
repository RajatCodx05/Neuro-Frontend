import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, type AuthUser, type UserProfile } from "@/lib/api-client";

// ─── Shape stays identical to the Supabase version so all consumers need zero changes ───

type AuthContextValue = {
  user: AuthUser | null;
  session: AuthUser | null; // alias for user — consumers that referenced `session` still compile
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async () => {
    try {
      const p = await api.profiles.getMe();
      setProfile(p);
    } catch {
      setProfile(null);
    }
  };

  useEffect(() => {
    // On mount: ask the Node backend if there is an active session (cookie-based).
    // No subscription needed — httpOnly cookies don't push events.
    api.auth
      .me()
      .then(async (u) => {
        setUser(u);
        await loadProfile();
      })
      .catch(() => {
        setUser(null);
        setProfile(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const refreshProfile = async () => {
    await loadProfile();
  };

  const signOut = async () => {
    try {
      await api.auth.logout();
    } catch {
      // Best-effort — cookie will expire on its own
    }
    setUser(null);
    setProfile(null);
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session: user, // keep `session` in shape for any consumer that uses it
        profile,
        loading,
        refreshProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

// Re-export UserProfile type so existing consumers that import Profile from here still compile
export type { UserProfile as Profile };
