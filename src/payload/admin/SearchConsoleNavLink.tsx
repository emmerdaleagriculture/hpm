import Link from 'next/link';

/**
 * Custom nav link in Payload's admin sidebar pointing at /admin-stats —
 * the Search Console dashboard. Lives outside the `/admin` route group
 * because it isn't a Payload collection or global; it's a bespoke page.
 */
export function SearchConsoleNavLink() {
  return (
    <Link
      href="/admin-stats"
      style={{
        display: 'block',
        padding: '0.6rem 1rem',
        marginBottom: '0.25rem',
        color: 'inherit',
        textDecoration: 'none',
        fontSize: '0.875rem',
        borderRadius: '4px',
      }}
    >
      Search Console ↗
    </Link>
  );
}
