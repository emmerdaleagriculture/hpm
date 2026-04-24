/**
 * Placeholder homepage.
 *
 * This exists so that `npm run dev` shows something real at localhost:3000
 * and you can confirm the scaffold is working. We'll replace this with the
 * full Hampshire Green design in the next session, sourcing content from
 * the Homepage global in Payload.
 */
export default function HomePage() {
  return (
    <main
      style={{
        minHeight: '90vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        background:
          'radial-gradient(ellipse at 70% 20%, rgba(156,176,136,0.25) 0%, transparent 50%), linear-gradient(180deg, #1a2415 0%, #2b3a22 40%, #3d5330 70%, #5c7a4e 100%)',
        color: 'var(--white)',
      }}
    >
      <div style={{ maxWidth: 720, textAlign: 'center' }}>
        <div className="eyebrow" style={{ color: 'var(--sage)', justifyContent: 'center' }}>
          Phase 3 scaffold
        </div>
        <h1
          className="display"
          style={{
            fontSize: 'clamp(40px, 6vw, 72px)',
            margin: '20px 0',
          }}
        >
          Hampshire Paddock Management
        </h1>
        <p style={{ opacity: 0.85, fontSize: 18, marginBottom: 32 }}>
          Scaffold is up and running. This placeholder will be replaced with the
          full homepage in the next session.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a
            href="/admin"
            style={{
              background: 'var(--white)',
              color: 'var(--green-deep)',
              padding: '14px 24px',
              borderRadius: 'var(--r-full)',
              fontWeight: 500,
              fontSize: 15,
            }}
          >
            Open Payload admin →
          </a>
        </div>
      </div>
    </main>
  );
}
