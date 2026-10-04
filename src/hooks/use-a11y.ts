'use client';

import { useMemo, useEffect, useState, useCallback } from 'react';
import {
  getAriaLabel,
  getScreenReaderText,
  getKeyboardNavInstructions,
  announceToScreenReader,
  isReducedMotion as checkReducedMotion,
  isHighContrast as checkHighContrast,
} from '@/lib/accessibility';

// ─── Types ─────────────────────────────────────────────────────────

type ElementType =
  | 'button'
  | 'link'
  | 'input'
  | 'select'
  | 'dialog'
  | 'alert'
  | 'status'
  | 'navigation'
  | 'listbox'
  | 'tab'
  | 'tabpanel'
  | 'menu'
  | 'menuitem'
  | 'tooltip';

interface AriaPropsResult {
  role?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  'aria-haspopup'?: boolean;
  'aria-live'?: 'polite' | 'assertive' | 'off';
  'aria-atomic'?: boolean;
  tabIndex?: number;
}

interface UseA11yReturn {
  /** Helper to generate screen-reader-only text (returns a props object) */
  srText: (text: string) => { className: string; children: string };
  /** Announce a message to screen readers (polite by default) */
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
  /** Get proper ARIA attributes for element types */
  getAriaProps: (elementType: ElementType, props?: Record<string, unknown>) => AriaPropsResult;
  /** Whether user prefers reduced motion */
  prefersReducedMotion: boolean;
  /** Whether user prefers high contrast */
  highContrast: boolean;
  /** Re-exported utility functions for convenience */
  getAriaLabel: typeof getAriaLabel;
  getScreenReaderText: typeof getScreenReaderText;
  getKeyboardNavInstructions: typeof getKeyboardNavInstructions;
}

// ─── ARIA attribute defaults per element type ──────────────────────

const elementAriaDefaults: Record<ElementType, AriaPropsResult> = {
  button: { role: 'button', tabIndex: 0 },
  link: { role: 'link', tabIndex: 0 },
  input: { role: 'textbox' },
  select: { role: 'combobox', 'aria-expanded': false, 'aria-haspopup': true },
  dialog: { role: 'dialog', 'aria-modal': true } as unknown as AriaPropsResult,
  alert: { role: 'alert', 'aria-live': 'assertive', 'aria-atomic': true },
  status: { role: 'status', 'aria-live': 'polite', 'aria-atomic': true },
  navigation: { role: 'navigation' },
  listbox: { role: 'listbox' },
  tab: { role: 'tab', tabIndex: 0 },
  tabpanel: { role: 'tabpanel', tabIndex: 0 },
  menu: { role: 'menu' },
  menuitem: { role: 'menuitem', tabIndex: -1 },
  tooltip: { role: 'tooltip' },
};

// ─── Hook ──────────────────────────────────────────────────────────

/**
 * React hook that provides accessibility utilities for building
 * inclusive user interfaces.
 *
 * • Sets up a visually-hidden `aria-live` region on mount.
 * • Exposes screen-reader text, ARIA prop helpers, and user preferences.
 * • All returned values are stable across renders (useMemo / useCallback).
 */
export function useA11y(): UseA11yReturn {
  // ─── Motion & contrast preferences ──────────────────────────

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    checkReducedMotion,
  );
  const [highContrast, setHighContrast] = useState(checkHighContrast);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const contrastQuery = window.matchMedia('(prefers-contrast: more)');

    const onMotionChange = (e: MediaQueryListEvent) =>
      setPrefersReducedMotion(e.matches);
    const onContrastChange = (e: MediaQueryListEvent) =>
      setHighContrast(e.matches);

    motionQuery.addEventListener('change', onMotionChange);
    contrastQuery.addEventListener('change', onContrastChange);

    return () => {
      motionQuery.removeEventListener('change', onMotionChange);
      contrastQuery.removeEventListener('change', onContrastChange);
    };
  }, []);

  // ─── Ensure aria-live region exists ─────────────────────────

  useEffect(() => {
    if (typeof document === 'undefined') return;

    // Create polite region
    if (!document.getElementById('a11y-announce-polite')) {
      const polite = document.createElement('div');
      polite.id = 'a11y-announce-polite';
      polite.setAttribute('aria-live', 'polite');
      polite.setAttribute('aria-atomic', 'true');
      polite.setAttribute('role', 'status');
      Object.assign(polite.style, {
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: '0',
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        borderWidth: '0',
      });
      document.body.appendChild(polite);
    }

    // Create assertive region
    if (!document.getElementById('a11y-announce-assertive')) {
      const assertive = document.createElement('div');
      assertive.id = 'a11y-announce-assertive';
      assertive.setAttribute('aria-live', 'assertive');
      assertive.setAttribute('aria-atomic', 'true');
      assertive.setAttribute('role', 'alert');
      Object.assign(assertive.style, {
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: '0',
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        borderWidth: '0',
      });
      document.body.appendChild(assertive);
    }
  }, []);

  // ─── Stable callbacks ───────────────────────────────────────

  const srText = useCallback((text: string) => {
    return { className: 'sr-only', children: text };
  }, []);

  const announce = useCallback(
    (message: string, priority: 'polite' | 'assertive' = 'polite') => {
      announceToScreenReader(message, priority);
    },
    [],
  );

  const getAriaProps = useCallback(
    (
      elementType: ElementType,
      props?: Record<string, unknown>,
    ): AriaPropsResult => {
      const defaults = elementAriaDefaults[elementType] || {};
      return { ...defaults, ...props } as AriaPropsResult;
    },
    [],
  );

  // ─── Memoised return object ─────────────────────────────────

  return useMemo<UseA11yReturn>(
    () => ({
      srText,
      announce,
      getAriaProps,
      prefersReducedMotion,
      highContrast,
      getAriaLabel,
      getScreenReaderText,
      getKeyboardNavInstructions,
    }),
    [
      srText,
      announce,
      getAriaProps,
      prefersReducedMotion,
      highContrast,
    ],
  );
}
