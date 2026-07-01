"use client";

import { cn, timeAgo } from "@/lib/utils";
import { MessageCircle, Plus, Search, Send, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

interface Message { id: string; senderId: string; content: string; createdAt: string; isRead: boolean; }
interface Contact { id: string; name: string | null; designerProfile: { alias: string | null } | null; }
interface Thread { contact: Contact; lastMessage: Message; unreadCount: number; }
interface SearchUser { id: string; name: string; role: string; designerProfile: { alias: string | null } | null; }

interface Props {
  currentUserId: string;
  threads: Thread[];
  initialContactId: string | null;
  initialConversation: Message[];
}

export function MessagingClient({ currentUserId, threads: initialThreads, initialContactId, initialConversation }: Props) {
  const [threads, setThreads] = useState(initialThreads);
  const [activeContactId, setActiveContactId] = useState(initialContactId);
  const [messages, setMessages] = useState<Message[]>(initialConversation);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // New conversation dialog state
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);

  const activeThread = threads.find(t => t.contact.id === activeContactId);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Debounced user search
  useEffect(() => {
    if (!showNewMessage || searchQuery.trim().length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const timeout = setTimeout(async () => {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery.trim())}`);
      if (res.ok) {
        const d = await res.json();
        setSearchResults(d.users);
      }
      setSearching(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, showNewMessage]);

  async function loadConversation(contactId: string) {
    setActiveContactId(contactId);
    const res = await fetch(`/api/messages?contactId=${contactId}`);
    if (res.ok) {
      const d = await res.json();
      setMessages(d.messages);
    }
  }

  function startNewConversation(user: SearchUser) {
    // If a thread already exists, just open it
    const existing = threads.find(t => t.contact.id === user.id);
    if (existing) {
      loadConversation(user.id);
    } else {
      // Create a placeholder thread (no messages yet) so the chat panel opens
      const placeholderContact: Contact = { id: user.id, name: user.name, designerProfile: user.designerProfile };
      setThreads(prev => [
        { contact: placeholderContact, lastMessage: { id: "draft", senderId: currentUserId, content: "", createdAt: new Date().toISOString(), isRead: true }, unreadCount: 0 },
        ...prev,
      ]);
      setActiveContactId(user.id);
      setMessages([]);
    }
    setShowNewMessage(false);
    setSearchQuery("");
    setSearchResults([]);
  }

  async function sendMessage() {
    if (!input.trim() || !activeContactId || sending) return;
    setSending(true);
    const content = input.trim();
    setInput("");
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientId: activeContactId, content }),
    });
    setSending(false);
    if (res.ok) {
      const d = await res.json();
      setMessages(prev => [...prev, d.message]);
      // Update thread preview + bump to top
      setThreads(prev => {
        const idx = prev.findIndex(t => t.contact.id === activeContactId);
        if (idx === -1) return prev;
        const updated = { ...prev[idx], lastMessage: d.message };
        const rest = prev.filter((_, i) => i !== idx);
        return [updated, ...rest];
      });
    }
  }

  function contactName(c: Contact) {
    return c.designerProfile?.alias ?? c.name ?? "User";
  }

  return (
    <div className="rounded-xl border overflow-hidden" style={{ height: "calc(100vh - 200px)", minHeight: 480 }}>
      <div className="flex h-full relative">
        {/* Thread list */}
        <aside className="w-72 border-r flex flex-col shrink-0">
          <div className="p-3 border-b flex items-center gap-2">
            <input
              className="flex-1 h-8 rounded-md border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none"
              placeholder="Search conversations…"
            />
            <button
              onClick={() => setShowNewMessage(true)}
              title="New message"
              className="h-8 w-8 shrink-0 flex items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {threads.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full px-4 text-center gap-3">
                <MessageCircle className="h-8 w-8 text-muted-foreground/30" />
                <div>
                  <p className="text-sm font-medium">No conversations yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Start a new message to connect with designers and companies.</p>
                </div>
                <button
                  onClick={() => setShowNewMessage(true)}
                  className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" /> New message
                </button>
              </div>
            ) : (
              threads.map(t => (
                <button
                  key={t.contact.id}
                  onClick={() => loadConversation(t.contact.id)}
                  className={cn(
                    "flex items-start gap-3 w-full p-3 text-left hover:bg-secondary transition-colors border-b",
                    activeContactId === t.contact.id && "bg-secondary"
                  )}
                >
                  <div className="h-9 w-9 rounded-full bg-secondary border flex items-center justify-center text-sm font-medium shrink-0">
                    {contactName(t.contact)[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">{contactName(t.contact)}</span>
                      <span className="text-xs text-muted-foreground shrink-0 ml-1">
                        {t.lastMessage.content ? timeAgo(t.lastMessage.createdAt) : "New"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {t.lastMessage.content || "Say hello 👋"}
                    </p>
                  </div>
                  {t.unreadCount > 0 && (
                    <span className="h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center shrink-0">
                      {t.unreadCount}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {activeContactId && activeThread ? (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b">
                <div className="h-8 w-8 rounded-full bg-secondary border flex items-center justify-center text-xs font-medium">
                  {contactName(activeThread.contact)[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-sm">{contactName(activeThread.contact)}</p>
                  <Link
                    href={`/profile/${activeThread.contact.designerProfile?.alias ?? activeThread.contact.id}`}
                    className="text-xs text-muted-foreground hover:underline"
                  >
                    View profile →
                  </Link>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                {messages.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground mt-8">
                    Start a conversation with {contactName(activeThread.contact)}
                  </p>
                )}
                {messages.map(msg => {
                  const mine = msg.senderId === currentUserId;
                  return (
                    <div key={msg.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                      <div className={cn(
                        "max-w-[70%] rounded-xl px-3.5 py-2 text-sm",
                        mine ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                      )}>
                        <p>{msg.content}</p>
                        <p className={cn("text-[10px] mt-0.5", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                          {timeAgo(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t flex gap-2">
                <input
                  className="flex-1 h-9 rounded-md border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Write a message…"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }}}
                  autoFocus
                />
                <button
                  onClick={sendMessage}
                  disabled={sending || !input.trim()}
                  className="h-9 w-9 rounded-md bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 transition-colors shrink-0"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 px-4">
              <MessageCircle className="h-10 w-10 text-muted-foreground/30" />
              <div>
                <p className="text-sm font-medium">Select a conversation</p>
                <p className="text-xs text-muted-foreground mt-1">or start a new one to begin messaging</p>
              </div>
              <button
                onClick={() => setShowNewMessage(true)}
                className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> New message
              </button>
            </div>
          )}
        </div>

        {/* New message overlay dialog */}
        {showNewMessage && (
          <div className="absolute inset-0 bg-background/95 backdrop-blur-sm flex items-start justify-center pt-10 z-20">
            <div className="w-full max-w-md rounded-xl border bg-card shadow-lg">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <h3 className="text-sm font-medium">New message</h3>
                <button onClick={() => { setShowNewMessage(false); setSearchQuery(""); setSearchResults([]); }}>
                  <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
              <div className="p-3">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    autoFocus
                    className="w-full h-9 rounded-md border bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="Search by name, alias, or company…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto border-t">
                {searching && (
                  <p className="px-4 py-6 text-sm text-muted-foreground text-center">Searching…</p>
                )}
                {!searching && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                  <p className="px-4 py-6 text-sm text-muted-foreground text-center">No users found</p>
                )}
                {!searching && searchQuery.trim().length < 2 && (
                  <p className="px-4 py-6 text-xs text-muted-foreground text-center">Type at least 2 characters to search</p>
                )}
                {searchResults.map(user => (
                  <button
                    key={user.id}
                    onClick={() => startNewConversation(user)}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-secondary transition-colors"
                  >
                    <div className="h-8 w-8 rounded-full bg-secondary border flex items-center justify-center text-xs font-medium shrink-0">
                      {user.name[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.role}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
