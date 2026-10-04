'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type GlowColor = 'emerald' | 'cyan' | 'amber' | 'rose' | 'none';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  glow?: GlowColor;
}

const glowStyles: Record<GlowColor, string> = {
  none: '',
  emerald: 'border-emerald-500/25',
  cyan: 'border-cyan-500/25',
  amber: 'border-amber-500/25',
  rose: 'border-rose-500/25',
};

const glowShadowStyles: Record<GlowColor, string> = {
  none: '',
  emerald: 'hover:shadow-[0_0_20px_rgba(16,185,129,0.15),0_0_40px_rgba(16,185,129,0.08),0_0_80px_rgba(16,185,129,0.04),0_0_120px_rgba(16,185,129,0.02)]',
  cyan: 'hover:shadow-[0_0_20px_rgba(6,182,212,0.15),0_0_40px_rgba(6,182,212,0.08),0_0_80px_rgba(6,182,212,0.04),0_0_120px_rgba(6,182,212,0.02)]',
  amber: 'hover:shadow-[0_0_20px_rgba(245,158,11,0.15),0_0_40px_rgba(245,158,11,0.08),0_0_80px_rgba(245,158,11,0.04),0_0_120px_rgba(245,158,11,0.02)]',
  rose: 'hover:shadow-[0_0_20px_rgba(244,63,94,0.15),0_0_40px_rgba(244,63,94,0.08),0_0_80px_rgba(244,63,94,0.04),0_0_120px_rgba(244,63,94,0.02)]',
};

const glowInsetStyles: Record<GlowColor, string> = {
  none: '',
  emerald: 'shadow-[inset_0_0_30px_rgba(16,185,129,0.06),inset_0_1px_0_rgba(255,255,255,0.06)] dark:shadow-[inset_0_0_30px_rgba(16,185,129,0.06),inset_0_1px_0_rgba(255,255,255,0.06)]',
  cyan: 'shadow-[inset_0_0_30px_rgba(6,182,212,0.06),inset_0_1px_0_rgba(255,255,255,0.06)] dark:shadow-[inset_0_0_30px_rgba(6,182,212,0.06),inset_0_1px_0_rgba(255,255,255,0.06)]',
  amber: 'shadow-[inset_0_0_30px_rgba(245,158,11,0.06),inset_0_1px_0_rgba(255,255,255,0.06)] dark:shadow-[inset_0_0_30px_rgba(245,158,11,0.06),inset_0_1px_0_rgba(255,255,255,0.06)]',
  rose: 'shadow-[inset_0_0_30px_rgba(244,63,94,0.06),inset_0_1px_0_rgba(255,255,255,0.06)] dark:shadow-[inset_0_0_30px_rgba(244,63,94,0.06),inset_0_1px_0_rgba(255,255,255,0.06)]',
};

// Gradient border colors for animated border on hover
const gradientBorderColors: Record<GlowColor, string> = {
  none: 'rgba(255,255,255,0.1), rgba(255,255,255,0.05), rgba(255,255,255,0.1)',
  emerald: 'rgba(16,185,129,0.5), rgba(6,182,212,0.4), rgba(16,185,129,0.5)',
  cyan: 'rgba(6,182,212,0.5), rgba(16,185,129,0.4), rgba(6,182,212,0.5)',
  amber: 'rgba(245,158,11,0.5), rgba(251,191,36,0.4), rgba(245,158,11,0.5)',
  rose: 'rgba(244,63,94,0.5), rgba(251,113,133,0.4), rgba(244,63,94,0.5)',
};

export function GlassCard({ children, className, hover = false, onClick, glow = 'none' }: GlassCardProps) {
  const isInteractive = hover || !!onClick;

  return (
    <motion.div
      whileHover={isInteractive ? { scale: 1.02, y: -4 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={onClick}
      className={cn(
        'rounded-xl border backdrop-blur-xl shadow-lg relative overflow-hidden group transition-all duration-300 ease-out',
        // ─── Light mode ───
        'bg-white/60 border-black/[0.06]',
        'shadow-[0_4px_16px_rgba(0,0,0,0.06),0_8px_32px_rgba(0,0,0,0.03),inset_0_0_24px_rgba(255,255,255,0.4),inset_0_1px_0_rgba(255,255,255,0.8)]',
        // ─── Dark mode ───
        'dark:bg-white/[0.04] dark:border-white/[0.08]',
        'dark:shadow-[0_4px_16px_rgba(0,0,0,0.08),0_8px_32px_rgba(0,0,0,0.04),inset_0_0_24px_rgba(255,255,255,0.03),inset_0_1px_0_rgba(255,255,255,0.06)]',
        // ─── Hover light ───
        isInteractive && 'cursor-pointer hover:border-black/[0.1] hover:shadow-[0_8px_32px_rgba(0,0,0,0.08),0_16px_48px_rgba(0,0,0,0.04),inset_0_0_30px_rgba(255,255,255,0.5),inset_0_1px_0_rgba(255,255,255,0.9)]',
        // ─── Hover dark ───
        isInteractive && 'dark:hover:border-white/[0.14] dark:hover:shadow-[0_8px_32px_rgba(0,0,0,0.12),0_16px_48px_rgba(0,0,0,0.06),inset_0_0_30px_rgba(255,255,255,0.05),inset_0_1px_0_rgba(255,255,255,0.08)]',
        glow !== 'none' && glowStyles[glow],
        glow !== 'none' && glowInsetStyles[glow],
        glow !== 'none' && glowShadowStyles[glow],
        'noise-texture',
        className
      )}
    >
      {/* Gradient border animation on hover — enhanced with rotating gradient */}
      {glow !== 'none' && (
        <div
          className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none -z-[1]"
          style={{
            background: `linear-gradient(90deg, ${gradientBorderColors[glow]})`,
            backgroundSize: '200% 100%',
            animation: 'gradient-border-flow 3s ease infinite',
            padding: '1.5px',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
          }}
        />
      )}

      {/* Rotating glow border effect on hover */}
      {glow !== 'none' && isInteractive && (
        <div
          className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none -z-[2] overflow-hidden"
        >
          <div
            className="absolute inset-[-50%]"
            style={{
              background: `conic-gradient(from 0deg, transparent 0%, ${(gradientBorderColors[glow] || gradientBorderColors.none).split(',')[0]} 10%, transparent 20%, transparent 80%, ${(gradientBorderColors[glow] || gradientBorderColors.none).split(',')[0]} 90%, transparent 100%)`,
              animation: 'glass-rotate 4s linear infinite',
            }}
          />
        </div>
      )}

      {/* Shimmer streak on hover — slower, more natural */}
      <div
        className="absolute inset-0 z-10 pointer-events-none opacity-0 group-hover:opacity-100"
        aria-hidden="true"
      >
        <div
          className="absolute inset-0 -translate-x-full group-hover:animate-[glass-shimmer_1.2s_ease-out_forwards] glass-shimmer"
        />
      </div>

      {/* Top reflection highlight */}
      <div
        className="absolute inset-x-0 top-0 h-[1px] pointer-events-none z-10 glass-reflection"
        aria-hidden="true"
      />

      {/* Bottom glow reflection on hover */}
      {glow !== 'none' && isInteractive && (
        <div
          className="absolute inset-x-4 -bottom-2 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-0"
          style={{
            background: `radial-gradient(ellipse, ${(gradientBorderColors[glow] || gradientBorderColors.none).split(',')[0].replace(/[\d.]+\)$/, '0.08)')}, transparent 70%)`,
            filter: 'blur(8px)',
          }}
          aria-hidden="true"
        />
      )}

      {children}
    </motion.div>
  );
}
