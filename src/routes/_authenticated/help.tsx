import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bookmark, FolderOpen, History, Settings, Sun, Mail, HelpCircle, Search, Shield, Send, X, Loader2 } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/_authenticated/help")({
  component: HelpPage,
});

const faqs = [
  {
    q: "What is NeuroSearch AI?",
    a: "NeuroSearch AI is an AI-powered research and search platform that helps you discover datasets, save results, and organize them into collections — all in one place.",
  },
  {
    q: "How do I search for datasets/information?",
    a: "Go to the Dashboard and type your query into the search bar. Results stream in real time as the AI processes your request. Click any result to view full details.",
  },
  {
    q: "How do I save a result?",
    a: "Click the bookmark icon on any search result or dataset detail page. The item is instantly saved and accessible from the Saved & Collections page.",
  },
  {
    q: "Where can I find my saved items?",
    a: "Open the Saved & Collections page from the sidebar. It shows all your Saved datasets in one place, grouped for easy browsing.",
  },
  {
    q: "How do I create and manage collections?",
    a: "Go to Saved & Collections, switch to the Collections tab, and enter a name to create a new collection. You can add saved items to collections and delete collections you no longer need.",
  },
  {
    q: "Can I move an item between collections or remove it?",
    a: "Yes. From the Saved & Collections page you can remove individual saved items. Collection management lets you keep your research organized by topic.",
  },
  {
    q: "Where can I see my past searches?",
    a: "The History page in the sidebar shows all your recent queries. You can re-run any search by clicking it, or clear your entire history with one click.",
  },
  {
    q: "How do I change my profile or preferences?",
    a: "Visit the Settings page from the sidebar. There you can update your name, institute, role, notification preferences, social links, and manage your account.",
  },
  {
    q: "How do I switch between light and dark mode?",
    a: "Click the Sun/Moon toggle button in the sidebar (just above the profile section) to switch between dark and light mode. Your preference is remembered across sessions.",
  },
  {
    q: "Is my saved data private to my account?",
    a: "Yes. All your saved datasets, collections, and search history are tied to your account and are not visible to other users. Your data is protected by secure authentication.",
  },
];

const steps = [
  {
    number: 1,
    icon: Search,
    title: "Search",
    desc: "Run a query from the Dashboard to find datasets and research results.",
  },
  {
    number: 2,
    icon: HelpCircle,
    title: "Explore results",
    desc: "Open any result to view detailed information about the dataset.",
  },
  {
    number: 3,
    icon: Bookmark,
    title: "Save",
    desc: "Bookmark items you want to keep for later reference.",
  },
  {
    number: 4,
    icon: FolderOpen,
    title: "Organize",
    desc: "Group saved items into Collections to keep research tidy.",
  },
];

function HelpPage() {
  const { user, profile } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setSending(true);
    try {
      await api.admin.helpDesk.submitTicket({
        subject: subject.trim(),
        message: message.trim(),
        email: user?.email,
        name: profile?.full_name || undefined,
      });
      toast.success("Support ticket submitted — we'll respond within 1–2 business days.");
      setSubject("");
      setMessage("");
      setShowForm(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit ticket.");
    } finally {
      setSending(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        {/* Hero */}
        <div className="mb-10">
          <h1 className="font-display text-3xl font-semibold">Help & Docs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Everything you need to know about using NeuroSearch AI.
          </p>
        </div>

        {/* Introduction */}
        <div className="glass card-elevated rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-cyan/40 to-neural/40">
              <Search className="h-5 w-5 text-cyan" />
            </span>
            <div>
              <div className="font-display text-base font-semibold">What is NeuroSearch AI?</div>
              <p className="mt-1 text-sm text-muted-foreground">
                NeuroSearch AI is an AI-powered research and search platform that lets you search
                datasets, save results, and organize them into collections. Whether you are a
                researcher, scientist, or working professional, NeuroSearch AI helps you discover
                and manage data efficiently.
              </p>
            </div>
          </div>
        </div>

        {/* How it works */}
        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold">How it works</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Get started in four simple steps.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <div key={s.number} className="glass card-elevated rounded-2xl p-5">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-xs font-bold text-cyan">
                  {s.number}
                </span>
                <s.icon className="mt-4 h-5 w-5 text-cyan" />
                <div className="mt-2 font-display text-base font-semibold">{s.title}</div>
                <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Guides */}
        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold">Guides</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Step-by-step instructions for common tasks.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="glass card-elevated rounded-2xl p-6">
              <div className="flex items-center gap-2 text-cyan">
                <Bookmark className="h-5 w-5" />
                <div className="text-xs uppercase tracking-widest">Guide</div>
              </div>
              <div className="mt-3 font-display text-base font-semibold">How do I save data?</div>
              <ol className="mt-3 list-inside list-decimal space-y-1.5 text-sm text-muted-foreground">
                <li>Find a result you want to keep from the search results or dataset detail page.</li>
                <li>Click the bookmark icon on that result.</li>
                <li>The item is instantly saved to your account.</li>
                <li>View all saved items under <strong>Saved &amp; Collections</strong> in the sidebar.</li>
              </ol>
            </div>
            <div className="glass card-elevated rounded-2xl p-6">
              <div className="flex items-center gap-2 text-cyan">
                <FolderOpen className="h-5 w-5" />
                <div className="text-xs uppercase tracking-widest">Guide</div>
              </div>
              <div className="mt-3 font-display text-base font-semibold">
                How do I create a Collection?
              </div>
              <ol className="mt-3 list-inside list-decimal space-y-1.5 text-sm text-muted-foreground">
                <li>Go to <strong>Saved &amp; Collections</strong> in the sidebar.</li>
                <li>Switch to the <strong>Collections</strong> tab.</li>
                <li>Enter a name for your collection and click <strong>Create</strong>.</li>
                <li>Add saved items into your collection to keep research organized by topic.</li>
              </ol>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold">Frequently asked questions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Quick answers to the most common questions.
          </p>
          <div className="mt-4 glass card-elevated rounded-2xl divide-y divide-white/5">
            <Accordion type="multiple" className="px-6">
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger className="text-sm font-medium">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Support */}
        <section className="mt-10">
          <div className="glass card-elevated rounded-2xl border border-cyan/20 bg-gradient-to-br from-cyan/5 to-transparent p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan/20">
                <Mail className="h-5 w-5 text-cyan" />
              </span>
              <div>
                <div className="font-display text-base font-semibold">Still need help?</div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Our team typically responds within 1–2 business days.
                </p>
              </div>
            </div>

            {!showForm ? (
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[oklch(0.78_0.16_220)] to-[oklch(0.86_0.15_200)] px-5 py-2.5 text-sm font-medium text-[oklch(0.15_0.03_258)] transition hover:opacity-90"
              >
                <Mail className="h-4 w-4" />
                Submit a support ticket
              </button>
            ) : (
              <form onSubmit={handleSubmit} className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-widest text-cyan">New support ticket</div>
                  <button type="button" onClick={() => { setShowForm(false); setSubject(""); setMessage(""); }} className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-white/10 hover:text-foreground transition">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject"
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/70 focus:border-cyan/50"
                />
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your issue or question..."
                  rows={4}
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/70 focus:border-cyan/50 resize-none"
                />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] text-muted-foreground">
                    {user?.email ? <>Ticket will be sent from <strong>{user.email}</strong></> : 'Sign in to submit a ticket'}
                  </span>
                  <button
                    type="submit"
                    disabled={sending || !subject.trim() || !message.trim()}
                    className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[oklch(0.78_0.16_220)] to-[oklch(0.86_0.15_200)] px-4 py-2 text-xs font-medium text-[oklch(0.15_0.03_258)] transition hover:opacity-90 disabled:opacity-40"
                  >
                    {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    {sending ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
