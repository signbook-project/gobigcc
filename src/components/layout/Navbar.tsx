"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Bell, Menu, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/designs", label: "Designs" },
  { href: "/problems", label: "Challenges" },
  { href: "/jobs", label: "Jobs" },
  { href: "/editorial", label: "Editorial" },
];

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [count, setCount] = useState(0);

  // ✅ fetch notification count safely
  useEffect(() => {
    if (!session?.user) return;

    async function loadNotifications() {
      try {
        const res = await fetch("/api/notifications/unread-count");
        const data = await res.json();
        setCount(data.count || 0);
      } catch (err) {
        console.error("Failed to load notifications", err);
      }
    }

    loadNotifications();
  }, [session]);
console.log("SESSION:", session);
console.log("USER ID:", session?.user?.id);
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">

        {/* Logo */}
        <Link href="/" className="font-semibold text-foreground">
          GoBig.cc
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 flex-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                pathname.startsWith(link.href)
                  ? "bg-secondary font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-2">

          {session ? (
            <>
              {/* Publish */}
              <Link
                href="/designs/new"
                className="hidden sm:flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
              >
                <Plus className="h-3.5 w-3.5" />
                Publish
              </Link>

              {/* Notifications */}
              <Link
                href="/notifications"
                className="relative rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-secondary"
              >
                <Bell className="h-4 w-4" />

                {count > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1 rounded-full">
                    {count}
                  </span>
                )}
              </Link>

              {/* Profile */}
              <div className="relative group">
                <button className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-sm font-medium border">
                  {session.user.name?.[0]?.toUpperCase() ??
                    session.user.email?.[0]?.toUpperCase()}
                </button>

                <div className="absolute right-0 top-full mt-1 hidden group-hover:block w-48 rounded-lg border bg-background shadow-lg py-1">
                  <Link href="/profile" className="block px-4 py-2 text-sm hover:bg-secondary">
                    Profile
                  </Link>
                  <Link href="/messages" className="block px-4 py-2 text-sm hover:bg-secondary">
                    Messages
                  </Link>

                  {(session.user as any)?.role === "ADMIN" && (
                    <Link href="/admin" className="block px-4 py-2 text-sm hover:bg-secondary">
                      Admin panel
                    </Link>
                  )}

                  <hr className="my-1" />

                  <button
                    onClick={() => signOut()}
                    className="block w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-secondary"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm border px-3 py-1.5 rounded-md">
                Log in
              </Link>
              <Link href="/register" className="text-sm bg-primary text-white px-3 py-1.5 rounded-md">
                Join free
              </Link>
            </>
          )}

          {/* Mobile menu */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden border-t px-4 py-3 flex flex-col gap-2">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "px-3 py-2 rounded-md text-sm",
                pathname.startsWith(link.href)
                  ? "bg-secondary font-medium"
                  : "text-muted-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}