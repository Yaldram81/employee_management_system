'use client';

import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isWeekend, isSameDay } from 'date-fns';

interface HeatmapCalendarProps {
  year: number;
  month: number;
  records: { date: string; status: string }[];
  className?: string;
}

const statusColors: Record<string, string> = {
  present: 'bg-emerald-500',
  absent: 'bg-rose-500',
  late: 'bg-amber-500',
  'half-day': 'bg-cyan-400',
  holiday: 'bg-purple-500',
  weekend: 'bg-slate-600',
};

export function HeatmapCalendar({ year, month, records, className }: HeatmapCalendarProps) {
  const start = startOfMonth(new Date(year, month - 1));
  const end = endOfMonth(new Date(year, month - 1));
  const days = eachDayOfInterval({ start, end });
  const startDay = getDay(start); // 0=Sun

  const getStatus = (day: Date) => {
    if (isWeekend(day)) return 'weekend';
    const dateStr = format(day, 'yyyy-MM-dd');
    const record = records.find((r) => r.date === dateStr);
    return record?.status || 'absent';
  };

  const blanks = Array.from({ length: startDay }, (_, i) => i);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className={cn('space-y-3', className)}>
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
            {d}
          </div>
        ))}
        {blanks.map((i) => (
          <div key={`blank-${i}`} />
        ))}
        {days.map((day) => {
          const status = getStatus(day);
          return (
            <div
              key={day.toISOString()}
              className={cn(
                'aspect-square rounded-md flex items-center justify-center text-xs font-medium transition-all hover:scale-110',
                statusColors[status] || 'bg-slate-700',
                status === 'weekend' ? 'text-slate-400' : 'text-white'
              )}
              title={`${format(day, 'MMM d')}: ${status}`}
            >
              {format(day, 'd')}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1"><div className="h-3 w-3 rounded bg-emerald-500" /> Present</div>
        <div className="flex items-center gap-1"><div className="h-3 w-3 rounded bg-amber-500" /> Late</div>
        <div className="flex items-center gap-1"><div className="h-3 w-3 rounded bg-rose-500" /> Absent</div>
        <div className="flex items-center gap-1"><div className="h-3 w-3 rounded bg-slate-600" /> Weekend</div>
      </div>
    </div>
  );
}
