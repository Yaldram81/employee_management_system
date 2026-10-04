'use client';

import type { JSX } from 'react';

// ─── Types ─────────────────────────────────────────────────────────

interface SROnlyProps {
  /** Content visible to screen readers but hidden visually */
  children: React.ReactNode;
  /** HTML element to render (defaults to 'span') */
  as?: 'span' | 'div' | 'p';
  /** Optional id for use with aria-describedby */
  id?: string;
}

// ─── Component ─────────────────────────────────────────────────────

/**
 * Screen Reader Only component.
 *
 * Renders content that is accessible to assistive technologies
 * but visually hidden using the Tailwind `sr-only` utility class.
 *
 * @example
 * ```tsx
 * <SROnly>Status: Approved</SROnly>
 * <SROnly as="p" id="field-help">Enter your full legal name</SROnly>
 * ```
 */
export function SROnly({ children, as = 'span', id }: SROnlyProps): JSX.Element {
  const Component = as;
  return (
    <Component id={id} className="sr-only">
      {children}
    </Component>
  );
}
