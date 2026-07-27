import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { AdminPageHeader } from "@/components/app/admin-shell";
import { useAuth } from "@/lib/auth-context";
import { Shield, Mail, Calendar, User, LogOut, Pencil, X, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");

  const { data: admins = [] } = useQuery({
    queryKey: ["admin-admins"],
    queryFn: () => api.admin.getAdmins() as Promise<AdminUser[]>,
  });

  const currentAdmin = admins.find((a) => a.email === user?.email) || null;

  const updateMutation = useMutation({
    mutationFn: (name: string) => api.admin.updateProfile({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-admins"] });
      setEditing(false);
      toast.success("Name updated successfully");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update name");
    },
  });

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/", replace: true });
  };

  const startEditing = () => {
    setEditName(currentAdmin?.name || "");
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setEditName("");
  };

  const saveEditing = () => {
    const trimmed = editName.trim();
    if (!trimmed) {
      toast.error("Name cannot be empty");
      return;
    }
    if (trimmed.length < 2 || trimmed.length > 100) {
      toast.error("Name must be between 2 and 100 characters");
      return;
    }
    updateMutation.mutate(trimmed);
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
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Account Details</div>
            {!editing && currentAdmin && (
              <button
                onClick={startEditing}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 [.light_&]:border-black/15 px-3 py-1.5 text-xs text-muted-foreground hover:bg-white/5 [.light_&]:hover:bg-black/5 hover:text-foreground transition"
              >
                <Pencil className="h-3 w-3" />
                Edit name
              </button>
            )}
          </div>
          <div className="mt-4 space-y-4">
            {/* Name - Editable */}
            <div className="flex items-center gap-3 rounded-xl bg-white/5 [.light_&]:bg-black/[0.04] px-4 py-3">
              <User className="h-4 w-4 text-cyan shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground">Name</div>
                {editing ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEditing();
                        if (e.key === "Escape") cancelEditing();
                      }}
                      placeholder="Enter your name"
                      autoFocus
                      className="flex-1 bg-transparent border-b border-cyan/40 px-1 py-0.5 text-sm font-medium outline-none focus:border-cyan transition"
                    />
                    <button
                      onClick={saveEditing}
                      disabled={updateMutation.isPending}
                      className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition disabled:opacity-50"
                    >
                      {updateMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      onClick={cancelEditing}
                      disabled={updateMutation.isPending}
                      className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-white/10 text-muted-foreground hover:bg-white/20 transition disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="text-sm font-medium">{currentAdmin?.name || "—"}</div>
                )}
              </div>
            </div>
            {/* Email - Read only */}
            <div className="flex items-center gap-3 rounded-xl bg-white/5 [.light_&]:bg-black/[0.04] px-4 py-3">
              <Mail className="h-4 w-4 text-cyan shrink-0" />
              <div>
                <div className="text-xs text-muted-foreground">Email</div>
                <div className="text-sm font-medium">{currentAdmin?.email || user?.email || "—"}</div>
              </div>
            </div>
            {/* Joined - Read only */}
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
