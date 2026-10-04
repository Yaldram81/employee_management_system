'use client';

import { useEffect, useRef } from 'react';
import { GlassCard } from './glass-card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { ProgressRing } from './shared';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: { value: number; label: string };
  color?: 'emerald' | 'amber' | 'rose' | 'cyan' | 'slate' | 'orange' | 'violet';
  className?: string;
  /** Compact mode: smaller fonts, no sparkline, no sparkle dots – ideal for dense grids */
  compact?: boolean;
  /** Hero mode: bento card style with glass glow, decorative circle, uppercase label, colored values */
  hero?: boolean;
  /** Optional progress ring instead of icon (hero mode only) */
  progressRing?: { value: number; max: number };
  /** Subtle pulse animation ring around the card when value > 0 */
  pulse?: boolean;
}

const colorMap = {
  emerald: 'from-emerald-500/20 to-emerald-600/5 text-emerald-600 dark:text-emerald-400',
  amber: 'from-amber-500/20 to-amber-600/5 text-amber-600 dark:text-amber-400',
  rose: 'from-rose-500/20 to-rose-600/5 text-rose-600 dark:text-rose-400',
  cyan: 'from-cyan-500/20 to-cyan-600/5 text-cyan-600 dark:text-cyan-400',
  slate: 'from-slate-500/20 to-slate-600/5 text-slate-600 dark:text-slate-400',
  orange: 'from-orange-500/20 to-orange-600/5 text-orange-600 dark:text-orange-400',
  violet: 'from-violet-500/20 to-violet-600/5 text-violet-600 dark:text-violet-400',
};

const iconColorMap = {
  emerald: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
  amber: 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
  rose: 'bg-rose-500/20 text-rose-600 dark:text-rose-400',
  cyan: 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400',
  slate: 'bg-slate-500/20 text-slate-600 dark:text-slate-400',
  orange: 'bg-orange-500/20 text-orange-600 dark:text-orange-400',
  violet: 'bg-violet-500/20 text-violet-600 dark:text-violet-400',
};

const sparklineColors = {
  emerald: 'rgba(16, 185, 129, 0.3)',
  amber: 'rgba(245, 158, 11, 0.3)',
  rose: 'rgba(244, 63, 94, 0.3)',
  cyan: 'rgba(6, 182, 212, 0.3)',
  slate: 'rgba(100, 116, 139, 0.3)',
  orange: 'rgba(249, 115, 22, 0.3)',
  violet: 'rgba(139, 92, 246, 0.3)',
};

const sparklineFillColors = {
  emerald: 'rgba(16, 185, 129, 0.05)',
  amber: 'rgba(245, 158, 11, 0.05)',
  rose: 'rgba(244, 63, 94, 0.05)',
  cyan: 'rgba(6, 182, 212, 0.05)',
  slate: 'rgba(100, 116, 139, 0.05)',
  orange: 'rgba(249, 115, 22, 0.05)',
  violet: 'rgba(139, 92, 246, 0.05)',
};

// Hero mode color maps
const heroValueColorMap = {
  emerald: 'text-emerald-600 dark:text-emerald-400',
  amber: 'text-amber-600 dark:text-amber-400',
  rose: 'text-rose-600 dark:text-rose-400',
  cyan: 'text-cyan-600 dark:text-cyan-400',
  slate: 'text-slate-600 dark:text-slate-400',
  orange: 'text-orange-600 dark:text-orange-400',
  violet: 'text-violet-600 dark:text-violet-400',
};

const heroSubtitleColorMap = {
  emerald: 'text-emerald-600/80 dark:text-emerald-400/80',
  amber: 'text-amber-600/80 dark:text-amber-400/80',
  rose: 'text-rose-600/80 dark:text-rose-400/80',
  cyan: 'text-cyan-600/80 dark:text-cyan-400/80',
  slate: 'text-muted-foreground',
  orange: 'text-orange-600/80 dark:text-orange-400/80',
  violet: 'text-violet-600/80 dark:text-violet-400/80',
};

const heroIconBgMap = {
  emerald: 'bg-emerald-500/10',
  amber: 'bg-amber-500/10',
  rose: 'bg-rose-500/10',
  cyan: 'bg-cyan-500/10',
  slate: 'bg-slate-500/10',
  orange: 'bg-orange-500/10',
  violet: 'bg-violet-500/10',
};

const heroCircleColorMap = {
  emerald: 'bg-emerald-500/5',
  amber: 'bg-amber-500/5',
  rose: 'bg-rose-500/5',
  cyan: 'bg-cyan-500/5',
  slate: 'bg-slate-500/5',
  orange: 'bg-orange-500/5',
  violet: 'bg-violet-500/5',
};

// Color hex map for progress ring
const colorHexMap: Record<string, string> = {
  emerald: '#10b981',
  amber: '#f59e0b',
  rose: '#f43f5e',
  cyan: '#06b6d4',
  slate: '#64748b',
  orange: '#f97316',
  violet: '#8b5cf6',
};

// Animated counter using ref + direct DOM update (avoids setState-in-effect lint)
function AnimatedValue({ target, prefix, suffix, compact }: { target: number; prefix: string; suffix: string; compact?: boolean }) {
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = spanRef.current;
    if (!el) return;

    const duration = compact ? 800 : 1200;
    const start = performance.now();

    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(target * eased);
      el.textContent = `${prefix}${current.toLocaleString()}${suffix}`;
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  }, [target, prefix, suffix, compact]);

  return <span ref={spanRef}>{prefix}{(0).toLocaleString()}{suffix}</span>;
}

// Sparkline SVG component
function MicroSparkline({ color, dataPoints }: { color: string; dataPoints?: number[] }) {
  const validColor = (color in sparklineColors ? color : 'cyan') as keyof typeof sparklineColors;
  const points = dataPoints || [3, 5, 4, 7, 6, 8, 7, 9, 8, 11, 10, 12];
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const width = 120;
  const height = 40;
  const padding = 4;

  const pathData = points.map((p, i) => {
    const x = padding + (i / (points.length - 1)) * (width - padding * 2);
    const y = height - padding - ((p - min) / range) * (height - padding * 2);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  const fillPath = pathData + ` L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="absolute bottom-2 right-2 opacity-40 group-hover:opacity-60 transition-opacity duration-300"
      aria-hidden="true"
    >
      <path d={fillPath} fill={sparklineFillColors[validColor]} />
      <path d={pathData} fill="none" stroke={sparklineColors[validColor]} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="sparkline-path" />
    </svg>
  );
}

// Sparkle dots component
function SparkleDots({ color }: { color: string }) {
  const dots = [
    { x: '25%', y: '25%', size: 2, delay: '0s' },
    { x: '70%', y: '20%', size: 1.5, delay: '0.5s' },
    { x: '50%', y: '65%', size: 2.5, delay: '1s' },
    { x: '80%', y: '60%', size: 1, delay: '1.5s' },
  ];

  const sparkleColorMap: Record<string, string> = {
    emerald: 'bg-emerald-300',
    amber: 'bg-amber-300',
    rose: 'bg-rose-300',
    cyan: 'bg-cyan-300',
    slate: 'bg-slate-300',
    orange: 'bg-orange-300',
    violet: 'bg-violet-300',
  };

  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      {dots.map((dot, i) => (
        <div
          key={i}
          className={cn('absolute rounded-full', sparkleColorMap[color])}
          style={{
            left: dot.x,
            top: dot.y,
            width: dot.size,
            height: dot.size,
            animation: `sparkle 2.5s ease-in-out ${dot.delay} infinite`,
          }}
        />
      ))}
    </div>
  );
}

export function StatCard({ title, value, subtitle, icon: Icon, trend, color = 'cyan', className, compact, hero, progressRing, pulse }: StatCardProps) {
  // Parse numeric value for animated counter
  const strValue = String(value);
  const numericValue = parseInt(strValue.replace(/[^0-9]/g, ''), 10);
  const isNumeric = !isNaN(numericValue) && numericValue > 0;
  const prefix = strValue.match(/^[^0-9]*/)?.[0] || '';
  const suffix = strValue.match(/[^0-9]*$/)?.[0] || '';

  // Hero mode: bento card style with glass glow
  if (hero) {
    const glowColor = color !== 'slate' ? color : undefined;
    return (
      <GlassCard
        className={cn('p-4 sm:p-5 relative overflow-hidden min-h-[120px] max-h-[140px]', className)}
        hover
        glow={glowColor as any}
      >
        {/* Decorative gradient circle */}
        <div className={cn('absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-8 translate-x-8', heroCircleColorMap[color] || heroCircleColorMap.cyan)} />

        {/* Pulse animation for attention */}
        {pulse && Number(value) > 0 && (
          <div className="absolute inset-0 rounded-xl pointer-events-none">
            <div className="absolute inset-0 rounded-xl ring-1 ring-amber-500/20 animate-pulse" />
          </div>
        )}

        <div className="flex items-start justify-between relative z-10">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">{title}</p>
            <p className={cn('text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight truncate', heroValueColorMap[color] || heroValueColorMap.cyan)}>
              {isNumeric ? (
                <AnimatedValue target={numericValue} prefix={prefix} suffix={suffix} />
              ) : (
                value
              )}
            </p>
            {subtitle && (
              <p className={cn('text-xs truncate', heroSubtitleColorMap[color] || heroSubtitleColorMap.cyan)}>{subtitle}</p>
            )}
            {trend && (
              <div className="flex items-center gap-1 text-xs">
                <span className={cn('inline-flex items-center gap-0.5 font-medium', trend.value >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                  {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
                </span>
                <span className="text-muted-foreground truncate">{trend.label}</span>
              </div>
            )}
          </div>
          {progressRing ? (
            <div className="relative flex items-center justify-center shrink-0">
              <ProgressRing value={progressRing.value} max={progressRing.max} color={colorHexMap[color] || colorHexMap.cyan} />
              <span className={cn('absolute text-xs font-bold', heroValueColorMap[color] || heroValueColorMap.cyan)}>
                {progressRing.max > 0 ? Math.round((progressRing.value / progressRing.max) * 100) : 0}%
              </span>
            </div>
          ) : Icon ? (
            <div className={cn('rounded-xl p-3 shrink-0', heroIconBgMap[color] || heroIconBgMap.cyan, heroValueColorMap[color] || heroValueColorMap.cyan)}>
              <Icon className="h-5 w-5" />
            </div>
          ) : null}
        </div>
      </GlassCard>
    );
  }

  if (compact) {
    return (
      <GlassCard
        className={cn(
          'p-3 bg-gradient-to-br relative overflow-hidden group/stat flex flex-col justify-between',
          colorMap[color] || colorMap.cyan,
          className
        )}
        hover
      >
        <div className="relative z-10 flex items-center gap-2.5">
          {Icon && (
            <div className={cn('rounded-md p-1.5 relative shrink-0', iconColorMap[color] || iconColorMap.cyan)}>
              <Icon className="h-3.5 w-3.5 relative z-10" />
            </div>
          )}
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="text-[10px] font-medium text-muted-foreground/80 uppercase tracking-wider truncate">{title}</p>
            <p className="text-base font-bold tracking-tight count-up truncate leading-tight">
              {isNumeric ? (
                <AnimatedValue target={numericValue} prefix={prefix} suffix={suffix} compact />
              ) : (
                value
              )}
            </p>
            {trend && (
              <div className="flex items-center gap-1 text-[10px]">
                <span
                  className={cn(
                    'inline-flex items-center gap-0.5 font-medium',
                    trend.value >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  )}
                >
                  {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
                </span>
                <span className="text-muted-foreground truncate">{trend.label}</span>
              </div>
            )}
          </div>
        </div>
        {subtitle && (
          <p className="text-[10px] text-muted-foreground/60 truncate mt-1 relative z-10">{subtitle}</p>
        )}
      </GlassCard>
    );
  }

  return (
    <GlassCard className={cn('p-4 sm:p-5 lg:p-6 bg-gradient-to-br relative overflow-hidden group/stat min-h-[120px] max-h-[140px] flex flex-col justify-between', colorMap[color] || colorMap.cyan, className)} hover>
      {/* Micro-chart sparkline in background */}
      <MicroSparkline color={color} />

      <div className="relative z-10 flex flex-col justify-between h-full">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5 min-w-0 flex-1">
            <p className="text-sm font-medium text-muted-foreground truncate max-w-[140px]">{title}</p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight count-up truncate">
              {isNumeric ? (
                <AnimatedValue target={numericValue} prefix={prefix} suffix={suffix} />
              ) : (
                value
              )}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground truncate max-w-[160px]">{subtitle}</p>
            )}
            {trend && (
              <div className="flex items-center gap-1 text-xs">
                <span
                  className={cn(
                    'inline-flex items-center gap-0.5 font-medium',
                    trend.value >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  )}
                  style={{ animation: 'bounce-arrow 1.5s ease-in-out infinite' }}
                >
                  {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
                </span>
                <span className="text-muted-foreground truncate max-w-[100px]">{trend.label}</span>
              </div>
            )}
          </div>
          {Icon && (
            <div className={cn('rounded-lg p-2 sm:p-2.5 relative shrink-0', iconColorMap[color] || iconColorMap.cyan)}>
              <SparkleDots color={color} />
              <Icon className="h-4 w-4 sm:h-5 sm:w-5 relative z-10" />
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
}
