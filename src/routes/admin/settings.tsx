import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { AdminPageHeader } from "@/components/app/admin-shell";
import { useAuth } from "@/lib/auth-context";
import { Shield, Mail, Calendar, User, LogOut } from "lucide-react";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "Admin · Settings — NeuroSearch AI" }] }),
  component: SettingsPage,
});

type AdminUser = {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
};

function SettingsPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const { data: admins = [] } = useQuery({
    queryKey: ["admin-admins"],
    queryFn: () => api.admin.getAdmins() as Promise<AdminUser[]>,
  });

  const currentAdmin = admins.find((a) => a.email === user?.email) || null;

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/", replace: true });
  };

  return (
    <>
      <AdminPageHeader title="Settings" description="Admin profile and account information" />
      <div className="mx-auto max-w-2xl space-y-6 px-6 py-6 md:px-8">
        {/* Admin Profile Card */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-cyan/30 to-blue-600/30">
              <Shield className="h-7 w-7 text-cyan" />
            </span>
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Admin Account</div>
              <div className="mt-1 font-display text-2xl font-semibold">{currentAdmin?.name || user?.email?.split("@")[0] || "Admin"}</div>
              <div className="mt-0.5 text-sm text-muted-foreground">{user?.email}</div>
            </div>
          </div>
        </div>

        {/* Details Card */}
        <div className="glass rounded-2xl p-6">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Account Details</div>
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-3 rounded-xl bg-white/5 [.light_&]:bg-black/[0.04] px-4 py-3">
              <User className="h-4 w-4 text-cyan shrink-0" />
              <div>
                <div className="text-xs text-muted-foreground">Name</div>
                <div className="text-sm font-medium">{currentAdmin?.name || "—"}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-white/5 [.light_&]:bg-black/[0.04] px-4 py-3">
              <Mail className="h-4 w-4 text-cyan shrink-0" />
              <div>
                <div className="text-xs text-muted-foreground">Email</div>
                <div className="text-sm font-medium">{currentAdmin?.email || user?.email || "—"}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-white/5 [.light_&]:bg-black/[0.04] px-4 py-3">
              <Calendar className="h-4 w-4 text-cyan shrink-0" />
              <div>
                <div className="text-xs text-muted-foreground">Joined</div>
                <div className="text-sm font-medium">{currentAdmin?.createdAt ? new Date(currentAdmin.createdAt).toLocaleDateString() : "—"}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Sign Out */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Sign out</div>
              <div className="text-xs text-muted-foreground">End your admin session and return to the home page.</div>
            </div>
            <button onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 [.light_&]:border-black/15 px-4 py-2 text-sm text-muted-foreground hover:bg-white/5 [.light_&]:hover:bg-black/5 hover:text-foreground">
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
