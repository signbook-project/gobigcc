"use client";

import { cn } from "@/lib/utils";
import {
  BarChart3,
  Bell,
  BookOpen,
  Building,
  ChevronDown, ChevronRight,
  Cloud,
  CreditCard,
  Database,
  FileImage,
  Flag,
  LayoutDashboard,
  Lock,
  Menu,
  Scale,
  Settings,
  Shield,
  UserCog,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type NavItem = { href: string; label: string; icon: React.ElementType; badge?: string };
type NavSection = { section: string; items: NavItem[] };

function buildNavSections(counts: { pendingJobs: number; pendingReports: number }): NavSection[] {
  return [
    {
      section: "Overview",
      items: [
        { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
        { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
      ],
    },
    {
      section: "People",
      items: [
        { href: "/admin/users", label: "Users", icon: Users },
        { href: "/admin/designers", label: "Designers", icon: UserCog },
        { href: "/admin/corporates", label: "Companies", icon: Building },
      ],
    },
    {
      section: "Content",
      items: [
        { href: "/admin/content", label: "Designs", icon: FileImage },
        { href: "/admin/problems", label: "Challenges", icon: Shield },
        { href: "/admin/jobs", label: "Jobs", icon: Building, badge: counts.pendingJobs > 0 ? String(counts.pendingJobs) : undefined },
        { href: "/admin/editorial", label: "Editorial", icon: BookOpen },
      ],
    },
    {
      section: "Operations",
      items: [
        { href: "/admin/payments", label: "Payments", icon: CreditCard },
        { href: "/admin/reports", label: "Reports", icon: Flag, badge: counts.pendingReports > 0 ? String(counts.pendingReports) : undefined },
        { href: "/admin/notifications", label: "Notifications", icon: Bell },
      ],
    },
    {
      section: "Settings",
      items: [
        { href: "/admin/settings", label: "Email", icon: Bell },
        { href: "/admin/settings/database", label: "Database", icon: Database },
        { href: "/admin/settings/storage", label: "Storage", icon: Cloud },
        { href: "/admin/settings/payments", label: "Payments", icon: CreditCard },
        { href: "/admin/settings/auth", label: "Auth & Security", icon: Lock },
        { href: "/admin/settings/platform", label: "Platform", icon: Settings },
        { href: "/admin/settings/admin-accounts", label: "Admin Accounts", icon: UserCog },
        { href: "/admin/settings/moderation", label: "Moderation Rules", icon: Shield },
        { href: "/admin/settings/legal", label: "Legal / Compliance", icon: Scale },
      ],
    },
  ];
}

function SidebarSection({
  section,
  items,
  pathname,
  collapsed,
}: {
  section: string;
  items: NavItem[];
  pathname: string;
  collapsed: boolean;
}) {
  const [open, setOpen] = useState(true);

  if (collapsed) {
    return (
      <div className="mb-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            className={cn(
              "flex items-center justify-center h-9 w-9 mx-auto rounded-md mb-1 transition-colors",
              pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-2 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
      >
        {section}
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>
      {open && (
        <div className="mt-1 space-y-0.5">
          {items.map((item) => {
            const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
                {item.badge && (
                  <span className="ml-auto rounded-full bg-destructive px-1.5 py-0.5 text-[10px] text-destructive-foreground">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [counts, setCounts] = useState({ pendingJobs: 0, pendingReports: 0 });

  useEffect(() => {
    let active = true;
    function load() {
      fetch("/api/admin/pending-counts")
        .then(r => r.json())
        .then(d => { if (active && d.success) setCounts({ pendingJobs: d.pendingJobs, pendingReports: d.pendingReports }); })
        .catch(() => {});
    }
    load();
    const interval = setInterval(load, 30_000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  const navSections = buildNavSections(counts);

  return (
    <aside
      className={cn(
        "flex flex-col h-full border-r bg-sidebar transition-all duration-200",
        collapsed ? "w-14" : "w-56"
      )}
    >
      {/* Header */}
      <div className={cn("flex items-center h-14 border-b px-3", collapsed ? "justify-center" : "justify-between")}>
        {!collapsed && (
          <Link href="/admin" className="font-semibold text-sm text-foreground">
            GoBig Admin
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
        >
          {collapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {navSections.map((sec) => (
          <SidebarSection
            key={sec.section}
            section={sec.section}
            items={sec.items}
            pathname={pathname}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className={cn("border-t p-3", collapsed ? "flex justify-center" : "")}>
        {collapsed ? (
          <Link href="/" title="Back to site" className="text-muted-foreground hover:text-foreground">
            <LayoutDashboard className="h-4 w-4" />
          </Link>
        ) : (
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground">
            ← Back to site
          </Link>
        )}
      </div>
    </aside>
  );
}
