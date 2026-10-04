'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

// ─── Context shape ─────────────────────────────────────────────────

interface AnnouncerContextValue {
  /** Announce a message politely (waits for current speech to finish) */
  announce: (message: string) => void;
  /** Announce a message assertively (interrupts current speech) */
  announceUrgent: (message: string) => void;
}

const AnnouncerContext = createContext<AnnouncerContextValue | null>(null);

// ─── Provider ──────────────────────────────────────────────────────

interface AnnouncerProviderProps {
  children: ReactNode;
}

export function AnnouncerProvider({ children }: AnnouncerProviderProps) {
  const politeRef = useRef<HTMLDivElement>(null);
  const assertiveRef = useRef<HTMLDivElement>(null);

  // Counter used to force React to re-render the live region content.
  // This is necessary because some screen readers do not re-announce
  // when the identical text is set consecutively.
  const [politeMessage, setPoliteMessage] = useState('');
  const [assertiveMessage, setAssertiveMessage] = useState('');

  const announce = useCallback((message: string) => {
    // Clear first so that the same message triggers a change event
    setPoliteMessage('');
    requestAnimationFrame(() => {
      setPoliteMessage(message);
    });
  }, []);

  const announceUrgent = useCallback((message: string) => {
    setAssertiveMessage('');
    requestAnimationFrame(() => {
      setAssertiveMessage(message);
    });
  }, []);

  // ─── Ensure cleanup of stale announcements ──────────────────

  useEffect(() => {
    if (!politeMessage) return;
    const timeout = setTimeout(() => setPoliteMessage(''), 5000);
    return () => clearTimeout(timeout);
  }, [politeMessage]);

  useEffect(() => {
    if (!assertiveMessage) return;
    const timeout = setTimeout(() => setAssertiveMessage(''), 5000);
    return () => clearTimeout(timeout);
  }, [assertiveMessage]);

  const value = useCallback<AnnouncerContextValue>(
    () => ({ announce, announceUrgent }),
    [announce, announceUrgent],
  )();

  return (
    <AnnouncerContext.Provider value={value}>
      {children}

      {/* Polite live region — announced after current speech */}
      <div
        ref={politeRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {politeMessage}
      </div>

      {/* Assertive live region — interrupts current speech */}
      <div
        ref={assertiveRef}
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertiveMessage}
      </div>
    </AnnouncerContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────

/**
 * Access the announcer context. Must be used within an `<AnnouncerProvider>`.
 */
export function useAnnouncer(): AnnouncerContextValue {
  const context = useContext(AnnouncerContext);
  if (!context) {
    throw new Error(
      'useAnnouncer must be used within an <AnnouncerProvider>. ' +
        'Wrap your app or component tree with <AnnouncerProvider>.',
    );
  }
  return context;
}
