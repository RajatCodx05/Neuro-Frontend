import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Save, Trash2, Plus, AlertTriangle } from "lucide-react";
import { api, type UserProfile, type NotificationPreferences } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/app/app-shell";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

type SocialLink = { id: string; platform: string; url: string };
const PLATFORMS = ["linkedin", "github", "pinterest", "instagram"] as const;

function SettingsPage() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [socials, setSocials] = useState<SocialLink[]>([]);
  const [addPlatform, setAddPlatform] = useState<string>("linkedin");
  const [addUrl, setAddUrl] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.socialLinks.list().then((data) => setSocials(data ?? []));
  }, [user]);

  const saveProfile = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const form = new FormData(e.currentTarget);
    setSaving(true);
    try {
      await api.profiles.update({
        full_name: String(form.get("full_name") ?? "").trim().slice(0, 100),
        phone: String(form.get("phone") ?? "").trim().slice(0, 30),
        institute: String(form.get("institute") ?? "").trim().slice(0, 150),
        role: (form.get("role") || null) as UserProfile["role"],
      });
    } catch (err) {
      setSaving(false);
      toast.error(err instanceof Error ? err.message : "Save failed");
      return;
    }
    setSaving(false);
    await refreshProfile();
    toast.success("Profile saved");
  };

  const updateNotificationPref = async (key: keyof NotificationPreferences, enabled: boolean) => {
    if (!user || !profile) return;
    const currentPrefs = profile.notification_preferences || {
      email_notifications: profile.notifications_enabled,
      in_app_notifications: profile.notifications_enabled,
      dataset_updates: profile.notifications_enabled,
      new_matches: profile.notifications_enabled,
      account_activity: profile.notifications_enabled,
    };
    const updated = { ...currentPrefs, [key]: enabled };
    // Optimistic: update local state immediately (the switch already toggled)
    // but we need the profile to reflect the change for other references
    // Snapshot the current preferences for rollback
    const prevPrefs = profile.notification_preferences;
    // We update profile directly so the switch state stays consistent
    Object.assign(profile.notification_preferences || {}, { [key]: enabled });
    try {
      await api.profiles.update({ notification_preferences: updated });
      await refreshProfile();
    } catch (err) {
      // Rollback on failure
      if (profile.notification_preferences && prevPrefs) {
        Object.assign(profile.notification_preferences, prevPrefs);
      }
      toast.error(err instanceof Error ? err.message : "Failed to update preference");
    }
  };

  const addSocial = async () => {
    if (!user || !addUrl.trim()) return;
    try { new URL(addUrl); } catch { toast.error("Enter a valid URL"); return; }
    try {
      const data = await api.socialLinks.upsert(addPlatform, addUrl.trim());
      setSocials((v) => [...v.filter((s) => s.platform !== addPlatform), data]);
      setAddUrl("");
      toast.success("Link added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add link");
    }
  };

  const removeSocial = async (id: string) => {
    // Snapshot for rollback
    const prevSocials = socials;
    // Optimistic: remove from UI immediately
    setSocials((v) => v.filter((s) => s.id !== id));
    try {
      await api.socialLinks.delete(id);
    } catch (err) {
      // Rollback on failure
      setSocials(prevSocials);
      toast.error(err instanceof Error ? err.message : "Failed to remove link");
    }
  };

  const deleteAccount = async () => {
    if (!user || confirmText !== "DELETE") return;
    setIsDeleting(true);
    try {
      await api.account.delete({ confirmation: confirmText });
      toast.success("Account scheduled for deletion (30-day grace period). Active sessions revoked.");
      setDeleteDialogOpen(false);
      setConfirmText("");
      await signOut();
      navigate({ to: "/", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete account");
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDeletion = async () => {
    setIsCancelling(true);
    try {
      await api.account.cancelDeletion();
      await refreshProfile();
      toast.success("Account deletion request cancelled. Your account is active.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel deletion");
    } finally {
      setIsCancelling(false);
    }
  };

  if (!profile) {
    return <AppShell><div className="p-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div></AppShell>;
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
        <div>
          <h1 className="font-display text-3xl font-semibold">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your profile, notifications, and account.</p>
        </div>

        {profile.is_deleted && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" /> Account Scheduled for Deletion
              </div>
              <div className="mt-1 text-xs text-amber-200/80">
                Your account is currently in a 30-day grace period and scheduled for permanent deletion on{" "}
                <span className="font-semibold text-amber-300">
                  {profile.scheduled_deletion_at ? new Date(profile.scheduled_deletion_at).toLocaleDateString() : "30 days"}
                </span>.
              </div>
            </div>
            <button
              onClick={cancelDeletion}
              disabled={isCancelling}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-50 transition-colors"
            >
              {isCancelling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Restore Account & Cancel Deletion
            </button>
          </div>
        )}

        {/* Profile */}
        <form onSubmit={saveProfile} className="glass card-elevated rounded-2xl p-6">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Profile</div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Full name" name="full_name" defaultValue={profile.full_name ?? ""} required />
            <Field label="Email" name="email" defaultValue={profile.email ?? user?.email ?? ""} readOnly disabled />
            <Field label="Phone" name="phone" type="tel" defaultValue={profile.phone ?? ""} />
            <Field label="Organization/Institute Name" name="institute" defaultValue={profile.institute ?? ""} />
            <label className="block">
              <span className="text-xs text-muted-foreground">Role</span>
              <select name="role" defaultValue={profile.role ?? ""}
                className="mt-1 w-full rounded-xl border border-white/10 [.light_&]:border-black/15 bg-white/5 [.light_&]:bg-black/[0.04] px-3 py-2 text-sm text-foreground outline-none focus:border-cyan/50">
                <option value="" className="bg-background text-foreground">—</option>
                <option value="academic_researcher" className="bg-background text-foreground">Academic Researcher</option>
                <option value="industry_researcher" className="bg-background text-foreground">Industry Researcher</option>
                <option value="healthcare_professional" className="bg-background text-foreground">Healthcare Professional</option>
                <option value="data_ai_engineer" className="bg-background text-foreground">Data/AI Engineer</option>
                <option value="other" className="bg-background text-foreground">Other</option>
              </select>
            </label>
          </div>
          <div className="mt-5 flex justify-end">
            <button type="submit" disabled={saving}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[oklch(0.78_0.16_220)] to-[oklch(0.86_0.15_200)] px-4 py-2 text-sm font-medium text-[oklch(0.15_0.03_258)] disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save changes
            </button>
          </div>
        </form>

        {/* Notifications */}
        <div className="glass card-elevated rounded-2xl p-6">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-4">Notifications</div>
          <div className="space-y-4 divide-y divide-white/5 [.light_&]:divide-black/5">
            <div className="flex items-center justify-between pt-3 first:pt-0">
              <div>
                <div className="text-sm font-medium">Email notifications</div>
                <div className="text-xs text-muted-foreground">Receive notification emails at your registered email address.</div>
              </div>
              <Switch
                checked={profile.notification_preferences?.email_notifications ?? profile.notifications_enabled}
                onCheckedChange={(checked) => updateNotificationPref("email_notifications", checked)}
              />
            </div>

            <div className="flex items-center justify-between pt-3">
              <div>
                <div className="text-sm font-medium">In-app notifications</div>
                <div className="text-xs text-muted-foreground">Receive real-time alerts and badges directly inside the application.</div>
              </div>
              <Switch
                checked={profile.notification_preferences?.in_app_notifications ?? profile.notifications_enabled}
                onCheckedChange={(checked) => updateNotificationPref("in_app_notifications", checked)}
              />
            </div>

            <div className="flex items-center justify-between pt-3">
              <div>
                <div className="text-sm font-medium">Dataset updates</div>
                <div className="text-xs text-muted-foreground">Notifications when saved or followed datasets are updated.</div>
              </div>
              <Switch
                checked={profile.notification_preferences?.dataset_updates ?? profile.notifications_enabled}
                onCheckedChange={(checked) => updateNotificationPref("dataset_updates", checked)}
              />
            </div>

            <div className="flex items-center justify-between pt-3">
              <div>
                <div className="text-sm font-medium">New matches & recommendations</div>
                <div className="text-xs text-muted-foreground">Alerts for new matching neuroscience datasets and research suggestions.</div>
              </div>
              <Switch
                checked={profile.notification_preferences?.new_matches ?? profile.notifications_enabled}
                onCheckedChange={(checked) => updateNotificationPref("new_matches", checked)}
              />
            </div>

            <div className="flex items-center justify-between pt-3">
              <div>
                <div className="text-sm font-medium">Account activity & security</div>
                <div className="text-xs text-muted-foreground">Security alerts, password changes, and account login updates.</div>
              </div>
              <Switch
                checked={profile.notification_preferences?.account_activity ?? profile.notifications_enabled}
                onCheckedChange={(checked) => updateNotificationPref("account_activity", checked)}
              />
            </div>
          </div>
        </div>

        {/* Social links */}
        <div className="glass card-elevated rounded-2xl p-6">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Social links</div>
          <div className="mt-4 space-y-2">
            {socials.length === 0 && <div className="text-xs text-muted-foreground">No links added yet.</div>}
            {socials.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-xl bg-white/5 [.light_&]:bg-black/[0.04] border border-white/10 [.light_&]:border-black/10 px-3 py-2 text-sm">
                <span className="w-20 text-xs uppercase tracking-widest text-muted-foreground font-medium">{s.platform}</span>
                <a href={s.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate hover:text-cyan text-foreground">{s.url}</a>
                <button onClick={() => removeSocial(s.id)} className="text-muted-foreground hover:text-foreground">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <select value={addPlatform} onChange={(e) => setAddPlatform(e.target.value)}
              className="rounded-xl border border-white/10 [.light_&]:border-black/15 bg-white/5 [.light_&]:bg-black/[0.04] px-3 py-2 text-sm text-foreground outline-none focus:border-cyan/50">
              {PLATFORMS.map((p) => <option key={p} value={p} className="bg-background text-foreground">{p}</option>)}
            </select>
            <input value={addUrl} onChange={(e) => setAddUrl(e.target.value)} placeholder="https://…"
              className="flex-1 rounded-xl border border-white/10 [.light_&]:border-black/15 bg-white/5 [.light_&]:bg-black/[0.04] px-3 py-2 text-sm text-foreground outline-none focus:border-cyan/50 placeholder:text-muted-foreground/60" />
            <button onClick={addSocial}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/10 [.light_&]:bg-black/10 px-4 py-2 text-sm font-medium hover:bg-white/15 [.light_&]:hover:bg-black/15">
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>
        </div>

        {/* Danger zone */}
        <div className="glass card-elevated rounded-2xl p-6">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Account Removal</div>
          <div className="mt-3 flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-foreground/90">Delete account</div>
              <div className="text-xs text-muted-foreground">
                Request account deletion with a 30-day grace period. You can restore your account anytime during grace period.
              </div>
            </div>
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <button className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 [.light_&]:border-black/15 bg-transparent px-3 py-1.5 text-xs text-muted-foreground hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive transition-colors">
                  <Trash2 className="h-3.5 w-3.5" /> Delete account
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2 text-sm text-muted-foreground">
                    <span>
                      Your account will be deactivated immediately and scheduled for permanent deletion after a 30-day grace period.
                    </span>
                    <span className="block">
                      During the 30-day grace period, all active sessions are revoked, but you can cancel deletion and restore your account at any time simply by logging back in.
                    </span>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="mt-2 space-y-2">
                  <label className="block text-xs text-muted-foreground">
                    To confirm, please type <span className="font-semibold text-foreground select-all">DELETE</span> below:
                  </label>
                  <input
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="DELETE"
                    className="w-full rounded-xl border border-white/10 [.light_&]:border-black/15 bg-white/5 [.light_&]:bg-black/[0.04] px-3 py-2 text-sm text-foreground outline-none focus:border-cyan/50 placeholder:text-muted-foreground/40 font-mono"
                  />
                </div>
                <AlertDialogFooter className="mt-4">
                  <AlertDialogCancel onClick={() => setConfirmText("")}>Cancel</AlertDialogCancel>
                  <button
                    disabled={confirmText !== "DELETE" || isDeleting}
                    onClick={deleteAccount}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-destructive/90 transition-opacity"
                  >
                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete account"}
                  </button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Field({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input {...props}
        className="mt-1 w-full rounded-xl border border-white/10 [.light_&]:border-black/15 bg-white/5 [.light_&]:bg-black/[0.04] px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-cyan/50 disabled:opacity-60" />
    </label>
  );
}
