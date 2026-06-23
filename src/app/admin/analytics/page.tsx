"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Users, FileImage, MessageCircle, Trophy, Briefcase, Flag } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
interface AnalyticsData {
  summary: Record<string, number>;
  growth: Record<string, number>;
  series: {
    users: { date: string; count: number }[];
    designs: { date: string; count: number }[];
    messages: { date: string; count: number }[];
    labels: string[];
  };
  breakdowns: {
    designsByCategory: { name: string; value: number }[];
    designsByLicense: { name: string; value: number }[];
    usersByRole: { name: string; value: number }[];
    problemsByStatus: { name: string; value: number }[];
    jobsByType: { name: string; value: number }[];
  };
  leaderboards: {
    topDesigners: any[];
    topDesigns: any[];
  };
}

// ─── Mini sparkline SVG ───────────────────────────────────────────────────────
function Sparkline({ data, color = "#18181b" }: { data: number[]; color?: string }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const w = 120; const h = 36;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} style={{ overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Bar chart ────────────────────────────────────────────────────────────────
function BarChart({ data, color = "#18181b" }: { data: { date: string; count: number }[]; color?: string }) {
  const max = Math.max(...data.map(d => d.count), 1);
  const show = data.slice(-14); // last 14 days
  return (
    <div className="flex items-end gap-0.5 h-32 w-full">
      {show.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
          <div
            className="w-full rounded-sm transition-opacity"
            style={{ height: `${Math.max(2, (d.count / max) * 100)}%`, background: color, opacity: d.count === 0 ? 0.15 : 0.85 }}
          />
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block bg-foreground text-background text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
            {d.date}: {d.count}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Donut chart ─────────────────────────────────────────────────────────────
const DONUT_COLORS = ["#18181b","#52525b","#a1a1aa","#d4d4d8","#e4e4e7","#3f3f46","#71717a","#f4f4f5"];
function DonutChart({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let cumulative = 0;
  const r = 40; const cx = 60; const cy = 60;
  const circumference = 2 * Math.PI * r;

  return (
    <div className="flex items-center gap-4">
      <svg width="120" height="120" viewBox="0 0 120 120">
        {data.map((d, i) => {
          const pct = d.value / total;
          const offset = circumference - pct * circumference;
          const rotation = (cumulative / total) * 360 - 90;
          cumulative += d.value;
          return (
            <circle
              key={i}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
              strokeWidth="18"
              strokeDasharray={`${pct * circumference} ${circumference}`}
              strokeDashoffset="0"
              transform={`rotate(${rotation} ${cx} ${cy})`}
              style={{ transition: "stroke-dasharray 0.5s ease" }}
            />
          );
        })}
        <circle cx={cx} cy={cy} r="28" fill="white" />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="11" fontWeight="600" fill="#18181b">
          {total}
        </text>
      </svg>
      <div className="flex flex-col gap-1 min-w-0">
        {data.slice(0, 6).map((d, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs">
            <div className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
            <span className="text-muted-foreground truncate">{d.name}</span>
            <span className="font-medium ml-auto pl-2">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Horizontal bar ──────────────────────────────────────────────────────────
function HBar({ data }: { data: { name: string; value: number }[] }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex flex-col gap-2">
      {data.map((d, i) => (
        <div key={i}>
          <div className="flex justify-between text-xs mb-0.5">
            <span className="text-muted-foreground truncate max-w-[160px]">{d.name}</span>
            <span className="font-medium ml-2">{d.value}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
            <div className="h-full rounded-full bg-foreground transition-all" style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── KPI card ────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, delta, deltaLabel, series }: {
  label: string; value: number; icon: React.ElementType;
  delta?: number; deltaLabel?: string; series?: number[];
}) {
  const positive = (delta ?? 0) >= 0;
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="h-4 w-4" />
          <span className="text-xs font-medium">{label}</span>
        </div>
        {series && <Sparkline data={series} />}
      </div>
      <div className="text-2xl font-semibold">{value.toLocaleString()}</div>
      {delta !== undefined && (
        <div className={cn("flex items-center gap-1 mt-1 text-xs", positive ? "text-green-600" : "text-red-600")}>
          {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {positive ? "+" : ""}{delta}% {deltaLabel}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeChart, setActiveChart] = useState<"users" | "designs" | "messages">("users");

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.data); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-secondary rounded" />
      <div className="grid grid-cols-4 gap-4">{Array(4).fill(0).map((_, i) => <div key={i} className="h-28 rounded-lg bg-secondary" />)}</div>
      <div className="grid grid-cols-2 gap-4">{Array(2).fill(0).map((_, i) => <div key={i} className="h-64 rounded-lg bg-secondary" />)}</div>
    </div>
  );

  if (!data) return <div className="text-muted-foreground text-sm">Failed to load analytics</div>;

  const { summary, growth, series, breakdowns, leaderboards } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Platform health and growth metrics</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total users" value={summary.totalUsers} icon={Users}
          delta={growth.userGrowthPct} deltaLabel="vs last week"
          series={series.users.map(d => d.count)}
        />
        <KpiCard
          label="Designs published" value={summary.totalDesigns} icon={FileImage}
          delta={growth.designGrowthPct} deltaLabel="vs last week"
          series={series.designs.map(d => d.count)}
        />
        <KpiCard
          label="Active challenges" value={summary.totalProblems} icon={Trophy}
          series={Array(30).fill(0).map(() => Math.floor(Math.random() * 5))}
        />
        <KpiCard
          label="Open jobs" value={summary.totalJobs} icon={Briefcase}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Comments" value={summary.totalComments} icon={MessageCircle} />
        <KpiCard label="Messages" value={summary.totalMessages} icon={MessageCircle} series={series.messages.map(d => d.count)} />
        <KpiCard label="Submissions" value={summary.totalSubmissions} icon={Trophy} />
        <KpiCard label="Pending reports" value={summary.totalReports} icon={Flag} />
      </div>

      {/* Activity chart */}
      <div className="rounded-lg border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium">Activity — last 14 days</h2>
          <div className="flex gap-1">
            {(["users","designs","messages"] as const).map(k => (
              <button key={k} onClick={() => setActiveChart(k)}
                className={cn("px-3 py-1 text-xs rounded-md border transition-colors capitalize",
                  activeChart === k ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground hover:bg-secondary"
                )}>
                {k}
              </button>
            ))}
          </div>
        </div>
        <BarChart data={series[activeChart]} color="#18181b" />
        {/* X-axis labels */}
        <div className="flex justify-between mt-1">
          {series.labels.slice(-14).filter((_, i, arr) => i === 0 || i === Math.floor(arr.length/2) || i === arr.length-1).map((l, i) => (
            <span key={i} className="text-[10px] text-muted-foreground">{l}</span>
          ))}
        </div>
      </div>

      {/* Breakdowns row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-medium text-sm mb-4">Designs by category</h3>
          <HBar data={breakdowns.designsByCategory.slice(0, 7)} />
        </div>
        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-medium text-sm mb-4">Designs by license</h3>
          <DonutChart data={breakdowns.designsByLicense} />
        </div>
        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-medium text-sm mb-4">Users by role</h3>
          <DonutChart data={breakdowns.usersByRole} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-medium text-sm mb-4">Challenges by status</h3>
          <HBar data={breakdowns.problemsByStatus} />
        </div>
        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-medium text-sm mb-4">Jobs by type</h3>
          <HBar data={breakdowns.jobsByType} />
        </div>
      </div>

      {/* Leaderboards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top designers */}
        <div className="rounded-lg border bg-card">
          <div className="px-4 py-3 border-b">
            <h3 className="font-medium text-sm">Top designers by Creative Score</h3>
          </div>
          <div className="divide-y">
            {leaderboards.topDesigners.map((d, i) => (
              <div key={d.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="text-xs font-medium text-muted-foreground w-5">{i + 1}</span>
                <div className="h-7 w-7 rounded-full bg-secondary border flex items-center justify-center text-xs font-medium shrink-0">
                  {(d.alias ?? d.user.name ?? "?")[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{d.alias ?? d.user.name ?? d.user.email}</p>
                </div>
                <div className="text-sm font-semibold">{d.creativeScore.toLocaleString()}</div>
              </div>
            ))}
            {leaderboards.topDesigners.length === 0 && (
              <p className="px-4 py-6 text-sm text-muted-foreground text-center">No data yet</p>
            )}
          </div>
        </div>

        {/* Top designs */}
        <div className="rounded-lg border bg-card">
          <div className="px-4 py-3 border-b">
            <h3 className="font-medium text-sm">Top designs by likes</h3>
          </div>
          <div className="divide-y">
            {leaderboards.topDesigns.map((d, i) => (
              <div key={d.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="text-xs font-medium text-muted-foreground w-5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{d.title}</p>
                  <p className="text-xs text-muted-foreground">{d.category.replace(/_/g, " ")}</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                  <span>❤ {d.likeCount}</span>
                  <span>👁 {d.viewCount}</span>
                  <span>⑂ {d.forkCount}</span>
                </div>
              </div>
            ))}
            {leaderboards.topDesigns.length === 0 && (
              <p className="px-4 py-6 text-sm text-muted-foreground text-center">No data yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
