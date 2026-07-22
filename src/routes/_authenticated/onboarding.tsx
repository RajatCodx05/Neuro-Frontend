import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { Loader2, Brain } from "lucide-react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: OnboardingPage,
});

// ponytail: minimal country list — user can extend via COUNTRY_CODES array
const COUNTRY_CODES = [
  { code: "+91", label: "+91 India" },
  { code: "+1", label: "+1 USA / Canada" },
  { code: "+44", label: "+44 UK" },
  { code: "+61", label: "+61 Australia" },
  { code: "+49", label: "+49 Germany" },
  { code: "+33", label: "+33 France" },
  { code: "+39", label: "+39 Italy" },
  { code: "+34", label: "+34 Spain" },
  { code: "+81", label: "+81 Japan" },
  { code: "+86", label: "+86 China" },
  { code: "+82", label: "+82 South Korea" },
  { code: "+65", label: "+65 Singapore" },
  { code: "+971", label: "+971 UAE" },
  { code: "+966", label: "+966 Saudi Arabia" },
  { code: "+55", label: "+55 Brazil" },
  { code: "+52", label: "+52 Mexico" },
  { code: "+27", label: "+27 South Africa" },
  { code: "+20", label: "+20 Egypt" },
  { code: "+234", label: "+234 Nigeria" },
  { code: "+7", label: "+7 Russia" },
];

const schema = z.object({
  full_name: z.string().trim().min(1).max(100),
  countryCode: z.string().min(1, "Select a country code"),
  phone: z.string().trim().min(5, "Phone number is required").max(20),
  role: z.enum(["student", "researcher", "scientist", "working_professional"]),
  institute: z.string().trim().max(150).optional().or(z.literal("")),
}).refine((d) => d.role !== "student" || (d.institute && d.institute.length > 0), {
  message: "Institute is required for students", path: ["institute"],
});

function OnboardingPage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<string>("");

  useEffect(() => {
    if (profile?.onboarding_complete) navigate({ to: "/", replace: true });
  }, [profile, navigate]);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const form = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      full_name: form.get("full_name"),
      countryCode: form.get("countryCode"),
      phone: form.get("phone"),
      role: form.get("role"),
      institute: form.get("institute") ?? "",
    });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    try {
      // ponytail: combine into single string — splitPhone in api-client parses it
      await api.profiles.update({
        full_name: parsed.data.full_name,
        phone: `${parsed.data.countryCode}${parsed.data.phone}`,
        role: parsed.data.role,
        institute: parsed.data.institute || null,
        onboarding_complete: true,
      });
    } catch (err) {
      setLoading(false);
      toast.error(err instanceof Error ? err.message : "Failed to save profile");
      return;
    }
    setLoading(false);
    await refreshProfile();
    toast.success("You're all set");
    navigate({ to: "/", replace: true });
  };

  const defaultName = profile?.full_name || "";

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <div className="pointer-events-none absolute inset-0 hero-bg" />
      <div className="relative w-full max-w-lg">
        <div className="mb-8 flex items-center justify-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[oklch(0.78_0.16_220)] to-[oklch(0.86_0.15_200)] glow-cyan">
            <Brain className="h-4 w-4 text-[oklch(0.15_0.03_258)]" strokeWidth={2.5} />
          </span>
          <span className="font-display text-lg font-semibold">NeuroSearch <span className="text-cyan">AI</span></span>
        </div>
        <div className="glass-strong card-elevated rounded-3xl p-6 sm:p-8">
          <h1 className="font-display text-2xl font-semibold">Tell us about yourself</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A quick profile so we can personalize your dataset recommendations.
          </p>
          <form onSubmit={submit} className="mt-6 space-y-3">
            <Field label="Full name" name="full_name" defaultValue={defaultName} required />
            <PhoneField defaultPhone={profile?.phone ?? ""} />
            <label className="block">
              <span className="text-xs text-muted-foreground">Role</span>
              <select name="role" required value={role} onChange={(e) => setRole(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 [.light_&]:border-black/15 bg-white/5 [.light_&]:bg-black/[0.04] px-3 py-2 text-sm text-foreground outline-none focus:border-cyan/50">
                <option value="" className="bg-background text-foreground">Select a role</option>
                <option value="student" className="bg-background text-foreground">Student</option>
                <option value="researcher" className="bg-background text-foreground">Researcher</option>
                <option value="scientist" className="bg-background text-foreground">Scientist</option>
                <option value="working_professional" className="bg-background text-foreground">Working Professional</option>
              </select>
            </label>
            <Field
              label={role === "student" ? "Institute name (required)" : "Institute name (optional)"}
              name="institute"
              defaultValue={profile?.institute ?? ""}
              required={role === "student"}
            />
            <button type="submit" disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[oklch(0.78_0.16_220)] to-[oklch(0.86_0.15_200)] py-2.5 text-sm font-medium text-[oklch(0.15_0.03_258)] disabled:opacity-50">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}Finish setup
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input {...props}
        className="mt-1 w-full rounded-xl border border-white/10 [.light_&]:border-black/15 bg-white/5 [.light_&]:bg-black/[0.04] px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-cyan/50" />
    </label>
  );
}

function PhoneField({ defaultPhone }: { defaultPhone: string }) {
  // Split stored combined phone (e.g. "+919876543210") back into code + digits for display
  const match = defaultPhone.match(/^(\+\d{1,4})(\d+)$/);
  const defaultCode = match ? match[1] : "+91";
  const defaultDigits = match ? match[2] : defaultPhone.replace(/^\+\d{1,4}/, "");
  return (
    <div className="block">
      <span className="text-xs text-muted-foreground">Phone number</span>
      <div className="mt-1 flex gap-2">
        <select name="countryCode" defaultValue={defaultCode} required
          className="w-36 shrink-0 rounded-xl border border-white/10 [.light_&]:border-black/15 bg-white/5 [.light_&]:bg-black/[0.04] px-2 py-2 text-sm text-foreground outline-none focus:border-cyan/50">
          {COUNTRY_CODES.map((c) => (
            <option key={c.code} value={c.code} className="bg-background text-foreground">{c.label}</option>
          ))}
        </select>
        <input name="phone" type="tel" required defaultValue={defaultDigits}
          placeholder="9876543210"
          className="min-w-0 flex-1 rounded-xl border border-white/10 [.light_&]:border-black/15 bg-white/5 [.light_&]:bg-black/[0.04] px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-cyan/50" />
      </div>
    </div>
  );
}
