import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  Brain, LayoutDashboard, Users, Database, ShieldCheck, Sparkles, BarChart3,
  Megaphone, Server, HardDrive, Coins, ScrollText, LifeBuoy,
  LogOut, User as UserIcon, PanelLeft, PanelLeftClose, ArrowLeft, Sun, Moon,
  ChevronsUpDown, X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NavItem = { icon: typeof Users; label: string; to: string; search?: Record<string, string> };
type NavGroup = { label: string; items: NavItem[] };

const groups: NavGroup[] = [
  {
    label: "Platform",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", to: "/admin" },
      { icon: BarChart3, label: "Analytics & reports", to: "/admin/analytics" },
      { icon: Megaphone, label: "Announcements", to: "/admin/announcements" },
    ],
  },
  {
    label: "Content & moderation",
    items: [
      { icon: Users, label: "User management", to: "/admin/users" },
      { icon: Database, label: "Repository management", to: "/admin/repositories" },
      { icon: ShieldCheck, label: "Dataset moderation", to: "/admin/moderation" },
    ],
  },
  {
    label: "Infrastructure & ops",
    items: [
      { icon: Server, label: "Infrastructure", to: "/admin/infrastructure" },
      { icon: Sparkles, label: "Agent activity", to: "/admin/agents" },
      { icon: Coins, label: "Token usage", to: "/admin/tokens" },
    ],
  },
  {
    label: "Support",
    items: [
      { icon: ScrollText, label: "Audit log", to: "/admin/audit-log" },
      { icon: LifeBuoy, label: "Help desk", to: "/admin/help-desk" },
    ],
  },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const search = useRouterState({ select: (s) => s.location.search as Record<string, unknown> });
  const { user, profile, signOut } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (item: NavItem) => {
    if (item.to === "/admin") return pathname === "/admin";
    if (!pathname.startsWith(item.to)) return false;
    if (item.search) {
      return Object.entries(item.search).every(([k, v]) => String(search?.[k] ?? "") === v);
    }
    return true;
  };

  const initials = (profile?.full_name || user?.email || "A").slice(0, 1).toUpperCase();
  const handleSignOut = async () => { await signOut(); navigate({ to: "/" }); };

  const sidebarWidth = collapsed ? "w-16" : "w-64";
  const mainPad = collapsed ? "md:pl-16" : "md:pl-64";

  return (
    <div className="relative min-h-screen">
      <aside className={`fixed inset-y-0 left-0 z-30 hidden ${sidebarWidth} flex-col border-r border-sidebar-border bg-sidebar/85 backdrop-blur-xl transition-[width] duration-200 md:flex`}>
        <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} px-3 py-5`}>
          <Link to="/admin" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-[oklch(0.78_0.16_220)] to-[oklch(0.86_0.15_200)] shrink-0">
              <Brain className="h-4 w-4 text-[oklch(0.15_0.03_258)]" strokeWidth={2.5} />
            </span>
            {!collapsed && (
              <span className="font-display text-sm font-semibold whitespace-nowrap">
                NeuroSearch <span className="text-cyan">Admin</span>
              </span>
            )}
          </Link>
          {!collapsed && (
            <button onClick={() => setCollapsed(true)} title="Collapse"
              className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-white/5 [.light_&]:hover:bg-black/5 hover:text-foreground">
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>

        {collapsed && (
          <button onClick={() => setCollapsed(false)} title="Expand"
            className="mx-auto mb-2 grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-white/5 [.light_&]:hover:bg-black/5 hover:text-foreground">
            <PanelLeft className="h-4 w-4" />
          </button>
        )}

        <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-3">
          {groups.map((g) => (
            <div key={g.label}>
              {!collapsed && (
                <div className="px-3 pb-1 pt-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground/70">
                  {g.label}
                </div>
              )}
              <div className="space-y-1">
                {g.items.map((item) => {
                  const active = isActive(item);
                  return (
                    <Link
                      key={item.label}
                      to={item.to}
                      search={item.search as never}
                      title={collapsed ? item.label : undefined}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                        active ? "bg-white/10 [.light_&]:bg-black/10 text-foreground font-medium" : "text-muted-foreground hover:bg-white/5 [.light_&]:hover:bg-black/5 hover:text-foreground"
                      } ${collapsed ? "justify-center" : ""}`}
                    >
                      <item.icon className={`h-4 w-4 shrink-0 ${active ? "text-cyan" : ""}`} />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="space-y-1 px-3 pb-2">
          <button onClick={toggleTheme}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground transition hover:bg-white/5 [.light_&]:hover:bg-black/5 hover:text-foreground ${collapsed ? "justify-center" : ""}`}
            title={collapsed ? (theme === "dark" ? "Light mode" : "Dark mode") : undefined}>
            {theme === "dark" ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
            {!collapsed && <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>}
          </button>
        </div>

        <div className="border-t border-white/5 [.light_&]:border-black/5 p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={`flex w-full items-center gap-3 rounded-xl p-2 hover:bg-white/5 [.light_&]:hover:bg-black/5 ${collapsed ? "justify-center" : ""}`}>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-neural to-electric text-xs font-semibold text-white">
                  {initials}
                </span>
                {!collapsed && (
                  <>
                    <span className="min-w-0 flex-1 text-left">
                      <span className="block truncate text-sm text-foreground">{profile?.full_name || user?.email?.split("@")[0]}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">Admin · {user?.email}</span>
                    </span>
                    <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56">
              <DropdownMenuLabel className="truncate">{profile?.full_name || user?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild><Link to="/admin/settings"><UserIcon className="mr-2 h-4 w-4" />Profile & settings</Link></DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}><LogOut className="mr-2 h-4 w-4" />Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-sidebar p-4 shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between border-b border-sidebar-border pb-4">
              <Link to="/admin" onClick={() => setMobileOpen(false)} className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-[oklch(0.78_0.16_220)] to-[oklch(0.86_0.15_200)] shrink-0">
                  <Brain className="h-4 w-4 text-[oklch(0.15_0.03_258)]" strokeWidth={2.5} />
                </span>
                <span className="font-display text-sm font-semibold whitespace-nowrap">
                  NeuroSearch <span className="text-cyan">Admin</span>
                </span>
              </Link>
              <button
                onClick={() => setMobileOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <nav className="mt-4 flex-1 space-y-4">
              {groups.map((g) => (
                <div key={g.label}>
                  <div className="px-3 pb-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground/70">
                    {g.label}
                  </div>
                  <div className="space-y-1">
                    {g.items.map((item) => {
                      const active = isActive(item);
                      return (
                        <Link
                          key={item.label}
                          to={item.to}
                          search={item.search as never}
                          onClick={() => setMobileOpen(false)}
                          className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                            active
                              ? "bg-sidebar-accent text-foreground font-medium"
                              : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                          }`}
                        >
                          <item.icon className={`h-4 w-4 shrink-0 ${active ? "text-cyan" : ""}`} />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            <div className="mt-4 space-y-1 border-t border-sidebar-border pt-3">
              <button
                onClick={toggleTheme}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground transition hover:bg-sidebar-accent hover:text-foreground"
              >
                {theme === "dark" ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
                <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
              </button>
            </div>

            <div className="mt-2 border-t border-sidebar-border pt-3">
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-xl p-2 hover:bg-sidebar-accent transition-colors"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-neural to-electric text-xs font-semibold text-white">
                  {initials}
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-sm text-foreground">
                    {profile?.full_name || user?.email?.split("@")[0]}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">Admin · Sign out</span>
                </span>
              </button>
            </div>
          </aside>
        </div>
      )}

      <div className={`min-h-screen ${mainPad} transition-[padding] duration-200`}>
        {/* Floating mobile menu button */}
        <button
          onClick={() => setMobileOpen(true)}
          className="fixed left-3 top-3 z-20 grid h-10 w-10 place-items-center rounded-full glass text-muted-foreground hover:text-foreground md:hidden"
          title="Open menu"
        >
          <PanelLeft className="h-4 w-4" />
        </button>

        <main>{children}</main>
      </div>
    </div>
  );
}

// Small helpers shared by admin pages
export function AdminPageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/5 [.light_&]:border-black/5 pl-14 pr-6 py-6 md:px-8">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
