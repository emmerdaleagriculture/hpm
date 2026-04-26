import Link from 'next/link';

/**
 * Custom button-styled nav entry in Payload's admin sidebar pointing
 * at /admin-stats. Lives outside the `/admin` route group because it
 * isn't a Payload collection or global; it's a bespoke dashboard.
 *
 * Rendered via `admin.components.beforeNavLinks` — sits at the very
 * top of the sidebar, above the Collections heading.
 */
export function SearchConsoleNavLink() {
  return (
    <div
      style={{
        padding: '0 0.75rem',
        marginBottom: '1rem',
        marginTop: '0.25rem',
      }}
    >
      <Link
        href="/admin-stats"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          padding: '0.625rem 0.875rem',
          background: '#367c2b',
          color: '#fff',
          textDecoration: 'none',
          fontSize: '0.875rem',
          fontWeight: 600,
          borderRadius: '6px',
          border: '1px solid #2a5e22',
          letterSpacing: '0.2px',
        }}
      >
        <span>📊 Analytics dashboard</span>
        <span style={{ opacity: 0.85 }}>→</span>
      </Link>
    </div>
  );
}
