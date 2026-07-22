import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { Brain, Eye, EyeOff, Loader2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({ redirect: typeof s.redirect === "string" ? s.redirect : undefined, mode: (s.mode === "signup" ? "signup" : "login") as "signup" | "login" }),
  component: AuthPage,
});

// ponytail: shared with onboarding — keep in sync
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

const loginSchema = z.object({ email: z.string().trim().email("Enter a valid email").max(255), password: z.string().min(6, "Password must be at least 6 characters").max(72) });
const signupSchema = z.object({ fullName: z.string().trim().min(1, "Full name is required").max(100), email: z.string().trim().email("Enter a valid email").max(255), countryCode: z.string().min(1, "Select a country code"), phone: z.string().trim().min(5, "Phone is required").max(20), password: z.string().min(6, "Password must be at least 6 characters").max(72), confirmPassword: z.string() }).refine((d) => d.password === d.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] });

type GoogleCredentialResponse = { credential: string };
type GoogleIdentity = {
  accounts: {
    id: {
      initialize: (config: { client_id: string; callback: (response: GoogleCredentialResponse) => void; ux_mode?: string; context?: string }) => void;
      renderButton: (parent: HTMLElement, options: { theme?: string; size?: string; width?: number; text?: string; shape?: string }) => void;
      prompt: () => void;
    };
  };
};

declare global { interface Window { google?: GoogleIdentity } }

function loadGoogleIdentity(): Promise<GoogleIdentity> {
  if (window.google) return Promise.resolve(window.google);
  return new Promise<GoogleIdentity>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
    const script = existing ?? document.createElement("script");
    const onLoad = () => (window.google ? resolve(window.google) : reject(new Error("Google Sign-In did not load.")));
    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", () => reject(new Error("Google Sign-In could not be loaded. Check your internet connection.")), { once: true });
    if (!existing) { script.src = "https://accounts.google.com/gsi/client"; script.async = true; document.head.appendChild(script); }
    else if (window.google) resolve(window.google);
  });
}

function AuthPage() {
  const search = Route.useSearch(); const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">(search.mode);
  const [loading, setLoading] = useState(false); const [showPw, setShowPw] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
  const [isAdminMode, setIsAdminMode] = useState(search.redirect?.startsWith("/admin") || false);
  // ponytail: reuse existing mode state — forgotStep adds reset flow without a new route
  const [forgotStep, setForgotStep] = useState<"idle" | "request" | "sent">("idle");
  const [forgotEmail, setForgotEmail] = useState("");
  const redirectTo = (path?: string) => {
    const target = path && path.startsWith("/") && !path.startsWith("/search") ? path : "/";
    navigate({ to: target, replace: true });
  };

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const form = new FormData(e.currentTarget); const parsed = loginSchema.safeParse({ email: form.get("email"), password: form.get("password") });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; } setLoading(true);
    try {
      if (isAdminMode) {
        await api.admin.auth.login(parsed.data.email, parsed.data.password);
        setPendingVerificationEmail(parsed.data.email);
        toast.success("Verification code sent to your email");
      } else {
        await api.auth.login(parsed.data.email, parsed.data.password);
        toast.success("Welcome back");
        redirectTo(search.redirect);
      }
    }
    catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      if (message === "Please verify your email before logging in.") setPendingVerificationEmail(parsed.data.email);
      toast.error(message);
    } finally { setLoading(false); }
  };
  const handleSignup = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = signupSchema.safeParse({
      fullName: form.get("fullName"),
      email: form.get("email"),
      countryCode: form.get("countryCode"),
      phone: form.get("phone"),
      password: form.get("password"),
      confirmPassword: form.get("confirmPassword"),
    });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    // ponytail: combine code+digits — api-client splitPhone parses it back
    try { await api.auth.signup({ email: parsed.data.email, password: parsed.data.password, full_name: parsed.data.fullName, phone: `${parsed.data.countryCode}${parsed.data.phone}` }); setPendingVerificationEmail(parsed.data.email); toast.success("Verification code sent to your email"); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Signup failed"); } finally { setLoading(false); }
  };
  const handleVerifyOtp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (!pendingVerificationEmail) return; const otp = String(new FormData(e.currentTarget).get("otp") ?? "").trim();
    if (!/^\d{6}$/.test(otp)) { toast.error("Enter the 6-digit verification code"); return; } setLoading(true);
    try {
      if (isAdminMode) {
        await api.admin.auth.verifyLoginOtp(pendingVerificationEmail, otp);
        toast.success("Admin login successful");
        redirectTo("/admin");
      } else {
        await api.auth.verifyOtp(pendingVerificationEmail, otp);
        toast.success("Email verified");
        redirectTo("/onboarding");
      }
    }
    catch (err) { toast.error(err instanceof Error ? err.message : "Verification failed"); } finally { setLoading(false); }
  };

  const handleForgotRequest = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    const parsed = loginSchema.shape.email.safeParse(email);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    try {
      await api.auth.forgotPassword(email);
      setForgotEmail(email);
      setForgotStep("sent");
      toast.success("Reset code sent — check your email");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Request failed"); }
    finally { setLoading(false); }
  };

  const handleResetPassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const otp = String(form.get("otp") ?? "").trim();
    const newPassword = String(form.get("newPassword") ?? "");
    const confirm = String(form.get("confirmPassword") ?? "");
    if (!/^\d{6}$/.test(otp)) { toast.error("Enter the 6-digit reset code"); return; }
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (newPassword !== confirm) { toast.error("Passwords do not match"); return; }
    setLoading(true);
    try {
      await api.auth.resetPassword(forgotEmail, otp, newPassword);
      toast.success("Password reset — please log in");
      setForgotStep("idle"); setForgotEmail(""); setMode("login");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Reset failed"); }
    finally { setLoading(false); }
  };

  const handleGoogleSignIn = async () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) { toast.error("Google Sign-In is not configured."); return; }
    setLoading(true);
    try {
      const google = await loadGoogleIdentity();

      await new Promise<void>((resolve, reject) => {
        let container = document.getElementById("__google-btn-container__");
        if (!container) {
          container = document.createElement("div");
          container.id = "__google-btn-container__";
          container.style.cssText = "position:fixed;left:-9999px;top:-9999px;opacity:0;pointer-events:none;";
          document.body.appendChild(container);
        }

        google.accounts.id.initialize({
          client_id: clientId,
          callback: (credential) => {
            void (async () => {
              try {
                const result = await api.auth.google(credential.credential);
                toast.success("Signed in with Google");
                redirectTo(result.isOnboarded ? search.redirect : "/onboarding");
                resolve();
              } catch (err) { reject(err); }
            })();
          },
          ux_mode: "popup",
          context: mode === "signup" ? "signup" : "signin",
        });

        google.accounts.id.renderButton(container, {
          theme: "outline",
          size: "large",
          width: 300,
          text: mode === "signup" ? "signup_with" : "signin_with",
          shape: "pill",
        });

        setTimeout(() => {
          const btn = container!.querySelector<HTMLElement>("div[role=button]") ?? container!.querySelector<HTMLElement>("button");
          if (btn) { btn.click(); }
          else {
            google.accounts.id.prompt();
          }
        }, 150);

        const timeout = setTimeout(() => reject(new Error("Google Sign-In timed out or was cancelled.")), 90_000);
        void Promise.race([
          new Promise<never>((_, r) => setTimeout(() => r(new Error("timeout")), 90_000)),
        ]).catch(() => clearTimeout(timeout));
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Google Sign-In failed";
      if (msg.toLowerCase().includes("not display") || msg.toLowerCase().includes("skip") || msg.toLowerCase().includes("unavailable")) {
        toast.error("Google Sign-In popup was blocked. Make sure popups are allowed for this site.");
      } else {
        toast.error(msg);
      }
    }
    finally { setLoading(false); }
  };

  return <div className="relative flex min-h-screen items-center justify-center px-4 py-12"><div className="pointer-events-none absolute inset-0 hero-bg" /><div className="relative w-full max-w-md">
    <Link to="/" className="mb-8 flex items-center justify-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[oklch(0.78_0.16_220)] to-[oklch(0.86_0.15_200)] glow-cyan"><Brain className="h-4 w-4 text-[oklch(0.15_0.03_258)]" strokeWidth={2.5} /></span><span className="font-display text-lg font-semibold text-foreground">NeuroSearch <span className="text-cyan-600 dark:text-cyan">AI</span></span></Link>
    <div className="glass-strong card-elevated rounded-3xl p-6 sm:p-8">
      {isAdminMode ? (
        <div className="text-center text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan bg-cyan/10 rounded-full py-2 border border-cyan/30">
          Administrator Portal
        </div>
      ) : (
        <div className="flex rounded-full border border-black/10 bg-black/5 p-1 text-sm dark:border-white/10 dark:bg-white/5">
          <button onClick={() => { setMode("login"); setPendingVerificationEmail(null); }} className={`flex-1 rounded-full py-1.5 font-medium transition ${mode === "login" ? "bg-white text-foreground shadow-sm dark:bg-white/15 dark:text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Log in</button>
          <button onClick={() => { setMode("signup"); setPendingVerificationEmail(null); }} className={`flex-1 rounded-full py-1.5 font-medium transition ${mode === "signup" ? "bg-white text-foreground shadow-sm dark:bg-white/15 dark:text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Sign up</button>
        </div>
      )}
      <h1 className="mt-6 font-display text-2xl font-semibold text-foreground">
        {pendingVerificationEmail
          ? "Verify your email"
          : forgotStep === "request"
            ? "Forgot password?"
            : forgotStep === "sent"
              ? "Reset your password"
              : isAdminMode
                ? "Admin Portal Login"
                : mode === "login"
                  ? "Welcome back"
                  : "Create your account"}
      </h1>
      <p className="mt-1 text-sm text-foreground/70 dark:text-muted-foreground">
        {pendingVerificationEmail
          ? `Enter the verification code sent to ${pendingVerificationEmail}.`
          : forgotStep === "request"
            ? "We'll email you a reset code."
            : forgotStep === "sent"
              ? `Enter the reset code sent to ${forgotEmail} and choose a new password.`
              : isAdminMode
                ? "Sign in with your administrator credentials."
                : mode === "login"
                  ? "Sign in to search and save datasets."
                  : "Join to save datasets and track your research."}
      </p>
      {pendingVerificationEmail ? (
        <form onSubmit={handleVerifyOtp} className="mt-6 space-y-3">
          <Field label="Verification code" name="otp" inputMode="numeric" maxLength={6} required />
          <Submit loading={loading}>Verify email</Submit>
        </form>
      ) : forgotStep === "request" ? (
        /* Forgot password — step 1: request reset code */
        <form onSubmit={handleForgotRequest} className="mt-6 space-y-3">
          <Field label="Email" name="email" type="email" placeholder="you@lab.edu" defaultValue={forgotEmail} required />
          <Submit loading={loading}>Send reset code</Submit>
          <p className="text-center text-xs text-foreground/70 dark:text-muted-foreground">
            <button type="button" onClick={() => setForgotStep("idle")} className="text-cyan-600 dark:text-cyan font-medium hover:underline">Back to login</button>
          </p>
        </form>
      ) : forgotStep === "sent" ? (
        /* Forgot password — step 2: OTP + new password */
        <form onSubmit={handleResetPassword} className="mt-6 space-y-3">
          <Field label="Reset code" name="otp" inputMode="numeric" maxLength={6} placeholder="123456" required />
          <PasswordField name="newPassword" show={showPw} onToggle={() => setShowPw((v) => !v)} />
          <Field label="Confirm new password" name="confirmPassword" type={showPw ? "text" : "password"} required />
          <Submit loading={loading}>Reset password</Submit>
          <p className="text-center text-xs text-foreground/70 dark:text-muted-foreground">
            <button type="button" onClick={() => { setForgotStep("idle"); setForgotEmail(""); }} className="text-cyan-600 dark:text-cyan font-medium hover:underline">Back to login</button>
          </p>
        </form>
      ) : mode === "login" || isAdminMode ? (
        <form onSubmit={handleLogin} className="mt-6 space-y-3">
          <Field label="Email" name="email" type="email" placeholder="you@lab.edu" required />
          <PasswordField name="password" show={showPw} onToggle={() => setShowPw((v) => !v)} />
          <Submit loading={loading}>Continue</Submit>
          {!isAdminMode && (
            <p className="text-right">
              <button type="button" onClick={() => setForgotStep("request")} className="text-xs text-cyan-600 dark:text-cyan hover:underline">
                Forgot password?
              </button>
            </p>
          )}
        </form>
      ) : (
        <form onSubmit={handleSignup} className="mt-6 space-y-3">
          <Field label="Full name" name="fullName" placeholder="Ada Lovelace" required />
          <Field label="Email" name="email" type="email" placeholder="you@lab.edu" required />
          <SignupPhoneField />
          <PasswordField name="password" show={showPw} onToggle={() => setShowPw((v) => !v)} />
          <Field label="Confirm password" name="confirmPassword" type={showPw ? "text" : "password"} required />
          <Submit loading={loading}>Create account</Submit>
        </form>
      )}
      {!pendingVerificationEmail && (
        <>
          <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-widest text-foreground/60 dark:text-muted-foreground">
            <span className="h-px flex-1 bg-black/15 dark:bg-white/10" />
            or
            <span className="h-px flex-1 bg-black/15 dark:bg-white/10" />
          </div>
          {!isAdminMode && (
            <button onClick={handleGoogleSignIn} disabled={loading} className="mb-4 flex w-full items-center justify-center gap-2 rounded-full border border-black/15 bg-black/[0.03] text-foreground font-medium py-2.5 text-sm hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 disabled:opacity-50 transition">
              <GoogleIcon /> Continue with Google
            </button>
          )}
          <p className="mt-6 text-center text-xs text-foreground/70 dark:text-muted-foreground">
            {isAdminMode ? (
              <button onClick={() => setIsAdminMode(false)} className="text-cyan-600 dark:text-cyan font-medium hover:underline">
                Standard Portal Login
              </button>
            ) : mode === "login" ? (
              <>
                <span>New here? </span>
                <button onClick={() => setMode("signup")} className="text-cyan-600 dark:text-cyan font-medium hover:underline">Create an account</button>
              </>
            ) : (
              <>
                <span>Already have an account? </span>
                <button onClick={() => setMode("login")} className="text-cyan-600 dark:text-cyan font-medium hover:underline">Log in</button>
              </>
            )}
          </p>
          {!isAdminMode && (
            <div className="mt-4 text-center">
              <button
                onClick={() => {
                  setIsAdminMode(true);
                  setMode("login");
                  setPendingVerificationEmail(null);
                }}
                className="text-[11px] font-medium text-foreground/70 dark:text-muted-foreground/70 hover:text-foreground underline transition"
              >
                Administrator Login
              </button>
            </div>
          )}
        </>
      )}
    </div></div></div>;
}
function Submit({ loading, children }: { loading: boolean; children: React.ReactNode }) { return <button type="submit" disabled={loading} className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[oklch(0.78_0.16_220)] to-[oklch(0.86_0.15_200)] py-2.5 text-sm font-medium text-[oklch(0.15_0.03_258)] disabled:opacity-50 shadow-sm hover:shadow-md transition">{loading && <Loader2 className="h-4 w-4 animate-spin" />}{children}</button>; }
function Field({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) { return <label className="block"><span className="text-xs font-medium text-foreground/80 dark:text-muted-foreground">{label}</span><input {...props} className="mt-1 w-full rounded-xl border border-black/15 bg-black/[0.03] px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-cyan focus:ring-1 focus:ring-cyan dark:border-white/10 dark:bg-white/5 dark:placeholder:text-muted-foreground/60" /></label>; }
function PasswordField({ name, show, onToggle }: { name: string; show: boolean; onToggle: () => void }) { return <label className="block"><span className="text-xs font-medium text-foreground/80 dark:text-muted-foreground">Password</span><div className="relative mt-1"><input name={name} type={show ? "text" : "password"} required minLength={6} className="w-full rounded-xl border border-black/15 bg-black/[0.03] px-3 py-2 pr-10 text-sm text-foreground outline-none focus:border-cyan focus:ring-1 focus:ring-cyan dark:border-white/10 dark:bg-white/5" /><button type="button" onClick={onToggle} className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-foreground/60 hover:bg-black/5 dark:text-muted-foreground dark:hover:bg-white/5">{show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</button></div></label>; }
function SignupPhoneField() {
  return (
    <div className="block">
      <span className="text-xs font-medium text-foreground/80 dark:text-muted-foreground">Phone number</span>
      <div className="mt-1 flex gap-2">
        <select name="countryCode" defaultValue="+91" required
          className="w-36 shrink-0 rounded-xl border border-black/15 bg-black/[0.03] px-2 py-2 text-sm text-foreground outline-none focus:border-cyan dark:border-white/10 dark:bg-white/5 [.light_&]:bg-white [.light_&]:text-slate-900">
          {COUNTRY_CODES.map((c) => (
            <option key={c.code} value={c.code} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">{c.label}</option>
          ))}
        </select>
        <input name="phone" type="tel" required placeholder="9876543210"
          className="min-w-0 flex-1 rounded-xl border border-black/15 bg-black/[0.03] px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-cyan focus:ring-1 focus:ring-cyan dark:border-white/10 dark:bg-white/5 dark:placeholder:text-muted-foreground/60" />
      </div>
    </div>
  );
}
function GoogleIcon() { return <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>; }
