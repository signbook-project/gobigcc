"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { timeAgo, cn } from "@/lib/utils";
import {
  Bell, Heart, GitFork, MessageCircle, Users, Trophy,
  Briefcase, UserPlus, CheckCheck, Settings,
} from "lucide-react";
import Link from "next/link";

interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string;
  linkUrl?: string;
  isRead: boolean;
  createdAt: string;
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  NEW_FOLLOWER: UserPlus,
  NEW_COMMENT: MessageCircle,
  NEW_COLLABORATOR_REQUEST: Users,
  COLLABORATOR_ACCEPTED: Users,
  DESIGN_LIKED: Heart,
  DESIGN_FORKED: GitFork,
  SUBMISSION_STATUS_CHANGED: Trophy,
  JOB_APPLICATION_STATUS: Briefcase,
  MESSAGE_RECEIVED: MessageCircle,
  JOB_MATCH: Briefcase,
  PROBLEM_UPDATE: Trophy,
  SYSTEM: Bell,
};

const TYPE_COLORS: Record<string, string> = {
  NEW_FOLLOWER: "text-blue-600 bg-blue-50",
  DESIGN_LIKED: "text-red-500 bg-red-50",
  DESIGN_FORKED: "text-purple-600 bg-purple-50",
  NEW_COMMENT: "text-green-600 bg-green-50",
  SUBMISSION_STATUS_CHANGED: "text-amber-600 bg-amber-50",
  JOB_APPLICATION_STATUS: "text-indigo-600 bg-indigo-50",
  MESSAGE_RECEIVED: "text-teal-600 bg-teal-50",
  SYSTEM: "text-muted-foreground bg-secondary",
};

const FILTER_TABS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "DESIGN_LIKED,DESIGN_FORKED", label: "Designs" },
  { key: "NEW_FOLLOWER", label: "Followers" },
  { key: "MESSAGE_RECEIVED", label: "Messages" },
  { key: "SUBMISSION_STATUS_CHANGED,JOB_APPLICATION_STATUS", label: "Opportunities" },
];

export default function NotificationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status !== "authenticated") return;
    loadNotifications();
  }, [status, activeFilter]);

  async function loadNotifications() {
    setLoading(true);
    const params = activeFilter === "unread" ? "?unread=1" : "";
    const res = await fetch(`/api/notifications${params}`);
    if (res.ok) {
      const d = await res.json();
      let items = d.notifications;
      // Client-side filter by type group
      if (activeFilter !== "all" && activeFilter !== "unread") {
        const types = activeFilter.split(",");
        items = items.filter((n: Notification) => types.includes(n.type));
      }
      setNotifications(items);
      setUnreadCount(d.unreadCount);
      setTotal(d.total);
    }
    setLoading(false);
  }

  async function markAllRead() {
    setMarkingAll(true);
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setMarkingAll(false);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }

  async function markRead(id: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }

  if (status === "loading") return null;

  return (
    <>
      <Navbar />
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              Notifications
              {unreadCount > 0 && (
                <span className="rounded-full bg-primary text-primary-foreground text-xs px-2 py-0.5">
                  {unreadCount}
                </span>
              )}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{total} total notifications</p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                disabled={markingAll}
                className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs hover:bg-secondary transition-colors disabled:opacity-50"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
            <Link href="/profile/edit" className="rounded-md border px-2 py-1.5 text-xs hover:bg-secondary transition-colors">
              <Settings className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 flex-wrap mb-4 border-b pb-3">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={cn(
                "rounded-full px-3 py-1 text-xs transition-colors border",
                activeFilter === tab.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "text-muted-foreground hover:bg-secondary border-transparent"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Notifications list */}
        {loading ? (
          <div className="flex flex-col gap-2">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="flex gap-3 p-4 rounded-lg border animate-pulse">
                <div className="h-9 w-9 rounded-full bg-secondary shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-secondary rounded" />
                  <div className="h-3 w-1/2 bg-secondary rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Bell className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="font-medium">No notifications yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              {activeFilter === "unread" ? "You're all caught up!" : "Activity will appear here as you engage with the platform."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {notifications.map(notif => {
              const Icon = TYPE_ICONS[notif.type] ?? Bell;
              const colorClass = TYPE_COLORS[notif.type] ?? "text-muted-foreground bg-secondary";
              const content = (
                <div
                  key={notif.id}
                  className={cn(
                    "flex items-start gap-3 p-4 rounded-lg border transition-colors cursor-pointer group",
                    notif.isRead ? "bg-card hover:bg-secondary/50" : "bg-primary/[0.03] border-primary/20 hover:bg-primary/[0.06]"
                  )}
                  onClick={() => { if (!notif.isRead) markRead(notif.id); }}
                >
                  {/* Icon */}
                  <div className={cn("h-9 w-9 rounded-full flex items-center justify-center shrink-0", colorClass)}>
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm leading-snug", !notif.isRead && "font-medium")}>
                      {notif.title}
                    </p>
                    {notif.body && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{notif.body}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">{timeAgo(notif.createdAt)}</p>
                  </div>

                  {/* Unread dot */}
                  {!notif.isRead && (
                    <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                  )}
                </div>
              );

              return notif.linkUrl ? (
                <Link key={notif.id} href={notif.linkUrl} onClick={() => { if (!notif.isRead) markRead(notif.id); }}>
                  {content}
                </Link>
              ) : content;
            })}
          </div>
        )}
      </div>
    </>
  );
}
