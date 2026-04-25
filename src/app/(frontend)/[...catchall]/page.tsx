import { notFound } from 'next/navigation';

/**
 * Catch-all for any (frontend) URL that doesn't match a real route.
 * Throws notFound() so the (frontend)/not-found.tsx renders inside the
 * (frontend) layout. Without this, Next falls back to its default
 * built-in 404 for unmatched paths.
 *
 * Real routes (/, /services, /notes/[slug], etc.) take precedence over
 * the catchall — Next picks more-specific matches first.
 */
export default function Catchall() {
  notFound();
}
