'use client';

/**
 * Shared chart/visual components for EMS.
 * All chart colors use CSS custom properties for theme support.
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// ─── Theme-aware color helpers ──────────────────────────────────

/** Resolve a CSS variable value at runtime. Falls back to the provided hex. */
function cssVar(varName: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  try {
    const val = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    return val || fallback;
  } catch {
    return fallback;
  }
}

/** Chart color tokens — light/dark CSS variable names + hex fallbacks */
const CHART_COLORS = {
  emerald: { var: '--color-emerald-500', fallback: '#10b981' },
  cyan:    { var: '--color-cyan-500',    fallback: '#06b6d4' },
  amber:   { var: '--color-amber-500',   fallback: '#f59e0b' },
  rose:    { var: '--color-rose-500',    fallback: '#f43f5e' },
  violet:  { var: '--color-violet-500',  fallback: '#8b5cf6' },
  slate:   { var: '--color-slate-500',   fallback: '#64748b' },
  orange:  { var: '--color-orange-500',  fallback: '#f97316' },
};

/** Get a theme-aware chart color by name */
export function getChartColor(name: string): string {
  const entry = (CHART_COLORS as Record<string, { var: string; fallback: string }>)[name];
  if (entry) return cssVar(entry.var, entry.fallback);
  // If it's already a hex/color value, return as-is
  return name;
}

/** Theme-aware background for SVG circles/tracks */
export function getChartTrackColor(): string {
  return cssVar('--color-border', 'rgba(0,0,0,0.08)');
}

// ─── Progress Ring ────────────────────────────────────────────
// Unified component: supports both percentage (value only) and fraction (value + max) modes

export interface ProgressRingProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
}

export function ProgressRing({
  value,
  max = 100,
  size = 48,
  strokeWidth = 4,
  color = 'emerald',
  bgColor,
}: ProgressRingProps) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (pct / 100) * circumference;
  const resolvedColor = getChartColor(color);
  const bg = bgColor || getChartTrackColor();

  return (
    <svg width={size} height={size} className="transform -rotate-90" aria-hidden="true">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={bg}
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={resolvedColor}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700 ease-out"
      />
    </svg>
  );
}

// ─── Donut Chart ──────────────────────────────────────────────
// Supports both `segments` (dashboard) and `data` (request center) prop names

export interface DonutChartSegment {
  value: number;
  color: string;
  label: string;
}

export interface DonutChartProps {
  segments?: DonutChartSegment[];
  data?: { label: string; value: number; color: string }[];
  size?: number;
  strokeWidth?: number;
}

export function DonutChart({
  segments,
  data,
  size = 140,
  strokeWidth = 18,
}: DonutChartProps) {
  const items = segments || data || [];
  const total = items.reduce((s, d) => s + d.value, 0) || 1;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const filtered = items.filter((d) => d.value > 0);
  const cumulativeOffsets = filtered.reduce<number[]>((acc, d, i) => {
    const prev = i > 0 ? acc[i - 1] : 0;
    acc.push(prev + (d.value / total) * 100);
    return acc;
  }, []);

  const trackColor = getChartTrackColor();

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        {filtered.map((d, i) => {
          const pct = (d.value / total) * 100;
          const dashArray = `${(pct / 100) * circumference} ${circumference}`;
          const offset = i > 0 ? cumulativeOffsets[i - 1] : 0;
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={d.color}
              strokeWidth={strokeWidth}
              strokeDasharray={dashArray}
              strokeDashoffset={-(offset / 100) * circumference}
              strokeLinecap="round"
              className="transition-all duration-700"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold">{total}</span>
        <span className="text-[9px] text-muted-foreground">total</span>
      </div>
    </div>
  );
}

// ─── Mini Bar Chart (Dashboard variant) ───────────────────────

export interface MiniBarChartProps {
  data: Array<{ label: string; value: number }>;
  color?: string;
  height?: number;
}

export function MiniBarChart({
  data,
  color = 'cyan',
  height = 120,
}: MiniBarChartProps) {
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const barColor = getChartColor(color);

  return (
    <div className="flex items-end gap-1 sm:gap-2" style={{ height }}>
      {data.map((d, i) => {
        const pct = (d.value / maxVal) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <span className="text-[10px] font-medium truncate">{d.value}</span>
            <div
              className="w-full bg-border/30 rounded-t-sm overflow-hidden"
              style={{ height: height - 28 }}
            >
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${pct}%` }}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.05 }}
                className="w-full rounded-t-sm"
                style={{
                  backgroundColor: barColor,
                  marginTop: `${100 - pct}%`,
                }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground truncate w-full text-center">
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Pipeline Stage (Dashboard) ───────────────────────────────

export interface PipelineStageProps {
  label: string;
  count: number;
  color: string;
  icon: React.ElementType;
  onClick?: () => void;
}

export function PipelineStage({
  label,
  count,
  color,
  icon: Icon,
  onClick,
}: PipelineStageProps) {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20' },
    amber:   { bg: 'bg-amber-500/10',   text: 'text-amber-600 dark:text-amber-400',   border: 'border-amber-500/20' },
    cyan:    { bg: 'bg-cyan-500/10',     text: 'text-cyan-600 dark:text-cyan-400',     border: 'border-cyan-500/20' },
    rose:    { bg: 'bg-rose-500/10',     text: 'text-rose-600 dark:text-rose-400',     border: 'border-rose-500/20' },
    slate:   { bg: 'bg-slate-500/10',    text: 'text-slate-600 dark:text-slate-400',   border: 'border-slate-500/20' },
    violet:  { bg: 'bg-violet-500/10',   text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-500/20' },
  };
  const c = colorMap[color] || colorMap.slate;

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 p-2 sm:p-3 rounded-xl border ${c.border} ${c.bg} hover:scale-105 transition-all cursor-pointer min-w-[64px] sm:min-w-[80px]`}
    >
      <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${c.text}`} />
      <span className="text-base sm:text-lg font-bold">{count}</span>
      <span className="text-[9px] sm:text-[10px] text-muted-foreground">{label}</span>
    </button>
  );
}

// ─── Task Kanban Mini (Dashboard) ─────────────────────────────

export interface TaskKanbanMiniProps {
  tasks: Array<{ status: string }>;
}

export function TaskKanbanMini({ tasks }: TaskKanbanMiniProps) {
  const columns = [
    { key: 'todo', label: 'To Do', color: 'bg-slate-500 dark:bg-slate-400' },
    { key: 'in-progress', label: 'In Progress', color: 'bg-cyan-500 dark:bg-cyan-400' },
    { key: 'review', label: 'Review', color: 'bg-amber-500 dark:bg-amber-400' },
    { key: 'done', label: 'Done', color: 'bg-emerald-500 dark:bg-emerald-400' },
  ];

  return (
    <div className="flex gap-1 sm:gap-3">
      {columns.map((col) => {
        const count = tasks.filter((t) => t.status === col.key).length;
        return (
          <div key={col.key} className="flex-1 space-y-1.5 min-w-0">
            <div className="flex items-center gap-1 sm:gap-1.5">
              <span className={`h-2 w-2 rounded-full shrink-0 ${col.color}`} />
              <span className="text-[9px] sm:text-[10px] text-muted-foreground font-medium truncate">
                {col.label}
              </span>
            </div>
            <div className="text-base sm:text-xl font-bold">{count}</div>
            <div className="h-1.5 rounded-full bg-border/30">
              <div
                className={`h-full rounded-full ${col.color}`}
                style={{
                  width: `${tasks.length > 0 ? (count / tasks.length) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Live Clock ───────────────────────────────────────────────

export function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="text-xs text-muted-foreground font-mono tabular-nums">
      {time.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })}
    </span>
  );
}

// ─── Ring Chart (center label overlay) ────────────────────────

export interface RingChartProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
}

export function RingChart({ value, max, size = 120, strokeWidth = 10, color = '#10b981', label }: RingChartProps) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (pct / 100) * circumference;
  const trackColor = getChartTrackColor();
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold" style={{ color }}>{Math.round(pct)}%</span>
        {label && <span className="text-[10px] text-muted-foreground">{label}</span>}
      </div>
    </div>
  );
}

// ─── Salary Donut Chart (multi-segment) ───────────────────────

export interface SalaryDonutChartProps {
  segments: { label: string; value: number; color: string }[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerValue?: string;
  showLegend?: boolean;
}

export function SalaryDonutChart({
  segments,
  size = 200,
  strokeWidth = 32,
  centerLabel,
  centerValue,
  showLegend = true,
}: SalaryDonutChartProps) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const trackColor = getChartTrackColor();

  const cumulativeOffsets = segments.reduce<number[]>((acc, seg) => {
    const prev = acc.length > 0 ? acc[acc.length - 1] : 0;
    const dashLength = (seg.value / total) * circumference;
    acc.push(prev + dashLength);
    return acc;
  }, []);

  const arcs = segments.map((seg, i) => {
    const pct = seg.value / total;
    const dashLength = pct * circumference;
    const gap = pct < 0.02 ? 2 : 4;
    const prevOffset = i > 0 ? cumulativeOffsets[i - 1] : 0;
    return {
      ...seg, pct,
      dashArray: `${Math.max(0, dashLength - gap)} ${circumference - dashLength + gap}`,
      dashOffset: -(prevOffset + gap / 2),
    };
  });

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
          <circle cx={center} cy={center} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
          {arcs.map((arc) =>
            arc.pct > 0.005 ? (
              <motion.circle
                key={arc.label}
                cx={center} cy={center} r={radius}
                fill="none" stroke={arc.color} strokeWidth={strokeWidth}
                strokeDasharray={arc.dashArray} strokeDashoffset={arc.dashOffset}
                strokeLinecap="round"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ duration: 0.7, delay: 0.2 }}
              />
            ) : null
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {centerLabel && <span className="text-xs text-muted-foreground">{centerLabel}</span>}
          <span className="text-lg font-bold text-emerald-400">{centerValue || total}</span>
        </div>
      </div>
      {showLegend && (
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs w-full">
          {segments.map((seg) => (
            <div key={seg.label} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
              <span className="text-muted-foreground truncate">{seg.label}</span>
              <span className="font-medium ml-auto whitespace-nowrap">{seg.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Mini Donut (on-time vs late) ─────────────────────────────

export interface MiniDonutProps {
  onTime: number;
  late: number;
  size?: number;
  strokeWidth?: number;
}

export function MiniDonut({ onTime, late, size = 80, strokeWidth = 8 }: MiniDonutProps) {
  const total = onTime + late;
  if (total === 0) return <div className="h-20 w-20 flex items-center justify-center text-xs text-muted-foreground">N/A</div>;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const onTimePct = onTime / total;
  const onTimeOffset = circumference * (1 - onTimePct);
  const trackColor = getChartTrackColor();

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(16,185,129,0.7)" strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={onTimeOffset}
        strokeLinecap="round" className="transition-all duration-700"
      />
    </svg>
  );
}

// ─── Animated Progress Ring (framer-motion) ────────────────────

export interface AnimatedProgressRingProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}

export function AnimatedProgressRing({ value, size = 140, strokeWidth = 10, color = '#10b981' }: AnimatedProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;
  const trackColor = getChartTrackColor();

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={trackColor} strokeWidth={strokeWidth}
      />
      <motion.circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeLinecap="round"
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />
    </svg>
  );
}
