import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}
export function formatCurrency(amount: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
export const DESIGN_CATEGORIES = [
  { value: "PRODUCT_DESIGN", label: "Product Design" },
  { value: "UX_UI", label: "UX/UI" },
  { value: "ARCHITECTURE", label: "Architecture" },
  { value: "INTERIOR_DESIGN", label: "Interior Design" },
  { value: "GRAPHIC_DESIGN", label: "Graphic Design" },
  { value: "BRANDING", label: "Branding" },
  { value: "PACKAGING", label: "Packaging" },
  { value: "INDUSTRIAL_DESIGN", label: "Industrial Design" },
  { value: "FASHION_DESIGN", label: "Fashion Design" },
  { value: "ILLUSTRATION", label: "Illustration" },
  { value: "CONCEPT_ART", label: "Concept Art" },
  { value: "OTHER", label: "Other" },
];

export const LICENSE_TYPES = [
  { value: "OPEN_SOURCE", label: "Open Source" },
  { value: "ROYALTY_BASED", label: "Royalty Based" },
  { value: "COLLABORATION_ONLY", label: "Collaboration Only" },
  { value: "CUSTOM", label: "Custom" },
];

// export function timeAgo(date: Date): string {
//   const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
//   if (seconds < 60) return "just now";
//   const minutes = Math.floor(seconds / 60);
//   if (minutes < 60) return `${minutes}m ago`;
//   const hours = Math.floor(minutes / 60);
//   if (hours < 24) return `${hours}h ago`;
//   const days = Math.floor(hours / 24);
//   if (days < 30) return `${days}d ago`;
//   const months = Math.floor(days / 30);
//   return `${months}mo ago`;
// }

export function timeAgo(date: string | Date): string {
  // Convert string ISO date to Date object if needed
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Check if it's a valid date
  if (isNaN(dateObj.getTime())) {
    return 'unknown';
  }

  const seconds = Math.floor((Date.now() - dateObj.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

export function uniqueSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export function formatBytes(bytes: number): string {
  if (!bytes) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}