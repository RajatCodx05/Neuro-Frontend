import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Save, Trash2, Plus, AlertTriangle } from "lucide-react";
import { api, type UserProfile } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/app/app-shell";
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

  const toggleNotifications = async (enabled: boolean) => {
    if (!user) return;
    await api.profiles.update({ notifications_enabled: enabled });
    await refreshProfile();
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
    await api.socialLinks.delete(id);
    setSocials((v) => v.filter((s) => s.id !== id));
  };

  const deleteAccount = async () => {
    if (!user) return;
    try {
      await api.account.delete();
      toast.success("Account deleted");
      await signOut();
      navigate({ to: "/", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete account");
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

        {/* Profile */}
        <form onSubmit={saveProfile} className="glass card-elevated rounded-2xl p-6">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Profile</div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Full name" name="full_name" defaultValue={profile.full_name ?? ""} required />
            <Field label="Email" name="email" defaultValue={profile.email ?? user?.email ?? ""} readOnly disabled />
            <Field label="Phone" name="phone" type="tel" defaultValue={profile.phone ?? ""} />
            <Field label="Institute" name="institute" defaultValue={profile.institute ?? ""} />
            <label className="block">
              <span className="text-xs text-muted-foreground">Role</span>
              <select name="role" defaultValue={profile.role ?? ""}
                className="mt-1 w-full rounded-xl border border-white/10 [.light_&]:border-black/15 bg-white/5 [.light_&]:bg-black/[0.04] px-3 py-2 text-sm text-foreground outline-none focus:border-cyan/50">
                <option value="" className="bg-background text-foreground">—</option>
                <option value="student" className="bg-background text-foreground">Student</option>
                <option value="researcher" className="bg-background text-foreground">Researcher</option>
                <option value="scientist" className="bg-background text-foreground">Scientist</option>
                <option value="working_professional" className="bg-background text-foreground">Working Professional</option>
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
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Notifications</div>
          <label className="mt-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Email & in-app notifications</div>
              <div className="text-xs text-muted-foreground">Dataset updates, new matches, and account activity.</div>
            </div>
            <input
              type="checkbox"
              className="h-5 w-9 cursor-pointer appearance-none rounded-full bg-white/10 [.light_&]:bg-black/10 checked:bg-cyan transition"
              defaultChecked={profile.notifications_enabled}
              onChange={(e) => toggleNotifications(e.target.checked)}
            />
          </label>
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
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <div className="text-xs uppercase tracking-widest">Danger zone</div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium">Delete account</div>
              <div className="text-xs text-muted-foreground">Permanently remove your account, saved datasets, collections, and history.</div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="inline-flex items-center gap-1.5 rounded-full bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground">
                  <Trash2 className="h-3.5 w-3.5" /> Delete account
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This cannot be undone. All your saved datasets, collections, history, and profile data will be removed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteAccount} className="bg-destructive text-destructive-foreground">
                    Yes, delete my account
                  </AlertDialogAction>
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
