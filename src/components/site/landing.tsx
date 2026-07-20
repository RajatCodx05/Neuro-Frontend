import { motion, useInView, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Sparkles, Mic, SlidersHorizontal, ArrowRight, ArrowUpRight, Play,
  CheckCircle2, Shield, Zap, Database, Activity, Bookmark, Share2, 
  MessageSquare, Wand2, Search, BrainCircuit, Waves, Download,
  Rocket
} from "lucide-react";
import { NeuralBackground } from "@/components/site/neural-background";
import { SiteFooter } from "@/components/site/site-footer";
import { AppShell } from "@/components/app/app-shell";
import { useAuth } from "@/lib/auth-context";
import brainCardImg from "@/assets/brain-card.jpg";
import { datasets, repositories, stats } from "@/lib/mock-data";

function Counter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { damping: 30, stiffness: 90 });
  const [display, setDisplay] = useState("0");
  useEffect(() => { if (inView) mv.set(value); }, [inView, mv, value]);
  useEffect(() => spring.on("change", (v) => {
    const decimals = value % 1 !== 0 ? 2 : 0;
    setDisplay(v.toLocaleString(undefined, { maximumFractionDigits: decimals, minimumFractionDigits: decimals }));
  }), [spring, value]);
  return <span ref={ref}>{display}{suffix}</span>;
}

const suggestions = [
  "Resting-state fMRI in children with ADHD",
  "Longitudinal Alzheimer's MRI cohorts",
  "EEG datasets for epilepsy localization",
  "Rodent two-photon calcium imaging",
];

const trending = [
  "Pediatric autism MEG", "Parkinson's DAT-SCAN PET", "Stroke recovery fMRI",
  "UK Biobank T1", "Sleep EEG", "Depression rs-fMRI",
];

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const guard = () => {
    if (!user) {
      navigate({ to: "/auth", search: { redirect: "/search", mode: "login" } });
      return false;
    }
    return true;
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!guard()) return;
    navigate({ to: "/search", search: { q } as never });
  };

  return (
    <AppShell>
      <div className="relative overflow-x-clip">
      {/* HERO */}
      <section className="relative isolate pt-16 pb-20 sm:pt-24 sm:pb-28" style={{ paddingBottom: "calc(5rem + 1px)" }}>
        <NeuralBackground />
        <div className="relative mx-auto max-w-7xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="mx-auto max-w-4xl text-center"
          >
            <div className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs text-foreground/80">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan animate-pulse" />
              10 repositories indexed · 5,827+ verified datasets
              <ArrowUpRight className="h-3 w-3" />
            </div>
            <h1 className="mt-6 font-display text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl md:text-7xl">
              Search Every Open <br className="hidden sm:block" />
              <span className="gradient-text">Neuroscience Dataset</span> with AI
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
              Discover MRI, EEG, PET, MEG, clinical and neuroimaging datasets from OpenNeuro, DANDI,
              ADNI, EBRAINS, UK Biobank and more — through one intelligent semantic search engine.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/search"
                search={{ q: "" }}
                className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[oklch(0.78_0.16_220)] to-[oklch(0.86_0.15_200)] px-5 py-3 text-sm font-medium text-[oklch(0.15_0.03_258)] glow-cyan transition hover:shadow-2xl"
              >
                Start Searching
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
              <a href="#docs" className="inline-flex items-center gap-2 rounded-full glass px-5 py-3 text-sm font-medium hover:bg-white/10">
                <Play className="h-3.5 w-3.5" /> View Documentation
              </a>
            </div>
          </motion.div>

          {/* Search Interface */}
          <motion.div
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative mx-auto mt-14 max-w-3xl"
          >
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-[oklch(0.78_0.16_220/0.5)] via-[oklch(0.86_0.15_200/0.4)] to-[oklch(0.68_0.22_285/0.5)] blur-2xl opacity-60" />
            <form onSubmit={submit} className="relative glass-strong card-elevated rounded-3xl p-3">
              <div className="flex items-center gap-2 rounded-2xl bg-[oklch(0.14_0.028_255)]/70 [.light_&]:bg-white/80 [.light_&]:ring-1 [.light_&]:ring-black/5 px-4 py-3">
                <Sparkles className="h-4 w-4 text-cyan shrink-0" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onFocus={() => { if (!user) guard(); }}
                  className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground sm:text-base"
                  placeholder="Find resting-state fMRI datasets for children under 12 with ADHD..."
                />
                <button type="button" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl hover:bg-white/5" title="Voice">
                  <Mic className="h-4 w-4" />
                </button>
                <button type="submit" className="ml-1 inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-[oklch(0.78_0.16_220)] to-[oklch(0.86_0.15_200)] px-4 py-2 text-sm font-medium text-[oklch(0.15_0.03_258)]">
                  Search <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2 px-3 pb-2 pt-3">
                <button className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 text-xs text-muted-foreground hover:text-foreground">
                  <SlidersHorizontal className="h-3 w-3" /> Advanced filters
                </button>
                {suggestions.map((s) => (
                  <button type="button" key={s} onClick={() => setQ(s)} className="rounded-full border border-white/10 px-3 py-1 text-xs text-muted-foreground hover:border-cyan/40 hover:text-foreground">
                    {s}
                  </button>
                ))}
              </div>
            </form>

          </motion.div>
        </div>
        {/* Seamless fade into stats section */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-[oklch(0.15_0.028_255)]" style={{ zIndex: 1 }} />
      </section>

      {/* STATS */}
      <section className="relative border-b border-white/5 bg-[oklch(0.15_0.028_255)] py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {stats.map((s) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.5 }}
                className="glass rounded-2xl p-4"
              >
                <div className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
                  <Counter value={s.value} suffix={s.suffix} />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* REPOSITORIES */}
      <section className="relative py-24">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHead
            eyebrow="Connected Repositories"
            title={<>Every major neuroscience archive, <span className="gradient-text">unified</span></>}
            subtitle="We continuously index and verify open-science repositories so you can search across all of them at once."
          />
          <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {repositories.map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.5, delay: (i % 5) * 0.05 }}
                whileHover={{ y: -4 }}
                className="group glass card-elevated relative overflow-hidden rounded-2xl p-5"
              >
                <div className={`absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br ${r.color} opacity-20 blur-2xl transition group-hover:opacity-40`} />
                <div className="flex items-center justify-between">
                  <div className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${r.color} text-sm font-bold text-white ring-1 ring-white/20`}>
                    {r.short}
                  </div>
                  <StatusPill status={r.status} />
                </div>
                <div className="mt-4 font-display text-base font-semibold">{r.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">{r.datasets.toLocaleString()} datasets · {r.tier} tier</div>
                <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3 text-xs text-muted-foreground">
                  <span>Synced {r.lastSync}</span>
                  {/* ponytail: use external <a> links with target_blank if URL exists, fallback to disabled text */}
                  {r.url ? (
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-cyan hover:text-foreground">
                      Explore <ArrowRight className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-muted-foreground/30 cursor-not-allowed" title="Link coming soon">
                      Explore <ArrowRight className="h-3 w-3" />
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED DATASETS */}
      <section className="relative py-24">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHead
            eyebrow="Featured Datasets"
            title={<>Handpicked, <span className="gradient-text">verified</span> and citation-ready</>}
            subtitle="Every dataset is validated with DOI resolution, license extraction and metadata normalization."
          />
          <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {datasets.map((d, i) => (
              <motion.article
                key={d.id}
                initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.5, delay: (i % 3) * 0.06 }}
                whileHover={{ y: -4 }}
                className="glass card-elevated group flex h-full flex-col overflow-hidden rounded-2xl"
              >
                <div className="relative h-48 overflow-hidden bg-black">
                  <img
                    src={brainCardImg}
                    alt="Neuroscience brain visualization"
                    loading="lazy"
                    width={800}
                    height={512}
                    className="absolute inset-0 h-full w-full object-cover opacity-90 transition duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <div className="absolute left-3 top-3 flex gap-1.5">
                    <Badge>{d.modality}</Badge>
                    <Badge variant="cyan">{d.access}</Badge>
                  </div>
                  <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white backdrop-blur">
                    <CheckCircle2 className="h-3 w-3 text-cyan" /> Verified {d.verified}
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{d.repo} · {d.id}</div>
                  <h3 className="mt-1 font-display text-lg font-semibold leading-snug">{d.name}</h3>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{d.description}</p>
                  <dl className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <Meta k="Region" v={d.region} />
                    <Meta k="Species" v={d.species} />
                    <Meta k="Age" v={d.ageGroup} />
                    <Meta k="Disease" v={d.disease} />
                    <Meta k="Subjects" v={d.subjects.toString()} />
                    <Meta k="License" v={d.license} />
                  </dl>
                  <div className="mt-5 flex items-center gap-2 border-t border-white/5 pt-4">
                    <Link to="/dataset/$id" params={{ id: d.id }} className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs font-medium hover:bg-white/10">
                      <Rocket className="h-3 w-3" /> Visit
                    </Link>
                    <Link to="/dataset/$id" params={{ id: d.id }} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">
                      Details <ArrowRight className="h-3 w-3" />
                    </Link>
                    <button className="ml-auto grid h-8 w-8 place-items-center rounded-full hover:bg-white/5"><Bookmark className="h-3.5 w-3.5" /></button>
                    <button className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/5"><Share2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="relative py-24">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHead
            eyebrow="How it works"
            title={<>From natural language to <span className="gradient-text">verified research data</span></>}
            subtitle="A neural pipeline that understands your question and cross-references every open repository."
          />
          <div className="relative mt-16">
            <div className="pointer-events-none absolute left-6 top-0 h-full w-px bg-gradient-to-b from-transparent via-cyan/40 to-transparent md:left-1/2" />
            <ol className="space-y-8">
              {[
                { icon: MessageSquare, title: "Natural Language Query", desc: "Ask like you'd ask a colleague — clinical constraints, cohorts, modalities, all in plain English.", },
                { icon: BrainCircuit, title: "AI Query Understanding", desc: "Neural parser extracts intent, entities, modalities and inclusion criteria." },
                { icon: Wand2, title: "Semantic Search", desc: "Embeddings match your intent against 5,000+ datasets across every indexed repository." },
                { icon: Shield, title: "Dataset Verification", desc: "Automatic DOI resolution, license validation and metadata normalization." },
                { icon: Database, title: "Cross-Repository Results", desc: "Unified, ranked results with rich metadata and comparable schema." },
                { icon: Download, title: "Download & Research", desc: "Download, cite, bookmark or hand off to your analysis pipeline." },
              ].map((s, i) => (
                <motion.li
                  key={s.title}
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.5, delay: i * 0.05 }}
                  className={`relative grid gap-4 md:grid-cols-2 md:gap-16 ${i % 2 ? "md:[&>*:first-child]:col-start-2" : ""}`}
                >
                  <div className={`glass card-elevated rounded-2xl p-6 ${i % 2 ? "md:text-left" : "md:text-right"}`}>
                    <div className={`inline-flex items-center gap-2 text-xs uppercase tracking-widest text-cyan`}>
                      Step {String(i + 1).padStart(2, "0")}
                    </div>
                    <h3 className="mt-2 font-display text-xl font-semibold">{s.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
                  </div>
                  <div className="hidden md:block" />
                  <div className="absolute left-6 top-6 grid h-12 w-12 -translate-x-1/2 place-items-center rounded-full bg-[oklch(0.22_0.05_255)] ring-4 ring-background md:left-1/2">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-[oklch(0.78_0.16_220)] to-[oklch(0.86_0.15_200)] text-[oklch(0.15_0.03_258)]">
                      <s.icon className="h-4 w-4" strokeWidth={2.5} />
                    </div>
                  </div>
                </motion.li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* FEATURES BENTO */}
      <section className="relative py-24">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHead
            eyebrow="Built for research teams"
            title={<>An enterprise platform, tuned for <span className="gradient-text">brain science</span></>}
            subtitle="Everything a lab, hospital or pharmaceutical R&D group needs to move from question to cohort."
          />
          <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-6">
            <Feature className="md:col-span-4" icon={Waves} title="Modality-aware search"
              desc="Understands MRI, fMRI, PET, EEG, MEG, iEEG, calcium imaging, tractography and more — including acquisition parameters." />
            <Feature className="md:col-span-2" icon={Zap} title="Sub-second results" desc="Vector index tuned for <500ms cross-repo search." />
            <Feature className="md:col-span-2" icon={Shield} title="Access-tier routing" desc="Route requests through open, registered or restricted access flows." />
            <Feature className="md:col-span-4" icon={Activity} title="Verified metadata pipeline"
              desc="Continuous DOI resolution, license extraction and provenance auditing across every dataset." />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="relative overflow-hidden rounded-3xl glass-strong card-elevated p-10 sm:p-16">
            <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-cyan/30 blur-3xl" />
            <div className="absolute -left-32 -bottom-32 h-96 w-96 rounded-full bg-neural/30 blur-3xl" />
            <div className="relative mx-auto max-w-3xl text-center">
              <h2 className="font-display text-4xl font-semibold sm:text-5xl">
                Ready to <span className="gradient-text">accelerate</span> your next study?
              </h2>
              <p className="mt-4 text-muted-foreground">
                Join thousands of neuroscientists and clinical researchers already searching smarter.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link to="/search" search={{ q: "" }} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[oklch(0.78_0.16_220)] to-[oklch(0.86_0.15_200)] px-5 py-3 text-sm font-medium text-[oklch(0.15_0.03_258)] glow-cyan">
                  Start Searching <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/" className="inline-flex items-center gap-2 rounded-full glass px-5 py-3 text-sm hover:bg-white/10">
                  Open Dashboard <Search className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
      </div>
    </AppShell>
  );
}

function SectionHead({ eyebrow, title, subtitle }: { eyebrow: string; title: React.ReactNode; subtitle: string }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <div className="inline-flex rounded-full glass px-3 py-1 text-[11px] uppercase tracking-widest text-cyan">{eyebrow}</div>
      <h2 className="mt-4 font-display text-3xl font-semibold sm:text-5xl">{title}</h2>
      <p className="mt-4 text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function StatusPill({ status }: { status: "online" | "syncing" | "offline" }) {
  const map = {
    online: { c: "bg-emerald-400", t: "Online" },
    syncing: { c: "bg-amber-400", t: "Syncing" },
    offline: { c: "bg-rose-400", t: "Offline" },
  } as const;
  const s = map[status];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-muted-foreground">
      <span className={`h-1.5 w-1.5 rounded-full ${s.c} animate-pulse`} /> {s.t}
    </span>
  );
}

function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "cyan" }) {
  const v = variant === "cyan"
    ? "bg-cyan/20 text-cyan border-cyan/30"
    : "bg-white/10 text-white border-white/15";
  return <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium backdrop-blur ${v}`}>{children}</span>;
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-[10px] uppercase tracking-widest text-muted-foreground/70">{k}</dt>
      <dd className="text-xs text-foreground/90">{v}</dd>
    </div>
  );
}

function Feature({ icon: Icon, title, desc, className = "" }: { icon: any; title: string; desc: string; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }} transition={{ duration: 0.5 }}
      className={`glass card-elevated relative overflow-hidden rounded-2xl p-6 ${className}`}
    >
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[oklch(0.78_0.16_220)] to-[oklch(0.86_0.15_200)] text-[oklch(0.15_0.03_258)]">
        <Icon className="h-4 w-4" strokeWidth={2.5} />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </motion.div>
  );
}
