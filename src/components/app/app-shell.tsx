import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  Brain, LayoutDashboard, Bookmark, History, Settings as SettingsIcon,
  LogOut, User as UserIcon, PanelLeft, PanelLeftClose, X, HelpCircle, ChevronsUpDown,
  Sun, Moon,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const nav = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/" },
  { icon: Bookmark, label: "Saved & Collections", to: "/saved" },
  { icon: History, label: "History", to: "/history" },
  { icon: SettingsIcon, label: "Settings", to: "/settings" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, profile, signOut } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (to: string) => to === "/" ? pathname === "/" : pathname.startsWith(to);
  const initials = (profile?.full_name || user?.email || "?").slice(0, 1).toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  const sidebarWidth = collapsed ? "w-16" : "w-60";
  const mainPad = collapsed ? "md:pl-16" : "md:pl-60";

  return (
    <div className="relative min-h-screen">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-30 hidden ${sidebarWidth} flex-col border-r border-sidebar-border bg-sidebar/85 backdrop-blur-xl transition-all duration-200 hover:bg-sidebar-accent/20 md:flex`}>
        <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} px-3 py-5`}>
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-[oklch(0.78_0.16_220)] to-[oklch(0.86_0.15_200)] glow-cyan shrink-0">
              <Brain className="h-4 w-4 text-[oklch(0.15_0.03_258)]" strokeWidth={2.5} />
            </span>
            {!collapsed && (
              <span className="font-display text-sm font-semibold whitespace-nowrap">
                NeuroSearch <span className="text-cyan">AI</span>
              </span>
            )}
          </Link>
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>

        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="mx-auto mb-2 grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
            title="Expand sidebar"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        )}

        <nav className="flex-1 space-y-1 px-3">
          {nav.map((n) => {
            const active = isActive(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                title={collapsed ? n.label : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
                  active ? "bg-sidebar-accent text-foreground" : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                } ${collapsed ? "justify-center" : ""}`}
              >
                <n.icon className={`h-4 w-4 shrink-0 ${active ? "text-cyan" : ""}`} />
                {!collapsed && <span className="truncate">{n.label}</span>}
                {!collapsed && active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan" />}
              </Link>
            );
          })}
        </nav>

        {/* Theme toggle + Help & Docs — sits above profile */}
        <div className="space-y-1 px-3 pb-2">
          <button
            onClick={toggleTheme}
            title={collapsed ? (theme === "dark" ? "Light mode" : "Dark mode") : undefined}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground ${collapsed ? "justify-center" : ""}`}
          >
            {theme === "dark" ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
            {!collapsed && <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>}
          </button>
          <Link
            to="/help"
            title={collapsed ? "Help & Docs" : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
              isActive("/help") ? "bg-sidebar-accent text-foreground" : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
            } ${collapsed ? "justify-center" : ""}`}
          >
            <HelpCircle className={`h-4 w-4 shrink-0 ${isActive("/help") ? "text-cyan" : ""}`} />
            {!collapsed && <span>Help & Docs</span>}
            {!collapsed && isActive("/help") && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan" />}
          </Link>
        </div>

        {/* Profile container — bottom */}
        <div className="border-t border-sidebar-border p-3">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={`flex w-full items-center gap-3 rounded-xl p-2 hover:bg-sidebar-accent transition-colors ${collapsed ? "justify-center" : ""}`}>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-neural to-electric text-xs font-semibold text-white">
                    {initials}
                  </span>
                  {!collapsed && (
                    <>
                      <span className="min-w-0 flex-1 text-left">
                        <span className="block truncate text-sm text-foreground">
                          {profile?.full_name || user.email?.split("@")[0]}
                        </span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {user.email}
                        </span>
                      </span>
                      <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    </>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuLabel className="truncate">
                  {profile?.full_name || user.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/settings"><UserIcon className="mr-2 h-4 w-4" />Profile & settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/saved"><Bookmark className="mr-2 h-4 w-4" />Saved datasets</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              to="/auth"
              search={{ redirect: undefined, mode: "login" as const }}
              title={collapsed ? "Sign in" : undefined}
              className={`flex items-center gap-2 rounded-xl bg-gradient-to-r from-[oklch(0.78_0.16_220)] to-[oklch(0.86_0.15_200)] px-3 py-2 text-sm font-medium text-[oklch(0.15_0.03_258)] ${collapsed ? "justify-center" : "justify-center"}`}
            >
              <UserIcon className="h-4 w-4" />
              {!collapsed && <span>Sign in</span>}
            </Link>
          )}
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-sidebar p-4">
            <div className="flex items-center justify-between">
              <Link to="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-[oklch(0.78_0.16_220)] to-[oklch(0.86_0.15_200)]">
                  <Brain className="h-4 w-4 text-[oklch(0.15_0.03_258)]" strokeWidth={2.5} />
                </span>
                <span className="font-display text-sm font-semibold">NeuroSearch AI</span>
              </Link>
              <button onClick={() => setMobileOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-sidebar-accent transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-6 flex-1 space-y-1">
              {nav.map((n) => (
                <Link key={n.to} to={n.to} onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
                    isActive(n.to) ? "bg-sidebar-accent text-foreground" : "text-muted-foreground hover:bg-sidebar-accent"
                  }`}>
                  <n.icon className="h-4 w-4" /> {n.label}
                </Link>
              ))}
            </div>
            <Link to="/help" onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
                isActive("/help") ? "bg-sidebar-accent text-foreground" : "text-muted-foreground hover:bg-sidebar-accent"
              }`}>
              <HelpCircle className="h-4 w-4" /> Help & Docs
            </Link>
            <div className="mt-2 border-t border-sidebar-border pt-3">
              {user ? (
                <button onClick={handleSignOut} className="flex w-full items-center gap-3 rounded-xl p-2 hover:bg-sidebar-accent transition-colors">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-neural to-electric text-xs font-semibold text-white">
                    {initials}
                  </span>
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-sm">{profile?.full_name || user.email?.split("@")[0]}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">Sign out</span>
                  </span>
                </button>
              ) : (
                <Link to="/auth" search={{ redirect: undefined, mode: "login" as const }} onClick={() => setMobileOpen(false)} className="block rounded-xl bg-gradient-to-r from-[oklch(0.78_0.16_220)] to-[oklch(0.86_0.15_200)] px-3 py-2 text-center text-sm font-medium text-[oklch(0.15_0.03_258)]">
                  Sign in
                </Link>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className={`min-h-screen ${mainPad} transition-[padding] duration-200`}>
        {/* Floating mobile menu button (top navbar removed) */}
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
