"use client";

import { useState, useRef, useEffect } from "react";
import { Share2, Link as LinkIcon, Check } from "lucide-react";
import { useToast } from "@/components/ui/Toaster";
import { cn } from "@/lib/utils";

interface Props {
  /** Full or relative URL to share. If relative, window.location.origin is prepended. */
  url: string;
  /** Title used in share text / Open Graph-style intents */
  title: string;
  /** Optional short description appended to share text on some platforms */
  description?: string;
  className?: string;
  /** "button" renders the icon+label pill used on detail pages; "icon" renders a compact icon-only button for cards */
  variant?: "button" | "icon";
}

function buildAbsoluteUrl(url: string) {
  if (typeof window === "undefined") return url;
  return url.startsWith("http") ? url : `${window.location.origin}${url}`;
}

export function ShareButton({ url, title, description, className, variant = "button" }: Props) {
  const { success } = useToast();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function copyLink() {
    const fullUrl = buildAbsoluteUrl(url);
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      success("Copy this link", fullUrl);
    }
    setOpen(false);
  }

  function openShareWindow(targetUrl: string) {
    window.open(targetUrl, "_blank", "noopener,noreferrer,width=600,height=600");
    setOpen(false);
  }

  function shareToTwitter() {
    const fullUrl = buildAbsoluteUrl(url);
    const text = encodeURIComponent(title);
    openShareWindow(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(fullUrl)}`);
  }

  function shareToLinkedIn() {
    const fullUrl = buildAbsoluteUrl(url);
    openShareWindow(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(fullUrl)}`);
  }

  function shareToWhatsApp() {
    const fullUrl = buildAbsoluteUrl(url);
    const text = encodeURIComponent(`${title} ${fullUrl}`);
    openShareWindow(`https://wa.me/?text=${text}`);
  }

  function shareToFacebook() {
    const fullUrl = buildAbsoluteUrl(url);
    openShareWindow(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}`);
  }

  async function handleNativeShareOrToggle() {
    // Prefer the native OS share sheet on supported devices (mostly mobile)
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title, text: description, url: buildAbsoluteUrl(url) });
        return;
      } catch {
        // user cancelled or unsupported — fall through to dropdown
      }
    }
    setOpen(v => !v);
  }

  return (
    <div className="relative" ref={containerRef}>
      {variant === "icon" ? (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleNativeShareOrToggle(); }}
          title="Share"
          className={cn("flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors", className)}
        >
          <Share2 className="h-3.5 w-3.5" />
        </button>
      ) : (
        <button
          onClick={handleNativeShareOrToggle}
          className={cn("flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-secondary text-muted-foreground transition-colors", className)}
        >
          <Share2 className="h-4 w-4" /> Share
        </button>
      )}

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-44 rounded-lg border bg-background shadow-lg py-1 z-50">
          <button onClick={copyLink} className="flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-secondary transition-colors">
            {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" />}
            {copied ? "Copied!" : "Copy link"}
          </button>
          <hr className="my-1" />
          <button onClick={shareToTwitter} className="flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-secondary transition-colors">
            <span className="h-3.5 w-3.5 flex items-center justify-center text-muted-foreground font-semibold text-xs">X</span>
            Twitter / X
          </button>
          <button onClick={shareToLinkedIn} className="flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-secondary transition-colors">
            <span className="h-3.5 w-3.5 flex items-center justify-center text-muted-foreground font-semibold text-xs">in</span>
            LinkedIn
          </button>
          <button onClick={shareToWhatsApp} className="flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-secondary transition-colors">
            <span className="h-3.5 w-3.5 flex items-center justify-center text-muted-foreground font-semibold text-xs">W</span>
            WhatsApp
          </button>
          <button onClick={shareToFacebook} className="flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-secondary transition-colors">
            <span className="h-3.5 w-3.5 flex items-center justify-center text-muted-foreground font-semibold text-xs">f</span>
            Facebook
          </button>
        </div>
      )}
    </div>
  );
}
