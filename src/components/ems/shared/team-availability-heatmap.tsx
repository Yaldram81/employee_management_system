'use client';

/**
 * TeamAvailabilityHeatMap — Monthly calendar heat map showing team availability
 * per day, color-coded by coverage risk level.
 */

import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { staggerFast } from './animations';

// ─── Types ────────────────────────────────────────────────────

export interface HeatmapDay {
  date: string; // YYYY-MM-DD
  available: number;
  away: number;
  total: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  members?: Array<{
    userId: string;
    name: string;
    status: 'available' | 'away';
    leaveType?: string;
  }>;
}

export interface TeamAvailabilityHeatMapProps {
  days: HeatmapDay[];
  teamSize: number;
  onDateClick?: (date: string) => void;
  onDateHover?: (date: string | null) => void;
}

// ─── Risk Level Colors ────────────────────────────────────────

const riskColors: Record<string, { bg: string; text: string; ring: string }> = {
  low: {
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-400',
    ring: 'ring-emerald-500/40',
  },
  medium: {
    bg: 'bg-amber-500/20',
    text: 'text-amber-400',
    ring: 'ring-amber-500/40',
  },
  high: {
    bg: 'bg-orange-500/30',
    text: 'text-orange-400',
    ring: 'ring-orange-500/50',
  },
  critical: {
    bg: 'bg-rose-500/30',
    text: 'text-rose-400',
    ring: 'ring-rose-500/50',
  },
};

/** Gradient opacity based on available ratio for low/medium risk */
function getRiskBg(riskLevel: string, available: number, total: number): string {
  const ratio = total > 0 ? available / total : 1;
  if (riskLevel === 'low') {
    if (ratio >= 0.8) return 'bg-emerald-500/30';
    return 'bg-emerald-500/20';
  }
  if (riskLevel === 'medium') {
    if (ratio >= 0.6) return 'bg-amber-500/30';
    return 'bg-amber-500/20';
  }
  if (riskLevel === 'high') {
    if (ratio >= 0.4) return 'bg-orange-500/50';
    return 'bg-orange-500/30';
  }
  if (riskLevel === 'critical') {
    if (ratio <= 0.2) return 'bg-rose-500/50';
    return 'bg-rose-500/30';
  }
  return 'bg-black/[0.03] dark:bg-white/[0.05]';
}

const riskLabel: Record<string, string> = {
  low: 'Low Risk',
  medium: 'Medium Risk',
  high: 'High Risk',
  critical: 'Critical',
};

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

// ─── Component ────────────────────────────────────────────────

export function TeamAvailabilityHeatMap({
  days,
  teamSize,
  onDateClick,
  onDateHover,
}: TeamAvailabilityHeatMapProps) {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  const daysInMonth = new Date(month.y, month.m + 1, 0).getDate();
  const startDay = (new Date(month.y, month.m, 1).getDay() + 6) % 7; // Mon=0

  // Build a lookup map for days data
  const dayMap = useMemo(() => {
    const m: Record<string, HeatmapDay> = {};
    days.forEach((d) => {
      m[d.date] = d;
    });
    return m;
  }, [days]);

  const prev = useCallback(
    () =>
      setMonth((p) =>
        p.m === 0 ? { y: p.y - 1, m: 11 } : { y: p.y, m: p.m - 1 }
      ),
    []
  );
  const next = useCallback(
    () =>
      setMonth((p) =>
        p.m === 11 ? { y: p.y + 1, m: 0 } : { y: p.y, m: p.m + 1 }
      ),
    []
  );

  const monthLabel = new Date(month.y, month.m).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const handleHover = useCallback(
    (date: string | null) => {
      setHoveredDate(date);
      onDateHover?.(date);
    },
    [onDateHover]
  );

  // Build calendar cells
  const cells: Array<{
    day: number;
    dateStr: string;
    isWeekend: boolean;
    data: HeatmapDay | undefined;
  }> = useMemo(() => {
    const result: Array<{
      day: number;
      dateStr: string;
      isWeekend: boolean;
      data: HeatmapDay | undefined;
    }> = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${month.y}-${String(month.m + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dow = new Date(month.y, month.m, i).getDay();
      result.push({
        day: i,
        dateStr,
        isWeekend: dow === 0 || dow === 6,
        data: dayMap[dateStr],
      });
    }
    return result;
  }, [month, daysInMonth, dayMap]);

  // Tooltip data for hovered date
  const hoveredDay = hoveredDate ? dayMap[hoveredDate] : null;
  const awayMembers = hoveredDay?.members?.filter((m) => m.status === 'away') || [];

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Header: Navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold">{monthLabel}</span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={next}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="text-[10px] text-muted-foreground font-medium py-1"
          >
            {d}
          </div>
        ))}
      </div>

      <motion.div
        className="grid grid-cols-7 gap-1"
        variants={staggerFast.container}
        initial="initial"
        animate="animate"
      >
        {/* Empty cells for offset */}
        {Array.from({ length: startDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {/* Day cells */}
        {cells.map((cell) => {
          const isToday = cell.dateStr === todayStr;
          const risk = cell.data?.riskLevel || 'low';
          const bgClass = cell.data
            ? getRiskBg(risk, cell.data.available, cell.data.total)
            : 'bg-black/[0.02] dark:bg-white/[0.03]';
          const colors = riskColors[risk] || riskColors.low;
          const isHoliday = cell.data?.members?.some(
            (m) => m.status === 'away' && m.leaveType === 'holiday'
          );

          return (
            <motion.div
              key={cell.day}
              variants={staggerFast.item}
              className="relative"
            >
              <button
                onClick={() => onDateClick?.(cell.dateStr)}
                onMouseEnter={() => handleHover(cell.dateStr)}
                onMouseLeave={() => handleHover(null)}
                className={`
                  relative w-full aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5
                  text-xs transition-all duration-200 cursor-pointer
                  hover:scale-105 hover:z-10
                  ${bgClass}
                  ${isToday ? `ring-2 ${colors.ring}` : ''}
                  ${cell.isWeekend ? 'opacity-60' : ''}
                  hover:brightness-125
                `}
              >
                <span
                  className={`text-[11px] font-medium leading-none ${
                    isToday ? colors.text : 'text-foreground/80'
                  }`}
                >
                  {cell.day}
                </span>
                {cell.data && (
                  <span className="text-[9px] text-muted-foreground leading-none">
                    {cell.data.available}/{cell.data.total}
                  </span>
                )}
                {isHoliday && (
                  <Star className="absolute top-0.5 right-0.5 h-2 w-2 text-amber-400" />
                )}
              </button>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Tooltip for hovered date */}
      {hoveredDate && hoveredDay && (
        <div className="mt-3 rounded-lg border border-black/[0.1] dark:border-white/[0.1] bg-black/[0.04] dark:bg-white/[0.06] backdrop-blur-sm p-3 text-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium">{hoveredDate}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full border ${
                riskColors[hoveredDay.riskLevel]?.bg || ''
              } ${riskColors[hoveredDay.riskLevel]?.text || ''} border-black/[0.1] dark:border-white/[0.1]`}
            >
              {riskLabel[hoveredDay.riskLevel]}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mb-1">
            {hoveredDay.available} available / {hoveredDay.away} away /{' '}
            {hoveredDay.total} total
          </div>
          {awayMembers.length > 0 && (
            <div className="mt-1 space-y-0.5">
              <span className="text-[10px] text-muted-foreground font-medium">
                Away:
              </span>
              {awayMembers.map((m) => (
                <div
                  key={m.userId}
                  className="text-xs text-foreground/70 flex items-center gap-1.5"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                  {m.name}
                  {m.leaveType && (
                    <span className="text-muted-foreground">
                      ({m.leaveType})
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          {awayMembers.length === 0 && (
            <div className="text-xs text-emerald-400 mt-1">
              All team members available
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 pt-4 text-[10px] text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-emerald-500/25" /> Low
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-amber-500/25" /> Medium
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-orange-500/35" /> High
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-rose-500/35" /> Critical
        </span>
        <span className="flex items-center gap-1">
          <Star className="h-2.5 w-2.5 text-amber-400" /> Holiday
        </span>
      </div>
    </div>
  );
}
