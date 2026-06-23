"use client";

import { useState, useRef, useEffect } from "react";
import { timeAgo } from "@/lib/utils";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Message { id: string; senderId: string; content: string; createdAt: string; isRead: boolean; }
interface Contact { id: string; name: string | null; designerProfile: { alias: string | null } | null; }
interface Thread { contact: Contact; lastMessage: Message; unreadCount: number; }

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

  const activeThread = threads.find(t => t.contact.id === activeContactId);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadConversation(contactId: string) {
    setActiveContactId(contactId);
    const res = await fetch(`/api/messages?contactId=${contactId}`);
    if (res.ok) {
      const d = await res.json();
      setMessages(d.messages);
    }
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
    }
  }

  function contactName(c: Contact) {
    return c.designerProfile?.alias ?? c.name ?? "User";
  }

  return (
    <div className="rounded-xl border overflow-hidden" style={{ height: "calc(100vh - 200px)", minHeight: 480 }}>
      <div className="flex h-full">
        {/* Thread list */}
        <aside className="w-72 border-r flex flex-col shrink-0">
          <div className="p-3 border-b">
            <input
              className="w-full h-8 rounded-md border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none"
              placeholder="Search conversations…"
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {threads.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground text-center">No conversations yet</p>
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
                      <span className="text-xs text-muted-foreground shrink-0 ml-1">{timeAgo(t.lastMessage.createdAt)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{t.lastMessage.content}</p>
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
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              Select a conversation to start messaging
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
