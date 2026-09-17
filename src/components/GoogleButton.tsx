import { googleEnabled } from '@/lib/google.mjs';

/** A "Sign in with Google" button, rendered only when OAuth is configured. */
export function GoogleButton({ label = 'Sign in with Google' }: { label?: string }) {
  if (!googleEnabled()) return null;
  return (
    <>
      <a
        href="/api/auth/google"
        className="bevel-out flex items-center justify-center gap-2 px-4 py-2 text-[13px] font-bold text-[var(--color-ink)]"
      >
        <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.3 0 24 0 14.6 0 6.4 5.4 2.5 13.3l7.9 6.1C12.3 13.2 17.6 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.1 5.3-4.5 7l7 5.4c4.1-3.8 6.2-9.4 6.2-16.9z"/>
          <path fill="#FBBC05" d="M10.4 28.6c-.5-1.5-.8-3-.8-4.6s.3-3.1.8-4.6l-7.9-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.5 10.7l7.9-6.1z"/>
          <path fill="#34A853" d="M24 48c6.3 0 11.6-2.1 15.5-5.7l-7-5.4c-2 1.3-4.6 2.1-8.5 2.1-6.4 0-11.7-3.7-13.6-9l-7.9 6.1C6.4 42.6 14.6 48 24 48z"/>
        </svg>
        {label}
      </a>
      <div className="my-1 flex items-center gap-2 text-[11px] text-[var(--color-ink-faint)]">
        <span className="h-px flex-1 bg-[#c9c4b0]" /> or <span className="h-px flex-1 bg-[#c9c4b0]" />
      </div>
    </>
  );
}
